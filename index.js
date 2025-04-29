"use strict";

require('dotenv').config();

// =============================
// 1. Імпортуємо необхідні модулі
// =============================
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// =============================
// 2. Ініціалізація додатку та налаштування порту
// =============================
const app = express();
const PORT = process.env.PORT || 3000;

// =============================
// 3. Базові заходи безпеки
// =============================
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'"], // Allow only external scripts or scripts with nonce
        "style-src": ["'self'", "https://www.w3schools.com", "https://cdnjs.cloudflare.com", "'unsafe-inline'"], // Allow inline styles for compatibility
        "font-src": ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com", "data:"],
        "img-src": ["'self'", "data:"],
        // ...other directives as needed...
      },
    },
  })
);
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 200 // Збільшено кількість запитів до 200
});
app.use(limiter);

// =============================
// 4. Шляхи до файлів даних
// =============================
const artInfoPath = path.join(__dirname, "art-info.json");
const accountsPath = process.env.ACCOUNTS_FILE_PATH;
const dataFiles = {
  team: path.join(__dirname, "team.json"),
  price: path.join(__dirname, "public", "price.json"),
  news: path.join(__dirname, "news.json"),
  managers: path.join(__dirname, "managers.json"),
  developments: path.join(__dirname, "developments.json")
};

// Paths for complaints and applications
const complaintsPath = path.join(__dirname, "problm.json");
const applicationsPath = path.join(__dirname, "mod.json");

// Ensure files exist
if (!fs.existsSync(complaintsPath)) {
  fs.writeFileSync(complaintsPath, JSON.stringify([], null, 2));
}
if (!fs.existsSync(applicationsPath)) {
  fs.writeFileSync(applicationsPath, JSON.stringify([], null, 2));
}

// =============================
// 5. Перевірка наявності файлів (оновлено: не створювати нові файли у public/)
// =============================
if (!fs.existsSync(artInfoPath)) {
  fs.writeFileSync(artInfoPath, JSON.stringify([], null, 2));
}
Object.keys(dataFiles).forEach(key => {
  // Не створювати нові файли у public/
  if (
    !fs.existsSync(dataFiles[key]) &&
    !dataFiles[key].includes(path.join("public", ""))
  ) {
    fs.writeFileSync(dataFiles[key], JSON.stringify([], null, 2));
    console.log(`Створено порожній файл для розділу "${key}": ${dataFiles[key]}`);
  }
  // Якщо файл у public і його немає — просто попередження, не створюємо!
  if (
    !fs.existsSync(dataFiles[key]) &&
    dataFiles[key].includes(path.join("public", ""))
  ) {
    console.warn(`Файл ${dataFiles[key]} не знайдено у public/. Додайте його вручну для уникнення 404!`);
  }
});

const accountsDir = path.dirname(accountsPath);

if (!fs.existsSync(accountsDir)) {
  fs.mkdirSync(accountsDir, { recursive: true });
  console.log(`Створено директорію: ${accountsDir}`);
}

if (!fs.existsSync(accountsPath)) {
  fs.writeFileSync(accountsPath, JSON.stringify([], null, 2));
  console.log(`Створено порожній файл: ${accountsPath}`);
}

// =============================
// 6. Допоміжна функція для очищення даних
// =============================
function sanitizeValue(input) {
  return input.trim();
}

// Basic XSS protection
function sanitizeInput(input) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Ensure body parsing middleware is applied before any route handling
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// =============================
// 7. Middleware перевірки прав для панельного завантаження
// =============================
function panelUploadAuth(req, res, next) {
  if (req.body && req.body.mode && req.body.mode === "main") {
    return next();
  }
  if (
    req.session &&
    req.session.user &&
    (
      req.session.user.accessLevel === "admin" ||
      req.session.user.accessLevel === "artist" ||
      (req.session.user.accessLevel === "user" &&
        req.body &&
        (req.body.category === "fanart" || req.body.category === "fanart_nsfw"))
    )
  ) {
    return next();
  }
  console.warn("Незаконована спроба завантаження через панель. Дані:", req.body || {});
  return res.status(403).send("Доступ заборонено");
}

// =============================
// 8. Налаштування Multer для завантаження артів
// =============================
const allowedMimeTypes = ["image/png", "image/jpg", "image/jpeg"];
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "";
    if (req.body.mode && req.body.mode === "main") {
      if (req.body.category === "fanart") {
        folder = path.join("custom-genres", "fan_arts");
      } else if (req.body.category === "fanart_nsfw") {
        folder = path.join("custom-genres", "fan_arts_nsfw");
      } else {
        folder = path.join("custom-genres", "fan_arts");
        console.warn("Невірна категорія для add-art.html; використовується за замовчуванням: fanart");
      }
    } else {
      if (req.body.newGenre && req.body.newGenre.trim() !== "") {
        folder = req.body.newGenre;
      } else if (req.body.artCategory && req.body.artCategory.trim() !== "") {
        folder = req.body.artCategory;
      } else {
        folder = "default";
      }
      folder = folder.trim().replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9\-]/gi, "");
    }
    const destFolder = path.join(__dirname, "public", "arts", folder);
    try {
      fs.mkdirSync(destFolder, { recursive: true });
      console.log("Створено/використано директорію:", destFolder);
    } catch (e) {
      console.error("Помилка створення директорії", destFolder, e);
    }
    cb(null, destFolder);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Непідтримуваний тип файлу. Дозволені лише png, jpg, jpeg."), false);
    }
  }
});

// =============================
// 9. Middleware для парсингу даних
// =============================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// =============================
// 10. Налаштування сесій
// =============================
app.use(session({
  secret: "secret_key_!@#$%",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 2 * 60 * 60 * 1000 }
}));

// =============================
// 11. API Endpoint'и для даних
// =============================
app.get("/api/art-info", (req, res) => {
  console.log("Отримали запит до /api/art-info");
  res.sendFile(path.resolve(artInfoPath), err => {
    if (err) {
      console.error("Помилка при відправленні art-info.json:", err);
      res.status(500).send("Помилка отримання даних");
    }
  });
});

app.get("/api/team", (req, res) => {
  console.log("Отримали запит до /api/team");
  try {
    const data = fs.readFileSync(dataFiles.team, "utf8");
    console.log("Дані з team.json:", data); // Log data for debugging
    res.json(JSON.parse(data));
  } catch (err) {
    console.error("Помилка зчитування team.json:", err); // Log error
    res.status(500).send("Помилка отримання даних");
  }
});

app.get("/api/price", (req, res) => {
  console.log("Отримали запит до /api/price");
  try {
    const data = fs.readFileSync(dataFiles.price, "utf8");
    res.json(JSON.parse(data));
  } catch (err) {
    console.error("Помилка зчитування price.json:", err);
    res.status(500).send("Помилка отримання даних");
  }
});

app.get("/api/news", (req, res) => {
  console.log("Отримали запит до /api/news");
  try {
    const data = fs.readFileSync(dataFiles.news, "utf8");
    res.json(JSON.parse(data));
  } catch (err) {
    console.error("Помилка зчитування news.json:", err);
    res.status(500).send("Помилка отримання даних");
  }
});

app.get("/api/managers", (req, res) => {
  console.log("Отримали запит до /api/managers");
  try {
    const data = fs.readFileSync(dataFiles.managers, "utf8");
    res.json(JSON.parse(data));
  } catch (err) {
    console.error("Помилка зчитування managers.json:", err);
    res.status(500).send("Помилка отримання даних");
  }
});

app.get("/api/developments", (req, res) => {
  console.log("Отримали запит до /api/developments");
  try {
    const data = fs.readFileSync(dataFiles.developments, "utf8");
    res.json(JSON.parse(data));
  } catch (err) {
    console.error("Помилка зчитування developments.json:", err);
    res.status(500).send("Помилка отримання даних");
  }
});

// =============================
// 12. Статичні файли
// =============================
app.use(express.static(path.join(__dirname, "public")));
app.use((req, res, next) => {
  console.log(`Запит на статичний файл: ${req.url}`);
  next();
});

// =============================
// 13. Маршрут завантаження артів (з panelUploadAuth)
// =============================
app.post("/upload", upload.single("artFile"), panelUploadAuth, (req, res) => {
  console.log("Запит на завантаження арту, дані:", req.body);
  const artTitle = sanitizeValue(req.body.artTitle);
  let artDescription = "";
  if (req.body.description) {
    artDescription = sanitizeValue(req.body.description);
    if (artDescription.length > 950) {
      artDescription = artDescription.substring(0, 950);
    }
  }
  let folder = "";
  let displayGenre = "";
  if (req.body.mode && req.body.mode === "main") {
    if (req.body.category === "fanart") {
      folder = path.join("custom-genres", "fan_arts");
      displayGenre = "Фан-арти";
    } else if (req.body.category === "fanart_nsfw") {
      folder = path.join("custom-genres", "fan_arts_nsfw");
      displayGenre = "Фан-арти NSFW";
    } else {
      folder = path.join("custom-genres", "fan_arts");
      displayGenre = "Фан-арти";
      console.warn("Невірна категорія для add-art.html; використовується за замовчуванням: fanart");
    }
  } else {
    if (req.body.newGenre && req.body.newGenre.trim() !== "") {
      folder = req.body.newGenre;
      displayGenre = req.body.newGenre.trim();
    } else if (req.body.artCategory && req.body.artCategory.trim() !== "") {
      folder = req.body.artCategory;
      displayGenre = req.body.artCategory.trim();
    } else {
      folder = "default";
      displayGenre = "Default";
    }
    folder = folder.trim().replace(/\s+/g, "-").toLowerCase().replace(/[^a-z0-9\-]/gi, "");
  }
  const destFolderRelative = path.join("arts", folder).replace(/\\/g, "/");
  const relativePath = path.join(destFolderRelative, req.file.filename).replace(/\\/g, "/");
  const artId = `art${Date.now()}`;
  const artEntry = {
    id: artId,
    title: artTitle,
    description: artDescription,
    category: displayGenre,
    file: relativePath
  };
  let artInfo = [];
  try {
    const data = fs.readFileSync(artInfoPath, "utf8");
    artInfo = JSON.parse(data);
  } catch (err) {
    console.error("Помилка зчитування art-info.json:", err);
  }
  artInfo.push(artEntry);
  try {
    fs.writeFileSync(artInfoPath, JSON.stringify(artInfo, null, 2));
    console.log("Арт-запис додано:", artEntry);
  } catch (err) {
    console.error("Помилка запису art-info.json:", err);
  }
  res.redirect("/arts.html");
});

// =============================
// 14. Логінова система
// =============================
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.post("/login", (req, res) => {
  console.log("Спроба логіну, дані:", req.body);
  const inputLogin = req.body.login ? req.body.login.trim() : "";
  const inputPassword = req.body.password ? req.body.password.trim() : "";
  if (!inputLogin || !inputPassword) {
    console.log("Логін або пароль не введені.");
    return res.status(400).send("Логін і пароль обов'язкові.");
  }

  let accounts;
  try {
    if (!fs.existsSync(accountsPath)) {
      console.error(`Файл ${accountsPath} не знайдено.`);
      return res.status(500).send("Сервіс недоступний. Файл акаунтів відсутній.");
    }
    const data = fs.readFileSync(accountsPath, "utf8");
    accounts = JSON.parse(data);
    if (!Array.isArray(accounts) || accounts.length === 0) {
      console.error("Файл accounts.json порожній або не містить акаунтів.");
      return res.status(500).send("Сервіс недоступний. Файл акаунтів порожній.");
    }
    console.log("Accounts зчитано успішно:", accounts);
  } catch (err) {
    console.error("Помилка читання accounts.json:", err);
    return res.status(500).send("Сервіс недоступний");
  }

  const account = accounts.find(acc => acc.login === inputLogin);
  if (!account) {
    console.log("Акаунт не знайдено для:", inputLogin);
    return res.status(401).send("Невірний логін або пароль");
  }
  if (inputPassword !== account.password) {
    console.log("Невірний пароль для:", inputLogin);
    return res.status(401).send("Невірний логін або пароль");
  }

  req.session.user = {
    login: account.login,
    role: account.role,
    accessLevel: account.accessLevel,
    rank: account.rank
  };
  console.log("Сесія встановлена:", req.session.user);
  res.redirect("/dashboard");
});

// =============================
// 15. Middleware захисту маршрутів
// =============================
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect("/login");
}

// Middleware to restrict access to specific accounts
function requireSuperAdmin(req, res, next) {
  if (
    req.session &&
    req.session.user &&
    (req.session.user.login === "002-FAREINHEITS-1904" || req.session.user.login === "001-KISO-1904")
  ) {
    return next();
  }
  return res.status(403).send("Доступ заборонено.");
}

// Route to view all accounts (restricted to super admins)
app.get("/manage-accounts", requireSuperAdmin, (req, res) => {
  let accounts = [];
  try {
    const data = fs.readFileSync(accountsPath, "utf8");
    accounts = JSON.parse(data);
  } catch (err) {
    console.error("Помилка зчитування accounts.json:", err);
    return res.status(500).send("Помилка отримання даних.");
  }

  let entriesHtml = accounts.map(account => `
    <div class="entry">
      <p><strong>Логін:</strong> ${account.login}</p>
      <p><strong>Роль:</strong> ${account.role}</p>
      <p><strong>Рівень доступу:</strong> ${account.accessLevel}</p>
      <p><strong>Звання:</strong> ${account.rank}</p>
      <form method="POST" action="/update-account" style="display:inline-block; margin-right:10px;">
        <input type="hidden" name="originalLogin" value="${account.login}">
        <input type="text" name="newLogin" placeholder="Новий логін" required>
        <input type="password" name="newPassword" placeholder="Новий пароль" required>
        <button type="submit"><i class="fa fa-pencil"></i> Оновити</button>
      </form>
    </div>
  `).join("");
  let formHtml = ""; // Додайте форму для додавання акаунта, якщо потрібно
  res.send(renderManagePage({ section: "accounts", entriesHtml, formHtml }));
});

// =============================
// 16. Панель управління (dashboard)
// =============================
app.get("/dashboard", requireAuth, (req, res) => {
  const user = req.session.user;
  res.send(`
    <!DOCTYPE html>
    <html lang="uk">
      <head>
        <meta charset="UTF-8">
        <title>Панель управління</title>
        <link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
        <style>
          body {
            font-family: 'Roboto', sans-serif;
            background: linear-gradient(135deg, #4b0082, #6a0dad);
            color: #fff;
            margin: 0;
            padding: 0;
          }
          header {
            background: #6a0dad;
            color: white;
            padding: 20px;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          }
          nav {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 15px;
            padding: 15px;
            background: #4b0082;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          }
          nav a {
            text-decoration: none;
            padding: 10px 20px;
            color: white;
            background: #6a0dad;
            border-radius: 5px;
            transition: background 0.3s ease, transform 0.3s ease;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          nav a:hover {
            background: #8a2be2;
            transform: scale(1.1);
          }
          .container {
            padding: 20px;
            max-width: 1200px;
            margin: 20px auto;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          }
          .info {
            text-align: center;
            margin-bottom: 20px;
          }
          .info p {
            margin: 10px 0;
            font-size: 1.2em;
          }
          footer {
            text-align: center;
            padding: 15px;
            background: #4b0082;
            color: white;
            position: fixed;
            bottom: 0;
            width: 100%;
            box-shadow: 0 -4px 8px rgba(0, 0, 0, 0.3);
          }
        </style>
      </head>
      <body>
        <header>
          <h1><i class="fa fa-cogs"></i> Панель управління</h1>
        </header>
        <nav>
          <a href="/manage-art"><i class="fa fa-picture-o"></i> Арти</a>
          <a href="/manage-team"><i class="fa fa-users"></i> Команда</a>
          <a href="/manage-price"><i class="fa fa-tags"></i> Прайс</a>
          <a href="/manage-news"><i class="fa fa-newspaper-o"></i> Новини</a>
          <a href="/manage-managers"><i class="fa fa-user-circle"></i> Менеджери</a>
          <a href="/manage-developments"><i class="fa fa-lightbulb-o"></i> Розробки</a>
          <a href="/manage-accounts"><i class="fa fa-user-secret"></i> Акаунти</a>
          <a href="/manage-messages"><i class="fa fa-envelope"></i> Повідомлення</a>
          <a href="/logout"><i class="fa fa-sign-out"></i> Вийти</a>
        </nav>
        <div class="container">
          <div class="info">
            <p><strong>Звання:</strong> ${user.rank}</p>
            <p><strong>Рівень допуску:</strong> ${user.accessLevel}</p>
          </div>
        </div>
        <footer>
          <p>&copy; 2023 Художник Всесвіту. Всі права захищено.</p>
        </footer>
      </body>
    </html>
  `);
});

// =============================
// 17. Секретний маршрут для доступу до логіну
// =============================
app.get("/adminpanel-F35YQ", (req, res) => {
  // Перенаправляємо користувача на сторінку логіну
  res.redirect("/login");
});

// =============================
// 18. Сторінка редагування артів (manage-art) — стиль уніфіковано
// =============================
app.get("/manage-art", requireAuth, (req, res) => {
  let artInfo = [];
  try {
    const data = fs.readFileSync(artInfoPath, "utf8");
    artInfo = JSON.parse(data);
  } catch (err) {
    console.error("Помилка зчитування art-info.json:", err);
  }
  let entriesHtml = artInfo.map(entry => `
    <div class="entry">
      <p><strong>ID:</strong> ${entry.id}</p>
      <p><strong>Назва:</strong> ${entry.title}</p>
      <p><strong>Категорія:</strong> ${entry.category}</p>
      <p><strong>Опис:</strong> ${entry.description || ""}</p>
      <img src="/${entry.file}" alt="${entry.title}">
      <form method="POST" action="/art/edit" style="display:inline-block; margin-right:10px;">
         <input type="hidden" name="id" value="${entry.id}">
         <input type="text" name="title" value="${entry.title}" required>
         <input type="text" name="category" value="${entry.category}" required>
         <button type="submit"><i class="fa fa-pencil"></i> Оновити</button>
      </form>
      <form method="POST" action="/art/delete" style="display:inline-block;">
         <input type="hidden" name="id" value="${entry.id}">
         <button type="submit" onclick="return confirm('Видалити цей запис?')"><i class="fa fa-trash"></i> Видалити</button>
      </form>
    </div>
  `).join("");
  let formHtml = `
    <form method="POST" action="/upload" enctype="multipart/form-data">
      <input type="text" name="artTitle" placeholder="Назва" required>
      <input type="text" name="category" placeholder="Категорія" required>
      <textarea name="description" placeholder="Опис"></textarea>
      <input type="file" name="artFile" accept="image/png,image/jpg,image/jpeg" required>
      <button type="submit"><i class="fa fa-plus"></i> Додати арт</button>
    </form>
  `;
  res.send(renderManagePage({ section: "art", entriesHtml, formHtml }));
});

app.post("/art/edit", requireAuth, (req, res) => {
  const { id, title, category } = req.body;
  let artInfo = [];
  try {
    const data = fs.readFileSync(artInfoPath, "utf8");
    artInfo = JSON.parse(data);
  } catch (err) {
    console.error("Помилка зчитування art-info.json:", err);
  }
  let found = artInfo.find(entry => entry.id === id);
  if (found) {
    found.title = title.trim();
    found.category = category.trim();
    try {
      fs.writeFileSync(artInfoPath, JSON.stringify(artInfo, null, 2));
      console.log("Запис оновлено для art.id =", id);
    } catch (err) {
      console.error("Помилка запису art-info.json:", err);
    }
    res.redirect("/manage-art");
  } else {
    res.status(404).send("Запис не знайдено");
  }
});

app.post("/art/delete", requireAuth, (req, res) => {
  const { id } = req.body;
  let artInfo = [];
  try {
    const data = fs.readFileSync(artInfoPath, "utf8");
    artInfo = JSON.parse(data);
  } catch (err) {
    console.error("Помилка зчитування art-info.json:", err);
  }
  const newArtInfo = artInfo.filter(entry => entry.id !== id);
  try {
    fs.writeFileSync(artInfoPath, JSON.stringify(newArtInfo, null, 2));
    console.log("Запис видалено для art.id =", id);
  } catch (err) {
    console.error("Помилка запису art-info.json:", err);
  }
  res.redirect("/manage-art");
});

// =============================
// Кешування для GET-запитів (тільки для читання, не для запису)
// =============================
const cache = {};
function getCachedJSON(filePath) {
  if (cache[filePath]) return cache[filePath];
  try {
    const data = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(data);
    cache[filePath] = parsed;
    return parsed;
  } catch {
    return [];
  }
}
function updateJSON(filePath, data) {
  cache[filePath] = data;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// =============================
// Допоміжний шаблон для сторінок керування
// =============================
function renderManagePage({ section, entriesHtml, formHtml }) {
  return `
    <!DOCTYPE html>
    <html lang="uk">
    <head>
      <meta charset="UTF-8">
      <title>Управління ${section}</title>
      <link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
      <style>
        body { font-family: 'Roboto', sans-serif; background: linear-gradient(135deg, #4b0082, #6a0dad); color: #fff; margin: 0; }
        .w3-container { background: rgba(255,255,255,0.1); border-radius: 10px; margin: 30px auto; max-width: 900px; box-shadow: 0 4px 8px rgba(0,0,0,0.3);}
        h1 { text-align: center; margin-top: 30px; }
        .entry { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; background: #fff; border-radius: 8px; color: #222; }
        .entry img { width: 80px; height: 80px; object-fit: cover; display: block; margin-bottom: 10px; }
        .return { margin-top: 20px; }
        a { color: #6a0dad; text-decoration: none; }
        a:hover { text-decoration: underline; }
        form { margin-top: 10px; display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        input[type="text"], input[type="number"], input[type="password"], textarea {
          padding: 10px;
          border-radius: 5px;
          border: 1px solid #bbb;
          min-width: 180px;
          font-size: 1em;
          background: #f8f8ff;
          color: #222;
          flex: 1 1 220px;
        }
        textarea { min-width: 220px; min-height: 40px; resize: vertical; }
        input[type="file"] {
          background: #fff;
          color: #222;
          border-radius: 5px;
          border: 1px solid #bbb;
          padding: 7px;
          font-size: 1em;
          flex: 1 1 220px;
        }
        button {
          background: #6a0dad;
          color: white;
          cursor: pointer;
          transition: background 0.3s ease;
          border: none;
          border-radius: 5px;
          padding: 10px 18px;
          font-size: 1em;
          flex: 0 0 auto;
        }
        button:hover { background: #8a2be2; }
        @media (max-width: 700px) {
          form { flex-direction: column; align-items: stretch; }
          input, textarea, button { min-width: 100%; }
        }
      </style>
    </head>
    <body>
      <div class="w3-container">
      <h1><i class="fa fa-cogs"></i> Управління ${section}</h1>
      <div>
        ${formHtml}
      </div>
      ${entriesHtml}
      <div class="return"><a href="/dashboard"><i class="fa fa-arrow-left"></i> Повернутись до панелі</a></div>
      </div>
    </body>
    </html>
  `;
}

// =============================
// 19. CRUD для інших розділів (універсально, оптимізовано)
// =============================
const allowedSections = ["team", "price", "news", "managers", "developments"];
allowedSections.forEach(section => {
  app.get(`/manage-${section}`, requireAuth, (req, res) => {
    const data = getCachedJSON(dataFiles[section]);
    let formHtml = "";
    if (section === "price") {
      formHtml = `
        <form method="POST" action="/data/price/add">
          <input type="text" name="name" placeholder="Назва" required>
          <input type="number" name="price" placeholder="Ціна" required>
          <button type="submit"><i class="fa fa-plus"></i> Додати запис</button>
        </form>
      `;
    } else if (section === "team") {
      formHtml = `
        <form method="POST" action="/data/team/add">
          <input type="text" name="name" placeholder="Ім'я" required>
          <input type="text" name="role" placeholder="Роль" required>
          <textarea name="bio" placeholder="Біо" required></textarea>
          <button type="submit"><i class="fa fa-plus"></i> Додати запис</button>
        </form>
      `;
    } else {
      formHtml = `
        <form method="POST" action="/data/${section}/add">
          <input type="text" name="title" placeholder="Заголовок" required>
          <textarea name="content" placeholder="Контент" required></textarea>
          <button type="submit"><i class="fa fa-plus"></i> Додати запис</button>
        </form>
      `;
    }
    let entriesHtml = data.map(item => {
      if (section === "price") {
        return `<div class="entry">
          <p><strong>ID:</strong> ${item.id}</p>
          <p><strong>Назва:</strong> ${item.name}</p>
          <p><strong>Ціна:</strong> ${item.price} грн</p>
          <form method="POST" action="/data/price/edit" style="display:inline-block; margin-right:10px;">
            <input type="hidden" name="id" value="${item.id}">
            <input type="text" name="name" value="${item.name}" required>
            <input type="number" name="price" value="${item.price}" required>
            <button type="submit"><i class="fa fa-pencil"></i> Оновити</button>
          </form>
          <form method="POST" action="/data/price/delete" style="display:inline-block;">
            <input type="hidden" name="id" value="${item.id}">
            <button type="submit" onclick="return confirm('Видалити цей запис?')"><i class="fa fa-trash"></i> Видалити</button>
          </form>
        </div>`;
      } else if (section === "team") {
        return `<div class="entry">
          <p><strong>ID:</strong> ${item.id}</p>
          <p><strong>Ім'я:</strong> ${item.name}</p>
          <p><strong>Роль:</strong> ${item.role}</p>
          <p><strong>Біо:</strong> ${item.bio}</p>
          <p><strong>Іконка:</strong> <img src="${item.icon}" alt="${item.name}" class="team-icon"></p>
          <form method="POST" action="/data/team/edit" style="display:inline-block; margin-right:10px;">
            <input type="hidden" name="id" value="${item.id}">
            <input type="text" name="name" value="${item.name}" required>
            <input type="text" name="role" value="${item.role}" required>
            <textarea name="bio" required>${item.bio}</textarea>
            <button type="submit"><i class="fa fa-pencil"></i> Оновити</button>
          </form>
          <form method="POST" action="/data/team/delete" style="display:inline-block;">
            <input type="hidden" name="id" value="${item.id}">
            <button type="submit" onclick="return confirm('Видалити цей запис?')"><i class="fa fa-trash"></i> Видалити</button>
          </form>
        </div>`;
      } else {
        return `<div class="entry">
          <p><strong>ID:</strong> ${item.id}</p>
          <p><strong>Title:</strong> ${item.title || item.name}</p>
          <p><strong>Content/Price:</strong> ${item.content || item.price}</p>
          <form method="POST" action="/data/${section}/edit" style="display:inline-block; margin-right:10px;">
            <input type="hidden" name="id" value="${item.id}">
            <input type="text" name="title" value="${item.title || item.name}" required>
            <textarea name="content" required>${item.content || item.price}</textarea>
            <button type="submit"><i class="fa fa-pencil"></i> Оновити</button>
          </form>
          <form method="POST" action="/data/${section}/delete" style="display:inline-block;">
            <input type="hidden" name="id" value="${item.id}">
            <button type="submit" onclick="return confirm('Видалити цей запис?')"><i class="fa fa-trash"></i> Видалити</button>
          </form>
        </div>`;
      }
    }).join("");
    res.send(renderManagePage({ section, entriesHtml, formHtml }));
  });

  app.post(`/data/${section}/add`, requireAuth, (req, res) => {
    let data = getCachedJSON(dataFiles[section]);
    let newRecord;
    if (section === "price") {
      newRecord = {
        id: `${section}${Date.now()}`,
        name: req.body.name.trim(),
        price: parseFloat(req.body.price),
        numRatings: 0,
        totalRating: 0,
        averageRating: 0.1
      };
    } else if (section === "team") {
      const teamIcons = [
        "images/icons/1.png",
        "images/icons/2.png",
        "images/icons/3.png",
        "images/icons/4.png",
        "images/icons/5.png",
      ];
      const randomIcon = teamIcons[Math.floor(Math.random() * teamIcons.length)];
      newRecord = {
        id: `${section}${Date.now()}`,
        name: req.body.name.trim(),
        role: req.body.role.trim(),
        bio: req.body.bio.trim(),
        icon: randomIcon
      };
    } else {
      newRecord = {
        id: `${section}${Date.now()}`,
        title: req.body.title.trim(),
        content: req.body.content.trim()
      };
    }
    data.push(newRecord);
    updateJSON(dataFiles[section], data);
    res.redirect(`/manage-${section}`);
  });

  app.post(`/data/${section}/edit`, requireAuth, (req, res) => {
    let data = getCachedJSON(dataFiles[section]);
    let record = data.find(item => item.id === req.body.id);
    if (record) {
      if (section === "price") {
        record.name = req.body.name.trim();
        record.price = parseFloat(req.body.price);
      } else if (section === "team") {
        record.name = req.body.name.trim();
        record.role = req.body.role.trim();
        record.bio = req.body.bio.trim();
      } else {
        record.title = req.body.title.trim();
        record.content = req.body.content.trim();
      }
      updateJSON(dataFiles[section], data);
      res.redirect(`/manage-${section}`);
    } else {
      res.status(404).send("Запис не знайдено.");
    }
  });

  app.post(`/data/${section}/delete`, requireAuth, (req, res) => {
    let data = getCachedJSON(dataFiles[section]);
    const filteredData = data.filter(item => item.id !== req.body.id);
    updateJSON(dataFiles[section], filteredData);
    res.redirect(`/manage-${section}`);
  });
});

// =============================
// 20. Головна сторінка
// =============================
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="uk">
      <head>
        <meta charset="UTF-8">
        <title>Художник Всесвіту</title>
        <link rel="stylesheet" href="https://www.w3schools.com/w3css/4/w3.css">
        <style>
          .language-switcher {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin: 20px;
          }
          .language-switcher a {
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 50px;
            height: 50px;
            border-radius: 50%;
            background: linear-gradient(135deg, #4b0082, #6a0dad);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          .language-switcher a:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 12px rgba(0, 0, 0, 0.5);
          }
          .language-switcher i {
            color: #fff;
            font-size: 24px;
          }
        </style>
      </head>
      <body>
        <h1>Ласкаво просимо до Художника Всесвіту!</h1>
        <p>Сайт для художника з можливістю завантаження артів та управління жанрами.</p>
      </body>
    </html>
  `);
});

// =============================
// 21. Маршрут виходу (logout)
// =============================
app.get("/logout", (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        console.error("Помилка знищення сесії:", err);
      }
      res.redirect("/");
    });
  } else {
    res.redirect("/");
  }
});

// =============================
// 22. Запуск серверу
// =============================
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// =============================
// 23. API та система рейтингу для прайс‑листу
// =============================
app.post("/price/rate", (req, res) => {
  const packageId = req.body.id;
  const rating = parseFloat(req.body.rating);
  if (!packageId || isNaN(rating) || rating < 0.1 || rating > 10.0) {
    return res.status(400).send("Некоректні дані.");
  }
  if (!req.session.ratedPrices) {
    req.session.ratedPrices = {};
  }
  if (req.session.ratedPrices[packageId]) {
    return res.status(403).send("Ви вже оцінили цей пакет.");
  }
  let priceData = [];
  try {
    const data = fs.readFileSync(dataFiles.price, "utf8");
    priceData = JSON.parse(data);
  } catch (err) {
    console.error("Помилка зчитування price.json:", err);
    return res.status(500).send("Сервіс недоступний");
  }
  const pkg = priceData.find(p => p.id === packageId);
  if (!pkg) {
    return res.status(404).send("Пакет не знайдено.");
  }
  pkg.numRatings = (pkg.numRatings || 0) + 1;
  pkg.totalRating = (pkg.totalRating || 0) + rating;
  pkg.averageRating = parseFloat((pkg.totalRating / pkg.numRatings).toFixed(1));
  try {
    fs.writeFileSync(dataFiles.price, JSON.stringify(priceData, null, 2));
  } catch (err) {
    console.error("Помилка запису price.json:", err);
    return res.status(500).send("Сервіс недоступний");
  }
  req.session.ratedPrices[packageId] = true;
  res.json({ averageRating: pkg.averageRating });
});

app.post("/data/accounts/add", requireAuth, (req, res) => {
  // Only admin can add accounts
  if (!req.session.user || req.session.user.accessLevel !== "admin") {
    return res.status(403).send("Доступ заборонено.");
  }
  let accounts = [];
  try {
    const data = fs.readFileSync(path.join(__dirname, "secure-data", "accounts.json"), "utf8");
    accounts = JSON.parse(data);
  } catch (err) {
    console.error("Помилка зчитування accounts.json:", err);
  }
  const body = req.body;
  const allowedRoles = ["артист", "модератор", "адміністратор"];
  const allowedAccess = ["artist", "moderator", "admin"];
  if (
    !body.login || !body.password || !body.role || !body.accessLevel || !body.rank ||
    !allowedRoles.includes(body.role.trim().toLowerCase()) ||
    !allowedAccess.includes(body.accessLevel.trim().toLowerCase())
  ) {
    return res.status(400).send("Всі поля обов'язкові та мають бути коректними.");
  }
  if (accounts.some(acc => acc.login === body.login.trim())) {
    return res.status(400).send("Такий логін вже існує.");
  }
  const newAccount = {
    login: body.login.trim(),
    password: body.password.trim(),
    role: body.role.trim(),
    accessLevel: body.accessLevel.trim(),
    rank: body.rank.trim()
  };
  accounts.push(newAccount);
  try {
    fs.writeFileSync(path.join(__dirname, "secure-data", "accounts.json"), JSON.stringify(accounts, null, 2));
    console.log("Новий акаунт додано:", newAccount);
  } catch (err) {
    console.error("Помилка запису accounts.json:", err);
    return res.status(500).send("Помилка запису.");
  }
  res.status(200).json({ success: true });
});

app.post("/data/accounts/edit", requireAuth, (req, res) => {
  let accounts = [];
  try {
    const data = fs.readFileSync(accountsPath, "utf8");
    accounts = JSON.parse(data);
  } catch (err) {
    console.error("Помилка зчитування accounts.json:", err);
  }
  const account = accounts.find(acc => acc.login === req.body.login.trim());
  if (account) {
    account.password = req.body.password ? req.body.password.trim() : account.password;
    account.role = req.body.role.trim();
    account.accessLevel = req.body.accessLevel.trim();
    account.rank = req.body.rank.trim();
    try {
      fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
      console.log("Акаунт оновлено:", account);
    } catch (err) {
      console.error("Помилка запису accounts.json:", err);
    }
    res.redirect("/manage-accounts");
  } else {
    res.status(404).send("Акаунт не знайдено.");
  }
});

app.post("/data/accounts/delete", requireAuth, (req, res) => {
  let accounts = [];
  try {
    const data = fs.readFileSync(accountsPath, "utf8");
    accounts = JSON.parse(data);
  } catch (err) {
    console.error("Помилка зчитування accounts.json:", err);
  }
  const filteredAccounts = accounts.filter(acc => acc.login !== req.body.login.trim());
  try {
    fs.writeFileSync(accountsPath, JSON.stringify(filteredAccounts, null, 2));
    console.log("Акаунт видалено:", req.body.login.trim());
  } catch (err) {
    console.error("Помилка запису accounts.json:", err);
  }
  res.redirect("/manage-accounts");
});

// Validate all JSON files on startup
Object.values(dataFiles).forEach(validateJSONFile);
validateJSONFile(artInfoPath);
validateJSONFile(accountsPath);

function validateJSONFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    const parsedData = JSON.parse(data);
    if (!Array.isArray(parsedData)) {
      throw new Error("JSON is not an array");
    }
    console.log(`Файл ${filePath} валідний.`);
  } catch (err) {
    console.error(`Помилка у файлі ${filePath}:`, err);
  }
}

// Validate accounts.json on startup
validateJSONFile(accountsPath);

validateJSONFile(dataFiles.team);

// Route for submitting complaints or applications
app.post("/submit-message", (req, res) => {
  const { type, name, discordName, age, description, position, reason, experience, complaint } = req.body;

  if (type === "complaint") {
    if (!complaint || complaint.trim().length > 1500) {
      return res.status(400).send("Скарга повинна містити до 1500 символів.");
    }

    const sanitizedComplaint = sanitizeInput(complaint.trim());
    const complaints = JSON.parse(fs.readFileSync(complaintsPath, "utf8"));
    complaints.push({ id: `${Date.now()}`, complaint: sanitizedComplaint, response: null });
    fs.writeFileSync(complaintsPath, JSON.stringify(complaints, null, 2));
    return res.send("Скарга успішно відправлена.");
  }

  if (type === "application") {
    if (!name || !discordName || !age || !description || !position || !reason || !experience) {
      return res.status(400).send("Всі поля анкети обов'язкові.");
    }
    if (description.trim().length > 1000) {
      return res.status(400).send("Опис про себе повинен містити до 1000 символів.");
    }

    // Check if user can re-submit
    const applications = JSON.parse(fs.readFileSync(applicationsPath, "utf8"));
    const userApps = applications.filter(a => a.discordName === discordName.trim());
    if (userApps.length > 0) {
      const lastApp = userApps[userApps.length - 1];
      if (
        lastApp.response === "Відхилено" &&
        lastApp.responseDate &&
        Date.now() - lastApp.responseDate < 3 * 24 * 60 * 60 * 1000
      ) {
        return res.status(403).send("Ваша попередня анкета була відхилена. Ви зможете подати нову через 3 дні після відмови.");
      }
    }

    const sanitizedApplication = {
      id: `${Date.now()}`,
      name: sanitizeInput(name.trim()),
      discordName: sanitizeInput(discordName.trim()),
      age: sanitizeInput(age.trim()),
      description: sanitizeInput(description.trim()),
      position: sanitizeInput(position.trim()),
      reason: sanitizeInput(reason.trim()),
      experience: sanitizeInput(experience.trim()),
      response: null,
      responseDate: null
    };

    applications.push(sanitizedApplication);
    fs.writeFileSync(applicationsPath, JSON.stringify(applications, null, 2));
    return res.send("Анкета успішно відправлена.");
  }

  res.status(400).send("Невірний тип повідомлення.");
});

// Admin panel for managing complaints and applications
app.get("/manage-messages", requireAuth, (req, res) => {
  if (req.session.user.accessLevel !== "admin") {
    return res.status(403).send("Доступ заборонено.");
  }

  const complaints = JSON.parse(fs.readFileSync(complaintsPath, "utf8"));
  const applications = JSON.parse(fs.readFileSync(applicationsPath, "utf8"));

  let html = `
    <!DOCTYPE html>
    <html lang="uk">
      <head>
        <meta charset="UTF-8">
        <title>Управління повідомленнями</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .message { border: 1px solid #ccc; padding: 10px; margin-bottom: 20px; border-radius: 5px; }
          .message h3 { margin: 0 0 10px; }
          .message p { margin: 5px 0; }
          .response-form { margin-top: 10px; }
          textarea { width: 100%; height: 80px; margin-bottom: 10px; }
          button { padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer; }
          button:hover { background: #0056b3; }
        </style>
      </head>
      <body>
        <h1>Управління повідомленнями</h1>
        <h2>Скарги</h2>
  `;

  complaints.forEach(complaint => {
    html += `
      <div class="message">
        <h3>Скарга #${complaint.id}</h3>
        <p>${complaint.complaint}</p>
        <p><strong>Відповідь:</strong> ${complaint.response || "Немає відповіді"}</p>
        <form class="response-form" method="POST" action="/respond-message">
          <input type="hidden" name="id" value="${complaint.id}">
          <textarea name="response" placeholder="Напишіть відповідь (до 950 символів)" maxlength="950"></textarea>
          <button type="submit">Відповісти</button>
        </form>
      </div>
    `;
  });

  html += `
        <h2>Анкети</h2>
  `;

  applications.forEach(application => {
    html += `
      <div class="message">
        <h3>Анкета #${application.id}</h3>
        <p><strong>Ім'я:</strong> ${application.name}</p>
        <p><strong>Ім'я в Discord:</strong> ${application.discordName}</p>
        <p><strong>Вік:</strong> ${application.age}</p>
        <p><strong>Опис:</strong> ${application.description}</p>
        <p><strong>Посада:</strong> ${application.position}</p>
        <p><strong>Чому ця посада:</strong> ${application.reason}</p>
        <p><strong>Досвід:</strong> ${application.experience}</p>
        <p><strong>Відповідь:</strong> ${application.response || "Немає відповіді"}</p>
        <form class="response-form" method="POST" action="/respond-message">
          <input type="hidden" name="id" value="${application.id}">
          <textarea name="response" placeholder="Напишіть відповідь (до 950 символів)" maxlength="950"></textarea>
          <button type="submit">Відповісти</button>
        </form>
      </div>
    `;
  });

  html += `
      </body>
    </html>
  `;

  res.send(html);
});

// Route for responding to complaints or applications
app.post("/respond-message", requireAuth, (req, res) => {
  if (req.session.user.accessLevel !== "admin") {
    return res.status(403).send("Доступ заборонено.");
  }

  const { id, response } = req.body;
  if (!id || !response || response.trim().length > 950) {
    return res.status(400).send("Відповідь повинна містити до 950 символів.");
  }

  const sanitizedResponse = sanitizeInput(response.trim());

  let complaints = JSON.parse(fs.readFileSync(complaintsPath, "utf8"));
  let applications = JSON.parse(fs.readFileSync(applicationsPath, "utf8"));

  let message = complaints.find(c => c.id === id) || applications.find(a => a.id === id);
  if (!message) {
    return res.status(404).send("Повідомлення не знайдено.");
  }

  message.response = sanitizedResponse;

  if (complaints.some(c => c.id === id)) {
    fs.writeFileSync(complaintsPath, JSON.stringify(complaints, null, 2));
  } else {
    fs.writeFileSync(applicationsPath, JSON.stringify(applications, null, 2));
  }

  res.redirect("/manage-messages");
});

// API endpoint to accept/reject complaints/applications (from mod.json/problm.json)
app.post('/api/manage-messages/respond', requireAuth, (req, res) => {
  if (!req.session.user || req.session.user.accessLevel !== "admin") {
    return res.status(403).json({ error: "Доступ заборонено." });
  }
  const { id, response } = req.body;
  if (!id || !response) {
    return res.status(400).json({ error: "Некоректні дані." });
  }
  let updated = false;
  const now = Date.now();

  // Use absolute paths for reading/writing files
  const problmPath = path.resolve(__dirname, "problm.json");
  const modPath = path.resolve(__dirname, "mod.json");

  // Complaints
  let complaints = [];
  try {
    complaints = JSON.parse(fs.readFileSync(problmPath, "utf8"));
  } catch (err) {
    console.error("Помилка зчитування problm.json:", err);
    complaints = [];
  }
  complaints = complaints.map(complaint => {
    if (complaint.id === id) {
      complaint.response = response;
      complaint.responseDate = now;
      updated = true;
    }
    return complaint;
  });
  if (updated) {
    try {
      fs.writeFileSync(problmPath, JSON.stringify(complaints, null, 2));
    } catch (err) {
      console.error("Помилка запису problm.json:", err);
      return res.status(500).json({ error: "Помилка запису файлу." });
    }
  }

  // Applications
  let applications = [];
  try {
    applications = JSON.parse(fs.readFileSync(modPath, "utf8"));
  } catch (err) {
    console.error("Помилка зчитування mod.json:", err);
    applications = [];
  }
  applications = applications.map(application => {
    if (application.id === id) {
      application.response = response;
      application.responseDate = now;
      updated = true;
    }
    return application;
  });
  if (updated) {
    try {
      fs.writeFileSync(modPath, JSON.stringify(applications, null, 2));
    } catch (err) {
      console.error("Помилка запису mod.json:", err);
      return res.status(500).json({ error: "Помилка запису файлу." });
    }
  }

  if (!updated) {
    console.warn(`Повідомлення з id=${id} не знайдено.`);
    return res.status(404).json({ error: "Повідомлення не знайдено." });
  }

  res.json({ success: true });
});

// Middleware to hide `.html` extensions in URLs
app.use((req, res, next) => {
  if (req.url.endsWith(".html")) {
    res.redirect(req.url.slice(0, -5));
  } else {
    next();
  }
});

// API endpoint for manage-messages.html data (mod.json, problm.json, accounts.json)
app.get('/api/manage-messages-data', requireAuth, (req, res) => {
  if (!req.session.user || req.session.user.accessLevel !== "admin") {
    // Important: respond with 401 for AJAX, not a redirect!
    return res.status(401).json({ error: "Доступ заборонено." });
  }
  let admins = [];
  try {
    admins = JSON.parse(fs.readFileSync(path.join(__dirname, "secure-data", "accounts.json"), "utf8"));
  } catch (err) {
    admins = [];
  }
  let complaints = [];
  try {
    complaints = JSON.parse(fs.readFileSync(path.join(__dirname, "problm.json"), "utf8"));
  } catch (err) {
    complaints = [];
  }
  let applications = [];
  try {
    applications = JSON.parse(fs.readFileSync(path.join(__dirname, "mod.json"), "utf8"));
  } catch (err) {
    applications = [];
  }
  // Add current user info for client-side access check
  res.json({ admins, complaints, applications, currentUser: req.session.user });
});

// =============================
// 24. Application status check for users
// =============================
app.get("/application-status", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="uk">
      <head>
        <meta charset="UTF-8">
        <title>Статус анкети</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f4f7f8; padding: 40px; }
          .container { max-width: 400px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 30px; }
          h1 { text-align: center; }
          form { display: flex; flex-direction: column; gap: 15px; }
          input[type="text"] { padding: 10px; border-radius: 5px; border: 1px solid #ccc; }
          button { padding: 10px; border-radius: 5px; background: #6a0dad; color: #fff; border: none; cursor: pointer; }
          button:hover { background: #4b0082; }
          .status { margin-top: 20px; padding: 15px; border-radius: 5px; background: #f0f0f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Перевірка статусу анкети</h1>
          <form method="POST" action="/application-status">
            <label for="discordName">Введіть ваш Discord нік:</label>
            <input type="text" id="discordName" name="discordName" required>
            <button type="submit">Перевірити</button>
          </form>
        </div>
      </body>
    </html>
  `);
});

app.post("/application-status", (req, res) => {
  const discordName = req.body.discordName ? req.body.discordName.trim() : "";
  if (!discordName) {
    return res.send(`
      <p>Будь ласка, введіть ваш Discord нік.</p>
      <a href="/application-status">Назад</a>
    `);
  }
  let applications = [];
  try {
    applications = JSON.parse(fs.readFileSync(applicationsPath, "utf8"));
  } catch (err) {
    applications = [];
  }
  // Find the latest application by this discordName
  const userApps = applications.filter(a => a.discordName === discordName);
  if (userApps.length === 0) {
    return res.send(`
      <p>Анкету з таким Discord ніком не знайдено.</p>
      <a href="/application-status">Назад</a>
    `);
  }
  const lastApp = userApps[userApps.length - 1];
  let statusText = "Очікує розгляду";
  if (lastApp.response) {
    if (lastApp.response.toLowerCase().includes("відхилено")) {
      statusText = `<span style="color:#c00;">Відхилено</span>: ${lastApp.response}`;
    } else if (lastApp.response.toLowerCase().includes("прийнято") || lastApp.response.toLowerCase().includes("прийнята")) {
      statusText = `<span style="color:#090;">Прийнято</span>: ${lastApp.response}`;
    } else {
      statusText = `<span style="color:#007bff;">Відповідь</span>: ${lastApp.response}`;
    }
  }
  res.send(`
    <!DOCTYPE html>
    <html lang="uk">
      <head>
        <meta charset="UTF-8">
        <title>Статус анкети</title>
        <style>
          body { font-family: Arial, sans-serif; background: #f4f7f8; padding: 40px; }
          .container { max-width: 400px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 30px; }
          h1 { text-align: center; }
          .status { margin-top: 20px; padding: 15px; border-radius: 5px; background: #f0f0f0; }
          a { display: inline-block; margin-top: 20px; color: #6a0dad; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Статус анкети</h1>
          <div class="status">
            <strong>Ваш Discord нік:</strong> ${discordName}<br>
            <strong>Статус:</strong> ${statusText}
          </div>
          <a href="/application-status">Перевірити інший нік</a>
        </div>
      </body>
    </html>
  `);
});

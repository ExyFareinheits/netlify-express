// Виконується після завантаження DOM
document.addEventListener("DOMContentLoaded", function () {
  loadGalleryFromJSON();
});

function loadGalleryFromJSON() {
  fetch("/api/art-info")
    .then(response => {
      if (!response.ok) {
        throw new Error(`Не вдалося завантажити дані: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data) || data.length === 0) {
        console.error("Дані арту порожні або мають неправильний формат.");
        return;
      }

      // Спочатку оновлюємо селект із жанрами відповідно до наявних даних
      updateCategoryFilter(data);

      const galleryContainer = document.getElementById("gallery");
      if (!galleryContainer) {
        console.error("Контейнер галереї не знайдено.");
        return;
      }
      galleryContainer.innerHTML = "";

      // Створюємо HTML для кожного арту
      data.forEach(item => {
        if (!item.file || !item.title || !item.category) {
          console.warn("Пропущено запис через відсутність необхідних даних:", item);
          return;
        }
        const artHTML = `
          <div class="w3-third gallery-item" data-id="${item.id}" data-category="${item.category}">
            <img src="${item.file}" alt="${item.title}" class="w3-image w3-round">
            <p class="w3-text-white">${item.title}</p>
          </div>
        `;
        galleryContainer.insertAdjacentHTML("beforeend", artHTML);
      });

      // Призначаємо обробник кліку для відкриття модального вікна
      const galleryItems = document.querySelectorAll(".gallery-item");
      galleryItems.forEach(item => {
        item.addEventListener("click", function () {
          const artId = item.getAttribute("data-id");
          openArtModal(artId);
        });
      });

      // Після завантаження і побудови елементів застосовуємо фільтрацію за вибраним жанром
      const categoryFilter = document.getElementById("categoryFilter");
      if (categoryFilter) {
        filterGallery();
      }
    })
    .catch(error => {
      console.error("Помилка завантаження арту:", error);
      const galleryContainer = document.getElementById("gallery");
      if (galleryContainer) {
        galleryContainer.innerHTML = `<p class="w3-text-red">Не вдалося завантажити галерею. Спробуйте пізніше.</p>`;
      }
    });
}

function updateCategoryFilter(data) {
  // Об'єкт для підрахунку кількості арту за категорією
  const categoryCounts = {};
  data.forEach(item => {
    const cat = item.category.toLowerCase();
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  
  const categoryFilter = document.getElementById("categoryFilter");
  if (!categoryFilter) return;
  categoryFilter.innerHTML = "";
  
  // Створюємо перший елемент: "Всі жанри"
  const allOption = document.createElement("option");
  allOption.value = "all";
  allOption.textContent = "Всі жанри (" + data.length + ")";
  categoryFilter.appendChild(allOption);
  
  // Для кожного унікального жанру створюємо опцію із зазначенням кількості
  Object.keys(categoryCounts).forEach(cat => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = formatCategoryName(cat) + " (" + categoryCounts[cat] + ")";
    categoryFilter.appendChild(option);
  });
  
  // Додаємо обробник зміни
  if (!categoryFilter.hasAttribute("data-listener")) {
    categoryFilter.addEventListener("change", filterGallery);
    categoryFilter.setAttribute("data-listener", "true");
  }
}

function formatCategoryName(cat) {
  // Спеціальний випадок для NSFW
  if (cat.toLowerCase() === "nsfw") return "NSFW";
  // Замінюємо дефіси на пробіли та капіталізуємо кожне слово
  return cat.split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
}

function filterGallery() {
  const selectedGenre = document.getElementById("categoryFilter").value.toLowerCase();
  const galleryItems = document.querySelectorAll(".gallery-item");
  galleryItems.forEach(item => {
    const itemGenre = item.getAttribute("data-category").toLowerCase();
    if (selectedGenre === "all" || itemGenre === selectedGenre) {
      item.style.display = "block";
    } else {
      item.style.display = "none";
    }
  });
}

function openArtModal(artId) {
  fetch("/api/art-info")
    .then(response => response.json())
    .then(data => {
      const art = data.find(a => a.id === artId);
      if (art) {
        let modalContent = `<h2>${art.title}</h2>`;
        if (art.author && art.author.trim() !== "") {
          modalContent += `<p><strong>Автор:</strong> ${art.author}</p>`;
        }
        if (art.description && art.description.trim() !== "") {
          modalContent += `<p>${art.description}</p>`;
        }
        if (art.category && art.category.trim() !== "") {
          modalContent += `<p><strong>Жанр:</strong> ${formatCategoryName(art.category)}</p>`;
        }
        modalContent += `<img src="${art.file}" alt="${art.title}" id="artModalImage">`;
        
        // Оновлюємо вміст модального вікна (залишаємо кнопку закриття)
        document.getElementById("artModalContent").innerHTML = `
          <span id="artModalClose" class="w3-button w3-display-topright">&times;</span>
          ${modalContent}
        `;
        document.getElementById("artModal").style.display = "block";

        // Додаємо обробник для кнопки закриття
        const closeButton = document.getElementById("artModalClose");
        if (closeButton) {
          closeButton.addEventListener("click", closeArtModal);
        }
      }
    })
    .catch(error => console.error("Помилка відкриття модального вікна:", error));
}

function closeArtModal() {
  const modal = document.getElementById("artModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// Додатково: закриття модального вікна при кліку поза його вмістом
window.addEventListener("click", function (event) {
  const modal = document.getElementById("artModal");
  if (modal && event.target === modal) {
    closeArtModal();
  }
});

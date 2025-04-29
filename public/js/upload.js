// js/upload.js
document.addEventListener("DOMContentLoaded", function () {
  const artFileInput = document.getElementById("artFileInput");
  const uploadForm = document.getElementById("uploadForm");

  if (artFileInput) {
    artFileInput.addEventListener("change", previewArtImage);
  }

  if (uploadForm) {
    uploadForm.addEventListener("submit", submitUpload);
  }
});

// === Popup system with animation (reuse from price.js if already loaded) ===
(function() {
  if (!window.showPopup) {
    function showPopup(message, type = "info") {
      let popup = document.getElementById("custom-popup");
      if (!popup) {
        popup = document.createElement("div");
        popup.id = "custom-popup";
        popup.style.position = "fixed";
        popup.style.top = "30px";
        popup.style.left = "50%";
        popup.style.transform = "translateX(-50%) scale(0.95)";
        popup.style.zIndex = "9999";
        popup.style.minWidth = "280px";
        popup.style.maxWidth = "90vw";
        popup.style.background = "#fff";
        popup.style.color = "#222";
        popup.style.boxShadow = "0 8px 32px rgba(0,0,0,0.25)";
        popup.style.borderRadius = "10px";
        popup.style.padding = "22px 28px 18px 28px";
        popup.style.fontSize = "1.15em";
        popup.style.textAlign = "center";
        popup.style.display = "none";
        popup.style.opacity = "0";
        popup.style.transition = "opacity 0.25s cubic-bezier(.4,0,.2,1), transform 0.25s cubic-bezier(.4,0,.2,1)";
        popup.innerHTML = `<span id="popup-message"></span>
          <button id="popup-close" style="margin-top:12px;padding:6px 18px;border:none;border-radius:6px;background:#6a0dad;color:#fff;cursor:pointer;">OK</button>`;
        document.body.appendChild(popup);
        document.getElementById("popup-close").onclick = () => hidePopup();
      }
      popup.style.border = type === "error" ? "2px solid #c00" : (type === "success" ? "2px solid #090" : "2px solid #6a0dad");
      popup.style.background = type === "error" ? "#ffeaea" : (type === "success" ? "#eaffea" : "#f7f3ff");
      popup.style.color = "#222";
      document.getElementById("popup-message").innerHTML = message;
      popup.style.display = "block";
      setTimeout(() => {
        popup.style.opacity = "1";
        popup.style.transform = "translateX(-50%) scale(1)";
      }, 10);

      if (type !== "error") {
        if (window._popupTimeout) clearTimeout(window._popupTimeout);
        window._popupTimeout = setTimeout(() => hidePopup(), 3000);
      }
    }
    function hidePopup() {
      let popup = document.getElementById("custom-popup");
      if (popup) {
        popup.style.opacity = "0";
        popup.style.transform = "translateX(-50%) scale(0.95)";
        setTimeout(() => {
          popup.style.display = "none";
        }, 250);
      }
    }
    window.showPopup = showPopup;
  }
})();

function previewArtImage(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Перевірка, чи вибраний файл є зображенням
  if (!file.type.startsWith("image/")) {
    showPopup("Будь ласка, виберіть зображення (PNG/JPG).", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    let previewContainer = document.getElementById("previewContainer");

    // Якщо контейнер попереднього перегляду не існує, створюємо його
    if (!previewContainer) {
      previewContainer = document.createElement("div");
      previewContainer.id = "previewContainer";
      previewContainer.style.marginTop = "15px";
      // Додаємо контейнер після input поля
      artFileInput.parentNode.appendChild(previewContainer);
    }

    // Створюємо елемент img для попереднього перегляду
    previewContainer.innerHTML = ""; // Очищення попередніх зображень
    const img = document.createElement("img");
    img.src = e.target.result;
    img.alt = "Попередній перегляд";
    img.style.maxWidth = "200px";
    img.style.borderRadius = "5px";
    previewContainer.appendChild(img);
  };

  reader.readAsDataURL(file);
}

function submitUpload(event) {
  event.preventDefault(); // Зупиняє стандартну відправку форми

  const formData = new FormData(event.target);
  const artTitle = formData.get("artTitle");
  const artCategory = formData.get("artCategory");

  // Відправка на Netlify Function
  fetch("/api/upload", {
    method: "POST",
    body: formData,
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showPopup(`Арт з назвою "${artTitle}" у жанрі "${artCategory}" успішно завантажено!`, "success");
        event.target.reset();
        const previewContainer = document.getElementById("previewContainer");
        if (previewContainer) {
          previewContainer.innerHTML = "";
        }
      } else {
        showPopup(data.message || "Сталася помилка при завантаженні.", "error");
      }
    })
    .catch(() => {
      showPopup("Сталася помилка при з'єднанні з сервером.", "error");
    });
}

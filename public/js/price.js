console.log("Скрипт завантаження даних для прайс‑листа запущено."); // Debugging log

// Функція повертає клас бейджа залежно від середнього рейтингу
function getBadgeClass(rating) {
  if (rating >= 8.0) {
    return "w3-green";
  } else if (rating >= 5.0) {
    return "w3-orange";
  } else {
    return "w3-red";
  }
}

// === Popup system with animation ===
(function() {
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
    // Animate in
    setTimeout(() => {
      popup.style.opacity = "1";
      popup.style.transform = "translateX(-50%) scale(1)";
    }, 10);

    // Auto-close after 3s for info/success
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

  // Глобально доступно для інших сторінок/скриптів
  window.showPopup = showPopup;
})();

// Функція, що надсилає оцінку через POST запит до /price/rate
function ratePackage(packageId) {
  // Prevent double rating
  if (window._ratingInProgress) return;
  window._ratingInProgress = true;
  let userRating = prompt("Введіть вашу оцінку (від 0.1 до 10.0):");
  if (!userRating) {
    window._ratingInProgress = false;
    return;
  }
  userRating = parseFloat(userRating);
  if (isNaN(userRating) || userRating < 0.1 || userRating > 10.0) {
    showPopup("Невірна оцінка. Будь ласка, введіть число від 0.1 до 10.0.", "error");
    window._ratingInProgress = false;
    return;
  }
  fetch("/price/rate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ id: packageId, rating: userRating })
  })
  .then(response => {
    if (!response.ok) {
      return response.text().then(text => { throw new Error(text) });
    }
    return response.json();
  })
  .then(data => {
    // Оновлюємо бейдж рейтингу для цього пакета
    const badge = document.querySelector(`#rating-${packageId}`);
    if (badge) {
      badge.textContent = Number(data.averageRating).toFixed(1);
      badge.className = "w3-badge " + getBadgeClass(data.averageRating) + " w3-xlarge";
    }
    showPopup("Дякуємо за оцінку!", "success");
  })
  .catch(error => {
    showPopup("Помилка: " + error.message, "error");
    console.error("Помилка:", error);
  })
  .finally(() => {
    window._ratingInProgress = false;
  });
}

// Завантаження даних з price.json
fetch("price.json")
  .then(response => {
    if (!response.ok) {
      throw new Error("Сталася помилка: " + response.status);
    }
    return response.json();
  })
  .then(data => {
    let contentHTML = "";
    data.forEach(item => {
      // Якщо ще не було голосувань, використовуємо стандартне значення 0.1
      let rating = item.averageRating ? parseFloat(item.averageRating) : 0.1;
      let badgeClass = getBadgeClass(rating);
      contentHTML += `
        <div class="w3-row w3-margin-bottom">
          <div class="w3-col m8 s12">
            <h3>${item.name}</h3>
            <p>Ціна: ${item.price} грн</p>
          </div>
          <div class="w3-col m4 s12 w3-right-align">
            <span id="rating-${item.id}" class="w3-badge ${badgeClass} w3-xlarge" title="Середня оцінка покупки">
              ${Number(rating).toFixed(1)}
            </span>
            <br>
            <button class="w3-button w3-small w3-green rate-btn" data-id="${item.id}">Оцінити</button>
          </div>
        </div>
        <hr>
      `;
    });
    document.getElementById("priceContent").innerHTML = contentHTML;

    // Додаємо обробники подій для кнопок "Оцінити"
    document.querySelectorAll('.rate-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        ratePackage(this.getAttribute('data-id'));
      });
    });
  })
  .catch(error => {
    console.error("Помилка завантаження даних:", error);
    showPopup("Помилка завантаження даних.", "error");
    document.getElementById("priceContent").innerHTML = "<p>Помилка завантаження даних.</p>";
  });

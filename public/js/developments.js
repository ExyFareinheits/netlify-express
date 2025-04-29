console.log("Скрипт завантаження даних про розробки запущено."); // Debugging log

fetch('/api/developments')
  .then(response => {
    console.log("Отримано відповідь від API:", response); // Debugging log
    if (!response.ok) {
      throw new Error("Помилка при завантаженні даних про розробки: " + response.status + " " + response.statusText);
    }
    return response.json();
  })
  .then(data => {
    console.log("Отримані дані:", data); // Debugging log
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("Дані про розробки відсутні або некоректні.");
    }
    let html = '';
    data.forEach(dev => {
      html += `
        <div class="w3-container w3-border-bottom w3-padding">
          <h3>${dev.title || "Без назви"}</h3>
          <p>${dev.content || "Опис відсутній"}</p>
        </div>
      `;
    });
    document.getElementById('developmentsContent').innerHTML = html;
  })
  .catch(err => {
    console.error("Помилка завантаження даних:", err); // Debugging log
    document.getElementById('developmentsContent').innerHTML = `<p>Помилка: ${err.message}</p>`;
  });

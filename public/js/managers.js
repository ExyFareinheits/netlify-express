console.log("Скрипт завантаження даних про менеджерів запущено."); // Debugging log

fetch('/api/managers')
  .then(response => {
    console.log("Отримано відповідь від API:", response); // Debugging log
    if (!response.ok) {
      throw new Error("Сталася помилка при завантаженні даних: " + response.status + " " + response.statusText);
    }
    return response.json();
  })
  .then(data => {
    console.log("Отримані дані:", data); // Debugging log
    let html = '<ul class="w3-ul">';
    data.forEach(manager => {
      html += `<li><i class="fa fa-user"></i> ${manager.title || "Без назви"} – ${manager.content || "Опис відсутній"}</li>`;
    });
    html += '</ul>';
    document.getElementById('managersContent').innerHTML = html;
  })
  .catch(err => {
    console.error("Помилка завантаження даних:", err); // Debugging log
    document.getElementById('managersContent').innerHTML = `<p>Помилка: ${err.message}</p>`;
  });

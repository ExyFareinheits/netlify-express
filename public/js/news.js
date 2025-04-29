console.log("Скрипт завантаження даних про новини запущено."); // Debugging log

fetch('/api/news')
  .then(response => {
    console.log("Отримано відповідь від API:", response); // Debugging log
    if (!response.ok) {
      throw new Error("Сталася помилка при завантаженні новин: " + response.status + " " + response.statusText);
    }
    return response.json();
  })
  .then(data => {
    console.log("Отримані дані:", data); // Debugging log
    let html = '';
    data.forEach(newsItem => {
      html += `
        <article class="w3-container w3-border-bottom w3-padding">
          <h3>${newsItem.title || "Без назви"}</h3>
          <p>${newsItem.content || "Опис відсутній"}</p>
        </article>
      `;
    });
    document.getElementById('newsContent').innerHTML = html;
  })
  .catch(err => {
    console.error("Помилка завантаження даних:", err); // Debugging log
    document.getElementById('newsContent').innerHTML = `<p>Помилка: ${err.message}</p>`;
  });

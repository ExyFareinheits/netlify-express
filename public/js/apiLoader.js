(function() {
    // Отримуємо ім'я поточної сторінки (без розширення)
    var pathParts = window.location.pathname.split('/');
    var fileName = pathParts[pathParts.length - 1] || "index.html";
    var pageName = fileName.replace('.html', '');
    console.log("Поточна сторінка:", pageName); // Debugging log

    // За замовчуванням контейнер має id = [pageName]Content
    var containerId = pageName + "Content";
    var container = document.getElementById(containerId);
    if (!container) {
      console.warn("Не знайдено контейнер із id '" + containerId + "'.");
      return;
    }

    // Формуємо API-URL: припускаємо, що дані для сторінки team.html завантажуються із /api/team, 
    // для price.html – із /api/price і т. д.
    var endpoint = "/api/" + pageName;
    console.log("Формуємо запит до API:", endpoint); // Debugging log

    // Запит за допомогою Fetch API
    fetch(endpoint)
      .then(function(response) {
        console.log("Отримано відповідь від API:", response); // Debugging log
        if (!response.ok) {
          throw new Error("Помилка: " + response.status + " " + response.statusText);
        }
        return response.json();
      })
      .then(function(data) {
        console.log("Отримані дані:", data); // Debugging log
        // За замовчуванням виводимо дані як список (якщо data – масив)
        if (Array.isArray(data)) {
          var html = '<ul class="data-list">';
          data.forEach(function(item) {
            html += '<li>';
            if (item.title) {
              html += '<strong>' + item.title + '</strong>';
            }
            if (item.content) {
              html += ' – ' + item.content;
            }
            html += '</li>';
          });
          html += '</ul>';
          container.innerHTML = html;
        } else {
          container.innerHTML = "<pre>" + JSON.stringify(data, null, 2) + "</pre>";
        }
      })
      .catch(function(err) {
        console.error("Помилка завантаження даних:", err); // Debugging log
        container.innerHTML = "<p>Помилка: " + err.message + "</p>";
      });
})();

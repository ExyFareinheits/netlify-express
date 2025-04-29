console.log("Скрипт завантаження даних про команду запущено."); // Debugging log

fetch("/api/team")
  .then(response => {
    console.log("Отримано відповідь від API:", response); // Debugging log
    if (!response.ok) {
      throw new Error(`Сталася помилка: ${response.status} ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    console.log("Отримані дані:", data); // Debugging log
    let html = "";
    data.forEach(member => {
      html += `
        <li class="w3-bar">
          <div class="w3-bar-item">
            <span class="w3-large"><b>${member.name}</b></span><br>
            <span>${member.role || ""}</span><br>
            <span>${member.bio || ""}</span>
          </div>
        </li>
      `;
    });
    document.getElementById("teamList").innerHTML = html;
  })
  .catch(error => {
    console.error("Помилка завантаження даних:", error); // Debugging log
    document.getElementById("teamList").innerHTML = `<li>Помилка завантаження даних: ${error.message}</li>`;
  });

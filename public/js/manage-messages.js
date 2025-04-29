// Helper to escape HTML
  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/[&<>"']/g, function(m) {
      return ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
      })[m];
    });
  }

  // Load admins, complaints, and applications
  function loadData() {
    fetch('/api/manage-messages-data', {
      method: 'GET',
      credentials: 'include' // Ensure cookies/session are sent!
    })
      .then(response => {
        if (!response.ok) throw new Error('Не вдалося отримати дані');
        return response.json();
      })
      .then(data => {
        // Admins
        const adminsDiv = document.getElementById('admins');
        adminsDiv.innerHTML = '';
        (data.admins || []).forEach(admin => {
          adminsDiv.innerHTML += `
            <div class="admin-entry" data-login="${escapeHtml(admin.login)}">
              <h3>${escapeHtml(admin.login)}</h3>
              <p><strong>Роль:</strong> ${escapeHtml(admin.role)}</p>
              <p><strong>Рівень доступу:</strong> ${escapeHtml(admin.accessLevel)}</p>
              <p><strong>Звання:</strong> ${escapeHtml(admin.rank)}</p>
              <div class="admin-buttons">
                <button class="edit"><i class="fa fa-pencil"></i> Редагувати</button>
                <button class="delete"><i class="fa fa-trash"></i> Видалити</button>
              </div>
            </div>
          `;
        });

        // Complaints (problm.json)
        const complaintsDiv = document.getElementById('complaints');
        complaintsDiv.innerHTML = '';
        (data.complaints || []).forEach(complaint => {
          complaintsDiv.innerHTML += `
            <div class="message">
              <h3>Скарга #${escapeHtml(complaint.id)}</h3>
              <p>${escapeHtml(complaint.complaint)}</p>
              <p><strong>Статус:</strong> ${escapeHtml(complaint.response || "Очікує відповіді")}</p>
              <div class="manage-buttons">
                <button class="accept"><i class="fa fa-check"></i> Прийняти</button>
                <button class="reject"><i class="fa fa-times"></i> Відхилити</button>
              </div>
            </div>
          `;
        });

        // Applications (mod.json)
        const applicationsDiv = document.getElementById('applications');
        applicationsDiv.innerHTML = '';
        (data.applications || []).forEach(application => {
          applicationsDiv.innerHTML += `
            <div class="message">
              <h3>Анкета #${escapeHtml(application.id)}</h3>
              <p><strong>Ім'я:</strong> ${escapeHtml(application.name)}</p>
              <p><strong>Ім'я в Discord:</strong> ${escapeHtml(application.discordName)}</p>
              <p><strong>Вік:</strong> ${escapeHtml(application.age)}</p>
              <p><strong>Опис:</strong> ${escapeHtml(application.description)}</p>
              <p><strong>Посада:</strong> ${escapeHtml(application.position)}</p>
              <p><strong>Чому ця посада:</strong> ${escapeHtml(application.reason)}</p>
              <p><strong>Досвід:</strong> ${escapeHtml(application.experience)}</p>
              <p><strong>Статус:</strong> ${escapeHtml(application.response || "Очікує відповіді")}</p>
              <div class="manage-buttons">
                <button class="accept"><i class="fa fa-check"></i> Прийняти</button>
                <button class="reject"><i class="fa fa-times"></i> Відхилити</button>
              </div>
            </div>
          `;
        });
      })
      .catch(error => {
        document.getElementById('admins').innerHTML = '<div style="color:#fff;background:#c82333;padding:10px;border-radius:5px;">Помилка завантаження даних: ' + error.message + '</div>';
        document.getElementById('complaints').innerHTML = '';
        document.getElementById('applications').innerHTML = '';
      });
  }

  // CRUD for admins
  document.getElementById('addAdminForm').onsubmit = function(e) {
    e.preventDefault();
    // Double-check on client side (for UX, not security)
    fetch('/api/manage-messages-data', {
      method: 'GET',
      credentials: 'include'
    })
      .then(response => response.json())
      .then(data => {
        if (!data.currentUser || data.currentUser.accessLevel !== "admin") {
          alert('Додавати акаунти може лише адміністратор!');
          return;
        }
        const form = e.target;
        const dataToSend = {
          login: form.login.value,
          password: form.password.value,
          role: form.role.value,
          accessLevel: form.accessLevel.value,
          rank: form.rank.value
        };
        fetch('/data/accounts/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(dataToSend)
        })
        .then(res => {
          if (!res.ok) return res.text().then(t => { throw new Error(t); });
          form.reset();
          loadData();
        })
        .catch(err => alert('Помилка: ' + err.message));
      });
  };

  function editAdmin(login) {
    const entry = document.querySelector(`.admin-entry[data-login="${login}"]`);
    if (!entry) return;
    const role = entry.querySelector('p:nth-child(2)').textContent.replace('Роль: ', '');
    const accessLevel = entry.querySelector('p:nth-child(3)').textContent.replace('Рівень доступу: ', '');
    const rank = entry.querySelector('p:nth-child(4)').textContent.replace('Звання: ', '');
    entry.innerHTML = `
      <form class="admin-form" onsubmit="submitEditAdmin(event, '${login}')">
        <input type="text" name="login" value="${login}" readonly>
        <input type="password" name="password" placeholder="Новий пароль">
        <select name="role" required>
          <option value="артист" ${role === "артист" ? "selected" : ""}>Артист</option>
          <option value="модератор" ${role === "модератор" ? "selected" : ""}>Модератор</option>
          <option value="адміністратор" ${role === "адміністратор" ? "selected" : ""}>Адміністратор</option>
        </select>
        <select name="accessLevel" required>
          <option value="artist" ${accessLevel === "artist" ? "selected" : ""}>Артист</option>
          <option value="moderator" ${accessLevel === "moderator" ? "selected" : ""}>Модератор</option>
          <option value="admin" ${accessLevel === "admin" ? "selected" : ""}>Адміністратор</option>
        </select>
        <select name="rank" required>
          <option value="Junior Artist" ${rank === "Junior Artist" ? "selected" : ""}>Junior Artist</option>
          <option value="Artist" ${rank === "Artist" ? "selected" : ""}>Artist</option>
          <option value="Moderator" ${rank === "Moderator" ? "selected" : ""}>Moderator</option>
          <option value="Administrator" ${rank === "Administrator" ? "selected" : ""}>Administrator</option>
          <option value="Lead" ${rank === "Lead" ? "selected" : ""}>Lead</option>
        </select>
        <button type="submit"><i class="fa fa-save"></i> Зберегти</button>
      </form>
    `;
  }

  function submitEditAdmin(e, login) {
    e.preventDefault();
    const form = e.target;
    const data = {
      login: form.login.value,
      password: form.password.value,
      role: form.role.value,
      accessLevel: form.accessLevel.value,
      rank: form.rank.value
    };
    fetch('/data/accounts/edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(() => loadData());
  }

  function deleteAdmin(login) {
    if (!confirm('Видалити адміністратора?')) return;
    fetch('/data/accounts/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login })
    }).then(() => loadData());
  }

  // Respond to complaint/application and set response date
  function respondMessage(id, response) {
    fetch('/api/manage-messages/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // Ensure session/cookies are sent!
      body: JSON.stringify({ id, response })
    })
    .then(res => {
      if (!res.ok) return res.text().then(t => { throw new Error(t); });
      loadData();
    })
    .catch(err => alert('Помилка: ' + err.message));
  }

  // CRUD for admins (allow only admin-level users to see the form)
  function checkAdminAccess() {
    fetch('/api/manage-messages-data', {
      method: 'GET',
      credentials: 'include'
    })
      .then(response => {
        if (!response.ok) throw new Error('Не вдалося отримати дані');
        return response.json();
      })
      .then(data => {
        // Check if current user is admin (assume server returns current user info in data.currentUser)
        if (data.currentUser && data.currentUser.accessLevel === "admin") {
          document.getElementById('addAdminForm').style.display = '';
        } else {
          document.getElementById('addAdminForm').style.display = 'none';
        }
      })
      .catch(() => {
        document.getElementById('addAdminForm').style.display = 'none';
      });
  }

  // Instead of inline onclick, use event delegation for all dynamic buttons
  document.addEventListener('DOMContentLoaded', function () {
    loadData();
    checkAdminAccess();

    // Event delegation for admin edit/delete buttons
    document.getElementById('admins').addEventListener('click', function (e) {
      const entry = e.target.closest('.admin-entry');
      if (!entry) return;
      const login = entry.getAttribute('data-login');
      if (e.target.classList.contains('edit')) {
        editAdmin(login);
      } else if (e.target.classList.contains('delete')) {
        deleteAdmin(login);
      }
    });

    // Event delegation for accept/reject buttons (complaints/applications)
    document.getElementById('complaints').addEventListener('click', function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const messageDiv = btn.closest('.message');
      if (!messageDiv) return;
      const id = messageDiv.querySelector('h3').textContent.replace(/^\D+/, '');
      if (btn.classList.contains('accept')) {
        respondMessage(id, 'Прийнято');
      } else if (btn.classList.contains('reject')) {
        respondMessage(id, 'Відхилено');
      }
    });
    document.getElementById('applications').addEventListener('click', function (e) {
      const btn = e.target.closest('button');
      if (!btn) return;
      const messageDiv = btn.closest('.message');
      if (!messageDiv) return;
      const id = messageDiv.querySelector('h3').textContent.replace(/^\D+/, '');
      if (btn.classList.contains('accept')) {
        respondMessage(id, 'Прийнято');
      } else if (btn.classList.contains('reject')) {
        respondMessage(id, 'Відхилено');
      }
    });
  });
// js/main.js
document.addEventListener("DOMContentLoaded", function () {
    // Функція для підсвічування активного посилання в навігаційному меню
    highlightActiveNavLink();
  });
  
  function highlightActiveNavLink() {
    // Отримуємо поточний шлях
    const currentPage = location.pathname.split("/").pop();
    const navLinks = document.querySelectorAll("nav.w3-bar a");
  
    navLinks.forEach(function (link) {
      // Якщо URL посилання співпадає з поточною сторінкою - додаємо клас 'w3-indigo'
      if (link.getAttribute("href") === currentPage) {
        link.classList.add("w3-indigo");
      } else {
        link.classList.remove("w3-indigo");
      }
    });
  }
  
// js/genre.js

function addNewGenre() {
    const newGenreInput = document.getElementById('newGenreInput');
    let newGenre = newGenreInput.value.trim();
  
    if (!newGenre) {
      alert('Будь ласка, введіть назву жанру.');
      return;
    }
  
    // Приводимо до нижнього регістру для уникнення дублювання
    newGenre = newGenre.toLowerCase();
    const artCategorySelect = document.getElementById('artCategory');
    let exists = false;
  
    // Перевірка наявності жанру
    for (let i = 0; i < artCategorySelect.options.length; i++) {
      if (artCategorySelect.options[i].value === newGenre) {
        exists = true;
        break;
      }
    }
  
    if (exists) {
      alert('Такий жанр вже існує!');
    } else {
      const newOption = document.createElement('option');
      newOption.value = newGenre;
      newOption.text = newGenre.charAt(0).toUpperCase() + newGenre.slice(1);
      artCategorySelect.add(newOption);
      alert('Новий жанр додано: ' + newOption.text);
    }
    newGenreInput.value = "";
  }
  // public/js/genre.js

// Функція для показу/приховування поля кастомного жанру
// public/js/genre.js
function handleGenreChange() {
  const genreSelect = document.getElementById("artCategory");
  const customField = document.getElementById("customGenreField");

  if (genreSelect.value === "custom") {
    customField.style.display = "block";
  } else {
    customField.style.display = "none";
    document.getElementById("customGenreInput").value = "";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const genreSelect = document.getElementById("artCategory");
  if (genreSelect) {
    genreSelect.addEventListener("change", handleGenreChange);
  }
});


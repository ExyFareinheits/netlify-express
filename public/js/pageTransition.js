document.addEventListener("DOMContentLoaded", function () {
  const transitionElement = document.createElement("div");
  transitionElement.className = "page-transition";
  document.body.appendChild(transitionElement);

  // Add transition effect on page load
  setTimeout(() => {
    transitionElement.classList.add("fade-out");
    setTimeout(() => {
      transitionElement.classList.remove("active", "fade-out");
    }, 500);
  }, 500);

  // Add transition effect on link clicks
  const links = document.querySelectorAll("a");
  links.forEach(link => {
    link.addEventListener("click", function (event) {
      const href = link.getAttribute("href");
      if (href && !href.startsWith("#") && !link.hasAttribute("target")) {
        event.preventDefault();
        transitionElement.classList.add("active");
        setTimeout(() => {
          window.location.href = href;
        }, 500);
      }
    });
  });
});

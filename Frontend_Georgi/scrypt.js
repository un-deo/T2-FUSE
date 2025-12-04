/* Minimal JS: handles search open/close and profile dropdown */
(function () {
  const nav = document.querySelector(".honey-nav");
  const searchInput = document.getElementById("nav-search");
  const searchClose = document.getElementById("searchClose");
  const filterBtn = document.getElementById("filterBtn");
  const menuList = document.querySelector(".menu-list");
  const profileBtn = document.getElementById("profileBtn");
  const profileMenu = document.getElementById("profileMenu");
  const cartBtn = document.getElementById("cartBtn");

  if (!nav || !searchInput) return;

  function openSearch() {
    nav.classList.add("search-active");
    // focus input (ensure keyboard users are positioned)
    setTimeout(() => searchInput.focus(), 0);
  }

  function closeSearch() {
    nav.classList.remove("search-active");
    searchInput.blur();
    // return focus to first menu link (accessibility)
    const first = menuList && menuList.querySelector("a");
    if (first) first.focus();
  }

  // Open on focus
  searchInput.addEventListener("focus", openSearch);
  // Close button
  searchClose.addEventListener("click", closeSearch);
  // Esc key to close
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSearch();
      e.stopPropagation();
    }
  });
  // Filter placeholder
  filterBtn.addEventListener("click", () => {
    alert("Open filter panel (implement on your site)");
  });

  // Profile dropdown toggle
  profileBtn.addEventListener("click", (e) => {
    const isShown = profileMenu.classList.toggle("show");
    profileBtn.setAttribute("aria-expanded", isShown ? "true" : "false");
  });

  // Close profile menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".profile-wrap")) {
      profileMenu.classList.remove("show");
      profileBtn.setAttribute("aria-expanded", "false");
    }
  });

  // Keyboard: close profile on Escape when open
  profileMenu.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      profileMenu.classList.remove("show");
      profileBtn.setAttribute("aria-expanded", "false");
      profileBtn.focus();
    }
  });

  // Cart click (placeholder)
  cartBtn.addEventListener("click", () => {
    alert("Open cart (implement on your site)");
  });
})();

/* Minimal JS for opening/closing search & keyboard handling */
(function () {
  const nav = document.querySelector(".honey-nav");
  const searchInput = document.getElementById("nav-search");
  const searchClose = document.getElementById("searchClose");
  const filterBtn = document.getElementById("filterBtn");
  const menuList = document.querySelector(".menu-list");

  if (!nav || !searchInput) return;

  function openSearch() {
    nav.classList.add("search-active");
    // keep focus in the input (helpful when user clicked a visual search icon)
    setTimeout(() => searchInput.focus(), 0);
  }

  function closeSearch() {
    // remove active class (triggers smooth CSS animation for closing)
    nav.classList.remove("search-active");
    // blur the input to ensure :focus-within / focus states don't interfere
    searchInput.blur();
    // return keyboard focus to first menu link for accessibility
    const firstMenuLink = menuList && menuList.querySelector("a");
    if (firstMenuLink) firstMenuLink.focus();
  }

  // open when input is focused
  searchInput.addEventListener("focus", openSearch);

  // close when pressing close X
  searchClose.addEventListener("click", closeSearch);

  // close on Escape
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSearch();
      e.stopPropagation();
    }
  });

  // placeholder filter handler (replace with real behavior)
  filterBtn.addEventListener("click", () => {
    alert("Open filter panel (implement on your site)");
  });

  // Optional: clicking outside search should close it.
  // If you want that behavior, uncomment the following:
  /*
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) {
      closeSearch();
    }
  });
  */
})();

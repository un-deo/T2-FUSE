
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("userToken");
  const allowGuestByAttr = document.body?.dataset.allowGuest === "true";
  const isProductPage =
    window.location.pathname.endsWith("/product.html") ||
    window.location.pathname.endsWith("product.html");
  const allowGuest = allowGuestByAttr || isProductPage;

  const loggedInHeader = document.getElementById("header-logged-in");
  const loggedOutHeader = document.getElementById("header-logged-out");

  if (loggedInHeader && loggedOutHeader) {
    if (token) {
      loggedInHeader.classList.remove("hidden");
      loggedOutHeader.classList.add("hidden");
    } else {
      loggedOutHeader.classList.remove("hidden");
      loggedInHeader.classList.add("hidden");
    }
  }

  if (!token && !allowGuest) {
    window.location.replace("/Frontend/home.html");
    return;
  }

  if (!token) {
    return;
  }

  const statusId = localStorage.getItem("statusId");
  const menuButton = document.getElementById("menuButton");
  const menu = document.getElementById("menu");
  const sellerLink = document.getElementById("seller-link");
  const adminLink = document.getElementById("admin-link");

  sellerLink?.classList.add("hidden");
  adminLink?.classList.add("hidden");

  if (statusId === "2") {
    sellerLink?.classList.remove("hidden");
  } else if (statusId === "3") {
    sellerLink?.classList.remove("hidden");
    adminLink?.classList.remove("hidden");
  }

  const roleEl = document.getElementById("menu-user-role");
  if (roleEl) {
    roleEl.textContent =
      statusId === "3" ? "admin" : statusId === "2" ? "verkäufer" : "kunde";
  }

  const nameEl = document.getElementById("menu-user-name");
  if (nameEl) {
    nameEl.textContent = localStorage.getItem("userName") || "Nutzer";
  }

  if (menuButton && menu) {
    menuButton.addEventListener("click", (event) => {
      event.stopPropagation();
      menu.classList.toggle("hidden");
    });

    document.addEventListener("click", (event) => {
      if (!menuButton.contains(event.target) && !menu.contains(event.target)) {
        menu.classList.add("hidden");
      }
    });
  }
});

function clearSessionStorage() {
  localStorage.removeItem("userToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("statusId");
  localStorage.removeItem("userName");
  window.location.href = "/Frontend/home.html";
}

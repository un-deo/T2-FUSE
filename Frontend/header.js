
document.addEventListener("DOMContentLoaded", () => {
  initHeader().catch((error) => {
    console.error("Header init failed:", error);
  });
});

async function initHeader() {
  const allowGuestByAttr = document.body?.dataset.allowGuest === "true";
  const isProductPage =
    window.location.pathname.endsWith("/product.html") ||
    window.location.pathname.endsWith("product.html");
  const allowGuest = allowGuestByAttr || isProductPage;

  const loggedInHeader = document.getElementById("header-logged-in");
  const loggedOutHeader = document.getElementById("header-logged-out");

  const setHeaderState = (isLoggedIn) => {
    if (!loggedInHeader || !loggedOutHeader) return;
    if (isLoggedIn) {
      loggedInHeader.classList.remove("hidden");
      loggedOutHeader.classList.add("hidden");
    } else {
      loggedOutHeader.classList.remove("hidden");
      loggedInHeader.classList.add("hidden");
    }
  };

  const token = localStorage.getItem("userToken");
  const userId = localStorage.getItem("userId");

  if (!token) {
    setHeaderState(false);
    if (!allowGuest) {
      window.location.replace("/Frontend/home.html");
    }
    return;
  }

  setHeaderState(true);

  const isValidSession = await validateSession(token, userId);
  if (!isValidSession) {
    clearSessionStorage(!allowGuest);
    setHeaderState(false);
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

  updateCartBadge();
  document.addEventListener("cart-updated", updateCartBadge);
}

async function updateCartBadge() {
  const token = localStorage.getItem("userToken");
  const userId = localStorage.getItem("userId");
  if (!token || !userId || typeof fetchCart !== "function") return;

  const result = await fetchCart(userId, token);
  if (!result?.success) {
    const err = (result.error || "").toString();
    if (/token/i.test(err) || /abgelau/.test(err)) {
      clearSessionStorage();
      return;
    }
    return;
  }
  if (!result?.cart) return;

  const count = Number(result.cart.totalItems || 0);
  const links = Array.from(document.querySelectorAll('a[href="/Frontend/warenkorb.html"]'));
  links.forEach((link) => {
    link.textContent = count > 0 ? `Warenkorb (${count})` : "Warenkorb";
  });
}

async function validateSession(token, userId) {
  if (!token || !userId) return false;
  try {
    const response = await fetch("http://localhost:3000/api/validate-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, userId }),
    });

    const data = await response.json();
    return Boolean(response.ok && data.success);
  } catch (error) {
    console.error("Token-Validierung fehlgeschlagen:", error);
    return false;
  }
}

function clearSessionStorage(shouldRedirect = true) {
  localStorage.removeItem("userToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("statusId");
  localStorage.removeItem("userName");
  if (shouldRedirect) {
    window.location.href = "/Frontend/home.html";
  }
}



// Local token validation used by the session menu (runs before `api.js` may be loaded)
async function validateSession(token, userId) {
  if (!token || !userId) return false;
  try {
    const response = await fetch("http://localhost:3000/api/validate-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, userId }),
    });
    const data = await response.json();
    return Boolean(response.ok && data.success);
  } catch (err) {
    console.error("validateSession (menu) failed:", err);
    return false;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setAuthMenuState().catch((error) => {
    console.error("Menue-Status konnte nicht gesetzt werden:", error);
  });
});

async function setAuthMenuState() {
  let token = localStorage.getItem("userToken");
  const userId = localStorage.getItem("userId");
  const guestMenu = document.getElementById("guest-menu");
  const userMenu = document.getElementById("user-menu");

  if (token && userId) {
    const isValid = await validateSession(token, userId);
    if (!isValid) {
      clearSessionStorage();
      return;
    }
  } else if (token && !userId) {
    clearSessionStorage();
    return;
  }

  if (token) {
    if (guestMenu) guestMenu.classList.add("hidden");
    if (userMenu) userMenu.classList.remove("hidden");
  } else {
    if (guestMenu) guestMenu.classList.remove("hidden");
    if (userMenu) userMenu.classList.add("hidden");
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



document.addEventListener("DOMContentLoaded", () => {
  setAuthMenuState();
});

function setAuthMenuState() {
  const token = localStorage.getItem("userToken");
  const guestMenu = document.getElementById("guest-menu");
  const userMenu = document.getElementById("user-menu");

  if (token) {
    if (guestMenu) guestMenu.classList.add("hidden");
    if (userMenu) userMenu.classList.remove("hidden");
  } else {
    if (guestMenu) guestMenu.classList.remove("hidden");
    if (userMenu) userMenu.classList.add("hidden");
  }
}

function clearSessionStorage() {
  localStorage.removeItem("userToken");
  localStorage.removeItem("userId");
  window.location.href = "/Frontend/home.html";
}

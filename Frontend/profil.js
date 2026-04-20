document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("userToken");
  const userId = localStorage.getItem("userId");

  if (!token || !userId) {
    window.location.replace("/Frontend/home.html");
    return;
  }

  setupRoleBasedMenu();
  setupDropdownMenu();
  updateProfileStatusBadge();

  const isValidSession = await validateSession(token, userId);
  if (!isValidSession) {
    clearSessionStorage();
    return;
  }

  const user = await fetchUserProfile(userId, token);
  if (!user) {
    return;
  }

  fillProfileForm(user);
  setupFormHandlers();
});

function setupFormHandlers() {
  const profileForm = document.getElementById("profileForm");
  const passwordForm = document.getElementById("passwordChangeForm");

  profileForm?.addEventListener("submit", handleProfileSubmit);
  passwordForm?.addEventListener("submit", handlePasswordChange);
}

function handleProfileSubmit(event) {
  event.preventDefault();
}

async function handlePasswordChange(event) {
  event.preventDefault();

  const userId = localStorage.getItem("userId");
  const oldPassword = (
    document.getElementById("oldPassword")?.value || ""
  ).trim();
  const newPassword = (
    document.getElementById("newPassword")?.value || ""
  ).trim();
  const confirmNewPassword = (
    document.getElementById("confirmNewPassword")?.value || ""
  ).trim();

  if (!userId) {
    showPasswordMessage("Benutzersitzung fehlt. Bitte neu anmelden.", "error");
    return;
  }

  if (!oldPassword || !newPassword || !confirmNewPassword) {
    showPasswordMessage("Bitte alle Passwortfelder ausfuellen.", "error");
    return;
  }

  if (newPassword !== confirmNewPassword) {
    showPasswordMessage(
      "Das neue Passwort stimmt nicht mit der Bestaetigung ueberein.",
      "error",
    );
    return;
  }

  if (oldPassword === newPassword) {
    showPasswordMessage(
      "Das neue Passwort muss sich vom alten unterscheiden.",
      "error",
    );
    return;
  }

  showPasswordMessage("Passwort wird aktualisiert...", "info");
  const result = await updatePassword(userId, oldPassword, newPassword);

  if (result?.success === true || result?.updated === true) {
    document.getElementById("passwordChangeForm")?.reset();
    showPasswordMessage(
      result?.message || "Passwort erfolgreich aktualisiert.",
      "success",
    );
    return;
  }

  showPasswordMessage(
    result?.error || "Passwort konnte nicht aktualisiert werden.",
    "error",
  );
}

function showPasswordMessage(message, type = "info") {
  const messageElement = document.getElementById("passwordChangeMessage");
  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
  messageElement.className = "text-sm";

  if (type === "success") {
    messageElement.classList.add("text-green-700");
    return;
  }

  if (type === "error") {
    messageElement.classList.add("text-red-600");
    return;
  }

  messageElement.classList.add("text-stone-600");
}

function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (!input) {
    return;
  }

  input.type = input.type === "password" ? "text" : "password";
}

window.togglePasswordVisibility = togglePasswordVisibility;

function setupRoleBasedMenu() {
  const statusId = localStorage.getItem("statusId");

  if (statusId === "2") {
    document.getElementById("seller-link")?.classList.remove("hidden");
  } else if (statusId === "3") {
    document.getElementById("seller-link")?.classList.remove("hidden");
    document.getElementById("admin-link")?.classList.remove("hidden");
  }
}

function setupDropdownMenu() {
  const menuButton = document.getElementById("menuButton");
  const menu = document.getElementById("menu");

  if (!menuButton || !menu) {
    return;
  }

  menuButton.addEventListener("click", () => {
    menu.classList.toggle("hidden");
  });

  document.addEventListener("click", (event) => {
    if (!menuButton.contains(event.target) && !menu.contains(event.target)) {
      menu.classList.add("hidden");
    }
  });
}

function fillProfileForm(user) {
  const nameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const phoneInput = document.getElementById("phone");
  const addressInput = document.getElementById("address");

  const nameDisplay = document.getElementById("profileNameDisplay");
  const emailDisplay = document.getElementById("profileEmailDisplay");

  const name = user?.name || "";
  const email = user?.email || "";
  const phone = user?.telefonNr || "";

  const addressParts = [
    user?.strasse,
    user?.hausnummer,
    user?.postleitzahl,
    user?.land,
  ]
    .filter((part) => part && String(part).trim() !== "")
    .map((part) => String(part).trim());
  const address = addressParts.join(", ");

  if (nameInput) {
    nameInput.value = name;
  }
  if (emailInput) {
    emailInput.value = email;
  }
  if (phoneInput) {
    phoneInput.value = phone;
  }
  if (addressInput) {
    addressInput.value = address;
  }

  if (nameDisplay) {
    nameDisplay.textContent = name || "Unbekannt";
  }
  if (emailDisplay) {
    emailDisplay.textContent = email || "Keine E-Mail";
  }
}

function updateProfileStatusBadge() {
  const statusId = localStorage.getItem("statusId");

  const statusBox = document.getElementById("profileStatusBox");
  const roleDisplay = document.getElementById("profileRoleDisplay");
  const verificationDisplay = document.getElementById(
    "profileVerificationDisplay",
  );

  if (!statusBox || !roleDisplay || !verificationDisplay) {
    return;
  }

  statusBox.className = "flex items-center gap-2 p-3 rounded-xl";
  verificationDisplay.className = "ml-auto text-xs px-2 py-1 rounded-full";

  if (statusId === "3") {
    roleDisplay.textContent = "Admin";
    roleDisplay.className = "font-medium text-green-800";
    statusBox.classList.add("bg-green-50");
    verificationDisplay.textContent = "Verifiziert";
    verificationDisplay.classList.add("bg-green-100", "text-green-700");
    return;
  }

  if (statusId === "2") {
    roleDisplay.textContent = "Verkäufer";
    roleDisplay.className = "font-medium text-amber-800";
    statusBox.classList.add("bg-amber-50");
    verificationDisplay.textContent = "Verifiziert";
    verificationDisplay.classList.add("bg-green-100", "text-green-700");
    return;
  }

  roleDisplay.textContent = "Kunde";
  roleDisplay.className = "font-medium text-stone-700";
  statusBox.classList.add("bg-stone-100");
  verificationDisplay.textContent = "Standard";
  verificationDisplay.classList.add("bg-stone-200", "text-stone-700");
}

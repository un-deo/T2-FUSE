let cachedProfile = null;

document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("userToken");
  const userId = localStorage.getItem("userId");

  if (!token || !userId) {
    window.location.replace("/Frontend/home.html");
    return;
  }

  setupRoleBasedMenu();
  setupDropdownMenu();
  syncMenuUserName();
  updateProfileStatusBadge();

  const isValidSession = await validateSession(token, userId);
  if (!isValidSession) {
    clearSessionStorage();
    return;
  }

  const user = await fetchUserProfile(userId);
  if (!user) {
    return;
  }

  cachedProfile = user;

  if (user?.statusId !== undefined && user?.statusId !== null) {
    const normalizedStatus = String(user.statusId);
    if (normalizedStatus !== localStorage.getItem("statusId")) {
      localStorage.setItem("statusId", normalizedStatus);
    }
  }

  if (user?.name) {
    localStorage.setItem("userName", user.name);
    syncMenuUserName();
  }

  fillProfileForm(user);
  setupRoleBasedMenu();
  updateProfileStatusBadge();
  setupFormHandlers();
  await setupSellerRequestModal();
});

function syncMenuUserName() {
  const nameEl = document.getElementById("menu-user-name");
  if (!nameEl) {
    return;
  }

  nameEl.textContent = localStorage.getItem("userName") || "Nutzer";
}

function setupFormHandlers() {
  const profileForm = document.getElementById("profileForm");
  const passwordForm = document.getElementById("passwordChangeForm");

  profileForm?.addEventListener("submit", handleProfileSubmit);
  passwordForm?.addEventListener("submit", handlePasswordChange);
}

async function setupSellerRequestModal() {
  const card = document.getElementById("sellerRequestCard");
  const openButton = document.getElementById("openSellerRequest");
  const modal = document.getElementById("sellerRequestModal");
  const overlay = document.getElementById("sellerRequestOverlay");
  const closeButton = document.getElementById("closeSellerRequest");
  const cancelButton = document.getElementById("cancelSellerRequest");
  const form = document.getElementById("sellerRequestForm");
  const textarea = document.getElementById("sellerReason");
  const errorEl = document.getElementById("sellerReasonError");
  const statusEl = document.getElementById("sellerRequestStatus");
  const submitButton = document.getElementById("submitSellerRequest");

  if (
    !card ||
    !openButton ||
    !modal ||
    !overlay ||
    !closeButton ||
    !form ||
    !textarea ||
    !errorEl ||
    !statusEl ||
    !submitButton
  ) {
    return;
  }

  const statusId = localStorage.getItem("statusId");
  if (statusId === "2" || statusId === "3") {
    localStorage.removeItem("sellerRequestStatus");
    card.classList.add("hidden");
    return;
  }

  const userId = localStorage.getItem("userId");
  if (userId) {
    const existingRequest = await fetchSellerRoleRequest(userId);
    if (existingRequest?.success && existingRequest.request) {
      storeSellerRequestStatus(existingRequest.request?.status);
      const shouldBlock = applySellerRequestState(
        existingRequest.request,
        statusEl,
        openButton,
      );
      if (shouldBlock) {
        return;
      }
    } else if (existingRequest?.success && !existingRequest.request) {
      const shouldBlock = applyStoredSellerRequestState(statusEl, openButton);
      if (shouldBlock) {
        return;
      }
    } else {
      const shouldBlock = applyStoredSellerRequestState(statusEl, openButton);
      if (shouldBlock) {
        return;
      }
    }
  }

  const openModal = () => {
    modal.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
    textarea.focus();
  };

  const closeModal = () => {
    modal.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
    errorEl.textContent = "";
    textarea.setAttribute("aria-invalid", "false");
  };

  openButton.addEventListener("click", openModal);
  closeButton.addEventListener("click", closeModal);
  cancelButton?.addEventListener("click", closeModal);
  overlay.addEventListener("click", closeModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const reason = textarea.value.trim();
    if (!reason) {
      errorEl.textContent = "Bitte gib eine Begruendung ein.";
      textarea.setAttribute("aria-invalid", "true");
      textarea.focus();
      return;
    }

    errorEl.textContent = "";
    textarea.setAttribute("aria-invalid", "false");

    const userId = localStorage.getItem("userId");
    if (!userId) {
      errorEl.textContent = "Benutzersitzung fehlt. Bitte neu anmelden.";
      return;
    }

    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Sende...";
    submitButton.classList.add("opacity-70");

    try {
      const result = await submitSellerRequest(userId, reason);

      if (result?.success) {
        const statusText = result?.message || "Antrag wurde erfolgreich abgesendet.";
        storeSellerRequestStatus("pending");
        setSellerRequestDisabledState(statusEl, openButton, statusText);
        form.reset();
        closeModal();
      } else {
        const errorText = result?.error || "Antrag konnte nicht gesendet werden.";
        if (isSellerRequestAlreadySentError(errorText)) {
          storeSellerRequestStatus("pending");
          setSellerRequestDisabledState(
            statusEl,
            openButton,
            "Dein Antrag wurde bereits abgesendet.",
          );
          closeModal();
          return;
        }
        errorEl.textContent = errorText;
      }
    } catch (error) {
      errorEl.textContent =
        error?.message || "Antrag konnte nicht gesendet werden.";
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalText || "Antrag senden";
      submitButton.classList.remove("opacity-70");
    }
  });
}

async function submitSellerRequest(userId, reason) {
  const url = "http://localhost:3000/api/request-seller-role";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
        begruendung: reason,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Request seller status failed:", error);
    return {
      success: false,
      error: "Netzwerkfehler bei der Anfrage des Verkäufer-Rolls",
    };
  }
}

async function fetchSellerRoleRequest(userId) {
  const url = "http://localhost:3000/api/my-seller-role-request";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Fetch seller request failed:", error);
    return {
      success: false,
      error: "Netzwerkfehler beim Abrufen der Verkäufer-Rollenanfrage",
    };
  }
}

function applySellerRequestState(request, statusEl, openButton) {
  const status = request?.status || "pending";

  if (status === "rejected") {
    const comment = (request?.kommentarAdmin || "").trim();
    const rejectionMessage = comment
      ? `Dein Antrag wurde abgelehnt: ${comment}`
      : "Dein Antrag wurde abgelehnt. Du kannst erneut ansuchen.";
    setSellerRequestRejectedState(
      statusEl,
      openButton,
      rejectionMessage,
    );
    return false;
  }

  if (status === "approved") {
    setSellerRequestDisabledState(
      statusEl,
      openButton,
      "Dein Antrag wurde genehmigt. Dein Status wird aktualisiert.",
    );
    return true;
  }

  setSellerRequestDisabledState(
    statusEl,
    openButton,
    "Dein Antrag wurde bereits abgesendet.",
  );
  return true;
}

function setSellerRequestDisabledState(statusEl, openButton, message) {
  setSellerRequestMessage(statusEl, message, "text-amber-700");
  setSellerRequestButtonState(openButton, true, "Antrag gesendet");
}

function setSellerRequestRejectedState(statusEl, openButton, message) {
  setSellerRequestMessage(statusEl, message, "text-red-600");
  setSellerRequestButtonState(openButton, false, "Erneut anfragen");
}

function setSellerRequestMessage(statusEl, message, colorClass) {
  if (!statusEl) {
    return;
  }

  statusEl.textContent = message;
  statusEl.className = `mt-4 text-xl font-semibold ${colorClass}`;
}

function setSellerRequestButtonState(openButton, disabled, label) {
  if (!openButton) {
    return;
  }

  if (!openButton.dataset.baseClass) {
    openButton.dataset.baseClass = openButton.className;
  }

  openButton.disabled = disabled;
  openButton.textContent = label;

  if (disabled) {
    openButton.className = `${openButton.dataset.baseClass} bg-stone-300 text-stone-500 shadow-none cursor-not-allowed`;
    openButton.classList.remove("hover:bg-amber-700");
    return;
  }

  openButton.className = openButton.dataset.baseClass;
}

function storeSellerRequestStatus(status) {
  if (!status) {
    return;
  }

  localStorage.setItem("sellerRequestStatus", status);
}

function getStoredSellerRequestStatus() {
  return localStorage.getItem("sellerRequestStatus");
}

function applyStoredSellerRequestState(statusEl, openButton) {
  const storedStatus = getStoredSellerRequestStatus();
  if (!storedStatus) {
    return false;
  }

  return applySellerRequestState({ status: storedStatus }, statusEl, openButton);
}

function isSellerRequestAlreadySentError(errorText) {
  if (!errorText) {
    return false;
  }

  return /bereits\s+eine\s+anfrage|anfrage\s+.*bereits|bereits\s+abgesendet/i
    .test(errorText);
}

async function handleProfileSubmit(event) {
  event.preventDefault();

  const userId = localStorage.getItem("userId");
  if (!userId) {
    showProfileMessage("Benutzersitzung fehlt. Bitte neu anmelden.", "error");
    return;
  }

  const name = (document.getElementById("name")?.value || "").trim();
  const email = (document.getElementById("email")?.value || "").trim();
  const phone = (document.getElementById("phone")?.value || "").trim();
  const street = (document.getElementById("street")?.value || "").trim();
  const houseNumber =
    (document.getElementById("houseNumber")?.value || "").trim();
  const postalCode =
    (document.getElementById("postalCode")?.value || "").trim();
  const country = (document.getElementById("country")?.value || "").trim();

  if (!name || !email) {
    showProfileMessage("Name und E-Mail sind erforderlich.", "error");
    return;
  }

  showProfileMessage("Profil wird gespeichert...", "info");
  try {
    const result = await updateUserData(userId, {
      name,
      email,
      strasse: street,
      hausnummer: houseNumber,
      postleitzahl: postalCode,
      land: country,
      telefonNr: phone,
    });

    if (result?.success) {
      cachedProfile = {
        ...(cachedProfile || {}),
        name,
        email,
        telefonNr: phone,
        strasse: street,
        hausnummer: houseNumber,
        postleitzahl: postalCode,
        land: country,
      };

      localStorage.setItem("userName", name);
      syncMenuUserName();

      const nameDisplay = document.getElementById("profileNameDisplay");
      const emailDisplay = document.getElementById("profileEmailDisplay");
      if (nameDisplay) nameDisplay.textContent = name;
      if (emailDisplay) emailDisplay.textContent = email;

      showProfileMessage("Profil erfolgreich aktualisiert.", "success");
      return;
    }

    showProfileMessage(
      result?.error || "Profil konnte nicht aktualisiert werden.",
      "error",
    );
  } catch (error) {
    showProfileMessage(
      error?.message || "Profil konnte nicht aktualisiert werden.",
      "error",
    );
  }
}

function showProfileMessage(message, type = "info") {
  let messageElement = document.getElementById("profileUpdateMessage");
  if (!messageElement) {
    const form = document.getElementById("profileForm");
    if (form) {
      messageElement = document.createElement("p");
      messageElement.id = "profileUpdateMessage";
      messageElement.className = "text-sm mt-4";
      form.appendChild(messageElement);
    }
  }

  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
  messageElement.className = "text-sm mt-4";

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

function togglePasswordVisibility(inputId, iconId) {
  const input = document.getElementById(inputId);
  const icon = document.getElementById(iconId);

  if (input.type === "password") {
    input.type = "text";

    icon.innerHTML = `
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
      <circle cx="12" cy="12" r="3"></circle>
      <line x1="2" y1="2" x2="22" y2="22"></line>
    `;
  } else {
    input.type = "password";

    icon.innerHTML = `
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    `;
  }
}

window.togglePasswordVisibility = togglePasswordVisibility;

function setupRoleBasedMenu() {
  const statusId = localStorage.getItem("statusId");
  const roleEl = document.getElementById("menu-user-role");

  if (roleEl) {
    roleEl.textContent =
      statusId === "3" ? "admin" : statusId === "2" ? "verkäufer" : "kunde";
  }

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
  const streetInput = document.getElementById("street");
  const houseNumberInput = document.getElementById("houseNumber");
  const postalCodeInput = document.getElementById("postalCode");
  const countryInput = document.getElementById("country");

  const nameDisplay = document.getElementById("profileNameDisplay");
  const emailDisplay = document.getElementById("profileEmailDisplay");

  const name = user?.name || "";
  const email = user?.email || "";
  const phone = user?.telefonNr || "";
  const street = user?.strasse || "";
  const houseNumber = user?.hausnummer || "";
  const postalCode = user?.postleitzahl || "";
  const country = user?.land || "";

  if (nameInput) {
    nameInput.value = name;
  }
  if (emailInput) {
    emailInput.value = email;
  }
  if (phoneInput) {
    phoneInput.value = phone;
  }
  if (streetInput) {
    streetInput.value = street;
  }
  if (houseNumberInput) {
    houseNumberInput.value = houseNumber;
  }
  if (postalCodeInput) {
    postalCodeInput.value = postalCode;
  }
  if (countryInput) {
    countryInput.value = country;
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
  verificationDisplay.className = "ml-auto text-xs px-2 py-1 roundsed-full";

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

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

function openLoginModal() {
  const modal = document.getElementById("loginModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.style.overflow = "hidden";
}

function closeLoginModal() {
  const modal = document.getElementById("loginModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.style.overflow = "auto";
}

function openRegisterModal() {
  const modal = document.getElementById("registerModal");
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.style.overflow = "hidden";

  resetRegisterForm();
}

function closeRegisterModal() {
  const modal = document.getElementById("registerModal");
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.style.overflow = "auto";
}

function calculatePasswordStrength(password) {
  if (!password)
    return {
      level: 0,
      strength: 0,
      text: "",
      color: "#ef4444",
      allowed: false,
    };

  const length = password.length;
  const hasLowerCase = /[a-z]/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[^a-zA-Z0-9]/.test(password);

  const charTypes = [
    hasLowerCase,
    hasUpperCase,
    hasNumbers,
    hasSpecialChars,
  ].filter(Boolean).length;

  if (length < 8 || charTypes === 1) {
    const missing = [];
    if (length < 8) missing.push("mind. 8 Zeichen");
    if (!hasLowerCase) missing.push("Kleinbuchstaben");
    if (!hasUpperCase) missing.push("Großbuchstaben");
    if (!hasNumbers) missing.push("Zahlen");

    const missingText =
      missing.length > 0 ? ` Fehlt: ${missing.join(", ")}` : "";

    return {
      level: 1,
      strength: 20,
      text: `Sehr schwach –${missingText}`,
      color: "#ef4444",
      allowed: false,
    };
  }

  if (length >= 8 && (!hasUpperCase || !hasLowerCase || !hasNumbers)) {
    const missing = [];
    if (!hasLowerCase) missing.push("Kleinbuchstaben");
    if (!hasUpperCase) missing.push("Großbuchstaben");
    if (!hasNumbers) missing.push("Zahlen");

    return {
      level: 2,
      strength: 40,
      text: `Schwach – Fehlt: ${missing.join(", ")}`,
      color: "#f97316",
      allowed: false,
    };
  }

  if (
    length >= 8 &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    !hasSpecialChars
  ) {
    return {
      level: 3,
      strength: 60,
      text: "Mittel – Für mehr Sicherheit: Sonderzeichen hinzufügen (z.B. !@#$)",
      color: "#eab308",
      allowed: true,
    };
  }

  if (
    length >= 16 &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChars
  ) {
    return {
      level: 4,
      strength: 100,
      text: "Sehr stark – Maximale Sicherheit erreicht",
      color: "#16a34a",
      allowed: true,
    };
  }

  if (
    length >= 10 &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChars
  ) {
    return {
      level: 4,
      strength: 85,
      text: "Stark – Sehr sicheres Passwort (Tipp: 16+ Zeichen für maximale Sicherheit)",
      color: "#22c55e",
      allowed: true,
    };
  }

  if (
    length >= 8 &&
    length < 10 &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumbers &&
    hasSpecialChars
  ) {
    return {
      level: 3.5,
      strength: 80,
      text: "Gut – Passwort ist sicher",
      color: "#84cc16",
      allowed: true,
    };
  }

  return {
    level: 3,
    strength: 60,
    text: "Mittel – Passwort ist ausreichend sicher",
    color: "#eab308",
    allowed: true,
  };
}

function validatePassword() {
  const password = document.getElementById("registerPassword").value;
  const strengthBar = document.getElementById("passwordStrengthBar");
  const strengthText = document.getElementById("passwordStrengthText");

  if (!password) {
    strengthBar.style.width = "0%";
    strengthText.classList.add("hidden");
    return false;
  }

  const result = calculatePasswordStrength(password);

  strengthBar.style.width = `${result.strength}%`;
  strengthBar.style.backgroundColor = result.color;
  strengthText.textContent = result.text;
  strengthText.classList.remove("hidden");
  strengthText.style.color = result.color;

  return result.allowed;
}

function validatePasswordMatch() {
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById(
    "registerPasswordConfirm",
  ).value;
  const matchText = document.getElementById("passwordMatchText");

  if (!confirmPassword) {
    matchText.classList.add("hidden");
    return false;
  }

  const matches = password === confirmPassword;

  if (matches) {
    matchText.classList.add("hidden");
  } else {
    matchText.classList.remove("hidden");
  }

  return matches;
}

function updateSubmitButton() {
  const submitBtn = document.getElementById("registerSubmitBtn");
  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const confirmPassword = document.getElementById(
    "registerPasswordConfirm",
  ).value;

  const isPasswordStrong = validatePassword();
  const passwordsMatch =
    password && confirmPassword && password === confirmPassword;
  const allFieldsFilled = name && email && password && confirmPassword;

  const isValid = allFieldsFilled && isPasswordStrong && passwordsMatch;

  submitBtn.disabled = !isValid;
}

function showRegisterError(message) {
  const errorDiv = document.getElementById("registerError");
  errorDiv.textContent = message;
  errorDiv.classList.remove("hidden");
}

function hideRegisterError() {
  const errorDiv = document.getElementById("registerError");
  errorDiv.classList.add("hidden");
}

function resetRegisterForm() {
  const form = document.getElementById("registerForm");
  form.reset();
  document.getElementById("passwordStrengthBar").style.width = "0%";
  document.getElementById("passwordStrengthText").classList.add("hidden");
  document.getElementById("passwordMatchText").classList.add("hidden");
  document.getElementById("registerSubmitBtn").disabled = true;
  hideRegisterError();
}

function handleRegister(event) {
  event.preventDefault();
  hideRegisterError();

  const name = document.getElementById("registerName").value.trim();
  const email = document.getElementById("registerEmail").value.trim();
  const password = document.getElementById("registerPassword").value;
  const phone = document.getElementById("registerPhone").value.trim();
  const address = document.getElementById("registerAddress").value.trim();

  const existingUsers = ["test@email.at", "admin@fuse-shop.at"];

  if (existingUsers.includes(email.toLowerCase())) {
    showRegisterError("Diese E-Mail-Adresse ist bereits registriert");
    return;
  }

  console.log("Registrierung:", { name, email, phone, address });

  alert("Registrierung erfolgreich! (Noch keine Backend-Anbindung)");
  closeRegisterModal();
}

function switchToRegister(event) {
  event.preventDefault();
  closeLoginModal();
  setTimeout(() => openRegisterModal(), 100);
}

function switchToLogin(event) {
  event.preventDefault();
  closeRegisterModal();
  setTimeout(() => openLoginModal(), 100);
}

document.addEventListener("DOMContentLoaded", () => {
  const loginModal = document.getElementById("loginModal");
  const registerModal = document.getElementById("registerModal");
  const registerPassword = document.getElementById("registerPassword");
  const registerPasswordConfirm = document.getElementById(
    "registerPasswordConfirm",
  );
  const registerForm = document.getElementById("registerForm");
  const registerName = document.getElementById("registerName");
  const registerEmail = document.getElementById("registerEmail");

  loginModal?.addEventListener("click", (e) => {
    if (e.target === loginModal) closeLoginModal();
  });

  registerModal?.addEventListener("click", (e) => {
    if (e.target === registerModal) closeRegisterModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeLoginModal();
      closeRegisterModal();
    }
  });

  registerPassword?.addEventListener("input", () => {
    validatePassword();
    validatePasswordMatch();
    updateSubmitButton();
  });

  registerPasswordConfirm?.addEventListener("input", () => {
    validatePasswordMatch();
    updateSubmitButton();
  });

  registerName?.addEventListener("input", updateSubmitButton);
  registerEmail?.addEventListener("input", updateSubmitButton);

  registerForm?.addEventListener("submit", handleRegister);
});

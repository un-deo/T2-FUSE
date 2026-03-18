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

  // Disable submit button while processing
  const submitBtn = document.getElementById("registerSubmitBtn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Wird registriert...";

  // Send registration data to backend
  fetch("http://localhost:3000/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name,
      email: email,
      passwort: password,
      telefonNr: phone,
      strasse: address, // You might want to split address into separate fields
      hausnummer: "",
      postleitzahl: "",
      land: "AT",
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        console.log("Registrierung erfolgreich:", data.user);
        // alert("Registrierung erfolgreich! Willkommen " + data.user.name);
        closeRegisterModal();
      } else {
        showRegisterError(data.error || "Registrierung fehlgeschlagen");
      }
    })
    .catch((error) => {
      console.error("Registrierung Fehler:", error);
      showRegisterError(
        "Verbindung zum Server fehlgeschlagen. Bitte versuchen Sie es später erneut.",
      );
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = "Konto erstellen";
    });
}

function handleLogin(event) {
  // prevent native form submit which would reload the page
  event.preventDefault?.();

  const emailEl = document.getElementById("loginEmail");
  const passwordEl = document.getElementById("loginPassword");
  const email = emailEl ? emailEl.value.trim() : "";
  const password = passwordEl ? passwordEl.value : "";

  // Disable submit button while processing
  const submitBtn = document.getElementById("loginSubmitBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Anmeldung läuft...";
  }

  fetch("http://localhost:3000/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ Mail: email, pw: password }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        // Token extrahieren (kann String oder Objekt sein)
        const tokenStr = (data.token && typeof data.token === 'object') ? data.token.tokenId : data.token;
        
        // Daten im localStorage speichern
        if (tokenStr) localStorage.setItem("userToken", tokenStr);
        if (data.userId) localStorage.setItem("userId", data.userId);
        if (data.statusId !== undefined) localStorage.setItem("statusId", data.statusId.toString());

        closeLoginModal();
        window.location.href = "/Frontend/signin Header.html";
      } else {
        const errorDiv = document.getElementById("loginError");
        if (errorDiv) {
          errorDiv.textContent = data.error || "Login fehlgeschlagen";
          errorDiv.classList.remove("hidden");
        }
      }
    })
    .catch((error) => {
      console.error("Login Fehler:", error);
    })
    .finally(() => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Anmelden";
      }
    });
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
  // attach login submit handler so the form uses fetch instead of reloading
  const loginForm = document.getElementById("loginForm");
  loginForm?.addEventListener("submit", handleLogin);
});

//Token validierung

async function validateSession(token, userId) {
  try {
    const response = await fetch("http://localhost:3000/api/validate-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: token, // Der Token aus dem localStorage/Cookie
        userId: userId, // Die ID des Users
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log("Token ist gültig für User:", data.userId);
      return true;
    } else {
      console.error("Validierung fehlgeschlagen:", data.error);
      return false;
    }
  } catch (error) {
    console.error("Netzwerkfehler oder Server down:", error);
    return false;
  }
}

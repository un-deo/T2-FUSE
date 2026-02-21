const searchForm = document.querySelector("form");
const productInput = document.getElementById("productDisplay");
searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(searchForm);
  const query = formData.get("search") ?? "";

  try {
    const url = `http://localhost:3000/api/search?search=${encodeURIComponent(query)}`;
    console.log("Fetching URL:", url);
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const products = await res.json();
    console.log("products", products);
    displayProducts(products);
  } catch (err) {
    console.error("Fetch error:", err);
  }
});

function displayProducts(products) {
  document.getElementById("productAmountFound").innerText =
    `${products.length} Produkte gefunden`;
  let productamount = products.length;
  productDisplay.innerHTML = "";
  for (let i = 0; i < productamount; i++) {
    productDisplay.innerHTML += ` 
        <a
          class="group relative bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-amber-200 transition-all duration-300 hover:shadow-xl hover:shadow-stone-200/50 hover:-translate-y-1"
          data-testid="product-card-195e1b0b-9b8d-45b7-92e0-fb5ceee469ad"
          href="/produkte/${products[i].produktId}"
        >
          <div
            class="aspect-square bg-stone-100 flex items-center justify-center text-stone-400 text-sm"
          >
            <img src="pics/${products[i].produktId}.jpg" alt="${products[i].name}">
          </div>

          <div class="p-4 md:p-5">
            <!-- <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-900/10 text-green-900 text-xs font-medium rounded-full mb-3"
              >${products[i].kategorie}</span
            >-->
            <h3
              class="font-serif text-lg font-semibold text-stone-900 mb-1 line-clamp-1 group-hover:text-amber-700 transition-colors"
            >
              ${products[i].name}
            </h3>
	
            <div class="flex items-center justify-between">
              <div>
                <span class="font-mono text-xl font-semibold text-amber-600"
                  >€${products[i].preis}</span
                >
                <!-- <span class="text-stone-400 text-sm ml-1">/ 500g</span> -->
              </div>

              <button
                class="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-amber-600 hover:bg-amber-700 text-white rounded-full w-10 h-10 shadow-lg hover:shadow-amber-600/20"
                data-testid="add-to-cart-195e1b0b-9b8d-45b7-92e0-fb5ceee469ad"
                type="button"
                aria-label="In den Warenkorb"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="w-4 h-4"
                  aria-hidden="true"
                >
                  <circle cx="8" cy="21" r="1"></circle>
                  <circle cx="19" cy="21" r="1"></circle>
                  <path
                    d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"
                  ></path>
                </svg>
              </button>
            </div>
          </div>
        </a>`;
  }
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
      strasse: address,
      hausnummer: "",
      postleitzahl: "",
      land: "AT",
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        console.log("Registrierung erfolgreich:", data.user);
        alert("Registrierung erfolgreich! Willkommen " + data.user.name);
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
});

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
});

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

  const addressParts = [user?.strasse, user?.hausnummer, user?.postleitzahl, user?.land]
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
  const verificationDisplay = document.getElementById("profileVerificationDisplay");

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

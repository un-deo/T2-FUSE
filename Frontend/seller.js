// ---------- STATE ----------
let currentProductId = null;
let deleteProductId = null;
let kategorieMap = {};

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", async function () {
  const token = localStorage.getItem("userToken");
  const userId = localStorage.getItem("userId");
  const statusId = localStorage.getItem("statusId");

  if (!token || !userId || (statusId !== "2" && statusId !== "3")) {
    window.location.href = "/Frontend/home.html";
    return;
  }

  const valid = await validateSession(token, userId);
  if (!valid) {
    window.location.href = "/Frontend/home.html";
    return;
  }

  await loadCategories();
  await loadProducts();
});

// ---------- CATEGORIES ----------
async function loadCategories() {
  try {
    const response = await fetch("http://localhost:3000/api/search?kategorie=all");
    const data = await response.json();

    const select = document.getElementById("kategorie");
    select.innerHTML = '<option value="">Kategorie wählen...</option>';

    kategorieMap = {};
    data.forEach((kategorie) => {
      kategorieMap[kategorie.kategorieId] = kategorie.name;
      const option = document.createElement("option");
      option.value = kategorie.kategorieId;
      option.textContent = kategorie.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Fehler beim Abrufen der Kategorien:", error);
  }
}

// ---------- LOAD PRODUCTS ----------
async function loadProducts() {
  const userId = localStorage.getItem("userId");
  const result = await fetchMyProducts(userId);

  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";

  if (!result.success || !result.products || result.products.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12 text-stone-500">
        <p class="text-lg">Noch keine Produkte vorhanden.</p>
        <p class="text-sm mt-1">Klicke auf "Neues Produkt", um dein erstes Produkt zu erstellen.</p>
      </div>`;
    return;
  }

  result.products.forEach((product) => {
    const card = renderProductCard(product);
    grid.appendChild(card);
  });
}

// ---------- RENDER PRODUCT CARD ----------
function renderProductCard(product) {
  const div = document.createElement("div");
  div.className = "bg-white rounded-xl border border-stone-200 overflow-hidden";

  const kategorieName = kategorieMap[product.kategorieId] || "Unbekannt";
  const preis = Number(product.preis).toFixed(2);
  const bestand = product.Bestand !== null ? product.Bestand : "—";
  const statusText = product.status === "active" ? "Aktiv" : product.status;
  const statusColor = product.status === "active" ? "bg-green-600" : "bg-stone-400";

  let imgHtml;
  if (product.bildUrl) {
    imgHtml = `<img src="${product.bildUrl}" alt="${product.name}" class="w-full h-full object-cover" />`;
  } else {
    imgHtml = `<span class="text-stone-400 text-sm">Bild Platzhalter</span>`;
  }

  div.innerHTML = `
    <div class="aspect-square bg-stone-100 flex items-center justify-center overflow-hidden">
      ${imgHtml}
    </div>
    <div class="p-4">
      <div class="flex justify-between items-start mb-2">
        <h3 class="font-semibold text-stone-900">${escapeHtml(product.name)}</h3>
        <span class="px-2 py-0.5 text-xs rounded text-white ${statusColor}">
          ${statusText}
        </span>
      </div>
      <p class="text-sm text-stone-500 mb-2">${escapeHtml(kategorieName)}</p>
      <div class="flex justify-between items-center">
        <span class="font-mono text-lg font-bold text-amber-600">€${preis}</span>
        <span class="text-sm text-stone-500">Bestand: ${bestand}</span>
      </div>
      <div class="flex gap-2 mt-4">
        <button class="edit-btn inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 text-xs flex-1" data-product-id="${product.produktId}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-square-pen w-4 h-4 mr-1"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"></path></svg>Bearbeiten
        </button>
        <button class="delete-btn inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 border border-input shadow-sm hover:text-accent-foreground h-8 rounded-md px-3 text-xs text-red-500 hover:bg-red-50" data-product-id="${product.produktId}">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash2 w-4 h-4"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>
        </button>
      </div>
    </div>
  `;

  div.querySelector(".edit-btn").addEventListener("click", function () {
    openEditModal(product);
  });

  div.querySelector(".delete-btn").addEventListener("click", function () {
    deleteProductId = product.produktId;
    document.getElementById("deleteModal").classList.remove("hidden");
  });

  return div;
}

// ---------- OPEN EDIT MODAL ----------
function openEditModal(product) {
  document.getElementById("modalTitle").textContent = "Produkt bearbeiten";
  document.getElementById("productId").value = product.produktId;
  document.getElementById("name").value = product.name || "";
  document.getElementById("kategorie").value = product.kategorieId || "";
  document.getElementById("beschreibung").value = product.beschreibung || "";
  document.getElementById("preis").value = product.preis || "";
  document.getElementById("bestand").value = product.Bestand || "";
  document.getElementById("gewicht").value = product.Gewicht || "";
  document.getElementById("herkunft").value = product.Bundesland || "";
  // clear file input and show preview of existing image (if any)
  const imageInput = document.getElementById('imageFile');
  if (imageInput) imageInput.value = '';
  const preview = document.getElementById('imagePreview');
  if (preview) {
    preview.innerHTML = '';
    if (product.bildUrl) {
      const img = document.createElement('img');
      img.src = product.bildUrl;
      img.className = 'w-24 h-24 object-cover rounded';
      preview.appendChild(img);
    }
  }
  // set status select
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.value = product.status || 'active';
  currentProductId = product.produktId;
  document.getElementById("editModal").classList.remove("hidden");
}

// ---------- OPEN CREATE MODAL ----------
function openCreateModal() {
  document.getElementById("modalTitle").textContent = "Produkt erstellen";
  document.getElementById("productId").value = "";
  document.getElementById("name").value = "";
  document.getElementById("kategorie").value = "";
  document.getElementById("beschreibung").value = "";
  document.getElementById("preis").value = "";
  document.getElementById("bestand").value = "";
  document.getElementById("gewicht").value = "";
  document.getElementById("herkunft").value = "";
  // clear file input and preview for new product
  const imageInput = document.getElementById('imageFile');
  if (imageInput) imageInput.value = '';
  const preview = document.getElementById('imagePreview');
  if (preview) preview.innerHTML = '';
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.value = 'active';
  currentProductId = null;
  document.getElementById("editModal").classList.remove("hidden");
}

// ---------- NEW PRODUCT BUTTON ----------
document.getElementById("newProductBtn").addEventListener("click", openCreateModal);

// ---------- FORM SUBMIT ----------
document.getElementById("produktForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const userId = localStorage.getItem("userId");
  const name = document.getElementById("name").value;
  const kategorieId = document.getElementById("kategorie").value;
  const beschreibung = document.getElementById("beschreibung").value;
  const preis = document.getElementById("preis").value;
  const bestand = document.getElementById("bestand").value;
  const gewicht = document.getElementById("gewicht").value;
  const herkunft = document.getElementById("herkunft").value;
  // image file input (file upload replaces previous bildUrl text input)
  const imageInput = document.getElementById("imageFile");
  const status = document.getElementById("status") ? document.getElementById("status").value : 'active';
  const bildUrl = null; // will be replaced if an upload occurs
  const productId = document.getElementById("productId").value;

  let result;
  // If user selected an image file, upload it first and use returned URL
  let bildUrlToSend = null;
  if (imageInput && imageInput.files && imageInput.files.length > 0) {
    try {
      const uploadResult = await uploadImageFile(imageInput.files[0]);
      bildUrlToSend = uploadResult.url;
    } catch (err) {
      alert("Bild-Upload fehlgeschlagen: " + err.message);
      return;
    }
  }

  if (productId) {
    result = await updateMyProduct(
      userId, productId, name, kategorieId, beschreibung,
      preis, bildUrlToSend, bestand, herkunft, gewicht, status
    );
  } else {
    result = await createProduct(
      userId, name, kategorieId, beschreibung,
      preis, bildUrlToSend, bestand, herkunft, gewicht, status
    );
  }

  if (result && result.success) {
    document.getElementById("editModal").classList.add("hidden");
    await loadProducts();
  } else {
    alert("Fehler: " + (result?.error || "Unbekannter Fehler"));
  }
});

// ---------- MODAL CLOSE BUTTONS ----------
document.getElementById("cancelBtn").addEventListener("click", function () {
  document.getElementById("editModal").classList.add("hidden");
});

document.getElementById("closeBtn").addEventListener("click", function () {
  document.getElementById("editModal").classList.add("hidden");
});

document.getElementById("cancelDeleteBtn").addEventListener("click", function () {
  document.getElementById("deleteModal").classList.add("hidden");
  deleteProductId = null;
});

document.getElementById("closeDeleteBtn").addEventListener("click", function () {
  document.getElementById("deleteModal").classList.add("hidden");
  deleteProductId = null;
});

// ---------- CONFIRM DELETE ----------
document.getElementById("confirmDeleteBtn").addEventListener("click", async function () {
  if (!deleteProductId) return;

  const userId = localStorage.getItem("userId");
  const result = await deleteMyProduct(deleteProductId, userId);

  if (result && result.success) {
    document.getElementById("deleteModal").classList.add("hidden");
    deleteProductId = null;
    await loadProducts();
  } else {
    alert("Fehler beim Löschen: " + (result?.error || "Unbekannter Fehler"));
  }
});

// ---------- VALIDATE SESSION ----------
async function validateSession(token, userId) {
  try {
    const response = await fetch("http://localhost:3000/api/validate-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: token,
        userId: userId,
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

// ---------- HELPER ----------
function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- IMAGE PREVIEW & UPLOAD HELPER ----------
// show preview when selecting a file
const imageFileInput = document.getElementById('imageFile');
if (imageFileInput) {
  imageFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const preview = document.getElementById('imagePreview');
    if (!preview) return;
    preview.innerHTML = '';
    if (file) {
      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.className = 'w-24 h-24 object-cover rounded';
      preview.appendChild(img);
    }
  });
}

async function uploadImageFile(file) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch('http://localhost:3000/api/upload-image', {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data; // expected { success: true, url }
}

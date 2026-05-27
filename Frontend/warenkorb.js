const cartItemsEl = document.getElementById("cart-items");
const summaryItemsEl = document.getElementById("summary-items");
const cartItemCountEl = document.getElementById("cart-item-count");
const cartTotalEl = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");
const clearCartBtn = document.getElementById("clear-cart-btn");
const messageEl = document.getElementById("cart-message");

const receiptModal = document.getElementById("receipt-modal");
const receiptCustomer = document.getElementById("receipt-customer");
const receiptItems = document.getElementById("receipt-items");
const receiptTotal = document.getElementById("receipt-total");
const receiptDate = document.getElementById("receipt-date");
const receiptDelivery = document.getElementById("receipt-delivery");
const receiptError = document.getElementById("receipt-error");
const receiptActions = document.getElementById("receipt-actions");
const receiptSuccess = document.getElementById("receipt-success");
const receiptConfirmBtn = document.getElementById("receipt-confirm-btn");
const receiptCancelBtn = document.getElementById("receipt-cancel-btn");
const receiptCloseBtn = document.getElementById("receipt-close-btn");
const receiptBackdrop = document.getElementById("receipt-backdrop");
const receiptDownloadBtn = document.getElementById("receipt-download-btn");

let currentCart = null;
let receiptData = null;

function getSession() {
  return {
    token: localStorage.getItem("userToken"),
    userId: localStorage.getItem("userId"),
  };
}

function eur(value) {
  return `€${Number(value || 0).toFixed(2).replace(".", ",")}`;
}

function setMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.remove("hidden", "border-red-200", "bg-red-50", "text-red-700", "border-green-200", "bg-green-50", "text-green-700");
  if (isError) {
    messageEl.classList.add("border-red-200", "bg-red-50", "text-red-700");
  } else {
    messageEl.classList.add("border-green-200", "bg-green-50", "text-green-700");
  }
}

function renderLoggedOut() {
  cartItemsEl.innerHTML = `
    <div class="bg-white rounded-2xl p-6 border border-stone-100">
      <h3 class="font-serif text-xl font-semibold text-stone-900 mb-3">Bitte melden Sie sich an</h3>
      <a href="/Frontend/home.html" class="inline-flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white rounded-full px-6 py-3 text-sm font-medium">Zur Anmeldung</a>
    </div>
  `;
  summaryItemsEl.innerHTML = "<p class='text-sm text-stone-500'>Keine Artikel im Warenkorb.</p>";
  cartItemCountEl.textContent = "0 Artikel";
  cartTotalEl.textContent = eur(0);
  clearCartBtn.classList.add("hidden");
  checkoutBtn.disabled = true;
  checkoutBtn.classList.add("opacity-50", "cursor-not-allowed");
}

function renderEmpty() {
  cartItemsEl.innerHTML = `
    <div class="bg-white rounded-2xl p-6 border border-stone-100">
      <h3 class="font-serif text-xl font-semibold text-stone-900 mb-3">Ihr Warenkorb ist leer</h3>
      <a href="/Frontend/product.html" class="inline-flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white rounded-full px-6 py-3 text-sm font-medium">Produkte entdecken</a>
    </div>
  `;
  summaryItemsEl.innerHTML = "<p class='text-sm text-stone-500'>Keine Artikel im Warenkorb.</p>";
  cartItemCountEl.textContent = "0 Artikel";
  cartTotalEl.textContent = eur(0);
  clearCartBtn.classList.add("hidden");
  checkoutBtn.disabled = true;
  checkoutBtn.classList.add("opacity-50", "cursor-not-allowed");
}

function renderCart(cart) {
  currentCart = cart;
  const items = Array.isArray(cart?.items) ? cart.items : [];

  if (items.length === 0) {
    renderEmpty();
    return;
  }

  checkoutBtn.disabled = false;
  checkoutBtn.classList.remove("opacity-50", "cursor-not-allowed");
  clearCartBtn.classList.remove("hidden");

  cartItemCountEl.textContent = `${cart.totalItems} Artikel`;
  cartTotalEl.textContent = eur(cart.totalAmount);

  cartItemsEl.innerHTML = items.map((item) => `
    <div class="bg-white rounded-2xl p-4 md:p-6 flex gap-4 border border-stone-100 hover:border-amber-200 transition-colors">
      <div class="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
        <img alt="${item.name}" class="w-full h-full object-cover" src="${item.imageUrl ? item.imageUrl : `pics/${item.productId}.jpg`}">
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-start justify-between gap-2">
          <div>
            <span class="text-xs text-green-700 font-medium">Produkt</span>
            <h3 class="font-serif font-semibold text-stone-900 text-sm md:text-base mt-0.5">${item.name}</h3>
          </div>
          <button data-action="remove" data-product-id="${item.productId}" class="text-stone-400 hover:text-red-500 transition-colors flex-shrink-0 p-1" aria-label="Artikel entfernen">✕</button>
        </div>
        <div class="flex items-center justify-between mt-3">
          <div class="flex items-center gap-2 border border-stone-200 rounded-full">
            <button data-action="decrease" data-product-id="${item.productId}" class="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-900 transition-colors" aria-label="Menge verringern">-</button>
            <span class="w-8 text-center text-sm font-medium">${item.quantity}</span>
            <button data-action="increase" data-product-id="${item.productId}" class="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-900 transition-colors" aria-label="Menge erhöhen">+</button>
          </div>
          <span class="font-mono font-semibold text-amber-600">${eur(item.lineTotal)}</span>
        </div>
      </div>
    </div>
  `).join("");

  summaryItemsEl.innerHTML = items.map((item) => `
    <div class="flex justify-between text-sm">
      <span class="text-stone-600 truncate mr-2">${item.name} x${item.quantity}</span>
      <span class="text-stone-900 font-medium flex-shrink-0">${eur(item.lineTotal)}</span>
    </div>
  `).join("");
}

async function loadCart() {
  const { token, userId } = getSession();
  if (!token || !userId) {
    renderLoggedOut();
    return;
  }

  const result = await fetchCart(userId, token);
  const errText = (result.error || "").toString();
  if (!result.success) {
    if (/token/i.test(errText) || /abgelau/.test(errText)) {
      if (typeof clearSessionStorage === "function") {
        clearSessionStorage();
      } else {
        localStorage.removeItem("userToken");
        localStorage.removeItem("userId");
        window.location.href = "/Frontend/home.html";
      }
      return;
    }
    setMessage(result.error || "Warenkorb konnte nicht geladen werden", true);
    renderEmpty();
    return;
  }

  renderCart(result.cart);
  document.dispatchEvent(new CustomEvent("cart-updated"));
}

async function updateItem(productId, nextQuantity) {
  const { token, userId } = getSession();
  if (!token || !userId) return;

  const result = await setCartQuantity(userId, token, productId, nextQuantity);
  if (!result.success) {
    setMessage(result.error || "Aktion fehlgeschlagen", true);
  }
  await loadCart();
}

cartItemsEl.addEventListener("click", async (event) => {
  const target = event.target.closest("button[data-action]");
  if (!target || !currentCart) return;

  const action = target.getAttribute("data-action");
  const productId = target.getAttribute("data-product-id");
  if (!action || !productId) return;

  const item = (currentCart.items || []).find((entry) => entry.productId === productId);
  if (!item) return;

  if (action === "increase") {
    await updateItem(productId, item.quantity + 1);
  } else if (action === "decrease") {
    await updateItem(productId, Math.max(0, item.quantity - 1));
  } else if (action === "remove") {
    const { token, userId } = getSession();
    const result = await removeCartItemApi(userId, token, productId);
    if (!result.success) {
      setMessage(result.error || "Produkt konnte nicht entfernt werden", true);
    }
    await loadCart();
  }
});

clearCartBtn.addEventListener("click", async () => {
  if (!currentCart || !currentCart.items || currentCart.items.length === 0) return;
  const { token, userId } = getSession();
  for (const item of currentCart.items) {
    await removeCartItemApi(userId, token, item.productId);
  }
  await loadCart();
  setMessage("Warenkorb wurde geleert.");
});

checkoutBtn.addEventListener("click", async () => {
  const { token, userId } = getSession();
  if (!token || !userId) {
    renderLoggedOut();
    return;
  }
  if (!currentCart || !currentCart.items || currentCart.items.length === 0) {
    setMessage("Ihr Warenkorb ist leer", true);
    return;
  }

  const deliveryOption = document.querySelector('input[name="delivery"]:checked');
  const selbstabholung = deliveryOption ? deliveryOption.value === "abholung" : false;
  const lieferadresse = document.getElementById("delivery-address").value.trim();

  const userData = await fetchUserProfile(userId);
  if (!userData) {
    setMessage("Benutzerdaten konnten nicht geladen werden", true);
    return;
  }

  showReceiptModal(userData, currentCart, selbstabholung, lieferadresse);
});

function showReceiptModal(userData, cart, selbstabholung, lieferadresse) {
  receiptData = { userData, cart, selbstabholung, lieferadresse, date: new Date(), orderId: null };
  receiptSuccess.classList.add("hidden");
  receiptError.classList.add("hidden");
  receiptActions.classList.remove("hidden");

  receiptDate.textContent = new Date().toLocaleDateString("de-DE", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const addrTeile = [userData.strasse, userData.hausnummer].filter(Boolean).join(" ");
  const plzLand = [userData.postleitzahl, userData.land].filter(Boolean).join(" ");
  receiptCustomer.innerHTML = `
    <div><span class="text-stone-500">Name:</span> <span class="font-medium">${userData.name || "-"}</span></div>
    <div><span class="text-stone-500">E-Mail:</span> ${userData.email || "-"}</div>
    <div><span class="text-stone-500">Adresse:</span> ${addrTeile || "-"}</div>
    <div><span class="text-stone-500">PLZ/Land:</span> ${plzLand || "-"}</div>
    <div><span class="text-stone-500">Telefon:</span> ${userData.telefonNr || "-"}</div>
  `;

  receiptDelivery.textContent = selbstabholung
    ? "Selbstabholung"
    : `Lieferung nach Hause — ${lieferadresse || "Keine Adresse angegeben"}`;

  receiptItems.innerHTML = cart.items.map((item) => `
    <tr class="border-b border-stone-100">
      <td class="py-2.5 pr-4">${item.name}</td>
      <td class="py-2.5 text-center">${item.quantity}</td>
      <td class="py-2.5 text-right">${eur(item.price)}</td>
      <td class="py-2.5 text-right font-medium">${eur(item.lineTotal)}</td>
    </tr>
  `).join("");

  receiptTotal.textContent = eur(cart.totalAmount);

  receiptModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function downloadReceipt() {
  if (!receiptData) return;
  const { userData, cart, selbstabholung, lieferadresse, date, orderId } = receiptData;

  const addrTeile = [userData.strasse, userData.hausnummer].filter(Boolean).join(" ");
  const plzLand = [userData.postleitzahl, userData.land].filter(Boolean).join(" ");

  const deliveryText = selbstabholung
    ? "Selbstabholung"
    : `Lieferung nach Hause — ${lieferadresse || "Keine Adresse angegeben"}`;

  const itemsHtml = cart.items.map((item) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5">${item.name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:center">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right">${eur(item.price)}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:600">${eur(item.lineTotal)}</td>
    </tr>
  `).join("");

  const dateStr = date.toLocaleDateString("de-DE", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>FUSE-SHOP Beleg</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 20px; color: #1c1917; }
    .receipt { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; padding: 32px; }
    h1 { font-family: Georgia, serif; text-align: center; font-size: 24px; margin: 0 0 4px; }
    .date { text-align: center; color: #78716c; font-size: 13px; margin-bottom: 24px; }
    h2 { font-size: 14px; margin: 0 0 8px; color: #44403c; }
    .section { margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 13px; }
    .info-grid .label { color: #78716c; }
    .info-grid .value { font-weight: 500; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; padding: 8px 12px; border-bottom: 2px solid #d6d3d1; color: #78716c; font-weight: 500; }
    th:nth-child(2) { text-align: center; }
    th:nth-child(3), th:nth-child(4) { text-align: right; }
    .total-row { text-align: right; padding: 12px 0 0; border-top: 2px solid #1c1917; margin-top: 8px; }
    .total-row span { font-size: 18px; font-weight: 700; color: #d97706; }
    .order-id { text-align: center; font-size: 14px; color: #16a34a; font-weight: 600; margin-top: 16px; }
    .delivery { font-size: 13px; color: #44403c; background: #f5f5f4; padding: 8px 12px; border-radius: 8px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="receipt">
    <h1>FUSE-SHOP</h1>
    <p class="date">${dateStr}${orderId ? ` — Bestell-Nr: ${orderId}` : ""}</p>

    <div class="section">
      <h2>Kundendaten</h2>
      <div class="info-grid">
        <div><span class="label">Name:</span> <span class="value">${userData.name || "-"}</span></div>
        <div><span class="label">E-Mail:</span> <span class="value">${userData.email || "-"}</span></div>
        <div><span class="label">Adresse:</span> <span class="value">${addrTeile || "-"}</span></div>
        <div><span class="label">PLZ/Land:</span> <span class="value">${plzLand || "-"}</span></div>
        <div><span class="label">Telefon:</span> <span class="value">${userData.telefonNr || "-"}</span></div>
      </div>
    </div>

    <div class="section">
      <h2>Lieferung</h2>
      <div class="delivery">${deliveryText}</div>
    </div>

    <div class="section">
      <h2>Bestellte Produkte</h2>
      <table>
        <thead>
          <tr>
            <th>Produkt</th>
            <th>Menge</th>
            <th>Einzelpreis</th>
            <th>Gesamt</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div class="total-row">
        Gesamtsumme: <span>${eur(cart.totalAmount)}</span>
      </div>
    </div>

    ${orderId ? `<p class="order-id">Bestellung erfolgreich — ${orderId}</p>` : ""}
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `FUSE-SHOP_Beleg_${orderId || "entwurf"}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function closeReceiptModal() {
  receiptModal.classList.add("hidden");
  document.body.style.overflow = "";
  receiptConfirmBtn.disabled = false;
  receiptConfirmBtn.textContent = "Bestellung bestätigen";
  receiptError.classList.add("hidden");
}

receiptConfirmBtn.addEventListener("click", async () => {
  const { token, userId } = getSession();
  if (!token || !userId) return;

  const deliveryOption = document.querySelector('input[name="delivery"]:checked');
  const selbstabholung = deliveryOption ? deliveryOption.value === "abholung" : false;
  const lieferadresse = document.getElementById("delivery-address").value.trim();

  receiptConfirmBtn.disabled = true;
  receiptConfirmBtn.textContent = "Wird verarbeitet...";
  receiptError.classList.add("hidden");

  const result = await checkoutCart(userId, token, lieferadresse, selbstabholung);

  if (!result.success) {
    receiptConfirmBtn.disabled = false;
    receiptConfirmBtn.textContent = "Bestellung bestätigen";
    receiptError.textContent = result.error || "Bestellung fehlgeschlagen";
    receiptError.classList.remove("hidden");
    return;
  }

  receiptActions.classList.add("hidden");
  receiptData.orderId = result.orderId;
  document.getElementById("receipt-success-msg").textContent =
    `Vielen Dank! Ihre Bestellnummer lautet: ${result.orderId}`;
  receiptSuccess.classList.remove("hidden");

  await loadCart();
});

receiptCancelBtn.addEventListener("click", closeReceiptModal);

receiptCloseBtn.addEventListener("click", () => {
  closeReceiptModal();
  setMessage("Bestellung erfolgreich aufgegeben!");
});

receiptDownloadBtn.addEventListener("click", downloadReceipt);

receiptBackdrop.addEventListener("click", closeReceiptModal);

loadCart();

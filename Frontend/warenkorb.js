const cartItemsEl = document.getElementById("cart-items");
const summaryItemsEl = document.getElementById("summary-items");
const cartItemCountEl = document.getElementById("cart-item-count");
const cartTotalEl = document.getElementById("cart-total");
const clearCartBtn = document.getElementById("clear-cart-btn");
const messageEl = document.getElementById("cart-message");
const checkoutDeliveryBtn = document.getElementById("checkout-delivery-btn");
const checkoutPickupBtn = document.getElementById("checkout-pickup-btn");
const deliveryAddressWrapper = document.getElementById("delivery-address-wrapper");
const deliveryAddressSelect = document.getElementById("delivery-address-select");
const profileAddressLink = document.getElementById("profile-address-link");

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
let itemSelection = {};
let receiptData = null;

function getSession() {
  return {
    token: localStorage.getItem("userToken"),
    userId: localStorage.getItem("userId"),
  };
}

function eur(value) {
  return `EUR ${Number(value || 0).toFixed(2).replace(".", ",")}`;
}

function setMessage(text, isError = false) {
  messageEl.textContent = text;
  messageEl.classList.remove("hidden", "border-red-200", "bg-red-50", "text-red-700", "border-green-200", "bg-green-50", "text-green-700");
  messageEl.classList.add(isError ? "border-red-200" : "border-green-200", isError ? "bg-red-50" : "bg-green-50", isError ? "text-red-700" : "text-green-700");
}

function renderLoggedOut() {
  cartItemsEl.innerHTML = `<div class="bg-white rounded-2xl p-6 border border-stone-100"><h3 class="font-serif text-xl font-semibold text-stone-900 mb-3">Bitte melden Sie sich an</h3><a href="/Frontend/home.html" class="inline-flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white rounded-full px-6 py-3 text-sm font-medium">Zur Anmeldung</a></div>`;
  summaryItemsEl.innerHTML = "<p class='text-sm text-stone-500'>Keine Artikel im Warenkorb.</p>";
  cartItemCountEl.textContent = "0 Artikel";
  cartTotalEl.textContent = eur(0);
  clearCartBtn.classList.add("hidden");
  checkoutDeliveryBtn.classList.add("hidden");
  checkoutPickupBtn.classList.add("hidden");
}

function renderEmpty() {
  cartItemsEl.innerHTML = `<div class="bg-white rounded-2xl p-6 border border-stone-100"><h3 class="font-serif text-xl font-semibold text-stone-900 mb-3">Ihr Warenkorb ist leer</h3><a href="/Frontend/product.html" class="inline-flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white rounded-full px-6 py-3 text-sm font-medium">Produkte entdecken</a></div>`;
  summaryItemsEl.innerHTML = "<p class='text-sm text-stone-500'>Keine Artikel im Warenkorb.</p>";
  cartItemCountEl.textContent = "0 Artikel";
  cartTotalEl.textContent = eur(0);
  clearCartBtn.classList.add("hidden");
  checkoutDeliveryBtn.classList.add("hidden");
  checkoutPickupBtn.classList.add("hidden");
}

function getItemMode(item) {
  if (item.versand && item.selbstabholung) return itemSelection[item.productId] || "lieferung";
  if (item.versand) return "lieferung";
  return "abholung";
}

function renderItemCard(item) {
  const mode = getItemMode(item);
  const canDelivery = item.versand === true;
  const canPickup = item.selbstabholung === true;
  const showChooser = canDelivery && canPickup;

  return `<div class="bg-white rounded-2xl p-4 md:p-6 border border-stone-100 hover:border-amber-200 transition-colors"><div class="flex gap-4"><div class="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0"><img alt="${item.name}" class="w-full h-full object-cover" src="${item.imageUrl || `pics/${item.productId}.jpg`}"></div><div class="flex-1 min-w-0"><div class="flex items-start justify-between gap-2"><div><span class="text-xs text-green-700 font-medium">Produkt</span><h3 class="font-serif font-semibold text-stone-900 text-sm md:text-base mt-0.5">${item.name}</h3></div><button data-action="remove" data-product-id="${item.productId}" class="text-stone-400 hover:text-red-500 transition-colors p-1" aria-label="Artikel entfernen">✕</button></div><div class="mt-3 flex items-center justify-between gap-4"><div class="flex items-center gap-2 border border-stone-200 rounded-full"><button data-action="decrease" data-product-id="${item.productId}" class="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-900">-</button><span class="w-8 text-center text-sm font-medium">${item.quantity}</span><button data-action="increase" data-product-id="${item.productId}" class="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-stone-900">+</button></div><span class="font-mono font-semibold text-amber-600">${eur(item.lineTotal)}</span></div><div class="mt-3">${showChooser ? `<div class="inline-flex rounded-full border border-stone-200 overflow-hidden"><button data-action="mode" data-product-id="${item.productId}" data-mode="lieferung" class="px-3 py-1.5 text-xs ${mode === "lieferung" ? "bg-amber-100 text-amber-800" : "bg-white text-stone-600"}">Lieferung</button><button data-action="mode" data-product-id="${item.productId}" data-mode="abholung" class="px-3 py-1.5 text-xs ${mode === "abholung" ? "bg-green-100 text-green-800" : "bg-white text-stone-600"}">Selbstabholung</button></div>` : `<div class="inline-flex gap-2"><span class="px-2.5 py-1 rounded-full text-xs ${canDelivery ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-400"}">Lieferung</span><span class="px-2.5 py-1 rounded-full text-xs ${canPickup ? "bg-green-100 text-green-800" : "bg-stone-100 text-stone-400"}">Selbstabholung</span></div>`}</div></div></div></div>`;
}

function getSelectedGroups() {
  const items = currentCart?.items || [];
  const delivery = [];
  const pickup = [];
  for (const item of items) {
    const mode = getItemMode(item);
    if (mode === "lieferung" && item.versand) delivery.push(item);
    else if (mode === "abholung" && item.selbstabholung) pickup.push(item);
    else if (item.versand) delivery.push(item);
    else if (item.selbstabholung) pickup.push(item);
  }
  return { delivery, pickup };
}

function updateCheckoutState() {
  const { delivery, pickup } = getSelectedGroups();
  checkoutDeliveryBtn.classList.toggle("hidden", delivery.length === 0);
  checkoutPickupBtn.classList.toggle("hidden", pickup.length === 0);
  deliveryAddressWrapper.classList.toggle("hidden", delivery.length === 0);
}

function renderCart(cart) {
  currentCart = cart;
  const items = Array.isArray(cart?.items) ? cart.items : [];
  if (items.length === 0) return renderEmpty();

  clearCartBtn.classList.remove("hidden");
  cartItemCountEl.textContent = `${cart.totalItems} Artikel`;
  cartTotalEl.textContent = eur(cart.totalAmount);

  for (const item of items) {
    if (!itemSelection[item.productId] && item.versand && item.selbstabholung) itemSelection[item.productId] = "lieferung";
  }

  const onlyDelivery = items.filter((i) => i.versand && !i.selbstabholung);
  const bothPossible = items.filter((i) => i.versand && i.selbstabholung);
  const onlyPickup = items.filter((i) => !i.versand && i.selbstabholung);
  const section = (title, list) => list.length ? `<div class="mb-6"><div class="flex items-center gap-3 mb-3"><h3 class="font-serif text-lg text-stone-900">${title}</h3><div class="h-px bg-stone-200 flex-1"></div></div><div class="space-y-4">${list.map(renderItemCard).join("")}</div></div>` : "";

  cartItemsEl.innerHTML = `${section("Nur Lieferung", onlyDelivery)}${section("Lieferung oder Selbstabholung", bothPossible)}${section("Nur Selbstabholung", onlyPickup)}`;
  summaryItemsEl.innerHTML = items.map((item) => `<div class="flex justify-between text-sm"><span class="text-stone-600 truncate mr-2">${item.name} x${item.quantity}</span><span class="text-stone-900 font-medium flex-shrink-0">${eur(item.lineTotal)}</span></div>`).join("");
  updateCheckoutState();
}

async function loadAddressOptions() {
  const { userId } = getSession();
  if (!userId) return;
  const user = await fetchUserProfile(userId);
  const parts = [user?.strasse, user?.hausnummer, user?.postleitzahl, user?.land].filter(Boolean).map((v) => String(v).trim()).filter(Boolean);
  deliveryAddressSelect.innerHTML = "";
  if (parts.length === 0) {
    profileAddressLink.classList.remove("hidden");
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Keine Lieferadresse gespeichert";
    deliveryAddressSelect.appendChild(opt);
    return;
  }
  profileAddressLink.classList.add("hidden");
  const joined = parts.join(" ");
  const opt = document.createElement("option");
  opt.value = joined;
  opt.textContent = joined;
  deliveryAddressSelect.appendChild(opt);
}

async function loadCart() {
  const { token, userId } = getSession();
  if (!token || !userId) return renderLoggedOut();
  const result = await fetchCart(userId, token);
  if (!result.success) {
    setMessage(result.error || "Warenkorb konnte nicht geladen werden", true);
    return renderEmpty();
  }
  renderCart(result.cart);
  await loadAddressOptions();
}

async function updateItem(productId, nextQuantity) {
  const { token, userId } = getSession();
  if (!token || !userId) return;
  const result = await setCartQuantity(userId, token, productId, nextQuantity);
  if (!result.success) setMessage(result.error || "Aktion fehlgeschlagen", true);
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

  if (action === "mode") {
    itemSelection[productId] = target.getAttribute("data-mode") || "lieferung";
    renderCart(currentCart);
    return;
  }
  if (action === "increase") return await updateItem(productId, item.quantity + 1);
  if (action === "decrease") return await updateItem(productId, Math.max(0, item.quantity - 1));
  if (action === "remove") {
    const { token, userId } = getSession();
    const result = await removeCartItemApi(userId, token, productId);
    if (!result.success) setMessage(result.error || "Produkt konnte nicht entfernt werden", true);
    delete itemSelection[productId];
    await loadCart();
  }
});

clearCartBtn.addEventListener("click", async () => {
  if (!currentCart?.items?.length) return;
  const { token, userId } = getSession();
  for (const item of currentCart.items) await removeCartItemApi(userId, token, item.productId);
  itemSelection = {};
  await loadCart();
  setMessage("Warenkorb wurde geleert.");
});

async function doCheckout(selbstabholung) {
  const { token, userId } = getSession();
  if (!token || !userId) return renderLoggedOut();
  const groups = getSelectedGroups();
  const selected = selbstabholung ? groups.pickup : groups.delivery;
  if (selected.length === 0) return;

  const lieferadresse = selbstabholung ? "" : (deliveryAddressSelect.value || "").trim();
  if (!selbstabholung && !lieferadresse) return setMessage("Bitte zuerst eine Lieferadresse im Profil speichern.", true);

  const userData = await fetchUserProfile(userId);
  if (!userData) return setMessage("Benutzerdaten konnten nicht geladen werden", true);

  showReceiptModal(
    userData,
    { items: selected, totalAmount: selected.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0) },
    selbstabholung,
    lieferadresse,
    selected.map((item) => item.productId),
  );
}

checkoutDeliveryBtn.addEventListener("click", async () => await doCheckout(false));
checkoutPickupBtn.addEventListener("click", async () => await doCheckout(true));

function showReceiptModal(userData, cart, selbstabholung, lieferadresse, productIds) {
  receiptData = { userData, cart, selbstabholung, lieferadresse, productIds, date: new Date(), orderId: null };
  receiptSuccess.classList.add("hidden");
  receiptError.classList.add("hidden");
  receiptActions.classList.remove("hidden");
  receiptDate.textContent = new Date().toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const addrTeile = [userData.strasse, userData.hausnummer].filter(Boolean).join(" ");
  const plzLand = [userData.postleitzahl, userData.land].filter(Boolean).join(" ");
  receiptCustomer.innerHTML = `<div><span class="text-stone-500">Name:</span> <span class="font-medium">${userData.name || "-"}</span></div><div><span class="text-stone-500">E-Mail:</span> ${userData.email || "-"}</div><div><span class="text-stone-500">Adresse:</span> ${addrTeile || "-"}</div><div><span class="text-stone-500">PLZ/Land:</span> ${plzLand || "-"}</div><div><span class="text-stone-500">Telefon:</span> ${userData.telefonNr || "-"}</div>`;
  receiptDelivery.textContent = selbstabholung ? "Selbstabholung" : `Lieferung nach Hause — ${lieferadresse || "Keine Adresse angegeben"}`;
  receiptItems.innerHTML = cart.items.map((item) => `<tr class="border-b border-stone-100"><td class="py-2.5 pr-4">${item.name}</td><td class="py-2.5 text-center">${item.quantity}</td><td class="py-2.5 text-right">${eur(item.price)}</td><td class="py-2.5 text-right font-medium">${eur(item.lineTotal)}</td></tr>`).join("");
  receiptTotal.textContent = eur(cart.totalAmount);
  receiptModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function downloadReceipt() {
  if (!receiptData) return;
  const { userData, cart, selbstabholung, lieferadresse, date, orderId } = receiptData;
  const addrTeile = [userData.strasse, userData.hausnummer].filter(Boolean).join(" ");
  const plzLand = [userData.postleitzahl, userData.land].filter(Boolean).join(" ");
  const deliveryText = selbstabholung ? "Selbstabholung" : `Lieferung nach Hause — ${lieferadresse || "Keine Adresse angegeben"}`;
  const itemsHtml = cart.items.map((item) => `<tr><td style="padding:8px 12px;border-bottom:1px solid #e5e5e5">${item.name}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:center">${item.quantity}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right">${eur(item.price)}</td><td style="padding:8px 12px;border-bottom:1px solid #e5e5e5;text-align:right;font-weight:600">${eur(item.lineTotal)}</td></tr>`).join("");
  const dateStr = date.toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><title>FUSE-SHOP Beleg</title></head><body><h1>FUSE-SHOP</h1><p>${dateStr}${orderId ? ` — Bestell-Nr: ${orderId}` : ""}</p><p>${deliveryText}</p><p>${userData.name || "-"}, ${userData.email || "-"}, ${addrTeile || "-"}, ${plzLand || "-"}</p><table><tbody>${itemsHtml}</tbody></table><p>Gesamtsumme: ${eur(cart.totalAmount)}</p></body></html>`;
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
  if (!token || !userId || !receiptData) return;

  receiptConfirmBtn.disabled = true;
  receiptConfirmBtn.textContent = "Wird verarbeitet...";
  receiptError.classList.add("hidden");

  const result = await checkoutCart(userId, token, receiptData.lieferadresse, receiptData.selbstabholung, receiptData.productIds || []);
  if (!result.success) {
    receiptConfirmBtn.disabled = false;
    receiptConfirmBtn.textContent = "Bestellung bestätigen";
    receiptError.textContent = result.error || "Bestellung fehlgeschlagen";
    receiptError.classList.remove("hidden");
    return;
  }

  receiptActions.classList.add("hidden");
  receiptData.orderId = result.orderId;
  document.getElementById("receipt-success-msg").textContent = `Vielen Dank! Ihre Bestellnummer lautet: ${result.orderId}`;
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

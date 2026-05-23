const cartItemsEl = document.getElementById("cart-items");
const summaryItemsEl = document.getElementById("summary-items");
const cartItemCountEl = document.getElementById("cart-item-count");
const cartTotalEl = document.getElementById("cart-total");
const checkoutBtn = document.getElementById("checkout-btn");
const clearCartBtn = document.getElementById("clear-cart-btn");
const messageEl = document.getElementById("cart-message");

let currentCart = null;

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

  const deliveryOption = document.querySelector('input[name="delivery"]:checked');
  const selbstabholung = deliveryOption ? deliveryOption.value === "abholung" : false;
  const lieferadresse = document.getElementById("delivery-address").value.trim();

  checkoutBtn.disabled = true;
  const result = await checkoutCart(userId, token, lieferadresse, selbstabholung);
  checkoutBtn.disabled = false;

  if (!result.success) {
    setMessage(result.error || "Checkout fehlgeschlagen", true);
    return;
  }

  await loadCart();
  setMessage(`Danke für Ihren Einkauf! Bestellnummer: ${result.orderId}`);
});

loadCart();

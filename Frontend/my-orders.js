document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("userToken");
  const userId = localStorage.getItem("userId");
  if (!token || !userId) {
    window.location.href = "/Frontend/home.html";
    return;
  }

  const valid = await validateSession(token, userId);
  if (!valid) {
    window.location.href = "/Frontend/home.html";
    return;
  }

  await loadOrders();
});

async function loadOrders() {
  const userId = localStorage.getItem("userId");
  const container = document.getElementById("ordersContainer");
  container.innerHTML = "<p class='text-stone-500'>Bestellungen werden geladen...</p>";

  const result = await getAllUserOrders(userId);
  if (!result.success) {
    container.innerHTML = "<p class='text-red-600'>Bestellungen konnten nicht geladen werden.</p>";
    return;
  }

  const orders = result.orders || [];
  if (orders.length === 0) {
    container.innerHTML = "<div class='bg-white border border-stone-200 rounded-2xl p-6 text-stone-500'>Noch keine Bestellungen vorhanden.</div>";
    return;
  }

  container.innerHTML = orders.map((order) => {
    const date = new Date(order.datum).toLocaleString("de-AT");
    const mode = order.Selbstabholung ? "Selbstabholung" : "Lieferung";
    const address = order.lieferadresse ? `<p class="text-sm text-stone-700 mt-2"><span class="font-medium">Lieferadresse:</span> ${escapeHtml(order.lieferadresse)}</p>` : "";
    const products = (order.produkte || []).map((p) => `<li class="text-sm text-stone-700">Produkt-ID: ${escapeHtml(p.produktId)} - Menge: ${p.menge}</li>`).join("");

    return `<article class="bg-white rounded-2xl border border-stone-200 p-6"><div class="flex items-start justify-between gap-3"><div><h2 class="font-serif text-lg font-semibold text-stone-900">Bestellung ${escapeHtml(order.bestellId)}</h2><p class="text-sm text-stone-500">${date}</p></div><span class="text-xs px-3 py-1 rounded-full ${order.Selbstabholung ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}">${mode}</span></div>${address}<p class="mt-3 font-semibold text-amber-700">Gesamt: EUR ${Number(order.gesamtbetrag || 0).toFixed(2).replace(".", ",")}</p><ul class="mt-3 space-y-1 border-t border-stone-100 pt-3">${products}</ul></article>`;
  }).join("");
}

function escapeHtml(str) {
  const el = document.createElement("div");
  el.textContent = str || "";
  return el.innerHTML;
}

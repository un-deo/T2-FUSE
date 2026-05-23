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

  await loadSellerOrders();
});

async function loadSellerOrders() {
  const userId = localStorage.getItem("userId");
  const container = document.getElementById("ordersContainer");
  container.innerHTML = `<div class="text-center py-12 text-stone-500"><p class="text-lg">Bestellungen werden geladen...</p></div>`;

  const result = await fetchSellerOrders(userId);

  container.innerHTML = "";

  if (!result.success) {
    container.innerHTML = `
      <div class="text-center py-12 text-stone-500">
        <p class="text-lg">Fehler beim Laden der Bestellungen.</p>
      </div>`;
    return;
  }

  if (!result.orders || result.orders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-12 text-stone-500">
        <p class="text-lg">Noch keine Bestellungen eingegangen.</p>
        <p class="text-sm mt-1">Sobald ein Käufer eines deiner Produkte bestellt, wird es hier angezeigt.</p>
      </div>`;
    return;
  }

  result.orders.forEach((order) => {
    const card = renderOrderCard(order);
    container.appendChild(card);
  });
}

function renderOrderCard(order) {
  const div = document.createElement("div");
  div.className = "bg-white rounded-xl border border-stone-200 overflow-hidden";

  const datum = new Date(order.datum);
  const datumStr = datum.toLocaleDateString("de-AT", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const lieferoption = order.Selbstabholung
    ? "Selbstabholung"
    : "Lieferung";

  const lieferadresseHtml = order.lieferadresse
    ? `<p class="text-sm text-stone-700"><span class="font-medium">Lieferadresse:</span> ${escapeHtml(order.lieferadresse)}</p>`
    : "";

  const kaeufer = order.kaeufer;
  const kaeuferAdresse = [
    kaeufer.strasse,
    kaeufer.hausnummer,
    kaeufer.postleitzahl,
    kaeufer.land,
  ].filter(Boolean).join(" ");

  const produkteHtml = order.produkte.map((p) => {
    const imgHtml = p.bildUrl
      ? `<img src="${p.bildUrl}" alt="${escapeHtml(p.name)}" class="w-16 h-16 object-cover rounded-lg" />`
      : `<div class="w-16 h-16 bg-stone-100 rounded-lg flex items-center justify-center text-stone-400 text-xs">Bild</div>`;
    return `
      <div class="flex items-center gap-4 py-2">
        ${imgHtml}
        <div class="flex-1">
          <p class="font-medium text-stone-900">${escapeHtml(p.name)}</p>
          <p class="text-sm text-stone-500">Menge: ${p.menge} × €${Number(p.preis).toFixed(2)}</p>
        </div>
        <p class="font-mono font-semibold text-amber-600">€${(Number(p.preis) * p.menge).toFixed(2)}</p>
      </div>`;
  }).join("");

  div.innerHTML = `
    <div class="p-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h3 class="font-serif text-lg font-bold text-stone-900">Bestellung vom ${datumStr}</h3>
          <p class="text-sm text-stone-500">Bestell-ID: ${order.bestellId}</p>
        </div>
        <div class="text-right">
          <p class="font-mono text-xl font-bold text-amber-600">€${Number(order.gesamtbetrag).toFixed(2)}</p>
          <span class="inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${
            order.Selbstabholung
              ? "bg-blue-100 text-blue-700"
              : "bg-green-100 text-green-700"
          }">${lieferoption}</span>
        </div>
      </div>

      ${lieferadresseHtml}

      <div class="border-t border-stone-100 mt-4 pt-4">
        <div class="space-y-1">
          ${produkteHtml}
        </div>
      </div>

      <div class="border-t border-stone-100 mt-4 pt-4">
        <p class="text-sm font-semibold text-stone-900 mb-2">Käufer-Kontaktdaten</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-stone-700">
          <p><span class="font-medium">Name:</span> ${escapeHtml(kaeufer.name)}</p>
          <p><span class="font-medium">E-Mail:</span> ${escapeHtml(kaeufer.email)}</p>
          ${kaeufer.telefonNr ? `<p><span class="font-medium">Telefon:</span> ${escapeHtml(kaeufer.telefonNr)}</p>` : ""}
          ${kaeuferAdresse ? `<p class="md:col-span-2"><span class="font-medium">Adresse:</span> ${escapeHtml(kaeuferAdresse)}</p>` : ""}
        </div>
      </div>
    </div>
  `;

  return div;
}

function escapeHtml(str) {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

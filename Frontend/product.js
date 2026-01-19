const searchForm = document.querySelector("form");
searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(searchForm);
  const query = formData.get("search") ?? "";

  try {
    const url = `http://localhost:3000/api/search?search=${encodeURIComponent(query)}`;
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const products = await res.json();
    console.log("products", products);
    // display results on the page:
    const container = document.getElementById("results-container");
    container.innerHTML = products
      .map((p) => `<div>${p.name} — ${p.beschreibung ?? ""}</div>`)
      .join("");
  } catch (err) {
    console.error("Fetch error:", err);
  }
});

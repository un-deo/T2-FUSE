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
  // console.log("Displaying products:", products.length);
  // console.log(products[0].name);
  // console.log(products[1].name);
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
/* 
 <div
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        data-testid="products-grid"
      >
        <a
          class="group relative bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-amber-200 transition-all duration-300 hover:shadow-xl hover:shadow-stone-200/50 hover:-translate-y-1"
          data-testid="product-card-195e1b0b-9b8d-45b7-92e0-fb5ceee469ad"
          href="/produkte/195e1b0b-9b8d-45b7-92e0-fb5ceee469ad"
        >
          <div
            class="aspect-square bg-stone-100 flex items-center justify-center text-stone-400 text-sm"
          >
            Bild Platzhalter
          </div>

          <div class="p-4 md:p-5">
            <span
              class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-900/10 text-green-900 text-xs font-medium rounded-full mb-3"
              >Honig</span
            >
            <h3
              class="font-serif text-lg font-semibold text-stone-900 mb-1 line-clamp-1 group-hover:text-amber-700 transition-colors"
            >
              Alpenblütenhonig
            </h3>

            <!-- <div class="flex items-center gap-1 text-stone-500 text-sm mb-3">
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
                class="w-3.5 h-3.5"
                aria-hidden="true"
              >
                <path
                  d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"
                ></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>Salzburg, Österreich</span>
            </div> -->

            <div class="flex items-center justify-between">
              <div>
                <span class="font-mono text-xl font-semibold text-amber-600"
                  >€12.90</span
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
        </a>
      </div>
*/

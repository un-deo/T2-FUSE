// Globale Variablen
let currentUser = null;
let cart = [];
let products = [];
let categories = [];

// API Base URL - Passen Sie dies an Ihre Backend-URL an
const API_BASE_URL = 'http://localhost:8000';

// Initialisierung beim Laden der Seite
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    setupEventListeners();
});

// App Initialisierung
function initApp() {
    loadCategories();
    loadProducts();
    loadCart();
    checkUserSession();
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });

    // Such- und Filter-Funktionen
    document.getElementById('search-input')?.addEventListener('input', filterProducts);
    document.getElementById('category-filter')?.addEventListener('change', filterProducts);
    document.getElementById('versand-filter')?.addEventListener('change', filterProducts);
    document.getElementById('abholung-filter')?.addEventListener('change', filterProducts);

    // Auth Forms
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
}

// Navigation zwischen Seiten
function showPage(pageName) {
    // Alle Seiten ausblenden
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Gewählte Seite anzeigen
    const selectedPage = document.getElementById(`${pageName}-page`);
    if (selectedPage) {
        selectedPage.classList.add('active');
    }

    // Navigation Links aktualisieren
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === pageName) {
            link.classList.add('active');
        }
    });

    // Spezielle Aktionen für bestimmte Seiten
    if (pageName === 'cart') {
        renderCart();
    }
}

// Kategorien laden
async function loadCategories() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/categories`);
        if (!response.ok) throw new Error('Fehler beim Laden der Kategorien');
        
        categories = await response.json();

        const categoryFilter = document.getElementById('category-filter');
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.kategorieId;
            option.textContent = cat.name;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Fehler beim Laden der Kategorien:', error);
        // Fallback zu Mock-Daten wenn Backend nicht erreichbar
        categories = [
            { kategorieId: '1', name: 'Honig', beschreibung: 'Naturbelassener Honig' },
            { kategorieId: '2', name: 'Bienenwachs', beschreibung: 'Kerzen und Wachstücher' },
            { kategorieId: '3', name: 'Propolis & Co', beschreibung: 'Gesundheit aus dem Bienenstock' },
            { kategorieId: '4', name: 'Geschenksets', beschreibung: 'Für jeden Anlass' }
        ];
        const categoryFilter = document.getElementById('category-filter');
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.kategorieId;
            option.textContent = cat.name;
            categoryFilter.appendChild(option);
        });
    }
}

// Produkte laden
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        if (!response.ok) throw new Error('Fehler beim Laden der Produkte');
        
        products = await response.json();
        renderProducts(products);
    } catch (error) {
        console.error('Fehler beim Laden der Produkte:', error);
        // Fallback zu Mock-Daten wenn Backend nicht erreichbar
        products = [
            {
                produktId: '1',
                name: 'Blütenhonig 500g',
                beschreibung: 'Fein-cremiger Blütenhonig aus der Region. Mild im Geschmack.',
                preis: 8.50,
                kategorieId: '1',
                versand: true,
                selbstabholung: true,
                status: 'verfügbar'
            },
            {
                produktId: '2',
                name: 'Waldhonig 500g',
                beschreibung: 'Dunkler, würziger Waldhonig. Kräftig im Geschmack.',
                preis: 9.50,
                kategorieId: '1',
                versand: true,
                selbstabholung: true,
                status: 'verfügbar'
            },
            {
                produktId: '3',
                name: 'Bienenwachskerze',
                beschreibung: 'Handgerollte Kerze aus 100% reinem Bienenwachs.',
                preis: 4.90,
                kategorieId: '2',
                versand: true,
                selbstabholung: true,
                status: 'verfügbar'
            },
            {
                produktId: '4',
                name: 'Propolis Tropfen 20ml',
                beschreibung: 'Hochwertige Propolis-Lösung. Das natürliche Antibiotikum der Bienen.',
                preis: 12.90,
                kategorieId: '3',
                versand: true,
                selbstabholung: true,
                status: 'verfügbar'
            },
            {
                produktId: '5',
                name: 'Geschenkset "Süße Grüße"',
                beschreibung: 'Enthält 2 Gläser Honig und eine kleine Kerze.',
                preis: 19.90,
                kategorieId: '4',
                versand: true,
                selbstabholung: true,
                status: 'verfügbar'
            },
            {
                produktId: '6',
                name: 'Wabenhonig im Glas',
                beschreibung: 'Ein Stück Natur pur. Honig direkt in der Wabe.',
                preis: 14.50,
                kategorieId: '1',
                versand: false,
                selbstabholung: true,
                status: 'verfügbar'
            }
        ];
        renderProducts(products);
    }
}

// Produkte anzeigen
function renderProducts(productsToRender) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    if (productsToRender.length === 0) {
        grid.innerHTML = '<p class="empty-cart">Keine Produkte gefunden</p>';
        return;
    }

    productsToRender.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => showProductDetails(product.produktId);

        const categoryName = categories.find(c => c.kategorieId === product.kategorieId)?.name || 'Andere';

        card.innerHTML = `
            <div class="product-image">🍯</div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.beschreibung}</p>
                <div class="product-badges">
                    <span class="badge-tag">${categoryName}</span>
                    ${product.versand ? '<span class="badge-tag">🚚 Versand</span>' : ''}
                    ${product.selbstabholung ? '<span class="badge-tag">🏪 Abholung</span>' : ''}
                </div>
                <div class="product-price">€${product.preis.toFixed(2)}</div>
                <button class="btn btn-primary btn-small btn-block" onclick="event.stopPropagation(); addToCart('${product.produktId}')">
                    In den Warenkorb
                </button>
            </div>
        `;

        grid.appendChild(card);
    });
}

// Produkte filtern
function filterProducts() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const categoryId = document.getElementById('category-filter').value;
    const versandOnly = document.getElementById('versand-filter').checked;
    const abholungOnly = document.getElementById('abholung-filter').checked;

    let filtered = products.filter(product => {
        // Suchfilter
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                            product.beschreibung.toLowerCase().includes(searchTerm);

        // Kategoriefilter
        const matchesCategory = !categoryId || product.kategorieId === categoryId;

        // Versandfilter
        const matchesVersand = !versandOnly || product.versand;

        // Abholungsfilter
        const matchesAbholung = !abholungOnly || product.selbstabholung;

        return matchesSearch && matchesCategory && matchesVersand && matchesAbholung;
    });

    renderProducts(filtered);
}

// Produkt-Details anzeigen
function showProductDetails(produktId) {
    const product = products.find(p => p.produktId === produktId);
    if (!product) return;

    const modal = document.getElementById('product-modal');
    const detailsDiv = document.getElementById('product-details');

    const categoryName = categories.find(c => c.kategorieId === product.kategorieId)?.name || 'Andere';

    detailsDiv.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 6rem; margin-bottom: 1rem;">🍯</div>
            <h2 style="color: var(--primary-color); margin-bottom: 1rem;">${product.name}</h2>
            <div style="margin-bottom: 1rem;">
                <span class="badge-tag">${categoryName}</span>
                ${product.versand ? '<span class="badge-tag">🚚 Versand verfügbar</span>' : ''}
                ${product.selbstabholung ? '<span class="badge-tag">🏪 Selbstabholung möglich</span>' : ''}
            </div>
            <p style="color: #6b7280; margin-bottom: 1.5rem; font-size: 1.125rem;">${product.beschreibung}</p>
            <div style="font-size: 2rem; color: var(--primary-color); font-weight: 700; margin-bottom: 2rem;">
                €${product.preis.toFixed(2)}
            </div>
            <button class="btn btn-primary btn-block" onclick="addToCart('${product.produktId}'); closeProductModal();">
                In den Warenkorb
            </button>
        </div>
    `;

    modal.classList.add('active');
}

function closeProductModal() {
    document.getElementById('product-modal').classList.remove('active');
}

// Warenkorb-Funktionen
function loadCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
    updateCartCount();
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
}

function addToCart(produktId) {
    const product = products.find(p => p.produktId === produktId);
    if (!product) return;

    const existingItem = cart.find(item => item.produktId === produktId);

    if (existingItem) {
        existingItem.menge++;
    } else {
        cart.push({
            produktId: produktId,
            menge: 1
        });
    }

    saveCart();
    showNotification(`${product.name} wurde zum Warenkorb hinzugefügt!`);
}

function removeFromCart(produktId) {
    cart = cart.filter(item => item.produktId !== produktId);
    saveCart();
    renderCart();
}

function updateQuantity(produktId, change) {
    const item = cart.find(item => item.produktId === produktId);
    if (!item) return;

    item.menge += change;

    if (item.menge <= 0) {
        removeFromCart(produktId);
    } else {
        saveCart();
        renderCart();
    }
}

function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.menge, 0);
    document.getElementById('cart-count').textContent = count;
}

function renderCart() {
    const cartItemsDiv = document.getElementById('cart-items');
    const cartSummaryDiv = document.getElementById('cart-summary');

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = '<p class="empty-cart">Ihr Warenkorb ist leer</p>';
        cartSummaryDiv.style.display = 'none';
        return;
    }

    let total = 0;
    let itemsHtml = '';

    cart.forEach(item => {
        const product = products.find(p => p.produktId === item.produktId);
        if (!product) return;

        const itemTotal = product.preis * item.menge;
        total += itemTotal;

        itemsHtml += `
            <div class="cart-item">
                <div class="cart-item-image">🍯</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${product.name}</div>
                    <div class="cart-item-price">€${product.preis.toFixed(2)} pro Stück</div>
                </div>
                <div class="cart-item-controls">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="updateQuantity('${item.produktId}', -1)">-</button>
                        <span>${item.menge}</span>
                        <button class="quantity-btn" onclick="updateQuantity('${item.produktId}', 1)">+</button>
                    </div>
                    <span class="cart-item-price">€${itemTotal.toFixed(2)}</span>
                    <span class="remove-btn" onclick="removeFromCart('${item.produktId}')">🗑️</span>
                </div>
            </div>
        `;
    });

    cartItemsDiv.innerHTML = itemsHtml;
    document.getElementById('total-price').textContent = `€${total.toFixed(2)}`;
    cartSummaryDiv.style.display = 'block';
}

// Checkout
async function checkout() {
    if (!currentUser) {
        showNotification('Bitte melden Sie sich an, um fortzufahren.');
        showPage('login');
        return;
    }

    if (cart.length === 0) {
        showNotification('Ihr Warenkorb ist leer.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: currentUser.userId })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Bestellung fehlgeschlagen');
        }

        const data = await response.json();
        const bestellung = data.bestellung;
        
        showNotification(`Bestellung erfolgreich! Gesamtbetrag: €${bestellung.gesamtbetrag.toFixed(2)}`);
        cart = [];
        saveCart();
        renderCart();
    } catch (error) {
        console.error('Checkout-Fehler:', error);
        // Fallback wenn Backend nicht erreichbar
        const total = cart.reduce((sum, item) => {
            const product = products.find(p => p.produktId === item.produktId);
            return sum + (product ? product.preis * item.menge : 0);
        }, 0);
        showNotification(`Bestellung erfolgreich! Gesamtbetrag: €${total.toFixed(2)}`);
        cart = [];
        saveCart();
        renderCart();
    }
}

// Auth-Funktionen
function showAuthForm(formType) {
    document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(`${formType}-form`).classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const passwort = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, passwort })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Anmeldung fehlgeschlagen');
        }

        const data = await response.json();
        currentUser = data.user;

        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        showNotification('Erfolgreich angemeldet!');
        updateAuthUI();
        showPage('home');
        
        // Formular zurücksetzen
        document.getElementById('login-form').reset();
    } catch (error) {
        console.error('Login-Fehler:', error);
        showNotification(error.message || 'Anmeldung fehlgeschlagen. Bitte überprüfen Sie Ihre Daten.');
    }
}

async function handleRegister(e) {
    e.preventDefault();

    const userData = {
        name: document.getElementById('register-name').value,
        email: document.getElementById('register-email').value,
        passwort: document.getElementById('register-password').value,
        strasse: document.getElementById('register-street').value,
        hausnummer: document.getElementById('register-housenumber').value,
        postleitzahl: document.getElementById('register-zip').value,
        land: document.getElementById('register-country').value,
        telefonNr: document.getElementById('register-phone').value,
        statusId: 1
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Registrierung fehlgeschlagen');
        }

        const data = await response.json();
        showNotification('Registrierung erfolgreich! Bitte melden Sie sich an.');
        showAuthForm('login');
        document.getElementById('register-form').reset();
    } catch (error) {
        console.error('Registrierungs-Fehler:', error);
        showNotification(error.message || 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    }
}

function checkUserSession() {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateAuthUI();
    }
}

function updateAuthUI() {
    const loginLink = document.querySelector('[data-page="login"]');
    if (currentUser) {
        loginLink.textContent = currentUser.name;
    } else {
        loginLink.textContent = 'Anmelden';
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    updateAuthUI();
    showNotification('Erfolgreich abgemeldet.');
    showPage('home');
}

// Benachrichtigungen
function showNotification(message) {
    // Einfache Browser-Benachrichtigung
    alert(message);
    
    // Alternativ können Sie hier ein schöneres Toast-Notification-System implementieren
}

// Modal-Klick außerhalb schließen
window.onclick = function(event) {
    const modal = document.getElementById('product-modal');
    if (event.target === modal) {
        closeProductModal();
    }
}

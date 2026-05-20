# Frontend Fetch API Reference

This document describes all functions and inline fetch usages in the Frontend folder that fetch, edit, or set data. Each entry has:
- File(s) where it appears
- Endpoint and HTTP method
- Signature
- Short description
- Example usage (async/await)
- Example response (inferred)
- Notes

Base URL used across the Frontend (hard-coded): `http://localhost:3000/api`

> Notes: examples use async/await. Some code in the repository uses Promise `.then` chaining; the async examples below are the equivalent and recommended.

## Overview

Click a function to jump to its detailed description.

- [fetchUserProfile(userId)](#fetchUserProfile)
- [validateSession(token, userId)](#validateSession)
- [ValidatePassword(userId, password)](#ValidatePassword)
- [fetchMyProducts(userId)](#fetchMyProducts)
- [updatePassword(userId, oldPassword, newPassword)](#updatePassword)
- [updateUserData(userId, dataToUpdate)](#updateUserData)
- [deleteMyProduct(productId, userID)](#deleteMyProduct)
- [updateMyProduct(...)](#updateMyProduct)
- [deleteUser(userId)](#deleteUser)
- [getAllUserDashboardData(userId)](#getAllUserDashboardData)
- [getAllProductsForAdminDashboard(userId)](#getAllProductsForAdminDashboard)
- [Search (form submit) - /api/search?search=](#search)
- [loadRandomProducts()](#loadRandomProducts)
- [handleLogin (inline POST /api/login)](#handleLogin)
- [handleRegister (inline POST /api/register)](#handleRegister)
- [seller.js fetch /api/search?kategorie=all](#sellerSearch)
 - [createProduct(...)](#createProduct)
 - [uploadImage(file)](#uploadImage)
 - [addToCart(userId, productId, amount)](#addToCart_simple)
 - [addToCart (token variant)](#addToCart_token)
 - [removeFromCart(userId, productId, amount)](#removeFromCart)
 - [fetchCart(userId, token)](#fetchCart)
 - [setCartQuantity(userId, token, productId, quantity)](#setCartQuantity)
 - [removeCartItemApi(userId, token, productId)](#removeCartItemApi)
 - [checkoutCart(userId, token)](#checkoutCart)
 - [requestSellerStatus(userId)](#requestSellerStatus)
 - [getAllSellerRoleRequests(userId)](#getAllSellerRoleRequests)
 - [processSellerRoleRequest(requestId, status, comment)](#processSellerRoleRequest)
 - [getAllUserOrders(userId)](#getAllUserOrders)

---

<a id="fetchUserProfile"></a>
### fetchUserProfile(userId)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/user-data
- **Signature:** async function fetchUserProfile(userId)
- **Description:** Retrieves profile data for the given `userId`. Returns the `user` object when successful.

Example

```js
const user = await fetchUserProfile('3adcacff-511a-4c90-96a6-84f7f50b1b0a');
console.log(user.name);
```

Example response (inferred)

```json
{
  "success": true,
  "user": {
    "userId": "3adc...",
    "name": "Dejan",
    "email": "dejan@example.com",
    "telefonNr": "012345",
    "strasse": "Example Street",
    "hausnummer": "1",
    "postleitzahl": "1010",
    "land": "AT"
  }
}
```

- **Notes:** The function logs and returns `result.user`. On network error it logs and returns `undefined`.

---

<a id="validateSession"></a>
### validateSession(token, userId)

- **File(s):** Frontend/api.js, Frontend/seller.js (duplicate implementations)
- **Endpoint:** POST http://localhost:3000/api/validate-token
- **Signature:** async function validateSession(token, userId)
- **Description:** Validates a session token for a user. Returns `true` when `response.ok` and `data.success` are true; otherwise returns `false`.

Example

```js
const valid = await validateSession(localStorage.getItem('userToken'), localStorage.getItem('userId'));
if (!valid) { /* redirect to login */ }
```

Example responses (inferred)

```json
{ "success": true, "userId": "3adc..." }
```
or
```json
{ "success": false, "error": "Invalid token" }
```

- **Notes:** There are two identical implementations (api.js & seller.js). Consider centralising this helper. The function returns `false` on network error.

---

<a id="ValidatePassword"></a>
### ValidatePassword(userId, password)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/validate-password
- **Signature:** async function ValidatePassword(userId, password)
- **Description:** Sends the password to the backend to verify if it matches the user. Returns parsed JSON result.

Example

```js
const result = await ValidatePassword('3adc...', 'hunter2');
if (result.success) { /* password valid */ }
```

Example response (inferred)

```json
{ "success": true }
```
or
```json
{ "success": false, "error": "Wrong password" }
```

- **Notes:** Password is trimmed before sending. On network error the function returns `{ success: false, error: 'Netzwerkfehler bei der Passwortpruefung' }`.

---

<a id="fetchMyProducts"></a>
### fetchMyProducts(userId)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/my-products
- **Signature:** async function fetchMyProducts(userId)
- **Description:** Requests products owned by the user. The function currently logs the returned data.

Example

```js
const products = await fetchMyProducts('c4cd7d0d-5432-45f0-96d3-619d3f09668e');
console.log(products);
```

Example response (inferred)

```json
[ { "produktId": "...", "name": "Apfel", "preis": 2.5, "bestand": 10 }, ... ]
```

---

<a id="updatePassword"></a>
### updatePassword(userId, oldPassword, newPassword)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/update-password
- **Signature:** async function updatePassword(userId, oldPassword, newPassword)
- **Description:** Requests the backend to update the user's password. Returns the parsed result object.

Example

```js
const res = await updatePassword(userId, 'old-pass', 'new-pass');
if (res.success) { console.log('Password updated'); }
```

Example response (inferred)

```json
{ "success": true, "updated": true, "message": "Password updated" }
```
or
```json
{ "success": false, "error": "Incorrect old password" }
```

---

<a id="updateUserData"></a>
### updateUserData(userId, dataToUpdate)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/edit-user
- **Signature:** async function updateUserData(userId, dataToUpdate)
- **Description:** Flexible updater that accepts an object with fields to change, e.g. `{ strasse: 'Banana' }` and returns `result.user` on success.

Example

```js
const user = await updateUserData(userId, { strasse: 'Banana', hausnummer: '20/2' });
```

Example response (inferred)

```json
{ "success": true, "user": { "userId": "3adc...", "name": "..." } }
```

- **Notes:** Only the flexible version is documented here (the repository previously contained another variant that accepted explicit parameters; confirm it is commented out). The function throws on non-ok responses.

---

<a id="deleteMyProduct"></a>
### deleteMyProduct(productId, userID)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/delete-product
- **Signature:** async function deleteMyProduct(productId, userID)
- **Description:** Requests deletion of a product owned by `userID`. Returns parsed JSON.

Example

```js
const res = await deleteMyProduct('product-id', userId);
if (res.success) { /* removed */ }
```

Example response (inferred)

```json
{ "success": true }
```

---

<a id="updateMyProduct"></a>
### updateMyProduct(userId, productId, name, kategorieId, beschreibung, preis, bildUrl, bestand, bundesland, gewicht)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/update-my-product
- **Signature:** async function updateMyProduct(...)
- **Description:** Sends updated product details to backend. Returns result or `{ success: false, error: ... }` on error.

Example

```js
const result = await updateMyProduct(userId, productId, 'Apfel', 1, 'Frische', 2.5, 'pics/..', 10, 'Wien', 0.2);
```

Example response (inferred)

```json
{ "success": true, "productId": "..." }
```

---

<a id="deleteUser"></a>
### deleteUser(userId)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/delete-user
- **Signature:** async function deleteUser(userId)
- **Description:** Requests deletion of the user account. Returns parsed JSON result.

Example

```js
const res = await deleteUser(userId);
```

---

<a id="getAllUserDashboardData"></a>
### getAllUserDashboardData(userId)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/dashboard-data
- **Signature:** async function getAllUserDashboardData(userId)
- **Description:** (Admin) retrieves aggregated dashboard data. Returns parsed JSON.

Example response (inferred)

```json
{ "success": true, "users": [...], "orders": [...], "stats": { ... } }
```

---

<a id="getAllProductsForAdminDashboard"></a>
### getAllProductsForAdminDashboard(userId)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/admin/products
- **Signature:** async function getAllProductsForAdminDashboard(userId)
- **Description:** Retrieves all products for the admin dashboard. Returns parsed data.

---

<a id="search"></a>
### Search (form submit handler)

- **File(s):** Frontend/product.js
- **Endpoint:** GET http://localhost:3000/api/search?search=<query>
- **Description:** Searches products by query string. The submit handler parses JSON and calls `displayProducts(products)`.

Programmatic usage (equivalent)

```js
async function searchProducts(query) {
  const url = `http://localhost:3000/api/search?search=${encodeURIComponent(query)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

const products = await searchProducts('apfel');
```

Example response (inferred)

```json
[ { "produktId": "...", "name": "Apfel", "preis": 2.5, "kategorie": "Obst" }, ... ]
```

---

<a id="loadRandomProducts"></a>
### loadRandomProducts()

- **File(s):** Frontend/product.js
- **Endpoint:** GET http://localhost:3000/api/search?search=<category or space>
- **Description:** Loads products for the home page or for a selected category. If more than 8 products, shows first 8.

---

<a id="handleLogin"></a>
### handleLogin (inline)

- **File(s):** Frontend/product.js, Frontend/home.js
- **Endpoint:** POST http://localhost:3000/api/login
- **Description:** Submits `{ Mail, pw }` to the backend. On success stores token/userId/statusId/userName in `localStorage` and navigates to `/Frontend/signin-header.html`.

Example (recommended wrapper)

```js
async function login(email, password) {
  const res = await fetch('http://localhost:3000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Mail: email, pw: password })
  });
  return await res.json();
}

const data = await login('dejan@example.com', 'secret');
if (data.success) {
  const tokenStr = typeof data.token === 'object' ? data.token.tokenId : data.token;
  localStorage.setItem('userToken', tokenStr);
  localStorage.setItem('userId', data.userId);
}
```

Example response (inferred)

```json
{ "success": true, "token": "abc123" OR { "tokenId": "abc123" }, "userId": "3adc...", "statusId": 2, "user": { "name": "Dejan" } }
```

---

<a id="handleRegister"></a>
### handleRegister (inline)

- **File(s):** Frontend/product.js, Frontend/home.js
- **Endpoint:** POST http://localhost:3000/api/register
- **Description:** Sends registration payload `{ name, email, passwort, telefonNr, strasse, hausnummer, postleitzahl, land }` to backend.

Example

```js
async function register(payload) {
  const res = await fetch('http://localhost:3000/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return await res.json();
}

const r = await register({ name: 'Dejan', email: 'd@example.com', passwort: 'pwd' });
```

Example response (inferred)

```json
{ "success": true, "user": { "userId": "...", "name": "Dejan" } }
```
or
```json
{ "success": false, "error": "Email already registered" }
```

---

<a id="sellerSearch"></a>
### seller.js fetch /api/search?kategorie=all

- **File(s):** Frontend/seller.js
- **Endpoint:** GET http://localhost:3000/api/search?kategorie=all
- **Description:** Fetches categories to populate a `<select>` element. Expected response: array of category objects with `kategorieId` and `name`.

Example response (inferred)

```json
[ { "kategorieId": 1, "name": "Obst" }, { "kategorieId": 2, "name": "Gemüse" } ]
```

---

<a id="createProduct"></a>
### createProduct(userId, name, kategorieId, beschreibung, preis, bildUrl, bestand, bundesland, gewicht, status)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/create-product
- **Signature:** async function createProduct(userId, name, kategorieId, beschreibung, preis, bildUrl, bestand, bundesland, gewicht, status)
- **Description:** Creates a new product owned by `userId`. The function trims string fields and coerces numeric fields; it includes `status` only if provided. Returns the parsed backend result (usually contains `success` and `product` / `produktId`).

Example

```js
const res = await createProduct(userId, 'Apfel', 1, 'Frisch', 2.5, '/img/apfel.jpg', 10, 'Wien', 0.2, 'active');
if (res.success) console.log('Created', res.product.produktId);
```

Example response (inferred)

```json
{ "success": true, "product": { "produktId": "...", "name": "Apfel" } }
```

- **Notes:** On non-ok responses the helper throws and returns `{ success: false, error: ... }` on network failures.

<a id="uploadImage"></a>
### uploadImage(file)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/upload-image (multipart/form-data)
- **Signature:** async function uploadImage(file)
- **Description:** Uploads a File/Blob to the backend using FormData under the `image` key. Returns parsed JSON from the server. The function throws when the server responds with a non-ok status.

Example

```js
const data = await uploadImage(fileInput.files[0]);
console.log(data.imageUrl);
```

Example response (inferred)

```json
{ "success": true, "imageUrl": "/uploads/abcd.jpg" }
```

<a id="addToCart_simple"></a>
### addToCart(userId, productId, amount)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/add-to-cart
- **Signature:** async function addToCart(userId, productId, amount)
- **Description:** Adds a product to the user's cart. This repository contains two variants of `addToCart` (one accepts a `token` parameter — see the token variant below). This simple variant sends `userId`, `productId`, and `amount` and returns the backend result.

Example

```js
const res = await addToCart(userId, 'produkt-123', 2);
if (res.success) console.log('Added to cart');
```

Example response (inferred)

```json
{ "success": true, "cart": { /* cart summary */ } }
```

<a id="removeFromCart"></a>
### removeFromCart(userId, productId, amount)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/remove-from-cart
- **Signature:** async function removeFromCart(userId, productId, amount)
- **Description:** Decreases or removes `amount` of `productId` from the user's cart. Returns parsed backend response.

Example

```js
const res = await removeFromCart(userId, 'produkt-123', 1);
```

Example response (inferred)

```json
{ "success": true, "cart": { /* updated cart */ } }
```

<a id="fetchCart"></a>
### fetchCart(userId, token)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/cart
- **Signature:** async function fetchCart(userId, token)
- **Description:** Loads the user's cart. The function accepts an optional `token` (used by some backends for session validation) and returns `{ success, cart?, error? }`.

Example

```js
const cartData = await fetchCart(localStorage.getItem('userId'), localStorage.getItem('userToken'));
if (cartData.success) renderCart(cartData.cart);
```

Example response (inferred)

```json
{ "success": true, "cart": [ { "productId": "..", "amount": 2, "price": 5.0 } ] }
```

<a id="addToCart_token"></a>
### addToCart(userId, token, productId, amount)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/add-to-cart
- **Signature:** async function addToCart(userId, token, productId, amount = 1)
- **Description:** Token-aware variant of `addToCart` that includes the session `token` in the request body. Preferred in flows where the backend requires a token for cart operations. Returns parsed backend result.

Example

```js
const res = await addToCart(userId, localStorage.getItem('userToken'), 'produkt-123', 3);
```

Example response (inferred)

```json
{ "success": true, "cart": { /* updated cart */ } }
```

<a id="setCartQuantity"></a>
### setCartQuantity(userId, token, productId, quantity)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/cart/set-quantity
- **Signature:** async function setCartQuantity(userId, token, productId, quantity)
- **Description:** Sets the exact quantity for a cart item. Returns parsed backend result.

Example

```js
const res = await setCartQuantity(userId, token, 'produkt-123', 5);
```

Example response (inferred)

```json
{ "success": true, "cart": { /* updated cart */ } }
```

<a id="removeCartItemApi"></a>
### removeCartItemApi(userId, token, productId)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/cart/remove-item
- **Signature:** async function removeCartItemApi(userId, token, productId)
- **Description:** Removes an item from the user's cart entirely. Returns parsed backend response.

Example

```js
const res = await removeCartItemApi(userId, token, 'produkt-123');
```

Example response (inferred)

```json
{ "success": true }
```

<a id="checkoutCart"></a>
### checkoutCart(userId, token)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/checkout
- **Signature:** async function checkoutCart(userId, token)
- **Description:** Submits the current cart for checkout/purchase. Returns order result or error information.

Example

```js
const res = await checkoutCart(userId, localStorage.getItem('userToken'));
if (res.success) navigateToOrderConfirmation(res.orderId);
```

Example response (inferred)

```json
{ "success": true, "orderId": "order-123", "summary": { /* ... */ } }
```

<a id="requestSellerStatus"></a>
### requestSellerStatus(userId)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/request-seller-role
- **Signature:** async function requestSellerStatus(userId)
- **Description:** Sends a request to become a seller. Returns the parsed backend response (success flag and optional metadata).

Example

```js
const res = await requestSellerStatus(userId);
if (res.success) alert('Request submitted');
```

Example response (inferred)

```json
{ "success": true, "requestId": "req-456" }
```

<a id="getAllSellerRoleRequests"></a>
### getAllSellerRoleRequests(userId)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/seller-role-requests
- **Signature:** async function getAllSellerRoleRequests(userId)
- **Description:** (Admin) Retrieves all pending/processed seller-role requests. Returns an array of request objects.

Example response (inferred)

```json
{ "success": true, "requests": [ { "requestId": "req-1", "userId": "...", "status": "pending" } ] }
```

<a id="processSellerRoleRequest"></a>
### processSellerRoleRequest(requestId, status, comment)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/process-seller-role-request
- **Signature:** async function processSellerRoleRequest(requestId, status, comment)
- **Description:** (Admin) Processes a seller-role request by setting `status` (e.g. `approved` / `rejected`) and optional `comment`. Returns parsed result.

Example

```js
const res = await processSellerRoleRequest('req-456', 'approved', 'Good profile');
```

Example response (inferred)

```json
{ "success": true }
```

<a id="getAllUserOrders"></a>
### getAllUserOrders(userId)

- **File(s):** Frontend/api.js
- **Endpoint:** POST http://localhost:3000/api/my-orders
- **Signature:** async function getAllUserOrders(userId)
- **Description:** Returns the authenticated user's orders. Response typically contains an array of order objects with items, totals and status.

Example

```js
const orders = await getAllUserOrders(userId);
console.log(orders);
```

Example response (inferred)

```json
{ "success": true, "orders": [ { "orderId": "o1", "items": [ /* ... */ ], "total": 12.5 } ] }
```

---

## Files that invoke these helpers

- Frontend/api.js — exports/declares most helpers (fetchUserProfile, validateSession, ValidatePassword, fetchMyProducts, updatePassword, updateUserData, deleteMyProduct, updateMyProduct, deleteUser, getAllUserDashboardData, getAllProductsForAdminDashboard)
- Frontend/product.js — search form, loadRandomProducts, login/register handlers
- Frontend/home.js — login/register handlers (near-duplicate of product.js)
- Frontend/seller.js — category fetch and a duplicate validateSession
- Frontend/profil.js — invokes validateSession, fetchUserProfile, updateUserData, updatePassword

## Recommendations (short)

- Centralise the base API URL into a single constant (e.g. `API_BASE`) and reference it from all files.
- Consolidate duplicated helpers (e.g. `validateSession`) into a single shared module and import it.
- Standardise return shapes across endpoints (prefer `{ success: boolean, data?: any, error?: string }`).

Where this file is located: `Frontend/API.md`

If you want I can now:
1) adjust anchors to match a specific renderer, or
2) create a small shared module (Frontend/api-client.js) exporting these helpers and update imports (requires editing other files).

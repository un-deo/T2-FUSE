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

async function fetchUserProfile(userId) {
  try {
    const response = await fetch("http://localhost:3000/api/user-data", {
      // Replace with your actual endpoint URL
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      // Handles 400, 401, and 500 errors from your function
      throw new Error(result.error || "Failed to fetch user data");
    }

    // Success! Access user data here
    console.log("User Data:", result.user);
    return result.user;
  } catch (error) {
    console.error("Request failed:", error.message);
  }
}

async function validateSession(token, userId) {
  try {
    const response = await fetch("http://localhost:3000/api/validate-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: token, // Der Token aus dem localStorage/Cookie
        userId: userId, // Die ID des Users
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      console.log("Token ist gültig für User:", data.userId);
      return true;
    } else {
      console.error("Validierung fehlgeschlagen:", data.error);
      return false;
    }
  } catch (error) {
    console.error("Netzwerkfehler oder Server down:", error);
    return false;
  }
}

async function ValidatePassword(userId, password) {
  const url = "http://localhost:3000/api/validate-password";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
        passwort: password ? password.trim() : "",
      }),
    });

    const result = await response.json();

    console.log(result);
    return result;
  } catch (error) {
    console.error("Validate password request failed:", error);
    return { success: false, error: "Netzwerkfehler bei der Passwortpruefung" };
  }
}
//ValidatePassword(`3adcacff-511a-4c90-96a6-84f7f50b1b0a`, `d3j"nAabaa`);

async function fetchMyProducts(userId) {
  const url = "http://localhost:3000/api/my-products";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
      }),
    });

    const data = await response.json();

    console.log(data);
    return data;
  } catch (error) {
    console.error("Fetch my products request failed:", error);
    return {
      success: false,
      error: "Netzwerkfehler beim Abrufen der Produkte",
    };
  }
}
//fetchMyProducts("c4cd7d0d-5432-45f0-96d3-619d3f09668e");

async function createProduct(
  userId,
  name,
  kategorieId,
  beschreibung,
  preis,
  bildUrl,
  bestand,
  bundesland,
  gewicht,
  status,
  versand,
  selbstabholung,
) {
  const url = "http://localhost:3000/api/create-product";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
        name: name ? name.trim() : "",
        kategorieId: kategorieId,
        beschreibung: beschreibung ? beschreibung.trim() : "",
        preis: Number(preis),
        bildUrl: bildUrl ? bildUrl.trim() : "",
        bestand: bestand !== "" ? Number(bestand) : undefined,
        bundesland: bundesland ? bundesland.trim() : "",
        gewicht: gewicht !== "" ? Number(gewicht) : undefined,
        status: status ? status : undefined,
        versand: versand === true,
        selbstabholung: selbstabholung === true,
      }),
    });

    const result = await response.json();
    console.log(result);

    if (!response.ok) {
      throw new Error(result.error || "Create failed in backend");
    }

    console.log("Product created successfully:", result.product?.produktId);
    return result;
  } catch (error) {
    console.error("Fetch Error:", error.message);
    return {
      success: false,
      error: error.message || "Netzwerkfehler beim Erstellen des Produkts",
    };
  }
}

async function uploadImage(file) {
  const form = new FormData();
  form.append("image", file);
  try {
    const resp = await fetch("http://localhost:3000/api/upload-image", {
      method: "POST",
      body: form,
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Upload failed");
    return data;
  } catch (err) {
    console.error("Image upload failed:", err.message);
    throw err;
  }
}

async function addToCart(userId, productId, amount) {
  const url = "http://localhost:3000/api/add-to-cart";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
        productId: productId,
        amount: Number(amount),
      }),
    });

    const result = await response.json();
    console.log(result);

    if (!response.ok) {
      throw new Error(result.error || "Failed to add product to cart");
    }

    return result;
  } catch (error) {
    console.error("Add to cart request failed:", error.message);
    return {
      success: false,
      error: error.message || "Netzwerkfehler beim Hinzufügen zum Warenkorb",
    };
  }
}

async function removeFromCart(userId, productId, amount) {
  const url = "http://localhost:3000/api/remove-from-cart";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
        productId: productId,
        amount: Number(amount),
      }),
    });

    const result = await response.json();
    console.log(result);

    if (!response.ok) {
      throw new Error(result.error || "Failed to remove product from cart");
    }

    return result;
  } catch (error) {
    console.error("Remove from cart request failed:", error.message);
    return {
      success: false,
      error: error.message || "Netzwerkfehler beim Entfernen aus dem Warenkorb",
    };
  }
}

async function updatePassword(userId, oldPassword, newPassword) {
  const url = "http://localhost:3000/api/update-password";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
        oldPassword: oldPassword ? oldPassword.trim() : "",
        newPassword: newPassword ? newPassword.trim() : "",
      }),
    });

    const data = await response.json();

    console.log(data);
    return data;
  } catch (error) {
    console.error("Update password request failed:", error);
    return { success: false, error: "Netzwerkfehler beim Passwort-Update" };
  }
}

// async function updateUserData(
//   userId,
//   name,
//   email,
//   strasse,
//   hausnummer,
//   postleitzahl,
//   land,
//   telefonNr,
// ) {
//   const url = "http://localhost:3000/api/update-user-data";
//   try {
//     const response = await fetch(url, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       // Ensure all required fields (userId, name, email) are in the object
//       body: JSON.stringify({
//         userId: userId,
//         name: name ? name.trim() : "",
//         email: email ? email.trim() : "",
//         strasse: strasse ? strasse.trim() : "",
//         hausnummer: hausnummer ? hausnummer.trim() : "",
//         postleitzahl: postleitzahl ? postleitzahl.trim() : "",
//         land: land ? land.trim() : "",
//         telefonNr: telefonNr ? telefonNr.trim() : "",
//       }),
//     });

//     const result = await response.json();
//     console.log(result);
//     if (!response.ok) {
//       throw new Error(result.error || "Update failed in backend");
//     }

//     console.log("Update successful:", result.userId);
//     return result;
//   } catch (error) {
//     console.error("Fetch Error:", error.message);
//     throw error;
//   }
// }

async function deleteMyProduct(productId, userID) {
  const url = "http://localhost:3000/api/delete-product";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userID,
        productId: productId,
      }),
    });
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("Delete product request failed:", error);
    return {
      success: false,
      error: "Netzwerkfehler beim Löschen des Produkts",
    };
  }
}

async function updateMyProduct(
  userId,
  productId,
  name,
  kategorieId,
  beschreibung,
  preis,
  bildUrl,
  bestand,
  bundesland,
  gewicht,
  status,
  versand,
  selbstabholung,
) {
  const url = "http://localhost:3000/api/update-my-product";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
        productId: productId,
        name: name ? name.trim() : "",
        kategorieId: kategorieId,
        beschreibung: beschreibung ? beschreibung.trim() : "",
        preis: Number(preis),
        bildUrl: bildUrl ? bildUrl.trim() : "",
        bestand: Number(bestand),
        bundesland: bundesland ? bundesland.trim() : "",
        gewicht: Number(gewicht),
        status: status ? status : "active",
        versand: versand === true,
        selbstabholung: selbstabholung === true,
      }),
    });

    const result = await response.json();
    console.log(result);

    if (!response.ok) {
      throw new Error(result.error || "Update failed in backend");
    }

    console.log("Product update successful:", result.productId);
    return result;
  } catch (error) {
    console.error("Fetch Error:", error.message);
    return {
      success: false,
      error: error.message || "Netzwerkfehler beim Aktualisieren des Produkts",
    };
  }
}

async function fetchCart(userId, token) {
  const url = "http://localhost:3000/api/cart";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, token }),
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Warenkorb konnte nicht geladen werden",
      };
    }
    return data;
  } catch (error) {
    console.error("fetchCart failed:", error);
    return {
      success: false,
      error: "Netzwerkfehler beim Laden des Warenkorbs",
    };
  }
}

async function addToCart(userId, token, productId, amount = 1) {
  const url = "http://localhost:3000/api/add-to-cart";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, token, productId, amount }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("addToCart failed:", error);
    return {
      success: false,
      error: "Netzwerkfehler beim Hinzufügen zum Warenkorb",
    };
  }
}

async function setCartQuantity(userId, token, productId, quantity) {
  const url = "http://localhost:3000/api/cart/set-quantity";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, token, productId, quantity }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("setCartQuantity failed:", error);
    return {
      success: false,
      error: "Netzwerkfehler beim Aktualisieren der Menge",
    };
  }
}

async function removeCartItemApi(userId, token, productId) {
  const url = "http://localhost:3000/api/cart/remove-item";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, token, productId }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("removeCartItemApi failed:", error);
    return {
      success: false,
      error: "Netzwerkfehler beim Entfernen des Produkts",
    };
  }
}

async function checkoutCart(userId, token) {
  const url = "http://localhost:3000/api/checkout";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, token }),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("checkoutCart failed:", error);
    return { success: false, error: "Netzwerkfehler beim Checkout" };
  }
}

async function deleteUser(userId) {
  const url = "http://localhost:3000/api/delete-user";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
      }),
    });
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("Delete user request failed:", error);
    return {
      success: false,
      error: "Netzwerkfehler beim Löschen des Benutzers",
    };
  }
}

async function getAllUserDashboardData(userId) {
  const url = "http://localhost:3000/api/dashboard-data";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId, //userid of Admin who is acceesing the dashboard
      }),
    });
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("Fetch Error:", error.message);
    return {
      success: false,
      error: error.message || "Netzwerkfehler beim Abrufen der Dashboard-Daten",
    };
  }
}

async function updateUserData(userId, dataToUpdate) {
  //datatoupdate has to be an object with the fields you want to update, e.g. { name: "New Name", email: "newemail@example.com" }
  // Example usage of updateUserData:
  // updateUserData("3adcacff-511a-4c90-96a6-84f7f50b1b0a", {
  //   strasse: "Banana",
  //   hausnummer: "20/2",
  //   postleitzahl: "FML",
  // });
  try {
    const response = await fetch("http://localhost:3000/api/edit-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // We combine the required userId with whatever fields you want to change
      body: JSON.stringify({
        userId,
        ...dataToUpdate,
      }),
    });

    const result = await response.json();

    // Return full API response so callers can check success flag
    if (!response.ok) {
      return result;
    }

    return result;
  } catch (error) {
    console.error("Error updating user:", error);
    return { success: false, error: error.message };
  }
}

async function getAllProductsForAdminDashboard(userId) {
  const url = "http://localhost:3000/api/admin/products";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
      }),
    });
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("Fetch Error:", error.message);
    return {
      success: false,
      error: error.message || "Netzwerkfehler beim Abrufen der Produktdaten",
    };
  }
}

async function requestSellerStatus(userId) {
  const url = "http://localhost:3000/api/request-seller-role";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
      }),
    });

    const result = await response.json();

    console.log(result);
    return result;
  } catch (error) {
    console.error("Request seller status failed:", error);
    return {
      success: false,
      error: "Netzwerkfehler bei der Anfrage des Verkäufer-Rolls",
    };
  }
}

async function getAllSellerRoleRequests(userId) {
  const url = "http://localhost:3000/api/seller-role-requests";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
      }),
    });
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("Fetch Error:", error.message);
    return {
      success: false,
      error:
        error.message ||
        "Netzwerkfehler beim Abrufen der Verkäufer-Roll-Anfragen",
    };
  }
}

async function processSellerRoleRequest(requestId, status, comment) {
  const url = "http://localhost:3000/api/process-seller-role-request";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requestId: requestId,
        status: status,
        comment: comment ? comment.trim() : "",
      }),
    });
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("Fetch Error:", error.message);
    return {
      success: false,
      error:
        error.message ||
        "Netzwerkfehler beim Verarbeiten der Verkäufer-Roll-Anfrage",
    };
  }
}

async function getAllUserOrders(userId) {
  const url = "http://localhost:3000/api/my-orders";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
      }),
    });
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error("Fetch Error:", error.message);
    return {
      success: false,
      error:
        error.message || "Netzwerkfehler beim Abrufen der Bestellungsdaten",
    };
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const userTableBody = document.getElementById("user-table-body");
  const allUsersToggle = document.getElementById("allUsersToggle");
  const usersContainer = document.getElementById("usersContainer");

  const productTableBody = document.getElementById("product-table-body");
  const allProductsToggle = document.getElementById("allProductsToggle");
  const productsContainer = document.getElementById("productsContainer");

  const sellerRequestTableBody = document.getElementById("seller-request-table-body");
  const sellerRequestsToggle = document.getElementById("sellerRequestsToggle");
  const sellerRequestsContainer = document.getElementById("sellerRequestsContainer");
  const sellerRequestFilter = document.getElementById("sellerRequestFilter");

  // Modals
  const editUserModal = document.getElementById("editUserModal");
  const deleteUserModal = document.getElementById("deleteUserModal");
  const editUserCancel = document.getElementById("editUserCancel");
  const editUserSave = document.getElementById("editUserSave");
  const deleteUserCancel = document.getElementById("deleteUserCancel");
  const deleteUserConfirm = document.getElementById("deleteUserConfirm");
  const editUserStatus = document.getElementById("editUserStatus");

  const editProductModal = document.getElementById("editProductModal");
  const deleteProductModal = document.getElementById("deleteProductModal");
  const editProductCancel = document.getElementById("editProductCancel");
  const editProductSave = document.getElementById("editProductSave");
  const deleteProductCancel = document.getElementById("deleteProductCancel");
  const deleteProductConfirm = document.getElementById("deleteProductConfirm");
  const editProductCategory = document.getElementById("editProductCategory");
  const editProductWeight = document.getElementById("editProductWeight");
  const editProductOrigin = document.getElementById("editProductOrigin");
  const editProductImage = document.getElementById("editProductImage");
  const editProductImagePreview = document.getElementById("editProductImagePreview");
  const editProductCurrentBildUrl = document.getElementById("editProductCurrentBildUrl");

  let currentEditUserId = null;
  let currentEditUserStatus = null;
  let currentDeleteUserId = null;
  let currentEditProductId = null;
  let currentDeleteProductId = null;
  let isUsersOpen = false;
  let isProductsOpen = false;
  let isSellerRequestsOpen = false;
  let sellerRequestsCache = [];

  if (!userTableBody) {
    return;
  }

  const formatNumber = (value) =>
    new Intl.NumberFormat("de-AT").format(value);

  const formatPrice = (value) =>
    new Intl.NumberFormat("de-AT", {
      style: "currency",
      currency: "EUR",
    }).format(value);

  const getStatusBadge = (statusId) => {
    const statusMap = {
      1: { label: "Kunde", color: "bg-stone-100 text-stone-700" },
      2: { label: "Verkäufer", color: "bg-amber-100 text-amber-700" },
      3: { label: "Admin", color: "bg-green-900/10 text-green-900" },
    };
    const status = statusMap[statusId] || statusMap[1];
    return `<span class="inline-flex px-2.5 py-1 ${status.color} text-xs font-medium rounded-full">${status.label}</span>`;
  };

  const getRequestStatusBadge = (status) => {
    const normalized = status || "pending";
    const map = {
      pending: { label: "Offen", color: "bg-amber-100 text-amber-700" },
      approved: { label: "Genehmigt", color: "bg-green-100 text-green-700" },
      rejected: { label: "Abgelehnt", color: "bg-red-100 text-red-700" },
    };
    const entry = map[normalized] || map.pending;
    return `<span class="inline-flex px-2.5 py-1 ${entry.color} text-xs font-medium rounded-full">${entry.label}</span>`;
  };

  const normalizeRequestStatus = (status) => {
    return status || "pending";
  };

  const formatRequestDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("de-AT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatRequestAddress = (user) => {
    if (!user) return "—";
    const parts = [user.strasse, user.hausnummer].filter(Boolean).join(" ");
    const cityParts = [user.postleitzahl, user.land].filter(Boolean).join(" ");
    if (!parts && !cityParts) return "—";
    return [parts, cityParts].filter(Boolean).join(", ");
  };

  const userId = localStorage.getItem("userId");
  const statusId = localStorage.getItem("statusId");
  if (!userId || statusId !== "3") {
    return;
  }

  const updateImagePreview = (src) => {
    if (!editProductImagePreview) return;
    editProductImagePreview.innerHTML = "";
    if (!src) return;
    const img = document.createElement("img");
    img.src = src;
    img.className = "w-24 h-24 object-cover rounded";
    editProductImagePreview.appendChild(img);
  };

  const loadCategories = async () => {
    if (!editProductCategory) return;

    try {
      const response = await fetch("http://localhost:3000/api/search?kategorie=all");
      const data = await response.json();

      editProductCategory.innerHTML = '<option value="">Kategorie wählen...</option>';

      data.forEach((kategorie) => {
        const option = document.createElement("option");
        option.value = kategorie.kategorieId;
        option.textContent = kategorie.name;
        editProductCategory.appendChild(option);
      });
    } catch (error) {
      console.error("Fehler beim Abrufen der Kategorien:", error);
    }
  };

  const uploadImageFile = async (file) => {
    const form = new FormData();
    form.append("image", file);

    const res = await fetch("http://localhost:3000/api/upload-image", {
      method: "POST",
      body: form,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Upload fehlgeschlagen");
    }
    return data;
  };

  if (editProductImage) {
    editProductImage.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) {
        updateImagePreview(editProductCurrentBildUrl?.value || "");
        return;
      }
      updateImagePreview(URL.createObjectURL(file));
    });
  }

  // Modal Functions
  const openEditModal = async (user) => {
    currentEditUserId = user.userId;
    
    try {
      const response = await fetch("http://localhost:3000/api/user-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.userId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Fehler beim Laden der Benutzerdaten");
      }

      const userData = data.user;
      document.getElementById("editUserName").value = userData.name || "";
      document.getElementById("editUserEmail").value = userData.email || "";
      document.getElementById("editUserTelefon").value = userData.telefonNr || "";
      currentEditUserStatus = Number(userData.statusId) || 1;
      if (editUserStatus) {
        editUserStatus.value = String(currentEditUserStatus);
        editUserStatus.disabled = currentEditUserStatus === 3;
      }
      document.getElementById("editUserStrasse").value = userData.strasse || "";
      document.getElementById("editUserHausnummer").value = userData.hausnummer || "";
      document.getElementById("editUserPostleitzahl").value = userData.postleitzahl || "";
      document.getElementById("editUserLand").value = userData.land || "";
      document.getElementById("editUserPassword").value = "";
      
      editUserModal.classList.remove("hidden");
    } catch (error) {
      console.error("Fehler beim Laden der Benutzerdaten:", error);
    }
  };

  const closeEditModal = () => {
    editUserModal.classList.add("hidden");
    currentEditUserId = null;
  };

  const openDeleteModal = (user) => {
    currentDeleteUserId = user.userId;
    document.getElementById("deleteUserName").textContent = user.name;
    document.getElementById("deleteUserEmail").textContent = user.email;
    deleteUserModal.classList.remove("hidden");
  };

  const closeDeleteModal = () => {
    deleteUserModal.classList.add("hidden");
    currentDeleteUserId = null;
  };

  const openEditProductModal = async (product) => {
    currentEditProductId = product.productId;
    document.getElementById("editProductName").value = product.name || "";
    document.getElementById("editProductPrice").value = product.preis ?? 0;
    document.getElementById("editProductDescription").value = product.beschreibung || "";
    document.getElementById("editProductStock").value = product.Bestand ?? "";
    document.getElementById("editProductStatus").value = product.status || "active";
    if (editProductCategory) {
      const selectedId = product.kategorieId || "";
      const hasOption = Array.from(editProductCategory.options || []).some(
        (option) => option.value === selectedId,
      );

      if (selectedId && !hasOption) {
        await loadCategories();
      }

      editProductCategory.value = selectedId;
    }
    if (editProductWeight) {
      editProductWeight.value = product.Gewicht ?? "";
    }
    if (editProductOrigin) {
      editProductOrigin.value = product.Bundesland || "";
    }
    if (editProductImage) {
      editProductImage.value = "";
    }
    if (editProductCurrentBildUrl) {
      editProductCurrentBildUrl.value = product.bildUrl || "";
    }
    updateImagePreview(product.bildUrl || "");
    editProductModal.classList.remove("hidden");
  };

  const closeEditProductModal = () => {
    editProductModal.classList.add("hidden");
    currentEditProductId = null;
  };

  const openDeleteProductModal = (product) => {
    currentDeleteProductId = product.productId;
    document.getElementById("deleteProductName").textContent = product.name;
    document.getElementById("deleteProductPrice").textContent = formatPrice(product.preis || 0);
    deleteProductModal.classList.remove("hidden");
  };

  const closeDeleteProductModal = () => {
    deleteProductModal.classList.add("hidden");
    currentDeleteProductId = null;
  };

  const saveProductChanges = async () => {
    if (!currentEditProductId) return;

    const name = document.getElementById("editProductName").value.trim();
    const price = parseFloat(document.getElementById("editProductPrice").value);
    const beschreibung = document.getElementById("editProductDescription").value.trim();
    const bestandRaw = document.getElementById("editProductStock").value;
    const bestand = bestandRaw === "" ? NaN : parseInt(bestandRaw, 10);
    const status = document.getElementById("editProductStatus").value;
    const kategorieId = editProductCategory ? editProductCategory.value : "";
    const gewichtRaw = editProductWeight ? editProductWeight.value.trim() : "";
    const gewicht = gewichtRaw === "" ? null : Number(gewichtRaw);
    const bundesland = editProductOrigin ? editProductOrigin.value.trim() : "";

    if (!name || isNaN(price) || !beschreibung || !kategorieId || Number.isNaN(bestand)) {
      console.error("Fehler: Erforderliche Felder nicht gefüllt");
      return;
    }

    if (gewicht !== null && Number.isNaN(gewicht)) {
      console.error("Fehler: Gewicht muss eine Zahl sein");
      return;
    }

    try {
      let bildUrlToSend = editProductCurrentBildUrl ? editProductCurrentBildUrl.value : "";

      if (editProductImage && editProductImage.files && editProductImage.files.length > 0) {
        const uploadResult = await uploadImageFile(editProductImage.files[0]);
        bildUrlToSend = uploadResult.url;
      }

      const response = await fetch("http://localhost:3000/api/admin/edit-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          productId: currentEditProductId,
          name,
          preis: price,
          beschreibung,
          bestand,
          status,
          kategorieId,
          bildUrl: bildUrlToSend === "" ? null : bildUrlToSend,
          bundesland: bundesland === "" ? null : bundesland,
          gewicht,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Fehler beim Speichern:", data.error);
        return;
      }

      closeEditProductModal();
      await loadDataKeepState();
    } catch (error) {
      console.error("Produkt-Speicher-Fehler:", error);
    }
  };

  const deleteProductAccount = async () => {
    if (!currentDeleteProductId) return;

    try {
      const response = await fetch("http://localhost:3000/api/admin/delete-product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userId,
          productId: currentDeleteProductId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Fehler beim Löschen:", data.error);
        return;
      }

      closeDeleteProductModal();
      await loadDataKeepState();
    } catch (error) {
      console.error("Produkt-Lösch-Fehler:", error);
    }
  };

  const saveUserChanges = async () => {
    if (!currentEditUserId) return;

    const name = document.getElementById("editUserName").value.trim();
    const email = document.getElementById("editUserEmail").value.trim();
    const telefonNr = document.getElementById("editUserTelefon").value.trim();
    const statusIdValue = editUserStatus ? editUserStatus.value : "";
    const strasse = document.getElementById("editUserStrasse").value.trim();
    const hausnummer = document.getElementById("editUserHausnummer").value.trim();
    const postleitzahl = document.getElementById("editUserPostleitzahl").value.trim();
    const land = document.getElementById("editUserLand").value.trim();
    const password = document.getElementById("editUserPassword").value.trim();

    if (!name || !email) {
      return;
    }

    try {
      const parsedStatusId = Number(statusIdValue);

      if (parsedStatusId === 3 && currentEditUserStatus !== 3) {
        console.error("Admin-Status darf nicht vergeben werden");
        return;
      }

      const updateData = {
        userId: currentEditUserId,
        name,
        email,
        telefonNr,
        statusId: parsedStatusId,
        strasse,
        hausnummer,
        postleitzahl,
        land,
      };

      if (password) {
        updateData.passwort = password;
      }

      const response = await fetch("http://localhost:3000/api/edit-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return;
      }

      closeEditModal();
      await loadDataKeepState();
    } catch (error) {
      console.error("Speicher-Fehler:", error);
    }
  };

  const deleteUserAccount = async () => {
    if (!currentDeleteUserId) return;

    try {
      const response = await fetch("http://localhost:3000/api/delete-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: currentDeleteUserId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return;
      }

      closeDeleteModal();
      await loadDataKeepState();
    } catch (error) {
      console.error("Benutzer-Lösch-Fehler:", error);
    }
  };

  const renderUserTable = (users) => {
    if (!userTableBody) return;

    if (!users || users.length === 0) {
      userTableBody.innerHTML =
        '<tr><td colspan="5" class="px-5 py-4 text-center text-stone-600">Keine Benutzer gefunden</td></tr>';
      return;
    }

    userTableBody.innerHTML = users
      .map(
        (user) =>
          `<tr class="border-b border-stone-100">
        <td class="px-5 py-4 text-sm text-stone-600">${user.userId.substring(0, 8).toUpperCase()}</td>
        <td class="px-5 py-4 font-medium">${user.name}</td>
        <td class="px-5 py-4 text-sm text-stone-600">${user.email}</td>
        <td class="px-5 py-4">${getStatusBadge(user.statusId)}</td>
        <td class="px-5 py-4">
          <div class="flex gap-2">
            <button class="px-3 py-2 text-xs rounded-full bg-amber-100 text-amber-700 font-medium edit-user-btn" data-user-id="${user.userId}">Bearbeiten</button>
            <button type="button" class="px-3 py-2 text-xs rounded-full bg-red-100 text-red-700 font-medium delete-user-btn" data-user-id="${user.userId}">Löschen</button>
          </div>
        </td>
      </tr>`,
      )
      .join("");

    document.querySelectorAll(".edit-user-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const targetUserId = e.target.dataset.userId;
        const user = users.find((u) => u.userId === targetUserId);
        if (user) {
          openEditModal(user);
        }
      });
    });

    document.querySelectorAll(".delete-user-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const targetUserId = e.target.dataset.userId;
        const user = users.find((u) => u.userId === targetUserId);
        if (user) {
          openDeleteModal(user);
        }
      });
    });
  };

  // User table filter: searches only ID, Name, E-Mail, Status (case-insensitive)
  const filterUserTable = (term) => {
    if (!userTableBody) return;
    const search = (term || "").trim().toLowerCase();
    const rows = Array.from(userTableBody.querySelectorAll("tr"));

    if (!search) {
      rows.forEach((r) => (r.style.display = ""));
      return;
    }

    rows.forEach((row) => {
      const tds = row.querySelectorAll("td");

      if (!tds || tds.length < 4) {
        row.style.display = "none";
        return;
      }

      const idText = (tds[0].textContent || "").toLowerCase();
      const nameText = (tds[1].textContent || "").toLowerCase();
      const emailText = (tds[2].textContent || "").toLowerCase();
      const statusText = (tds[3].textContent || "").toLowerCase();

      if (
        idText.includes(search) ||
        nameText.includes(search) ||
        emailText.includes(search) ||
        statusText.includes(search)
      ) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  };

  const searchUsersInput = document.getElementById("searchUsersInput");
  if (searchUsersInput) {
    searchUsersInput.addEventListener("input", (e) => {
      filterUserTable(e.target.value);
    });
  }

  const renderProductTable = (products) => {
    if (!productTableBody) return;

    if (!products || products.length === 0) {
      productTableBody.innerHTML =
        '<tr><td colspan="5" class="px-5 py-4 text-center text-stone-600">Keine Produkte gefunden</td></tr>';
      return;
    }

    productTableBody.innerHTML = products
      .map(
        (product) =>
          `<tr class="border-b border-stone-100">
        <td class="px-5 py-4 text-sm text-stone-600">${product.productId.substring(0, 8).toUpperCase()}</td>
        <td class="px-5 py-4 font-medium">${product.name}</td>
        <td class="px-5 py-4 text-sm text-stone-600">${product.sellerName || "Unbekannt"}</td>
        <td class="px-5 py-4 font-medium">${formatPrice(product.preis || 0)}</td>
        <td class="px-5 py-4">
          <div class="flex gap-2">
            <button class="px-3 py-2 text-xs rounded-full bg-amber-100 text-amber-700 font-medium edit-product-btn" data-product-id="${product.productId}">Bearbeiten</button>
            <button type="button" class="px-3 py-2 text-xs rounded-full bg-red-100 text-red-700 font-medium delete-product-btn" data-product-id="${product.productId}">Löschen</button>
          </div>
        </td>
      </tr>`,
      )
      .join("");

    document.querySelectorAll(".edit-product-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const targetProductId = e.target.dataset.productId;
        const product = products.find((p) => p.productId === targetProductId);
        if (product) {
          openEditProductModal(product);
        }
      });
    });

    document.querySelectorAll(".delete-product-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const targetProductId = e.target.dataset.productId;
        const product = products.find((p) => p.productId === targetProductId);
        if (product) {
          openDeleteProductModal(product);
        }
      });
    });
  };

  const renderSellerRequestTable = (requests) => {
    if (!sellerRequestTableBody) return;

    const filterValue = sellerRequestFilter ? sellerRequestFilter.value : "all";
    const filteredRequests = requests.filter((request) => {
      const normalized = normalizeRequestStatus(request.status);
      return filterValue === "all" || normalized === filterValue;
    });

    if (!filteredRequests || filteredRequests.length === 0) {
      sellerRequestTableBody.innerHTML =
        '<tr><td colspan="7" class="px-5 py-4 text-center text-stone-600">Keine Verkäufer-Anfragen vorhanden</td></tr>';
      return;
    }

    sellerRequestTableBody.innerHTML = filteredRequests
      .map((request) => {
        const status = request.status || "pending";
        const isPending = status === "pending" || status === "" || status === null;
        const user = request.user || {};
        const commentValue = request.kommentarAdmin || "";
        const begruendung = request.begruendung || "—";
        const name = user.name || "Unbekannt";
        const email = user.email || "—";
        const address = formatRequestAddress(user);

        return `
          <tr class="border-b border-stone-100 align-top">
            <td class="px-5 py-4 text-sm text-stone-600">${formatRequestDate(request.datum)}</td>
            <td class="px-5 py-4">
              <div class="font-medium text-stone-900">${name}</div>
              <div class="text-xs text-stone-500">${email}</div>
            </td>
            <td class="px-5 py-4 text-sm text-stone-600">${address}</td>
            <td class="px-5 py-4 text-sm text-stone-600">${begruendung}</td>
            <td class="px-5 py-4">${getRequestStatusBadge(status)}</td>
            <td class="px-5 py-4">
              <textarea
                rows="2"
                class="seller-request-comment w-full rounded-md border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 ${!isPending ? "bg-stone-50 text-stone-500" : ""}"
                data-request-id="${request.anfrageId}"
                ${!isPending ? "disabled" : ""}
                placeholder="Begruendung (Pflicht bei Ablehnung)"
              >${commentValue}</textarea>
              <p class="seller-request-error text-xs text-red-600 mt-1" data-request-id="${request.anfrageId}"></p>
            </td>
            <td class="px-5 py-4">
              <div class="flex flex-col gap-2">
                <button
                  type="button"
                  class="approve-seller-request-btn px-3 py-2 text-xs rounded-full bg-green-100 text-green-800 font-medium ${!isPending ? "opacity-50 cursor-not-allowed" : ""}"
                  data-request-id="${request.anfrageId}"
                  ${!isPending ? "disabled" : ""}
                >Annehmen</button>
                <button
                  type="button"
                  class="reject-seller-request-btn px-3 py-2 text-xs rounded-full bg-red-100 text-red-700 font-medium ${!isPending ? "opacity-50 cursor-not-allowed" : ""}"
                  data-request-id="${request.anfrageId}"
                  ${!isPending ? "disabled" : ""}
                >Ablehnen</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    document.querySelectorAll(".approve-seller-request-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const requestId = e.currentTarget.dataset.requestId;
        await handleSellerRequestAction(requestId, "approved");
      });
    });

    document.querySelectorAll(".reject-seller-request-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const requestId = e.currentTarget.dataset.requestId;
        await handleSellerRequestAction(requestId, "rejected");
      });
    });
  };

  const handleSellerRequestAction = async (requestId, status) => {
    if (!requestId) return;

    const commentInput = document.querySelector(
      `.seller-request-comment[data-request-id="${requestId}"]`,
    );
    const errorEl = document.querySelector(
      `.seller-request-error[data-request-id="${requestId}"]`,
    );
    const comment = commentInput ? commentInput.value.trim() : "";

    if (status === "rejected" && !comment) {
      if (errorEl) {
        errorEl.textContent = "Bitte eine Begruendung fuer die Ablehnung eintragen.";
      }
      return;
    }

    if (errorEl) {
      errorEl.textContent = "";
    }

    try {
      const response = await fetch("http://localhost:3000/api/process-seller-role-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId,
          status,
          admincomment: comment,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        if (errorEl) {
          errorEl.textContent = data.error || "Anfrage konnte nicht verarbeitet werden.";
        }
        return;
      }

      await loadDataKeepState();
    } catch (error) {
      if (errorEl) {
        errorEl.textContent = "Netzwerkfehler beim Verarbeiten der Anfrage.";
      }
    }
  };

  const loadSellerRequests = async () => {
    if (!sellerRequestTableBody) return;

    try {
      const response = await fetch("http://localhost:3000/api/seller-role-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Anfragen konnten nicht geladen werden");
      }

      sellerRequestsCache = data.requests || [];
      renderSellerRequestTable(sellerRequestsCache);
    } catch (error) {
      sellerRequestTableBody.innerHTML =
        '<tr><td colspan="7" class="px-5 py-4 text-center text-red-600">Fehler beim Laden der Verkäufer-Anfragen</td></tr>';
    }
  };

  const updateStatsBoxes = (stats) => {
    if (stats) {
      const totalUsersEl = document.getElementById("admin-total-users");
      const sellerUsersEl = document.getElementById("admin-seller-users");
      const adminUsersEl = document.getElementById("admin-admin-users");

      if (totalUsersEl) totalUsersEl.textContent = formatNumber(stats.totalUsers || 0);
      if (sellerUsersEl) sellerUsersEl.textContent = formatNumber(stats.sellerUsers || 0);
      if (adminUsersEl) adminUsersEl.textContent = formatNumber(stats.adminUsers || 0);
    }
  };

  const loadData = async () => {
    try {
      const response = await fetch(
        "http://localhost:3000/api/dashboard-data",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Daten konnten nicht geladen werden",
        );
      }

      updateStatsBoxes(data.stats);
      renderUserTable(data.users || []);
      renderProductTable(data.products || []);
      await loadSellerRequests();
    } catch (error) {
      console.error("Admin-Daten Fehler:", error);
      if (userTableBody) {
        userTableBody.innerHTML =
          '<tr><td colspan="5" class="px-5 py-4 text-center text-red-600">Fehler beim Laden der Benutzer</td></tr>';
      }
    }
  };

  const loadDataKeepState = async () => {
    try {
      const response = await fetch(
        "http://localhost:3000/api/dashboard-data",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Daten konnten nicht geladen werden",
        );
      }

      updateStatsBoxes(data.stats);
      renderUserTable(data.users || []);
      renderProductTable(data.products || []);
      await loadSellerRequests();
      
      if (isUsersOpen) {
        usersContainer.style.maxHeight = usersContainer.scrollHeight + "px";
      }
      
      if (isProductsOpen) {
        productsContainer.style.maxHeight = productsContainer.scrollHeight + "px";
      }

      if (isSellerRequestsOpen && sellerRequestsContainer) {
        sellerRequestsContainer.style.maxHeight = sellerRequestsContainer.scrollHeight + "px";
      }
    } catch (error) {
      console.error("Admin-Daten Fehler:", error);
      if (userTableBody) {
        userTableBody.innerHTML =
          '<tr><td colspan="5" class="px-5 py-4 text-center text-red-600">Fehler beim Laden der Benutzer</td></tr>';
      }
    }
  };

  // Modal Event Listeners
  editUserCancel.addEventListener("click", closeEditModal);
  editUserSave.addEventListener("click", saveUserChanges);
  deleteUserCancel.addEventListener("click", closeDeleteModal);
  deleteUserConfirm.addEventListener("click", deleteUserAccount);

  editUserModal.addEventListener("click", (e) => {
    if (e.target === editUserModal) closeEditModal();
  });

  deleteUserModal.addEventListener("click", (e) => {
    if (e.target === deleteUserModal) closeDeleteModal();
  });

  // Product Modal Event Listeners
  editProductCancel.addEventListener("click", closeEditProductModal);
  editProductSave.addEventListener("click", saveProductChanges);
  deleteProductCancel.addEventListener("click", closeDeleteProductModal);
  deleteProductConfirm.addEventListener("click", deleteProductAccount);

  editProductModal.addEventListener("click", (e) => {
    if (e.target === editProductModal) closeEditProductModal();
  });

  deleteProductModal.addEventListener("click", (e) => {
    if (e.target === deleteProductModal) closeDeleteProductModal();
  });

  // Toggle All Users Accordion
  allUsersToggle.addEventListener("click", () => {
    isUsersOpen = !isUsersOpen;
    
    if (isUsersOpen) {
      const toggleIcon = allUsersToggle.querySelector(".toggle-icon");
      toggleIcon.classList.add("open");
      usersContainer.style.maxHeight = usersContainer.scrollHeight + "px";
    } else {
      const toggleIcon = allUsersToggle.querySelector(".toggle-icon");
      toggleIcon.classList.remove("open");
      usersContainer.style.maxHeight = "0";
    }
  });

  // Toggle All Products Accordion
  allProductsToggle.addEventListener("click", () => {
    isProductsOpen = !isProductsOpen;
    
    if (isProductsOpen) {
      const toggleIcon = allProductsToggle.querySelector(".toggle-icon");
      toggleIcon.classList.add("open");
      productsContainer.style.maxHeight = productsContainer.scrollHeight + "px";
    } else {
      const toggleIcon = allProductsToggle.querySelector(".toggle-icon");
      toggleIcon.classList.remove("open");
      productsContainer.style.maxHeight = "0";
    }
  });

  if (sellerRequestsToggle && sellerRequestsContainer) {
    sellerRequestsToggle.addEventListener("click", () => {
      isSellerRequestsOpen = !isSellerRequestsOpen;

      if (isSellerRequestsOpen) {
        const toggleIcon = sellerRequestsToggle.querySelector(".toggle-icon");
        toggleIcon.classList.add("open");
        sellerRequestsContainer.style.maxHeight = sellerRequestsContainer.scrollHeight + "px";
      } else {
        const toggleIcon = sellerRequestsToggle.querySelector(".toggle-icon");
        toggleIcon.classList.remove("open");
        sellerRequestsContainer.style.maxHeight = "0";
      }
    });
  }

  if (sellerRequestFilter) {
    sellerRequestFilter.addEventListener("change", () => {
      renderSellerRequestTable(sellerRequestsCache);
      if (isSellerRequestsOpen && sellerRequestsContainer) {
        sellerRequestsContainer.style.maxHeight = sellerRequestsContainer.scrollHeight + "px";
      }
    });
  }

  await loadCategories();
  loadData();
});

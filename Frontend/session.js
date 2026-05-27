// Central session helpers — exposes `validateSession` and `clearSessionStorage` globally
// Include this file before other frontend scripts (api.js, header.js, session-menu.js, ...)
(function () {
  const VALIDATE_URL = "/api/validate-token";

  async function validateSession(token, userId) {
    if (!token || !userId) return false;
    try {
      const resp = await fetch(VALIDATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, userId }),
      });

      const data = await resp.json().catch(() => ({}));

      if (resp.ok && data && data.success) {
        if (data.statusId !== undefined && data.statusId !== null) {
          localStorage.setItem("statusId", String(data.statusId));
        }
        if (data.userName) {
          localStorage.setItem("userName", data.userName);
        }
        window.dispatchEvent(new CustomEvent("session-validated", { detail: { userId: data.userId } }));
        return true;
      }

      // invalid or expired
      window.dispatchEvent(new CustomEvent("session-invalid", { detail: { error: data?.error } }));
      return false;
    } catch (err) {
      console.error("session.validateSession error:", err);
      return false;
    }
  }

  function clearSessionStorage(shouldRedirect = true) {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userId");
    localStorage.removeItem("statusId");
    localStorage.removeItem("userName");
    window.dispatchEvent(new CustomEvent("session-cleared"));
    if (shouldRedirect) {
      window.location.href = "/Frontend/home.html";
    }
  }

  // Expose on window so existing code can call without imports
  window.validateSession = validateSession;
  window.clearSessionStorage = clearSessionStorage;
})();

async function fetchUserProfile(userId, token) {
  try {
    const response = await fetch("http://localhost:3000/api/user-data", {
      // Replace with your actual endpoint URL
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
        token: token,
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

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId: userId,
      passwort: password,
    }),
  });

  const result = await response.json();

  console.log(result);
}
ValidatePassword(`3adcacff-511a-4c90-96a6-84f7f50b1b0a`, `d3j"nAabaa`);

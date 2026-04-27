import { PrismaClient } from "./prisma/client/client.ts";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10;
const BCRYPT_MAX_BYTES = 72;
const BCRYPT_HASH_REGEX = /^\$2[aby]?\$\d{2}\$[./A-Za-z0-9]{53}$/;

function isBcryptHash(value: string): boolean {
  return BCRYPT_HASH_REGEX.test(value);
}

function isBcryptPasswordLengthValid(password: string): boolean {
  return new TextEncoder().encode(password).length <= BCRYPT_MAX_BYTES;
}

async function hashPassword(password: string) {
  if (!isBcryptPasswordLengthValid(password)) {
    throw new Error("Password exceeds bcrypt limit of 72 bytes");
  }

  return await bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(storedPassword: string, plainPassword: string) {
  if (isBcryptHash(storedPassword)) {
    if (!isBcryptPasswordLengthValid(plainPassword)) {
      return false;
    }

    return await bcrypt.compare(plainPassword, storedPassword);
  }

  return storedPassword === plainPassword;
}

function corsHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*", // dev only - tighten for production
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

async function searchHandler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const searchTerm = url.searchParams.get("search") ?? "";

    if (searchTerm === "") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: corsHeaders(),
      });
    }

    const results = await prisma.produkte.findMany({
      where: {
        AND: [
          { status: "active" },
          {
            OR: [
              { name: { contains: searchTerm } },
              { beschreibung: { contains: searchTerm } },
            ],
          },
        ],
      },
    });

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("searchHandler error:", err);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function kategorieHandler(): Promise<Response> {
  try {
    const results = await prisma.kategorie.findMany();

    return new Response(JSON.stringify(results), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("searchHandler error:", err);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function loginHandler(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { Mail, pw } = body;

    if (!Mail || !pw) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Email und Passwort sind erforderlich",
        }),
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    if (!isBcryptPasswordLengthValid(String(pw))) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Passwort darf maximal 72 Byte lang sein",
        }),
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    const results = await prisma.user.findMany({
      where: {
        OR: [{ email: Mail }],
      },
    });

    if (
      results.length === 0 ||
      !(await verifyPassword(results[0].passwort, pw))
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ungültige E-Mail oder Passwort",
        }),
        {
          status: 401,
          headers: corsHeaders(),
        },
      );
    } else if (results[0].email === Mail) {
      const IDofUser = results[0].userId;
      if (!results[0].passwort.startsWith("$2")) {
        await prisma.user.update({
          where: { userId: IDofUser },
          data: { passwort: await hashPassword(pw) },
        });
      }

      await prisma.token.deleteMany({
        where: {
          userId: IDofUser,
        },
      });
      const newToken = await prisma.token.create({
        data: {
          userId: IDofUser,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 2), // Token expires in 2 hours
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          token: {
            tokenId: newToken.token,
            expiresAt: newToken.expiresAt,
            UserID: newToken.userId,
          },
          statusId: results[0].statusId,
          userId: results[0].userId,
        }),
        {
          status: 200,
          headers: corsHeaders(),
        },
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ungültige E-Mail oder Passwort",
        }),
        {
          status: 401,
          headers: corsHeaders(),
        },
      );
    }
  } catch (err) {
    console.error("useremailHandler error:", err);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function validateTokenForUser(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { token, userId } = body;

    if (!token || !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token und UserID sind erforderlich",
        }),
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    const tokenRecord = await prisma.token.findFirst({
      where: {
        token: token,
        userId: userId,
      },
    });

    if (!tokenRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ungültiger Token oder UserID",
        }),
        {
          status: 401,
          headers: corsHeaders(),
        },
      );
    }

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token abgelaufen",
        }),
        {
          status: 401,
          headers: corsHeaders(),
        },
      );
    }

    // Token is valid
    return new Response(
      JSON.stringify({
        success: true,
        userId: tokenRecord.userId,
      }),
      {
        status: 200,
        headers: corsHeaders(),
      },
    );
  } catch (err) {
    console.error("validateTokenForUser error:", err);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function registerHandler(req: Request): Promise<Response> {
  try {
    // Parse JSON body from request
    const body = await req.json();

    const {
      name,
      email,
      passwort,
      strasse,
      hausnummer,
      postleitzahl,
      land,
      telefonNr,
    } = body;

    // Validate required fields
    if (!name || !email || !passwort) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Name, Email und Passwort sind erforderlich",
        }),
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    if (!isBcryptPasswordLengthValid(String(passwort))) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Passwort darf maximal 72 Byte lang sein",
        }),
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    // Check if user already exists (by email or name)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: email }, { name: name }],
      },
    });

    if (existingUser) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Benutzer mit dieser E-Mail oder diesem Namen existiert bereits",
        }),
        {
          status: 409, // Conflict
          headers: corsHeaders(),
        },
      );
    }

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwort: await hashPassword(passwort),
        statusId: 1, // Default status
        strasse: strasse ?? "",
        hausnummer: hausnummer ?? "",
        postleitzahl: postleitzahl ?? "",
        land: land ?? "AT",
        telefonNr: telefonNr ?? "",
      },
    });

    // Return success (don't send password back)
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          userId: newUser.userId,
          name: newUser.name,
          email: newUser.email,
        },
      }),
      {
        status: 201,
        headers: corsHeaders(),
      },
    );
  } catch (err) {
    console.error("registerHandler error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Registrierung fehlgeschlagen",
      }),
      {
        status: 500,
        headers: corsHeaders(),
      },
    );
  }
}

async function getUserData(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    const { token, userId } = body;
    if (!token || !userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token und UserID sind erforderlich",
        }),
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    const tokenRecord = await prisma.token.findFirst({
      where: {
        token: token,
        userId: userId,
      },
    });

    if (!tokenRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ungültiger Token oder UserID",
        }),
        {
          status: 401,
          headers: corsHeaders(),
        },
      );
    }

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Token abgelaufen",
        }),
        {
          status: 401,
          headers: corsHeaders(),
        },
      );
    }

    const userData = await prisma.user.findUnique({
      where: { userId: userId },
      select: {
        userId: true,
        name: true,
        email: true,
        strasse: true,
        hausnummer: true,
        postleitzahl: true,
        land: true,
        telefonNr: true,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        user: userData,
      }),
      {
        status: 200,
        headers: corsHeaders(),
      },
    );
  } catch (err) {
    console.error("getUserData error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Fehler beim Abrufen der Benutzerdaten",
      }),
      {
        status: 500,
        headers: corsHeaders(),
      },
    );
  }
}

async function validatePassword(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    const { userId, passwort } = body;
    if (!userId || !passwort) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "UserID und Passwort sind erforderlich",
        }),
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    if (!isBcryptPasswordLengthValid(String(passwort))) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Passwort darf maximal 72 Byte lang sein",
        }),
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    const userRecord = await prisma.user.findUnique({
      where: {
        userId: userId,
      },
    });

    if (!userRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ungültige UserID",
        }),
        {
          status: 404,
          headers: corsHeaders(),
        },
      );
    }

    if (!(await verifyPassword(userRecord.passwort, passwort))) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ungültiges Passwort",
        }),
        {
          status: 401,
          headers: corsHeaders(),
        },
      );
    } else {
      return new Response(
        JSON.stringify({
          success: true,
          userId: userRecord.userId,
        }),
        {
          status: 200,
          headers: corsHeaders(),
        },
      );
    }
  } catch (err) {
    console.error("validatePassword error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Fehler beim Überprüfen des Passworts",
      }),
      {
        status: 500,
        headers: corsHeaders(),
      },
    );
  }
}

async function getMyProducts(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    const { userId } = body;
    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "UserID ist erforderlich",
        }),
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    const products = await prisma.produkte.findMany({
      where: {
        userId: userId,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        products: products,
      }),
      {
        status: 200,
        headers: corsHeaders(),
      },
    );
  } catch (err) {
    console.error("getMyProducts error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Fehler beim Abrufen der Produkte",
      }),
      {
        status: 500,
        headers: corsHeaders(),
      },
    );
  }
}

async function updatePassword(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    const { userId, oldPassword, newPassword } = body;
    if (!userId || !oldPassword || !newPassword) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "UserID, altes und neues Passwort sind erforderlich",
        }),
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    if (!isBcryptPasswordLengthValid(String(newPassword))) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Neues Passwort darf maximal 72 Byte lang sein",
        }),
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    const userRecord = await prisma.user.findUnique({
      where: {
        userId: userId,
      },
    });

    if (!userRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ungültige UserID",
        }),
        {
          status: 404,
          headers: corsHeaders(),
        },
      );
    }

    if (!(await verifyPassword(userRecord.passwort, oldPassword))) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ungültiges altes Passwort",
        }),
        {
          status: 401,
          headers: corsHeaders(),
        },
      );
    }

    await prisma.user.update({
      where: {
        userId: userId,
      },
      data: {
        passwort: await hashPassword(newPassword),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Passwort erfolgreich aktualisiert",
      }),
      {
        status: 200,
        headers: corsHeaders(),
      },
    );
  } catch (err) {
    console.error("updatePassword error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Fehler beim Aktualisieren des Passworts",
      }),
      {
        status: 500,
        headers: corsHeaders(),
      },
    );
  }
}

async function updateMyProduct(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const {
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
    } = body;

    if (
      !userId ||
      !productId ||
      !name ||
      !kategorieId ||
      !beschreibung ||
      preis === undefined ||
      bestand === undefined ||
      bundesland === undefined ||
      gewicht === undefined
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "UserID, ProduktID und Produktdaten sind erforderlich",
        }),
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    const parsedPreis = Number(preis);
    const parsedBestand = Number(bestand);
    const parsedGewicht = Number(gewicht);

    if (
      Number.isNaN(parsedPreis) ||
      Number.isNaN(parsedBestand) ||
      Number.isNaN(parsedGewicht)
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ungültige Produktdaten",
        }),
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    const updated = await prisma.produkte.updateMany({
      where: {
        produktId: String(productId),
        userId: String(userId),
      },
      data: {
        name: String(name).trim(),
        beschreibung: String(beschreibung).trim(),
        preis: parsedPreis,
        kategorieId: String(kategorieId),
        bildUrl: String(bildUrl ?? "").trim() || null,
        Bestand: parsedBestand,
        Bundesland: String(bundesland ?? "").trim() || null,
        Gewicht: parsedGewicht,
      },
    });

    if (updated.count === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Produkt nicht gefunden oder keine Berechtigung",
        }),
        {
          status: 404,
          headers: corsHeaders(),
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        productId: String(productId),
      }),
      {
        status: 200,
        headers: corsHeaders(),
      },
    );
  } catch (err) {
    console.error("updateMyProduct error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Fehler beim Aktualisieren des Produkts",
      }),
      {
        status: 500,
        headers: corsHeaders(),
      },
    );
  }
}

async function updateUserData(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { userId, name, email, strasse, hausnummer, postleitzahl, land, telefonNr } = body;

    if (!userId || !name || !email) {
      return new Response(JSON.stringify({
        success: false,
        error: "UserID, Name und Email sind erforderlich",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    const updated = await prisma.user.update({
      where: {
        userId: String(userId),
      },
      data: {
        name: String(name).trim(),
        email: String(email).trim(),
        strasse: String(strasse ?? "").trim(),
        hausnummer: String(hausnummer ?? "").trim(),
        postleitzahl: String(postleitzahl ?? "").trim(),
        land: String(land ?? "").trim(),
        telefonNr: String(telefonNr ?? "").trim(),
      },
    });

    if (!updated) {
      return new Response(JSON.stringify({
        success: false,
        error: "Benutzer nicht gefunden oder keine Berechtigung",
      }), {
        status: 404,
        headers: corsHeaders(),
      });
    }

    return new Response(JSON.stringify({
      success: true,
      userId: String(userId),
    }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("updateUserData error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Aktualisieren der Benutzerdaten",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function deleteProduct(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { userId, productId} = body;

    const deleted = await prisma.produkte.deleteMany({
      where: {
        produktId: String(productId),
        userId: String(userId),
      },
    });

    if (deleted.count === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Produkt nicht gefunden oder keine Berechtigung",
        ID: String(productId),
        UserId: String(userId),
      }), {
        status: 404,
        headers: corsHeaders(),
      });
    }

    return new Response(JSON.stringify({
      success: true,
      productId: String(productId),
    }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("deleteMyProduct error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Löschen des Produkts",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function addToCart(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { userId, productId, amount } = body;

    // Implementation for adding product to cart
    // in modell warenkorbProdukte create a new entry. generate a warenkorbID, add ProductID and amount
    //then link the warenkorb id to the useID in the modell called warenkorb
    
    if (!userId || !productId || amount === undefined) {
      return new Response(JSON.stringify({
        success: false,
        error: "UserID, ProductID und Menge sind erforderlich",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    //chck if user has a cart already
    let cart = await prisma.warenkorb.findFirst({
      where: {
        userId: String(userId),
      },
    });

    //check if the product is already in the cart if so change amount, if so adda a new entry to warenkorbProdukte
    if (cart) {
      const cartProduct = await prisma.warenkorbProdukte.findFirst({
        where: {
          warenkorbId: cart.warenkorbId,
          produktId: String(productId),
        },
      })
      if (cartProduct) {
        await prisma.warenkorbProdukte.update({
          where: {
            warenkorbId_produktId: {
              warenkorbId: cart.warenkorbId,
              produktId: cartProduct.produktId,
            },
          },
          data: {
            menge: cartProduct.menge + amount,
          },
        });
      } else if (!cartProduct) {
        await prisma.warenkorbProdukte.create({
          data: {
            warenkorbId: cart.warenkorbId,
            produktId: String(productId),
            menge: amount,
          },
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: "Fehler beim Hinzufügen zum Warenkorb",
        }), {
          status: 500,
          headers: corsHeaders(),
        });
      }
    } else if (!cart) {
      //if user has no cart create one and add the product to it
      cart = await prisma.warenkorb.create({
        data: {
          userId: String(userId),
          erstellungsdatum: new Date(),
        },
      });
      await prisma.warenkorbProdukte.create({
        data: {
          warenkorbId: cart.warenkorbId,
          produktId: String(productId),
          menge: amount,
        },
      });
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: "Produkt erfolgreich zum Warenkorb hinzugefügt",
    }), {
      status: 200,
      headers: corsHeaders(),
    });

  } catch (err) {
    console.error("addToCart error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Hinzufügen zum Warenkorb",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function removeFromCart(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { userId, productId, amount } = body;

    // Implementation for removing product from cart
    // in modell warenkorbProdukte remove the entry. or decrease by amount. if amount is 0 remove the entry
    //then remove the link the warenkorb    in the modell called warenkorb    
    if (!userId || !productId || amount === undefined) {
      return new Response(JSON.stringify({
        success: false,
        error: "UserID, ProductID und Menge sind erforderlich",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }
    
    const cart = await prisma.warenkorb.findFirst({
      where: {
        userId: String(userId),
      },
    });

    if (!cart) {
      return new Response(JSON.stringify({
        success: false,
        error: "Warenkorb nicht gefunden",
      }), {
        status: 404,
        headers: corsHeaders(),
      });
    } else if (cart) {
      const cartProduct = await prisma.warenkorbProdukte.findFirst({
        where: {
          warenkorbId: cart.warenkorbId,
          produktId: String(productId),
        },
      });

      if (!cartProduct) {
        return new Response(JSON.stringify({
          success: false,
          error: "Produkt nicht im Warenkorb gefunden",
        }), {
          status: 404,
          headers: corsHeaders(),
        });
      } else if (cartProduct) {
        if (cartProduct.menge > amount) {
          await prisma.warenkorbProdukte.update({
            where: {
              warenkorbId_produktId: {
                warenkorbId: cart.warenkorbId,
                produktId: cartProduct.produktId,
              },
            },
            data: {
              menge: cartProduct.menge - amount,
            },
          });
        } else {
          await prisma.warenkorbProdukte.delete({
            where: {
              warenkorbId_produktId: {
                warenkorbId: cart.warenkorbId,
                produktId: cartProduct.produktId,
              },
            },
          });
        }
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: "Fehler beim Entfernen aus dem Warenkorb",
        }), {
          status: 500,
          headers: corsHeaders(),
        });
      }
    }

      return new Response(JSON.stringify({
        success: true,
        message: "Produkt erfolgreich aus dem Warenkorb entfernt",
      }), {
        status: 200,
        headers: corsHeaders(),
      });

  } catch (err) {
    console.error("addToCart error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Hinzufügen zum Warenkorb",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function router(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (url.pathname === "/api/user-data" && req.method === "POST") {
    return await getUserData(req);
  }

  // POST /api/register - User registration
  if (url.pathname === "/api/register" && req.method === "POST") {
    return await registerHandler(req);
  }

  // POST /api/login - User login
  if (url.pathname === "/api/login" && req.method === "POST") {
    return await loginHandler(req);
  }
  if (url.pathname === "/api/validate-token" && req.method === "POST") {
    return await validateTokenForUser(req);
  }

  if (url.pathname.startsWith("/api/search")) {
    if (url.searchParams.has("search")) {
      return await searchHandler(req);
    }
    if (url.searchParams.has("kategorie")) {
      return await kategorieHandler();
    }
  }

  if (url.pathname === "/api/validate-password" && req.method === "POST") {
    return await validatePassword(req);
  }

  if (url.pathname === "/api/my-products" && req.method === "POST") {
    return await getMyProducts(req);
  }

  if (url.pathname === "/api/update-password" && req.method === "POST") {
    return await updatePassword(req);
  }

  if (url.pathname === "/api/update-my-product" && req.method === "POST") {
    return await updateMyProduct(req);
  }

  if (url.pathname === "/api/update-user-data" && req.method === "POST") {
    return await updateUserData(req);
  }

  if (url.pathname === "/api/delete-product" && req.method === "POST") {
    return await deleteProduct(req);
  }

  if (url.pathname === "/api/add-to-cart" && req.method === "POST") {
    return await addToCart(req);
  }

  if (url.pathname === "/api/remove-from-cart" && req.method === "POST") {
    return await removeFromCart(req);
  }

  return new Response(JSON.stringify({ error: "not_found" }), {
    status: 404,
    headers: corsHeaders(),
  });
}

// Start server when run directly (modern Deno.serve: options first, handler second)
if (import.meta.main) {
  const port = Number(Deno.env.get("PORT") ?? 3000);
  console.log(`Starting productSearch server on http://localhost:${port}`);
  Deno.serve({ port }, router);
}

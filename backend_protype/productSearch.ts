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
  if (!isBcryptHash(storedPassword)) {
    return false;
  }

  if (!isBcryptPasswordLengthValid(plainPassword)) {
    return false;
  }

  return await bcrypt.compare(plainPassword, storedPassword);
}

async function verifyPasswordWithLegacyUpgrade(
  userId: string,
  storedPassword: string,
  plainPassword: string,
) {
  if (isBcryptHash(storedPassword)) {
    return await verifyPassword(storedPassword, plainPassword);
  }

  // Legacy fallback for old plaintext rows: compare once and migrate to bcrypt.
  if (storedPassword !== plainPassword) {
    return false;
  }

  if (!isBcryptPasswordLengthValid(plainPassword)) {
    console.warn(
      `Password migration skipped for user ${userId}: plaintext exceeds bcrypt 72-byte limit.`,
    );
    return true;
  }

  await prisma.user.update({
    where: { userId },
    data: { passwort: await hashPassword(plainPassword) },
  });

  return true;
}

function corsHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*", // dev only - tighten for production
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Von Georgi hinzugefügt
function parsePositiveInt(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return null;
  }
  return parsed;
}

// Von Georgi hinzugefügt
async function validateTokenForUserContext(
  userId: string,
  token: string,
): Promise<boolean> {
  const tokenRecord = await prisma.token.findFirst({
    where: {
      token,
      userId,
    },
  });

  if (!tokenRecord) {
    return false;
  }

  if (tokenRecord.expiresAt < new Date()) {
    return false;
  }

  return true;
}

// Von Georgi hinzugefügt
async function getOrCreateCartForUser(userId: string) {
  const existing = await prisma.warenkorb.findFirst({
    where: { userId },
  });
  if (existing) {
    return existing;
  }
  return await prisma.warenkorb.create({
    data: {
      userId,
      erstellungsdatum: new Date(),
    },
  });
}

// Von Georgi hinzugefügt
async function buildCartResponse(userId: string) {
  const cart = await prisma.warenkorb.findFirst({
    where: { userId },
    include: {
      produkte: {
        include: {
          produkt: {
            select: {
              produktId: true,
              name: true,
              preis: true,
              status: true,
              bildUrl: true,
            },
          },
        },
      },
    },
  });

  if (!cart) {
    return {
      cartId: null,
      items: [],
      totalItems: 0,
      totalAmount: 0,
    };
  }

  const items = cart.produkte.map((item) => {
    const preis = Number(item.produkt.preis ?? 0);
    const menge = Number(item.menge ?? 0);
    return {
      productId: item.produktId,
      name: item.produkt.name,
      price: preis,
      quantity: menge,
      status: item.produkt.status,
      imageUrl: item.produkt.bildUrl,
      lineTotal: preis * menge,
    };
  });

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    cartId: cart.warenkorbId,
    items,
    totalItems,
    totalAmount,
  };
}

// Von Georgi hinzugefügt
async function getAuthorizedUserFromBody(body: Record<string, unknown>) {
  const userId = String(body.userId ?? "").trim();
  const token = String(body.token ?? "").trim();

  if (!userId || !token) {
    return { ok: false as const, response: new Response(JSON.stringify({
      success: false,
      error: "Token und UserID sind erforderlich",
    }), {
      status: 400,
      headers: corsHeaders(),
    }) };
  }

  const isValidSession = await validateTokenForUserContext(userId, token);
  if (!isValidSession) {
    return { ok: false as const, response: new Response(JSON.stringify({
      success: false,
      error: "Ungültiger oder abgelaufener Token",
    }), {
      status: 401,
      headers: corsHeaders(),
    }) };
  }

  return { ok: true as const, userId };
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
      !(await verifyPasswordWithLegacyUpgrade(
        results[0].userId,
        results[0].passwort,
        pw,
      ))
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
          // Von Georgi hinzugefuegt/geaendert: Nutzername wird fuer Frontend-Dropdown mitgeliefert
          user: {
            name: results[0].name,
          },
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

    const userData = await prisma.user.findUnique({
      where: { userId: userId },
      select: {
        userId: true,
        statusId: true,
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

    if (
      !(await verifyPasswordWithLegacyUpgrade(
        userRecord.userId,
        userRecord.passwort,
        passwort,
      ))
    ) {
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

    if (
      !(await verifyPasswordWithLegacyUpgrade(
        userRecord.userId,
        userRecord.passwort,
        oldPassword,
      ))
    ) {
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
      status,
      versand,
      selbstabholung,
    } = body;

    if (
      !userId ||
      !productId ||
      !name ||
      !kategorieId ||
      !beschreibung ||
      preis === undefined
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "UserID, ProduktID, Name, Kategorie, Beschreibung und Preis sind erforderlich",
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

    // build update data and include status only when provided
    const updateData: any = {
      name: String(name).trim(),
      beschreibung: String(beschreibung).trim(),
      preis: parsedPreis,
      kategorieId: String(kategorieId),
      bildUrl: String(bildUrl ?? "").trim() || null,
      Bestand: parsedBestand,
      Bundesland: String(bundesland ?? "").trim() || null,
      Gewicht: parsedGewicht,
    };
    if (status !== undefined) {
      updateData.status = String(status).trim();
    }
    if (versand !== undefined) {
      updateData.versand = versand === true;
    }
    if (selbstabholung !== undefined) {
      updateData.selbstabholung = selbstabholung === true;
    }

    // BEFORE updating, check for an existing product image and delete it if it's
    // being replaced and no other product references it.
    const existingProduct = await prisma.produkte.findUnique({ where: { produktId: String(productId) } });
    if (!existingProduct) {
      return new Response(
        JSON.stringify({ success: false, error: "Produkt nicht gefunden" }),
        { status: 404, headers: corsHeaders() },
      );
    }

    const oldBildUrl = existingProduct.bildUrl ?? null;
    const newBildUrl = updateData.bildUrl ?? null;

    const updated = await prisma.produkte.updateMany({
      where: {
        produktId: String(productId),
        userId: String(userId),
      },
      data: updateData,
    });

    // If we replaced the image (old exists, new different), attempt to remove the old file
    if (oldBildUrl && oldBildUrl !== newBildUrl) {
      try {
        // Only delete if no other product references the same URL
        const refs = await prisma.produkte.findMany({ where: { bildUrl: oldBildUrl } });
        if (!refs || refs.length <= 1) {
          // extract filename and delete from ./productpics if it looks like a local upload
          const idx = oldBildUrl.lastIndexOf('/');
          const filename = idx !== -1 ? oldBildUrl.slice(idx + 1) : null;
          if (filename) {
            const filePath = `./productpics/${filename}`;
            try {
              // only remove if file exists
              const stat = await Deno.lstat(filePath).catch(() => null);
              if (stat && stat.isFile) {
                await Deno.remove(filePath).catch(() => null);
              }
            } catch (_e) {
              // ignore deletion errors
            }
          }
        }
      } catch (err) {
        console.error('Error while cleaning up old image:', err);
      }
    }

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

async function createProduct(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { userId, name, kategorieId, beschreibung, preis, bildUrl, bestand, bundesland, gewicht, status, versand, selbstabholung } = body;

    if (!userId || !name || !kategorieId || !beschreibung || preis === undefined) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "UserID, Name, Kategorie, Beschreibung und Preis sind erforderlich",
        }),
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    const parsedPreis = Number(preis);
    if (Number.isNaN(parsedPreis)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ungültiger Preis",
        }),
        {
          status: 400,
          headers: corsHeaders(),
        },
      );
    }

    const parsedBestand = bestand !== undefined ? Number(bestand) : null;
    const parsedGewicht = gewicht !== undefined ? Number(gewicht) : null;

    const product = await prisma.produkte.create({
      data: {
        name: String(name).trim(),
        beschreibung: String(beschreibung).trim(),
        preis: parsedPreis,
        userId: String(userId),
        kategorieId: String(kategorieId),
        // allow client to set status; default to active
        status: status ? String(status).trim() : "active",
        selbstabholung: selbstabholung === true,
        versand: versand === true,
        suchfilterattribute: "",
        bildUrl: bildUrl ? String(bildUrl).trim() : null,
        Bestand: (parsedBestand !== null && !Number.isNaN(parsedBestand)) ? parsedBestand : null,
        Bundesland: bundesland ? String(bundesland).trim() : null,
        Gewicht: (parsedGewicht !== null && !Number.isNaN(parsedGewicht)) ? parsedGewicht : null,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        product: product,
      }),
      {
        status: 201,
        headers: corsHeaders(),
      },
    );
  } catch (err) {
    console.error("createProduct error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Fehler beim Erstellen des Produkts",
      }),
      {
        status: 500,
        headers: corsHeaders(),
      },
    );
  }
}

async function uploadImage(req: Request): Promise<Response> {
  try {
    const form = await req.formData();
    const file = form.get('image') as File | null;
    if (!file) {
      return new Response(JSON.stringify({ success: false, error: 'No file uploaded' }), { status: 400, headers: corsHeaders() });
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid file type' }), { status: 400, headers: corsHeaders() });
    }

    const MAX_BYTES = 5 * 1024 * 1024; // 5MB
    const buffer = await file.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return new Response(JSON.stringify({ success: false, error: 'File too large' }), { status: 413, headers: corsHeaders() });
    }

    let ext = 'jpg';
    if (file.type === 'image/png') ext = 'png';
    else if (file.type === 'image/webp') ext = 'webp';
    else if (file.type === 'image/gif') ext = 'gif';
    else if (file.type === 'image/jpeg') ext = 'jpg';

    const filename = `${crypto.randomUUID()}.${ext}`;
    const uploadDir = './productpics';
    await Deno.mkdir(uploadDir, { recursive: true });
    const outPath = `${uploadDir}/${filename}`;
    await Deno.writeFile(outPath, new Uint8Array(buffer));

    const urlObj = new URL(req.url);
    const origin = `${urlObj.protocol}//${urlObj.host}`;
    const publicUrl = `${origin}/productpics/${filename}`;

    return new Response(JSON.stringify({ success: true, url: publicUrl }), { status: 201, headers: corsHeaders() });
  } catch (err) {
    console.error('uploadImage error', err);
    return new Response(JSON.stringify({ success: false, error: 'Upload failed' }), { status: 500, headers: corsHeaders() });
  }
}

async function addToCart(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    // Von Georgi geändert
    const auth = await getAuthorizedUserFromBody(body as Record<string, unknown>);
    if (!auth.ok) {
      return auth.response;
    }

    // Von Georgi geändert
    const productId = String((body as Record<string, unknown>).productId ?? "").trim();
    const parsedAmount = parsePositiveInt((body as Record<string, unknown>).amount);

    if (!productId || parsedAmount === null) {
      return new Response(JSON.stringify({
        success: false,
        error: "ProductID und gültige Menge sind erforderlich",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    // Von Georgi hinzugefügt
    const product = await prisma.produkte.findFirst({
      where: {
        produktId: productId,
        status: "active",
      },
      select: {
        produktId: true,
      },
    });

    if (!product) {
      return new Response(JSON.stringify({
        success: false,
        error: "Produkt nicht gefunden oder nicht aktiv",
      }), {
        status: 404,
        headers: corsHeaders(),
      });
    }

    // Von Georgi hinzugefügt
    const cart = await getOrCreateCartForUser(auth.userId);

    // Von Georgi hinzugefügt
    const existingCartItem = await prisma.warenkorbProdukte.findUnique({
      where: {
        warenkorbId_produktId: {
          warenkorbId: cart.warenkorbId,
          produktId: productId,
        },
      },
    });

    if (existingCartItem) {
      // Von Georgi hinzugefügt
      await prisma.warenkorbProdukte.update({
        where: {
          warenkorbId_produktId: {
            warenkorbId: cart.warenkorbId,
            produktId: productId,
          },
        },
        data: {
          menge: existingCartItem.menge + parsedAmount,
        },
      });
    } else {
      // Von Georgi hinzugefügt
      await prisma.warenkorbProdukte.create({
        data: {
          warenkorbId: cart.warenkorbId,
          produktId: productId,
          menge: parsedAmount,
        },
      });
    }

    // Von Georgi hinzugefügt
    const cartResponse = await buildCartResponse(auth.userId);

    return new Response(JSON.stringify({
      success: true,
      message: "Produkt erfolgreich zum Warenkorb hinzugefügt",
      cart: cartResponse,
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
    // Von Georgi geändert
    const auth = await getAuthorizedUserFromBody(body as Record<string, unknown>);
    if (!auth.ok) {
      return auth.response;
    }

    // Von Georgi geändert
    const productId = String((body as Record<string, unknown>).productId ?? "").trim();
    const parsedAmount = parsePositiveInt((body as Record<string, unknown>).amount);

    if (!productId || parsedAmount === null) {
      return new Response(JSON.stringify({
        success: false,
        error: "ProductID und gültige Menge sind erforderlich",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    // Von Georgi hinzugefügt
    const cart = await prisma.warenkorb.findFirst({
      where: {
        userId: auth.userId,
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
    }

    // Von Georgi hinzugefügt
    const cartProduct = await prisma.warenkorbProdukte.findUnique({
      where: {
        warenkorbId_produktId: {
          warenkorbId: cart.warenkorbId,
          produktId: productId,
        },
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
    }

    if (cartProduct.menge > parsedAmount) {
      // Von Georgi hinzugefügt
      await prisma.warenkorbProdukte.update({
        where: {
          warenkorbId_produktId: {
            warenkorbId: cart.warenkorbId,
            produktId: productId,
          },
        },
        data: {
          menge: cartProduct.menge - parsedAmount,
        },
      });
    } else {
      // Von Georgi hinzugefügt
      await prisma.warenkorbProdukte.delete({
        where: {
          warenkorbId_produktId: {
            warenkorbId: cart.warenkorbId,
            produktId: productId,
          },
        },
      });
    }

    // Von Georgi hinzugefügt
    const cartResponse = await buildCartResponse(auth.userId);

    return new Response(JSON.stringify({
      success: true,
      message: "Produkt erfolgreich aus dem Warenkorb entfernt",
      cart: cartResponse,
    }), {
      status: 200,
      headers: corsHeaders(),
    });

  } catch (err) {
    // Von Georgi geändert
    console.error("removeFromCart error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Entfernen aus dem Warenkorb",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

// Von Georgi hinzugefügt
async function getCart(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const auth = await getAuthorizedUserFromBody(body as Record<string, unknown>);
    if (!auth.ok) {
      return auth.response;
    }

    const cartResponse = await buildCartResponse(auth.userId);

    return new Response(JSON.stringify({
      success: true,
      cart: cartResponse,
    }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("getCart error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Abrufen des Warenkorbs",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

// Von Georgi hinzugefügt
async function setCartItemQuantity(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const auth = await getAuthorizedUserFromBody(body as Record<string, unknown>);
    if (!auth.ok) {
      return auth.response;
    }

    const productId = String((body as Record<string, unknown>).productId ?? "").trim();
    const quantityRaw = Number((body as Record<string, unknown>).quantity);

    if (!productId || !Number.isInteger(quantityRaw) || quantityRaw < 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "ProductID und gültige Menge sind erforderlich",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    const cart = await prisma.warenkorb.findFirst({ where: { userId: auth.userId } });
    if (!cart) {
      return new Response(JSON.stringify({
        success: false,
        error: "Warenkorb nicht gefunden",
      }), {
        status: 404,
        headers: corsHeaders(),
      });
    }

    const cartItem = await prisma.warenkorbProdukte.findUnique({
      where: {
        warenkorbId_produktId: {
          warenkorbId: cart.warenkorbId,
          produktId: productId,
        },
      },
    });

    if (!cartItem) {
      return new Response(JSON.stringify({
        success: false,
        error: "Produkt nicht im Warenkorb gefunden",
      }), {
        status: 404,
        headers: corsHeaders(),
      });
    }

    if (quantityRaw === 0) {
      await prisma.warenkorbProdukte.delete({
        where: {
          warenkorbId_produktId: {
            warenkorbId: cart.warenkorbId,
            produktId: productId,
          },
        },
      });
    } else {
      await prisma.warenkorbProdukte.update({
        where: {
          warenkorbId_produktId: {
            warenkorbId: cart.warenkorbId,
            produktId: productId,
          },
        },
        data: {
          menge: quantityRaw,
        },
      });
    }

    const cartResponse = await buildCartResponse(auth.userId);

    return new Response(JSON.stringify({
      success: true,
      cart: cartResponse,
    }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("setCartItemQuantity error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Aktualisieren der Warenkorbmenge",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

// Von Georgi hinzugefügt
async function removeCartItem(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const auth = await getAuthorizedUserFromBody(body as Record<string, unknown>);
    if (!auth.ok) {
      return auth.response;
    }

    const productId = String((body as Record<string, unknown>).productId ?? "").trim();
    if (!productId) {
      return new Response(JSON.stringify({
        success: false,
        error: "ProductID ist erforderlich",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    const cart = await prisma.warenkorb.findFirst({ where: { userId: auth.userId } });
    if (!cart) {
      return new Response(JSON.stringify({
        success: false,
        error: "Warenkorb nicht gefunden",
      }), {
        status: 404,
        headers: corsHeaders(),
      });
    }

    await prisma.warenkorbProdukte.deleteMany({
      where: {
        warenkorbId: cart.warenkorbId,
        produktId: productId,
      },
    });

    const cartResponse = await buildCartResponse(auth.userId);

    return new Response(JSON.stringify({
      success: true,
      cart: cartResponse,
    }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("removeCartItem error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Entfernen des Produkts aus dem Warenkorb",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

// Von Georgi hinzugefügt
async function checkout(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const auth = await getAuthorizedUserFromBody(body as Record<string, unknown>);
    if (!auth.ok) {
      return auth.response;
    }

    const cart = await prisma.warenkorb.findFirst({
      where: { userId: auth.userId },
      include: {
        produkte: {
          include: {
            produkt: {
              select: {
                produktId: true,
                preis: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!cart || cart.produkte.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Warenkorb ist leer",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    const invalidItem = cart.produkte.find((item) => item.produkt.status !== "active");
    if (invalidItem) {
      return new Response(JSON.stringify({
        success: false,
        error: "Ein oder mehrere Produkte sind nicht mehr verfügbar",
      }), {
        status: 409,
        headers: corsHeaders(),
      });
    }

    const totalAmount = cart.produkte.reduce(
      (sum, item) => sum + Number(item.produkt.preis) * item.menge,
      0,
    );

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.bestellung.create({
        data: {
          userId: auth.userId,
          datum: new Date(),
          gesamtbetrag: totalAmount,
        },
      });

      for (const item of cart.produkte) {
        await tx.bestellungProdukte.create({
          data: {
            bestellId: order.bestellId,
            produktId: item.produktId,
            menge: item.menge,
          },
        });
      }

      await tx.warenkorbProdukte.deleteMany({
        where: {
          warenkorbId: cart.warenkorbId,
        },
      });

      return order;
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Checkout erfolgreich",
      orderId: result.bestellId,
      totalAmount,
    }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("checkout error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Checkout",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function deleteUser(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { userId, begruendung } = body;

    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: "UserID is required",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        userId: String(userId),
      },
    });

    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: "User not found",
      }), {
        status: 404,
        headers: corsHeaders(),
      });
    }

    await prisma.user.delete({
      where: {
        userId: String(userId),
      },
    });

    return new Response(JSON.stringify({
      success: true,
      message: "User successfully deleted",
    }), {
      status: 200,
      headers: corsHeaders(),
    });

  } catch (err) {
    console.error("deleteUser error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Löschen des Benutzers",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function getAllUserDashboardData(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { userId } = body; //userID of Admin who is accessing the dashboard

    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: "UserID is required",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        userId: String(userId),
      },
    });

    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: "User not found",
      }), {
        status: 404,
        headers: corsHeaders(),
      });
    }

    if (user.statusId !== 3) {
      return new Response(JSON.stringify({
        success: false,
        error: "Access denied: insufficient permissions",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    const [totalUsers, customerUsers, sellerUsers, adminUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { statusId: 1 } }),
      prisma.user.count({ where: { statusId: 2 } }),
      prisma.user.count({ where: { statusId: 3 } }),
    ]);

    const users = await prisma.user.findMany({
      where: {
        OR: [{ statusId: 1 }, { statusId: 2 }],
      },
      select: {
        userId: true,
        name: true,
        email: true,
        statusId: true,
      },
    });

    // Fetch products with seller information
    const products = await prisma.produkte.findMany({
      select: {
        produktId: true,
        name: true,
        beschreibung: true,
        preis: true,
        status: true,
        Bestand: true,
        kategorieId: true,
        bildUrl: true,
        Gewicht: true,
        Bundesland: true,
        userId: true,
      },
    });

    // Enrich products with seller names
    const productUsers = new Map();
    for (const product of products) {
      if (!productUsers.has(product.userId)) {
        const seller = await prisma.user.findUnique({
          where: { userId: product.userId },
          select: { name: true },
        });
        productUsers.set(product.userId, seller?.name || "Unknown");
      }
    }

    const enrichedProducts = products.map(p => ({
      ...p,
      sellerName: productUsers.get(p.userId),
      productId: p.produktId,
    }));

    return new Response(JSON.stringify({
      success: true,
      users,
      products: enrichedProducts,
      stats: {
        totalUsers,
        customerUsers,
        sellerUsers,
        adminUsers,
      },
    }), {
      status: 200,
      headers: corsHeaders(),
    });

 

  } catch (err) {
    console.error("getAllUserDashboardData error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Abrufen der Benutzer-Dashboard-Daten",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function editUser(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ success: false, error: 'Invalid request body' }), { status: 400, headers: corsHeaders() });
    }

    // Extract and validate userId
    const { userId } = body as { userId?: string };
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: 'UserID is required' }), { status: 400, headers: corsHeaders() });
    }

    // Whitelist fields to avoid accidental array/indexed payloads
    const allowedFields = ['name', 'email', 'passwort', 'strasse', 'hausnummer', 'postleitzahl', 'land', 'telefonNr', 'statusId'];
    const updateData: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        updateData[key] = (body as any)[key];
      }
    }

    if (Object.prototype.hasOwnProperty.call(updateData, 'statusId')) {
      const statusValue = Number(updateData.statusId);
      if (Number.isNaN(statusValue)) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid statusId' }), { status: 400, headers: corsHeaders() });
      }

      if (statusValue === 3) {
        const targetUser = await prisma.user.findUnique({
          where: { userId: String(userId) },
          select: { statusId: true },
        });

        if (!targetUser) {
          return new Response(JSON.stringify({ success: false, error: 'User not found' }), { status: 404, headers: corsHeaders() });
        }

        if (targetUser.statusId !== 3) {
          return new Response(JSON.stringify({ success: false, error: 'Admin role assignment not allowed' }), { status: 403, headers: corsHeaders() });
        }
      }

      updateData.statusId = statusValue;
    }

    // Hash password if present
    if (updateData.passwort && typeof updateData.passwort === 'string') {
      updateData.passwort = await hashPassword(updateData.passwort as string);
    }

    // 2. Update Database
    const updatedUser = await prisma.user.update({
      where: { userId: String(userId) },
      data: updateData as any,
    });

    // 3. Success Response
    return new Response(
      JSON.stringify({
        success: true,
        user: updatedUser,
      }),
      {
        status: 200,
        headers: corsHeaders(),
      }
    );

  } catch (err: any) {
    console.error("editUser error:", err);

    // Handle Prisma-specific error: Record to update not found (P2025)
    if (err.code === 'P2025') {
      return new Response(
        JSON.stringify({
          success: false,
          error: "User not found",
        }),
        {
          status: 404,
          headers: corsHeaders(),
        }
      );
    }

    // General server error
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error while updating user",
      }),
      {
        status: 500,
        headers: corsHeaders(),
      }
    );
  }
}

async function getAllProductsForAdminDashboard(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { userId } = body; //userID of Admin who is accessing the dashboard

    // 1. Validation: Ensure userId exists
    if (!userId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "UserID is required",
        }),
        {
          status: 400,
          headers: corsHeaders(),
        }
      );
    }

    const admin = await prisma.user.findUnique({
      where: {
        userId: String(userId),
      },
    });
    if (!admin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Admin not found",
        }),
        {
          status: 404,
          headers: corsHeaders(),
        }
      );
    }
    if (admin.statusId !== 3) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Access denied: insufficient permissions",
        }),
        {
          status: 403,
          headers: corsHeaders(),
        }
      );
    }
    // 2. Fetch all products
    const products = await prisma.produkte.findMany({
      select: {
        produktId: true,
        status: true,
        name: true,
        beschreibung: true,
        preis: true,
        userId: true,
        selbstabholung: true,
        versand: true,
        suchfilterattribute: true,
        kategorieId: true,
        bildUrl: true,
        Bestand: true,
        Bundesland: true,
        Gewicht: true,
      },
    });

    // 3. Success Response
    return new Response(
      JSON.stringify({
        success: true,
        products,
      }),
      {
        status: 200,
        headers: corsHeaders(),
      }
    );

  } catch (err) {
    console.error("getAllProductsForAdminDashboard error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Abrufen der Produkte für das Admin-Dashboard",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function editProductAsAdmin(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const {
      userId,
      productId,
      name,
      preis,
      beschreibung,
      bestand,
      status,
      kategorieId,
      bildUrl,
      bundesland,
      gewicht,
    } = body;

    if (!userId || !productId || !name || preis === undefined || !beschreibung || !kategorieId || bestand === undefined || bestand === null || bestand === "") {
      return new Response(JSON.stringify({
        success: false,
        error: "Erforderliche Felder fehlen",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    // Verify admin access
    const admin = await prisma.user.findUnique({
      where: { userId: String(userId) },
    });

    if (!admin || admin.statusId !== 3) {
      return new Response(JSON.stringify({
        success: false,
        error: "Zugriff verweigert: Admin-Berechtigung erforderlich",
      }), {
        status: 403,
        headers: corsHeaders(),
      });
    }

    const parsedPreis = Number(preis);
    const parsedBestand = Number(bestand);
    const parsedGewicht = gewicht === undefined || gewicht === null || gewicht === ""
      ? null
      : Number(gewicht);

    if (
      Number.isNaN(parsedPreis) ||
      Number.isNaN(parsedBestand) ||
      (parsedGewicht !== null && Number.isNaN(parsedGewicht))
    ) {
      return new Response(JSON.stringify({
        success: false,
        error: "Preis, Bestand und Gewicht müssen Zahlen sein",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    const updateData: any = {
      name: String(name).trim(),
      beschreibung: String(beschreibung).trim(),
      preis: parsedPreis,
      kategorieId: String(kategorieId),
    };

    updateData.Bestand = parsedBestand;

    if (gewicht !== undefined) {
      updateData.Gewicht = parsedGewicht;
    }

    if (bundesland !== undefined) {
      updateData.Bundesland = bundesland ? String(bundesland).trim() : null;
    }

    if (bildUrl !== undefined) {
      updateData.bildUrl = bildUrl ? String(bildUrl) : null;
    }

    if (status !== undefined) {
      updateData.status = String(status);
    }

    const updated = await prisma.produkte.updateMany({
      where: {
        produktId: String(productId),
      },
      data: updateData,
    });

    if (updated.count === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Produkt nicht gefunden",
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
    console.error("editProductAsAdmin error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Bearbeiten des Produkts",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function deleteProductAsAdmin(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { userId, productId } = body;

    if (!userId || !productId) {
      return new Response(JSON.stringify({
        success: false,
        error: "UserID und ProductID sind erforderlich",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    // Verify admin access
    const admin = await prisma.user.findUnique({
      where: { userId: String(userId) },
    });

    if (!admin || admin.statusId !== 3) {
      return new Response(JSON.stringify({
        success: false,
        error: "Zugriff verweigert: Admin-Berechtigung erforderlich",
      }), {
        status: 403,
        headers: corsHeaders(),
      });
    }

    // Get the product to delete the image if needed
    const product = await prisma.produkte.findUnique({
      where: { produktId: String(productId) },
    });

    if (!product) {
      return new Response(JSON.stringify({
        success: false,
        error: "Produkt nicht gefunden",
      }), {
        status: 404,
        headers: corsHeaders(),
      });
    }

    // Delete the product
    const deleted = await prisma.produkte.deleteMany({
      where: {
        produktId: String(productId),
      },
    });

    if (deleted.count === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Fehler beim Löschen des Produkts",
      }), {
        status: 500,
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
    console.error("deleteProductAsAdmin error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Löschen des Produkts",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function requestSellerRole(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { userId, begruendung } = body;

    const user = await prisma.user.findUnique({
      where: { userId: String(userId) },
    });

    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: "Benutzer nicht gefunden",
      }), {
        status: 404,
        headers: corsHeaders(),
      });
    }

    const existingRequest = await prisma.verkäuferstatusanfrage.findFirst({
      where: {
        userId: String(userId),
        status: {
          in: ["pending", "approved"],
        },
      },
      orderBy: {
        datum: "desc",
      },
    });

    if (existingRequest) {
      return new Response(JSON.stringify({
        success: false,
        error: "Es liegt bereits eine Anfrage für den Verkäufer-Status vor",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    const trimmedBegruendung = typeof begruendung === "string"
      ? begruendung.trim()
      : "";

    if (!trimmedBegruendung) {
      return new Response(JSON.stringify({
        success: false,
        error: "Die Begruendung darf nicht leer sein",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    await prisma.verkäuferstatusanfrage.create({
      data: {
        userId: String(userId),
        status: "pending",
        datum: new Date(),
        begruendung: trimmedBegruendung,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      userId: String(userId),
      message: "Antrag wurde erfolgreich abgesendet",
    }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("requestSellerRole error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler bei der Antragstellung für Verkäuferrolle",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function getSellerRoleRequestForUser(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return new Response(JSON.stringify({
        success: false,
        error: "Benutzer-ID fehlt",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    const user = await prisma.user.findUnique({
      where: { userId: String(userId) },
    });

    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: "Benutzer nicht gefunden",
      }), {
        status: 404,
        headers: corsHeaders(),
      });
    }

    const request = await prisma.verkäuferstatusanfrage.findFirst({
      where: { userId: String(userId) },
      orderBy: { datum: "desc" },
    });

    return new Response(JSON.stringify({
      success: true,
      request: request
        ? {
          anfrageId: request.anfrageId,
          status: request.status,
          datum: request.datum,
          kommentarAdmin: request.kommentarAdmin ?? null,
        }
        : null,
    }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("getSellerRoleRequestForUser error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Abrufen der Verkäufer-Rollenanfrage",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function getAllSellerRoleRequests(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { userId } = body;

    //get all seller role requests, only accessible by admins
    const admin = await prisma.user.findUnique({
      where: { userId: String(userId) },
    });

    if (!admin || admin.statusId !== 3) {
      return new Response(JSON.stringify({
        success: false,
        error: "Zugriff verweigert: Admin-Berechtigung erforderlich",
      }), {
        status: 403,
        headers: corsHeaders(),
      });
    }

    const requests = await prisma.verkäuferstatusanfrage.findMany({
      include: {
        user: {
          select: {
            userId: true,
            name: true,
            email: true,
            strasse: true,
            hausnummer: true,
            postleitzahl: true,
            land: true,
          },
        },
      },
      orderBy: {
        datum: "desc",
      },
    });

    return new Response(JSON.stringify({
      success: true,
      requests,
    }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("getSellerRoleRequests error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Abrufen der Verkäufer-Rollenanfragen",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function processSellerRoleRequest(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { requestId, status, admincomment, comment } = body; //reason
    const resolvedComment = typeof admincomment === "string"
      ? admincomment.trim()
      : typeof comment === "string"
      ? comment.trim()
      : "";

    if (status === "rejected" && !resolvedComment) {
      return new Response(JSON.stringify({
        success: false,
        error: "Eine Begruendung ist fuer die Ablehnung erforderlich",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    // set status of request to "approved" or "rejected", and also add the comment if provided
    const request = await prisma.verkäuferstatusanfrage.findUnique({
      where: { anfrageId: String(requestId) },
    });

    if (!request) {
      return new Response(JSON.stringify({
        success: false,
        error: "Anfrage nicht gefunden",
      }), {
        status: 404,
        headers: corsHeaders(),
      });
    }

    await prisma.verkäuferstatusanfrage.update({
      where: { anfrageId: String(requestId) },
      data: {
        status: String(status),
        kommentarAdmin: resolvedComment || null,
        //grund: reason || null,
      },
    });

    if (status === "approved") {
      await prisma.user.update({
        where: { userId: String(request.userId) },
        data: { statusId: 2 }, // Assuming 2 represents the seller status
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Verkäufer-Rollenanfrage erfolgreich verarbeitet",
    }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("processSellerRoleRequest error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler bei der Verarbeitung der Verkäufer-Rollenanfrage",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function getAllUserOrders(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { userId } = body;

    const orders = await prisma.bestellung.findMany({
      where: { userId: String(userId) },
      include: { produkte: true }, 
    });

    return new Response(JSON.stringify({
      success: true,
      orders,
    }), {
      status: 200,
      headers: corsHeaders(),
    });
  } catch (err) {
    console.error("getAllUserOrders error:", err);
    return new Response(JSON.stringify({
      success: false,
      error: "Fehler beim Abrufen der Benutzerbestellungen",
    }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

async function router(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Serve files from ./productpics at /productpics/*
  if (url.pathname.startsWith('/productpics/')) {
    try {
      const fsPath = '.' + url.pathname; // map /productpics/foo.jpg -> ./productpics/foo.jpg
      const data = await Deno.readFile(fsPath);
      let contentType = 'application/octet-stream';
      if (fsPath.endsWith('.png')) contentType = 'image/png';
      else if (fsPath.endsWith('.jpg') || fsPath.endsWith('.jpeg')) contentType = 'image/jpeg';
      else if (fsPath.endsWith('.webp')) contentType = 'image/webp';
      else if (fsPath.endsWith('.gif')) contentType = 'image/gif';
      return new Response(data, { status: 200, headers: { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' } });
    } catch (e) {
      return new Response('Not found', { status: 404, headers: corsHeaders() });
    }
  }

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

  if (url.pathname === "/api/create-product" && req.method === "POST") {
    return await createProduct(req);
  }

  if (url.pathname === '/api/upload-image' && req.method === 'POST') {
    return await uploadImage(req);
  }

  // Cleanup endpoint: delete files in ./productpics not referenced by any product
  if (url.pathname === '/api/cleanup-productpics') {
    try {
      // optional auth could be added here
      const dir = './productpics';
      const entries: string[] = [];
      for await (const file of Deno.readDir(dir)) {
        if (file.isFile) entries.push(file.name);
      }

      // collect all bildUrl filenames referenced in DB
      const products = await prisma.produkte.findMany({ select: { bildUrl: true } });
      const referenced = new Set<string>();
      for (const p of products) {
        if (p.bildUrl) {
          const idx = p.bildUrl.lastIndexOf('/');
          if (idx !== -1) referenced.add(p.bildUrl.slice(idx + 1));
        }
      }

      const deleted: string[] = [];
      for (const f of entries) {
        if (!referenced.has(f)) {
          try {
            await Deno.remove(`${dir}/${f}`);
            deleted.push(f);
          } catch (err) {
            console.error('Failed to delete', f, err);
          }
        }
      }

      return new Response(JSON.stringify({ success: true, deleted }), { status: 200, headers: corsHeaders() });
    } catch (err) {
      console.error('cleanup error', err);
      return new Response(JSON.stringify({ success: false, error: 'Cleanup failed' }), { status: 500, headers: corsHeaders() });
    }
  }

  if (url.pathname === "/api/add-to-cart" && req.method === "POST") {
    return await addToCart(req);
  }

  if (url.pathname === "/api/remove-from-cart" && req.method === "POST") {
    return await removeFromCart(req);
  }

  // Von Georgi hinzugefügt
  if (url.pathname === "/api/cart" && req.method === "POST") {
    return await getCart(req);
  }

  // Von Georgi hinzugefügt
  if (url.pathname === "/api/cart/set-quantity" && req.method === "POST") {
    return await setCartItemQuantity(req);
  }

  // Von Georgi hinzugefügt
  if (url.pathname === "/api/cart/remove-item" && req.method === "POST") {
    return await removeCartItem(req);
  }

  // Von Georgi hinzugefügt
  if (url.pathname === "/api/checkout" && req.method === "POST") {
    return await checkout(req);
  }

  if (url.pathname === "/api/delete-user" && req.method === "POST") {
    return await deleteUser(req);
  }

  if (url.pathname === "/api/dashboard-data" && req.method === "POST") {
    return await getAllUserDashboardData(req);
  }

  if (url.pathname === "/api/edit-user" && req.method === "POST") {
    return await editUser(req);
  }

  if (url.pathname === "/api/admin/products" && req.method === "POST") {
    return await getAllProductsForAdminDashboard(req);
  }

  if (url.pathname === "/api/admin/edit-product" && req.method === "POST") {
    return await editProductAsAdmin(req);
  }

  if (url.pathname === "/api/admin/delete-product" && req.method === "POST") {
    return await deleteProductAsAdmin(req);
  }

  if (url.pathname === "/api/request-seller-role" && req.method === "POST") {
    return await requestSellerRole(req);
  }

  if (url.pathname === "/api/my-seller-role-request" && req.method === "POST") {
    return await getSellerRoleRequestForUser(req);
  }

  if (url.pathname === "/api/seller-role-requests" && req.method === "POST") {
    return await getAllSellerRoleRequests(req);
  }

  if (url.pathname === "/api/process-seller-role-request" && req.method === "POST") {
    return await processSellerRoleRequest(req);
  }

  if (url.pathname === "/api/my-orders" && req.method === "POST") {
    return await getAllUserOrders(req);
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

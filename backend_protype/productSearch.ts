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
    const { userId, name, kategorieId, beschreibung, preis, bildUrl, bestand, bundesland, gewicht, status } = body;

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
        selbstabholung: true,
        versand: true,
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

async function deleteUser(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const { userId } = body;

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
    } else if (user.statusId === 3) { 
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

      return new Response(JSON.stringify({
        success: true,
        users,
      }), {
        status: 200,
        headers: corsHeaders(),
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: "Access denied: insufficient permissions",
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

 

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
    
    /**
     * We extract userId and group the remaining fields into 'updateData'.
     * If 'body' contains { userId: "1", name: "Alex" }, 
     * then userId is "1" and updateData is { name: "Alex" }.
     */
    const { userId, ...updateData } = body;

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

    // 2. Update Database
    // Prisma .update() only updates the fields present in the object.
    // Fields that are 'undefined' (not in the JSON body) are ignored by Prisma.
    const updatedUser = await prisma.user.update({
      where: {
        userId: String(userId),
      },
      data: updateData,
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
  if (url.pathname === '/api/cleanup-productpics' && req.method === 'POST') {
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

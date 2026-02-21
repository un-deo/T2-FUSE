import { PrismaClient } from "./prisma/client/client.ts";

const prisma = new PrismaClient();

function corsHeaders() {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",               // dev only - tighten for production
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
    const url = new URL(req.url);
    const searchTerm = url.searchParams.get("logininfo") ?? "";
    const pw = url.searchParams.get("pw") ?? "";

    if (searchTerm === "" || pw === "") {
      return new Response(JSON.stringify([false]), {
        status: 200,
        headers: corsHeaders(),
      });
    }

    const results = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: searchTerm } },
        ],
      },
    });

    if(results.length === 0 || results[0].passwort !== pw){
      return new Response(JSON.stringify([false]), {
        status: 200,
        headers: corsHeaders(),
      });
    }
    if(results[0].email === searchTerm && results[0].passwort === pw){
      return new Response(JSON.stringify([true]), {
        status: 200,
        headers: corsHeaders(),
      });
    } else {
      return new Response(JSON.stringify([false]), {
        status: 200,
        headers: corsHeaders(),
      });
    }

  } catch (err) {
    console.error("useremailHandler error:", err);
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: corsHeaders(),
    });
  }
}

// Register a new user
async function registerHandler(req: Request): Promise<Response> {
  try {
    // Parse JSON body from request
    const body = await req.json();
    
    const { name, email, passwort, strasse, hausnummer, postleitzahl, land, telefonNr } = body;

    // Validate required fields
    if (!name || !email || !passwort) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Name, Email und Passwort sind erforderlich" 
      }), {
        status: 400,
        headers: corsHeaders(),
      });
    }

    // Check if user already exists (by email or name)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { name: name },
        ],
      },
    });

    if (existingUser) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Benutzer mit dieser E-Mail oder diesem Namen existiert bereits" 
      }), {
        status: 409, // Conflict
        headers: corsHeaders(),
      });
    }

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwort, // Note: In production, hash the password!
        statusId: 1, // Default status
        strasse: strasse ?? "",
        hausnummer: hausnummer ?? "",
        postleitzahl: postleitzahl ?? "",
        land: land ?? "AT",
        telefonNr: telefonNr ?? "",
      },
    });

    // Return success (don't send password back)
    return new Response(JSON.stringify({ 
      success: true, 
      user: {
        userId: newUser.userId,
        name: newUser.name,
        email: newUser.email,
      }
    }), {
      status: 201,
      headers: corsHeaders(),
    });

  } catch (err) {
    console.error("registerHandler error:", err);
    return new Response(JSON.stringify({ 
      success: false, 
      error: "Registrierung fehlgeschlagen" 
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

  // POST /api/register - User registration
  if (url.pathname === "/api/register" && req.method === "POST") {
    return await registerHandler(req);
  }

  if (url.pathname.startsWith("/api/search")) {
    if (url.searchParams.has("search") ) { 
      return await searchHandler(req)
    };
    if (url.searchParams.has("logininfo"))
    {
      return await loginHandler(req)
    }
    if (url.searchParams.has("kategorie"))
    {
      return await kategorieHandler()
    }
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
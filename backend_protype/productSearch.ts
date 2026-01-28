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
        OR: [
          { name: { contains: searchTerm } },
          { beschreibung: { contains: searchTerm } },
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

async function kategorieHandler(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const searchTerm = url.searchParams.get("kategorie") ?? "";

    // if (searchTerm === "") {
    //   return new Response(JSON.stringify([]), {
    //     status: 200,
    //     headers: corsHeaders(),
    //   });
    // }

    // return all categories
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


    // return new Response(JSON.stringify(results), {
    //   status: 200,
    //   headers: corsHeaders(),
    // });
  } catch (err) {
    console.error("useremailHandler error:", err);
    return new Response(JSON.stringify({ error: "internal" }), {
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
      return await kategorieHandler(req)
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
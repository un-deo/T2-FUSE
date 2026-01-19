import { PrismaClient } from "./prisma/client/client.ts";
import { serve } from "https://deno.land/std@0.206.0/http/server.ts";

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

async function router(req: Request): Promise<Response> {
  const url = new URL(req.url);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (url.pathname.startsWith("/api/search")) {
    return await searchHandler(req);
  }

  return new Response(JSON.stringify({ error: "not_found" }), {
    status: 404,
    headers: corsHeaders(),
  });
}

// Start server when run directly
if (import.meta.main) {
  const port = Number(Deno.env.get("PORT") ?? 3000);
  console.log(`Starting productSearch server on http://localhost:${port}`);
  serve(router, { port });
}
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://primitiverepairs.com",
  "https://www.primitiverepairs.com",
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]);

function getCorsHeaders(origin: string | null) {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://www.primitiverepairs.com";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin"
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json; charset=utf-8"
      }
    }
  );
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get("origin");

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse(
      {
        success: false,
        error: "Origin not allowed."
      },
      403,
      origin
    );
  }

  if (request.method === "OPTIONS") {
    return new Response(
      null,
      {
        status: 204,
        headers: getCorsHeaders(origin)
      }
    );
  }

  if (request.method !== "GET") {
    return jsonResponse(
      {
        success: false,
        error: "Method not allowed."
      },
      405,
      origin
    );
  }

  const supabaseUrl =
    Deno.env.get("SUPABASE_URL");

  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Missing Supabase function environment variables."
    );

    return jsonResponse(
      {
        success: false,
        error: "Inventory service is not configured."
      },
      500,
      origin
    );
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );

  const {
    data,
    error
  } = await supabase
    .from("primitive_repairs_screen_protectors")
    .select(
      [
        "brand",
        "model",
        "sku",
        "name",
        "label",
        "price",
        "quantity",
        "available",
        "installed"
      ].join(",")
    )
    .eq("active", true)
    .order("brand", {
      ascending: true
    })
    .order("model", {
      ascending: true
    });

  if (error) {
    console.error(
      "Screen-protector inventory query failed:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error: "Unable to load inventory."
      },
      500,
      origin
    );
  }

  const inventory: Record<
    string,
    Record<string, Record<string, unknown>>
  > = {};

  for (const row of data || []) {
    const brand = String(row.brand || "").trim();
    const model = String(row.model || "").trim();

    if (!brand || !model) {
      continue;
    }

    if (!inventory[brand]) {
      inventory[brand] = {};
    }

    const quantity = Math.max(
      0,
      Number(row.quantity || 0)
    );

    inventory[brand][model] = {
      available:
        row.available === true &&
        quantity > 0,

      sku: String(row.sku || "").trim(),

      name: String(
        row.name ||
        "Premium Tempered Glass"
      ).trim(),

      label: String(
        row.label ||
        row.name ||
        "Premium Screen Protector"
      ).trim(),

      price: Math.max(
        0,
        Number(row.price || 0)
      ),

      quantity,

      installed:
        row.installed !== false
    };
  }

  return jsonResponse(
    {
      success: true,
      source: "supabase",
      inventory,
      fetchedAt: new Date().toISOString()
    },
    200,
    origin
  );
});
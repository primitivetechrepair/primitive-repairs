import { createClient } from "npm:@supabase/supabase-js@2";

const INVENTORY_TABLE =
  "primitive_repairs_screen_protectors";

const AUDIT_TABLE =
  "primitive_repairs_screen_protector_inventory_audit";

const MAX_BODY_BYTES = 16384;

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

function timingSafeEqual(
  supplied: string,
  expected: string
) {
  const encoder = new TextEncoder();
  const suppliedBytes = encoder.encode(supplied);
  const expectedBytes = encoder.encode(expected);

  const maximumLength = Math.max(
    suppliedBytes.length,
    expectedBytes.length
  );

  let difference =
    suppliedBytes.length ^
    expectedBytes.length;

  for (
    let index = 0;
    index < maximumLength;
    index += 1
  ) {
    difference |=
      (suppliedBytes[index] || 0) ^
      (expectedBytes[index] || 0);
  }

  return difference === 0;
}

function readRequiredText(
  value: unknown,
  fieldName: string,
  maximumLength = 160
) {
  const normalized = String(value || "").trim();

  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  if (normalized.length > maximumLength) {
    throw new Error(`${fieldName} is too long.`);
  }

  return normalized;
}

function readQuantity(value: unknown) {
  const quantity = Number(value);

  if (
    !Number.isInteger(quantity) ||
    quantity < 0 ||
    quantity > 100000
  ) {
    throw new Error(
      "Quantity must be a whole number from 0 to 100000."
    );
  }

  return quantity;
}

function readPrice(value: unknown) {
  const price = Number(value);

  if (
    !Number.isFinite(price) ||
    price < 0 ||
    price > 100000
  ) {
    throw new Error(
      "Price must be a valid non-negative number."
    );
  }

  return Number(price.toFixed(2));
}

Deno.serve(async (request: Request) => {
  /*
   * This endpoint is intentionally not available from
   * browser JavaScript.
   */
  if (request.headers.get("origin")) {
    return jsonResponse(
      {
        success: false,
        error: "Browser requests are not allowed."
      },
      403
    );
  }

  const expectedAdminKey =
    Deno.env.get(
      "PRIMITIVE_REPAIRS_INVENTORY_ADMIN_KEY"
    ) || "";

  if (expectedAdminKey.length < 32) {
    console.error(
      "Inventory admin key is missing or invalid."
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Inventory administration is not configured."
      },
      500
    );
  }

  const authorization =
    request.headers.get("authorization") || "";

  const suppliedAdminKey =
    authorization.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : "";

  if (
    !suppliedAdminKey ||
    !timingSafeEqual(
      suppliedAdminKey,
      expectedAdminKey
    )
  ) {
    return jsonResponse(
      {
        success: false,
        error: "Unauthorized."
      },
      401
    );
  }

  const supabaseUrl =
    Deno.env.get("SUPABASE_URL");

  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      {
        success: false,
        error:
          "Supabase administration is not configured."
      },
      500
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

  if (request.method === "GET") {
    const requestUrl = new URL(request.url);
    const view =
      requestUrl.searchParams.get("view") ||
      "inventory";

    if (view === "audit") {
      const requestedLimit = Number(
        requestUrl.searchParams.get("limit") || 25
      );

      const limit = Math.min(
        100,
        Math.max(
          1,
          Number.isInteger(requestedLimit)
            ? requestedLimit
            : 25
        )
      );

      const {
        data,
        error
      } = await supabase
        .from(AUDIT_TABLE)
        .select(
          [
            "id",
            "inventory_id",
            "sku",
            "operation",
            "old_record",
            "new_record",
            "changed_at"
          ].join(",")
        )
        .order(
          "changed_at",
          {
            ascending: false
          }
        )
        .limit(limit);

      if (error) {
        console.error(
          "Inventory audit lookup failed:",
          error
        );

        return jsonResponse(
          {
            success: false,
            error: "Unable to load inventory history."
          },
          500
        );
      }

      return jsonResponse({
        success: true,
        view: "audit",
        audit: data || []
      });
    }

    const {
      data,
      error
    } = await supabase
      .from(INVENTORY_TABLE)
      .select(
        [
          "id",
          "brand",
          "model",
          "sku",
          "name",
          "label",
          "price",
          "quantity",
          "available",
          "installed",
          "active",
          "created_at",
          "updated_at"
        ].join(",")
      )
      .order(
        "brand",
        {
          ascending: true
        }
      )
      .order(
        "model",
        {
          ascending: true
        }
      );

    if (error) {
      console.error(
        "Admin inventory lookup failed:",
        error
      );

      return jsonResponse(
        {
          success: false,
          error: "Unable to load inventory."
        },
        500
      );
    }

    return jsonResponse({
      success: true,
      view: "inventory",
      inventory: data || []
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Method not allowed."
      },
      405
    );
  }

  const contentLength = Number(
    request.headers.get("content-length") || 0
  );

  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse(
      {
        success: false,
        error: "Request body is too large."
      },
      413
    );
  }

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        success: false,
        error: "Invalid JSON body."
      },
      400
    );
  }

  const action = String(
    body.action || ""
  )
    .trim()
    .toLowerCase();

  try {
    if (action === "upsert") {
      const brand = readRequiredText(
        body.brand,
        "Brand",
        80
      );

      const model = readRequiredText(
        body.model,
        "Model",
        120
      );

      const sku = readRequiredText(
        body.sku,
        "SKU",
        120
      );

      const name = String(
        body.name ||
        "Premium Tempered Glass"
      ).trim();

      const label = String(
        body.label ||
        "Premium Screen Protector"
      ).trim();

      const price = readPrice(
        body.price ?? 19
      );

      const quantity = readQuantity(
        body.quantity ?? 0
      );

      const record = {
        brand,
        model,
        sku,
        name,
        label,
        price,
        quantity,
        available: quantity > 0,
        installed: body.installed !== false,
        active: body.active !== false
      };

      const {
        data,
        error
      } = await supabase
        .from(INVENTORY_TABLE)
        .upsert(
          record,
          {
            onConflict: "sku"
          }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      return jsonResponse({
        success: true,
        action,
        record: data
      });
    }

    const sku = readRequiredText(
      body.sku,
      "SKU",
      120
    );

    if (action === "confirm-addon") {
      const requestId = readRequiredText(
        body.requestId,
        "Request ID",
        160
      );

      const units = readQuantity(
        body.units ?? 1
      );

      if (units < 1) {
        throw new Error(
          "Units must be at least 1."
        );
      }

      const note = String(
        body.note || ""
      )
        .trim()
        .slice(0, 500);

      const {
        data,
        error
      } = await supabase.rpc(
        "primitive_repairs_confirm_screen_protector_addon",
        {
          p_sku: sku,
          p_request_id: requestId,
          p_units: units,
          p_note: note || null
        }
      );

      if (error) {
        throw error;
      }

      return jsonResponse({
        success: true,
        action,
        result: data
      });
    }

    if (action === "restore-addon") {
      const requestId = readRequiredText(
        body.requestId,
        "Request ID",
        160
      );

      const note = String(
        body.note || ""
      )
        .trim()
        .slice(0, 500);

      const {
        data,
        error
      } = await supabase.rpc(
        "primitive_repairs_restore_screen_protector_addon",
        {
          p_sku: sku,
          p_request_id: requestId,
          p_note: note || null
        }
      );

      if (error) {
        throw error;
      }

      return jsonResponse({
        success: true,
        action,
        result: data
      });
    }

    if (action === "restock") {
      const units = readQuantity(
        body.units
      );

      if (units < 1) {
        throw new Error(
          "Units must be at least 1."
        );
      }

      const operationId = String(
        body.operationId ||
        `restock:${crypto.randomUUID()}`
      )
        .trim()
        .slice(0, 200);

      const note = String(
        body.note || ""
      )
        .trim()
        .slice(0, 500);

      const {
        data,
        error
      } = await supabase.rpc(
        "primitive_repairs_restock_screen_protector",
        {
          p_sku: sku,
          p_units: units,
          p_operation_id: operationId,
          p_note: note || null
        }
      );

      if (error) {
        throw error;
      }

      return jsonResponse({
        success: true,
        action,
        result: data
      });
    }

    if (action === "set-stock") {
      const quantity = readQuantity(
        body.quantity
      );

      const {
        data,
        error
      } = await supabase
        .from(INVENTORY_TABLE)
        .update({
          quantity,
          available: quantity > 0
        })
        .eq("sku", sku)
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return jsonResponse(
          {
            success: false,
            error: "Inventory SKU was not found."
          },
          404
        );
      }

      return jsonResponse({
        success: true,
        action,
        record: data
      });
    }

    if (action === "set-price") {
      const price = readPrice(
        body.price
      );

      const {
        data,
        error
      } = await supabase
        .from(INVENTORY_TABLE)
        .update({
          price
        })
        .eq("sku", sku)
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return jsonResponse(
          {
            success: false,
            error: "Inventory SKU was not found."
          },
          404
        );
      }

      return jsonResponse({
        success: true,
        action,
        record: data
      });
    }

    if (
      action === "enable" ||
      action === "disable"
    ) {
      const active = action === "enable";

      const {
        data,
        error
      } = await supabase
        .from(INVENTORY_TABLE)
        .update({
          active
        })
        .eq("sku", sku)
        .select()
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        return jsonResponse(
          {
            success: false,
            error: "Inventory SKU was not found."
          },
          404
        );
      }

      return jsonResponse({
        success: true,
        action,
        record: data
      });
    }

    return jsonResponse(
      {
        success: false,
        error: "Unsupported inventory action."
      },
      400
    );
  } catch (error) {
    console.error(
      "Inventory administration failed:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Inventory update failed."
      },
      400
    );
  }
});
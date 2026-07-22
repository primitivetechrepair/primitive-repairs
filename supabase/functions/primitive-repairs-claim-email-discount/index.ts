import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = new Set([
  "https://primitiverepairs.com",
  "https://www.primitiverepairs.com",
  "http://localhost:3000",
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]);

const OFFER_VERSION = "primitive-repairs-email-discount-v1";
const DISCOUNT_AMOUNT = 10;
const EXPIRATION_DAYS = 30;
const MINIMUM_REPAIR_SUBTOTAL = 75;

const CONSENT_TEXT =
  "Email me my $10 savings code and occasional repair offers. I can unsubscribe anytime.";

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://primitiverepairs.com";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

function normalizeEmail(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function sanitizeText(
  value: unknown,
  maxLength: number
): string {
  return String(value || "")
    .trim()
    .slice(0, maxLength);
}

function createCouponCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(7);

  crypto.getRandomValues(bytes);

  const token = Array.from(bytes)
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");

  return `PR10-${token}`;
}

async function hashRequestIp(
  request: Request
): Promise<string | null> {
  const secret = Deno.env.get("DISCOUNT_IP_HASH_SECRET");

  if (!secret) {
    return null;
  }

  const forwardedFor =
    request.headers.get("x-forwarded-for") || "";

  const ip = forwardedFor
    .split(",")[0]
    .trim();

  if (!ip) {
    return null;
  }

  const encoded = new TextEncoder().encode(
    `${secret}:${ip}`
  );

  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoded
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function formatExpirationDate(
  isoDate: string
): string {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "America/New_York",
      year: "numeric",
      month: "long",
      day: "numeric"
    }
  ).format(new Date(isoDate));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendDiscountEmail({
  to,
  couponCode,
  expiresAt
}: {
  to: string;
  couponCode: string;
  expiresAt: string;
}): Promise<void> {
  const resendApiKey =
    Deno.env.get("RESEND_API_KEY");

  const fromEmail =
    Deno.env.get("DISCOUNT_FROM_EMAIL");

  const replyTo =
    Deno.env.get("DISCOUNT_REPLY_TO");

  if (!resendApiKey) {
    throw new Error(
      "Missing RESEND_API_KEY secret."
    );
  }

  if (!fromEmail) {
    throw new Error(
      "Missing DISCOUNT_FROM_EMAIL secret."
    );
  }

  const safeCouponCode =
    escapeHtml(couponCode);

  const expirationLabel =
    escapeHtml(
      formatExpirationDate(expiresAt)
    );

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        ...(replyTo
          ? { reply_to: replyTo }
          : {}),
        subject:
          "Your $10 Primitive Tech Repairs savings code",
        html: `
          <!doctype html>
          <html lang="en">
            <head>
              <meta charset="utf-8">
              <meta
                name="viewport"
                content="width=device-width, initial-scale=1"
              >
              <title>Your $10 Repair Savings Code</title>
            </head>

            <body
              style="
                margin:0;
                padding:0;
                background:#e9eef4;
                color:#182536;
                font-family:'Manrope',Arial,Helvetica,sans-serif;
              "
            >
              <div
                style="
                  display:none;
                  max-height:0;
                  overflow:hidden;
                  opacity:0;
                  color:transparent;
                "
              >
                Your $10 Primitive Tech Repairs savings code is ready.
              </div>

              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  width:100%;
                  border-collapse:collapse;
                  background:#e9eef4;
                "
              >
                <tr>
                  <td
                    align="center"
                    style="padding:28px 12px;"
                  >
                    <table
                      role="presentation"
                      width="620"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="
                        width:100%;
                        max-width:620px;
                        border-collapse:collapse;
                        background:#ffffff;
                        border:1px solid #bdc8d4;
                        box-shadow:0 16px 42px rgba(12,27,44,.12);
                      "
                    >
                      <tr>
                        <td
                          style="
                            padding:14px 22px;
                            background:#10263b;
                            border-bottom:3px solid #1c8f86;
                          "
                        >
                          <table
                            role="presentation"
                            width="100%"
                            cellspacing="0"
                            cellpadding="0"
                            border="0"
                          >
                            <tr>
                              <td>
                                <div
                                  style="
                                    margin:0;
                                    color:#8fe1d7;
                                    font-family:'Space Grotesk',Arial,Helvetica,sans-serif;
                                    font-size:11px;
                                    font-weight:700;
                                    line-height:1.4;
                                    letter-spacing:.16em;
                                    text-transform:uppercase;
                                  "
                                >
                                  Repair Blueprint
                                </div>
                              </td>

                              <td
                                align="right"
                                style="
                                  color:#c7d3df;
                                  font-size:10px;
                                  font-weight:700;
                                  letter-spacing:.12em;
                                  text-transform:uppercase;
                                "
                              >
                                Savings Authorization
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <tr>
                        <td
                          style="
                            padding:30px 28px 12px;
                            background:#f8fafc;
                          "
                        >
                          <div
                            style="
                              margin:0 0 8px;
                              color:#1c8f86;
                              font-size:11px;
                              font-weight:800;
                              line-height:1.4;
                              letter-spacing:.14em;
                              text-transform:uppercase;
                            "
                          >
                            Primitive Tech Repairs
                          </div>

                          <h1
                            style="
                              margin:0;
                              color:#13263a;
                              font-family:'Space Grotesk',Arial,Helvetica,sans-serif;
                              font-size:30px;
                              font-weight:700;
                              line-height:1.12;
                              letter-spacing:-.025em;
                            "
                          >
                            Your repair savings blueprint is ready.
                          </h1>

                          <p
                            style="
                              margin:14px 0 0;
                              color:#536477;
                              font-size:15px;
                              line-height:1.65;
                            "
                          >
                            Present the authorization code below when submitting
                            or confirming your qualifying repair service.
                          </p>
                        </td>
                      </tr>

                      <tr>
                        <td
                          style="
                            padding:18px 28px 24px;
                            background:#f8fafc;
                          "
                        >
                          <table
                            role="presentation"
                            width="100%"
                            cellspacing="0"
                            cellpadding="0"
                            border="0"
                            style="
                              width:100%;
                              border-collapse:collapse;
                              border:1px solid #6f8295;
                              background:#10263b;
                            "
                          >
                            <tr>
                              <td
                                style="
                                  padding:11px 16px;
                                  border-bottom:1px solid #395064;
                                "
                              >
                                <table
                                  role="presentation"
                                  width="100%"
                                  cellspacing="0"
                                  cellpadding="0"
                                  border="0"
                                >
                                  <tr>
                                    <td
                                      style="
                                        color:#8fe1d7;
                                        font-size:10px;
                                        font-weight:800;
                                        letter-spacing:.16em;
                                        text-transform:uppercase;
                                      "
                                    >
                                      Customer Savings Authorization
                                    </td>

                                    <td
                                      align="right"
                                      style="
                                        color:#9fb0c0;
                                        font-size:10px;
                                        font-weight:700;
                                        letter-spacing:.1em;
                                        text-transform:uppercase;
                                      "
                                    >
                                      PR-BP-010
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <tr>
                              <td
                                align="center"
                                style="padding:28px 18px 12px;"
                              >
                                <div
                                  style="
                                    margin:0;
                                    color:#ffffff;
                                    font-family:'Space Grotesk',Arial,Helvetica,sans-serif;
                                    font-size:46px;
                                    font-weight:700;
                                    line-height:1;
                                    letter-spacing:-.04em;
                                  "
                                >
                                  $10 OFF
                                </div>

                                <div
                                  style="
                                    margin:9px 0 0;
                                    color:#a9bac9;
                                    font-size:11px;
                                    font-weight:700;
                                    line-height:1.4;
                                    letter-spacing:.15em;
                                    text-transform:uppercase;
                                  "
                                >
                                  Qualifying completed repair
                                </div>
                              </td>
                            </tr>

                            <tr>
                              <td
                                style="padding:16px 22px 24px;"
                              >
                                <div
                                  style="
                                    padding:17px 12px;
                                    background:#e9fffb;
                                    border:1px solid #70c9bf;
                                    color:#123e3a;
                                    text-align:center;
                                    font-family:'Space Grotesk',Arial,Helvetica,sans-serif;
                                    font-size:27px;
                                    font-weight:700;
                                    line-height:1.2;
                                    letter-spacing:.1em;
                                  "
                                >
                                  ${safeCouponCode}
                                </div>
                              </td>
                            </tr>

                            <tr>
                              <td
                                style="
                                  padding:13px 16px;
                                  background:#162f46;
                                  border-top:1px solid #395064;
                                "
                              >
                                <table
                                  role="presentation"
                                  width="100%"
                                  cellspacing="0"
                                  cellpadding="0"
                                  border="0"
                                >
                                  <tr>
                                    <td
                                      style="
                                        color:#9fb0c0;
                                        font-size:10px;
                                        font-weight:700;
                                        letter-spacing:.12em;
                                        text-transform:uppercase;
                                      "
                                    >
                                      Status
                                    </td>

                                    <td
                                      align="right"
                                      style="
                                        color:#8fe1d7;
                                        font-size:11px;
                                        font-weight:800;
                                        letter-spacing:.1em;
                                        text-transform:uppercase;
                                      "
                                    >
                                      Authorized
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <tr>
                        <td
                          style="
                            padding:0 28px 26px;
                            background:#ffffff;
                          "
                        >
                          <table
                            role="presentation"
                            width="100%"
                            cellspacing="0"
                            cellpadding="0"
                            border="0"
                            style="
                              width:100%;
                              border-collapse:collapse;
                              border-top:1px solid #d9e1e8;
                              border-bottom:1px solid #d9e1e8;
                            "
                          >
                            <tr>
                              <td
                                style="
                                  width:50%;
                                  padding:14px 10px 14px 0;
                                  border-right:1px solid #d9e1e8;
                                "
                              >
                                <div
                                  style="
                                    margin:0 0 4px;
                                    color:#718194;
                                    font-size:9px;
                                    font-weight:800;
                                    letter-spacing:.14em;
                                    text-transform:uppercase;
                                  "
                                >
                                  Expiration
                                </div>

                                <div
                                  style="
                                    color:#1a2c3f;
                                    font-size:14px;
                                    font-weight:700;
                                  "
                                >
                                  ${expirationLabel}
                                </div>
                              </td>

                              <td
                                style="
                                  width:50%;
                                  padding:14px 0 14px 18px;
                                "
                              >
                                <div
                                  style="
                                    margin:0 0 4px;
                                    color:#718194;
                                    font-size:9px;
                                    font-weight:800;
                                    letter-spacing:.14em;
                                    text-transform:uppercase;
                                  "
                                >
                                  Minimum service
                                </div>

                                <div
                                  style="
                                    color:#1a2c3f;
                                    font-size:14px;
                                    font-weight:700;
                                  "
                                >
                                  ${MINIMUM_REPAIR_SUBTOTAL} repair subtotal
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <tr>
                        <td
                          align="center"
                          style="
                            padding:0 28px 28px;
                            background:#ffffff;
                          "
                        >
                          <a
                            href="https://primitiverepairs.com/"
                            style="
                              display:inline-block;
                              padding:14px 24px;
                              background:#1c8f86;
                              border:1px solid #16756e;
                              color:#ffffff;
                              font-family:'Space Grotesk',Arial,Helvetica,sans-serif;
                              font-size:13px;
                              font-weight:700;
                              line-height:1;
                              letter-spacing:.08em;
                              text-decoration:none;
                              text-transform:uppercase;
                            "
                          >
                            Start Repair Request
                          </a>
                        </td>
                      </tr>

                      <tr>
                        <td
                          style="
                            padding:20px 28px;
                            background:#eef3f7;
                            border-top:1px solid #d5dee7;
                          "
                        >
                          <div
                            style="
                              margin:0 0 8px;
                              color:#33485d;
                              font-size:10px;
                              font-weight:800;
                              letter-spacing:.13em;
                              text-transform:uppercase;
                            "
                          >
                            Authorization conditions
                          </div>

                          <p
                            style="
                              margin:0;
                              color:#69798a;
                              font-size:11px;
                              line-height:1.65;
                            "
                          >
                            Valid for $10 off one qualifying completed repair
                            service with a minimum repair subtotal of
                            ${MINIMUM_REPAIR_SUBTOTAL}. One offer per customer
                            and email address. Cannot be combined with other
                            discounts. Not valid toward diagnostic fees,
                            parts-only purchases, accessories, or after-hours
                            convenience fees.
                          </p>
                        </td>
                      </tr>

                      <tr>
                        <td
                          align="center"
                          style="
                            padding:17px 22px;
                            background:#10263b;
                            color:#9fb0c0;
                            font-size:10px;
                            line-height:1.6;
                          "
                        >
                          Primitive Tech Repairs · Miami, Florida<br>
                          Repair Blueprint Customer Savings Program
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
        `
      })
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Resend request failed: ${response.status} ${errorText}`
    );
  }
}

Deno.serve(async (request: Request) => {
  const origin =
    request.headers.get("origin");

  const corsHeaders =
    getCorsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new Response(
      null,
      {
        status: 204,
        headers: corsHeaders
      }
    );
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        message: "Method not allowed."
      },
      405,
      corsHeaders
    );
  }

  if (
    origin &&
    !ALLOWED_ORIGINS.has(origin)
  ) {
    return jsonResponse(
      {
        success: false,
        message: "Origin not allowed."
      },
      403,
      corsHeaders
    );
  }

  let payload: Record<string, unknown>;

  try {
    payload = await request.json();
  } catch {
    return jsonResponse(
      {
        success: false,
        message: "Invalid request body."
      },
      400,
      corsHeaders
    );
  }

  const honeypot =
    sanitizeText(payload.company, 200);

  if (honeypot) {
    return jsonResponse(
      {
        success: true,
        message:
          "If this email is eligible, the savings details will be sent."
      },
      200,
      corsHeaders
    );
  }

  const email =
    normalizeEmail(payload.email);

  const consentGiven =
    payload.consent === true;

  const sourcePage =
    sanitizeText(
      payload.sourcePage,
      200
    );

  const sourceUrl =
    sanitizeText(
      payload.sourceUrl,
      1000
    );

  if (
    !email ||
    email.length > 254 ||
    !EMAIL_PATTERN.test(email)
  ) {
    return jsonResponse(
      {
        success: false,
        field: "email",
        message:
          "Enter a valid email address."
      },
      400,
      corsHeaders
    );
  }

  if (!consentGiven) {
    return jsonResponse(
      {
        success: false,
        field: "consent",
        message:
          "Consent is required to receive the savings code."
      },
      400,
      corsHeaders
    );
  }

  const supabaseUrl =
    Deno.env.get("SUPABASE_URL");

  const serviceRoleKey =
    Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    console.error(
      "Missing required Supabase environment variables."
    );

    return jsonResponse(
      {
        success: false,
        message:
          "The savings service is temporarily unavailable."
      },
      500,
      corsHeaders
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
    data: existingSignup,
    error: existingError
  } = await supabase
    .from("primitive_repairs_email_discount_signups")
    .select(
      "id, coupon_code, status, expires_at"
    )
    .eq("email_normalized", email)
    .maybeSingle();

  if (existingError) {
    console.error(
      "Existing signup lookup failed:",
      existingError
    );

    return jsonResponse(
      {
        success: false,
        message:
          "The savings service is temporarily unavailable."
      },
      500,
      corsHeaders
    );
  }

  if (existingSignup) {
    const isActive =
      existingSignup.status === "issued" &&
      new Date(
        existingSignup.expires_at
      ).getTime() > Date.now();

    if (isActive) {
      try {
        await sendDiscountEmail({
          to: email,
          couponCode:
            existingSignup.coupon_code,
          expiresAt:
            existingSignup.expires_at
        });
      } catch (error) {
        console.error(
          "Existing code resend failed:",
          error
        );

        return jsonResponse(
          {
            success: false,
            message:
              "We could not send the savings email. Please try again."
          },
          502,
          corsHeaders
        );
      }
    }

    return jsonResponse(
      {
        success: true,
        message:
          "If this email is eligible, the savings details have been sent."
      },
      200,
      corsHeaders
    );
  }

  const issuedAt =
    new Date();

  const expiresAt =
    new Date(
      issuedAt.getTime() +
      EXPIRATION_DAYS *
      24 *
      60 *
      60 *
      1000
    );

  const couponCode =
    createCouponCode();

  const requestIpHash =
    await hashRequestIp(request);

  const userAgent =
    sanitizeText(
      request.headers.get("user-agent"),
      500
    );

  const {
    data: insertedSignup,
    error: insertError
  } = await supabase
    .from("primitive_repairs_email_discount_signups")
    .insert({
      email,
      email_normalized: email,
      coupon_code: couponCode,
      discount_amount:
        DISCOUNT_AMOUNT,
      status: "issued",
      source_page:
        sourcePage || null,
      source_url:
        sourceUrl || null,
      consent_given: true,
      consent_text:
        CONSENT_TEXT,
      offer_version:
        OFFER_VERSION,
      consented_at:
        issuedAt.toISOString(),
      issued_at:
        issuedAt.toISOString(),
      expires_at:
        expiresAt.toISOString(),
      request_ip_hash:
        requestIpHash,
      user_agent:
        userAgent || null
    })
    .select(
      "id, coupon_code, expires_at"
    )
    .single();

  if (insertError) {
    if (
      insertError.code === "23505"
    ) {
      return jsonResponse(
        {
          success: true,
          message:
            "If this email is eligible, the savings details have been sent."
        },
        200,
        corsHeaders
      );
    }

    console.error(
      "Discount signup insert failed:",
      insertError
    );

    return jsonResponse(
      {
        success: false,
        message:
          "The savings service is temporarily unavailable."
      },
      500,
      corsHeaders
    );
  }

  try {
    await sendDiscountEmail({
      to: email,
      couponCode:
        insertedSignup.coupon_code,
      expiresAt:
        insertedSignup.expires_at
    });
  } catch (error) {
    console.error(
      "New discount email failed:",
      error
    );

    const { error: cleanupError } =
      await supabase
        .from(
          "primitive_repairs_email_discount_signups"
        )
        .delete()
        .eq(
          "id",
          insertedSignup.id
        );

    if (cleanupError) {
      console.error(
        "Failed to clean up undelivered discount record:",
        cleanupError
      );
    }

    return jsonResponse(
      {
        success: false,
        message:
          "We could not send the savings email. Please try again."
      },
      502,
      corsHeaders
    );
  }

  return jsonResponse(
    {
      success: true,
      message:
        "Check your email — your $10 savings code is on the way."
    },
    201,
    corsHeaders
  );
});
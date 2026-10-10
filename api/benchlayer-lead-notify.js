import crypto from "node:crypto";

const clean = (value, max = 500) => String(value ?? "").trim().slice(0, max);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function secureEqual(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));
  if (!a.length || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const expectedSecret = clean(process.env.BENCHLAYER_LEAD_NOTIFY_SECRET, 256);
  const suppliedSecret = clean(req.headers["x-benchlayer-notify-secret"], 256);
  if (!expectedSecret || !secureEqual(expectedSecret, suppliedSecret)) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const resendApiKey = clean(process.env.RESEND_API_KEY, 512);
  const notifyEmail = clean(process.env.FORM_NOTIFY_EMAIL, 320);
  const fromEmail = clean(process.env.FORM_FROM_EMAIL, 320);
  if (!resendApiKey || !notifyEmail || !fromEmail) {
    return res.status(503).json({ success: false, error: "Email notification is not configured" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const confirmationReference = clean(body.confirmationReference, 96);
  const leadId = clean(body.leadId, 160);
  const customerName = clean(body.customerName, 120) || "New customer";
  const phone = clean(body.contactNumber, 32);
  const email = clean(body.email, 254);
  const device = clean(body.device, 280) || "Device not specified";
  const repair = clean(body.repair, 500) || "Repair request";
  const appUrl = clean(body.appUrl, 1000);

  if (!/^PTR-[A-F0-9]{20}$/.test(confirmationReference)) {
    return res.status(400).json({ success: false, error: "Invalid lead notification reference" });
  }

  let safeAppUrl = "";
  try {
    const parsed = new URL(appUrl);
    if (parsed.protocol === "https:" && parsed.hostname === "benchlayerapp.vercel.app") {
      safeAppUrl = parsed.toString();
    }
  } catch {}

  const subject = `New website repair lead - ${customerName}`;
  const textBody = [
    "A new repair lead was submitted through Primitive Tech Repair.",
    "",
    `Customer: ${customerName}`,
    phone ? `Phone: ${phone}` : "",
    email ? `Email: ${email}` : "",
    `Device: ${device}`,
    `Repair: ${repair}`,
    leadId ? `Lead ID: ${leadId}` : "",
    `Reference: ${confirmationReference}`,
    safeAppUrl ? `Open in BenchLayer: ${safeAppUrl}` : "",
  ].filter(Boolean).join("\n");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#1D1E22;color:#f4f5f7;padding:28px">
      <div style="max-width:620px;margin:0 auto;border:1px solid #393F4D;border-radius:18px;background:#24262d;overflow:hidden">
        <div style="height:4px;background:#66FCF1"></div>
        <div style="padding:24px">
          <div style="color:#66FCF1;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">BenchLayer alert</div>
          <h1 style="margin:8px 0 4px;font-size:25px;line-height:1.15">New website repair lead</h1>
          <p style="margin:0 0 22px;color:#aeb3bf;font-size:14px">A customer just submitted a repair request through Primitive Tech Repair.</p>

          <div style="padding:16px;border:1px solid #393F4D;border-radius:12px;background:#1D1E22">
            <div style="font-size:19px;font-weight:700">${escapeHtml(customerName)}</div>
            ${phone ? `<div style="margin-top:6px"><a href="tel:${escapeHtml(phone.replace(/[^\\d+]/g, ""))}" style="color:#66FCF1;text-decoration:none">${escapeHtml(phone)}</a></div>` : ""}
            ${email ? `<div style="margin-top:4px"><a href="mailto:${escapeHtml(email)}" style="color:#66FCF1;text-decoration:none">${escapeHtml(email)}</a></div>` : ""}
          </div>

          <div style="display:grid;gap:10px;margin-top:14px">
            <div style="padding:12px 14px;border:1px solid #393F4D;border-radius:10px"><strong>Device</strong><div style="margin-top:4px;color:#c7cad2">${escapeHtml(device)}</div></div>
            <div style="padding:12px 14px;border:1px solid #393F4D;border-radius:10px"><strong>Repair</strong><div style="margin-top:4px;color:#c7cad2">${escapeHtml(repair)}</div></div>
          </div>

          ${safeAppUrl ? `<a href="${escapeHtml(safeAppUrl)}" style="display:inline-block;margin-top:18px;padding:12px 16px;border-radius:10px;background:#66FCF1;color:#1D1E22;font-weight:800;text-decoration:none">Open lead in BenchLayer</a>` : ""}
          <div style="margin-top:18px;color:#7f8592;font-size:11px">Reference ${escapeHtml(confirmationReference)}</div>
        </div>
      </div>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [notifyEmail],
        subject,
        text: textBody,
        html,
        reply_to: email || undefined,
      }),
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("benchlayer lead email failed", response.status, result?.name || result?.message || "unknown");
      return res.status(502).json({ success: false, error: "Email delivery failed" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("benchlayer lead email failed", error?.message || error);
    return res.status(502).json({ success: false, error: "Email delivery failed" });
  }
}

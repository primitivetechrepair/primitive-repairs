// api/submit-warranty.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.FORM_NOTIFY_EMAIL;
    const fromEmail = process.env.FORM_FROM_EMAIL;

    if (!resendApiKey || !notifyEmail || !fromEmail) {
      return res.status(500).json({
        success: false,
        error: "Missing email environment variables.",
      });
    }

    const claim = req.body || {};

    const fullName = claim.fullName || claim.name || "Not provided";
    const phone = claim.phone || "Not provided";
    const email = claim.email || "Not provided";
    const originalRepairDate = claim.originalRepairDate || "Not provided";
    const device = claim.device || "Not provided";
    const originalRepairType = claim.originalRepairType || "Not provided";
    const issue = claim.issue || "Not provided";

    const filesCount = Array.isArray(claim.attachments)
      ? claim.attachments.length
      : Array.isArray(claim.files)
        ? claim.files.length
        : claim.filesCount || 0;

    const submittedAt = claim.submittedAt || new Date().toISOString();

    const emailHtml = `
      <div style="margin:0;padding:0;background:#05070b;font-family:Arial,Helvetica,sans-serif;color:#f5f7fb;">
        <div style="max-width:680px;margin:0 auto;padding:28px 16px;">
          
          <div style="background:linear-gradient(135deg,#101827,#070b12);border:1px solid rgba(255,255,255,0.12);border-radius:22px;overflow:hidden;box-shadow:0 18px 45px rgba(0,0,0,0.35);">
            
            <div style="padding:28px 28px 22px;border-bottom:1px solid rgba(255,255,255,0.1);">
              <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:rgba(102,252,241,0.12);border:1px solid rgba(102,252,241,0.35);color:#66fcf1;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                Warranty Claim
              </div>

              <h1 style="margin:18px 0 8px;font-size:28px;line-height:1.15;color:#ffffff;">
                New Warranty Review Request
              </h1>

              <p style="margin:0;color:#b8c0cc;font-size:15px;line-height:1.6;">
                A customer submitted a warranty claim from the Primitive Repairs website.
              </p>
            </div>

            <div style="padding:24px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 0;color:#8d98a8;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">Submitted</td>
                  <td style="padding:12px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(submittedAt)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#8d98a8;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">Full Name</td>
                  <td style="padding:12px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(fullName)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#8d98a8;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">Phone</td>
                  <td style="padding:12px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(phone)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#8d98a8;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">Email</td>
                  <td style="padding:12px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(email)}</td>
                </tr>
              </table>

              <div style="height:1px;background:rgba(255,255,255,0.1);margin:18px 0;"></div>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 0;color:#8d98a8;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">Original Repair Date</td>
                  <td style="padding:12px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(originalRepairDate)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#8d98a8;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">Device</td>
                  <td style="padding:12px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(device)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#8d98a8;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">Repair Type</td>
                  <td style="padding:12px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(originalRepairType)}</td>
                </tr>
              </table>

              <div style="margin-top:22px;padding:18px;border-radius:16px;background:rgba(255,255,255,0.055);border:1px solid rgba(255,255,255,0.1);">
                <div style="margin-bottom:8px;color:#66fcf1;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
                  Customer Issue
                </div>
                <div style="color:#f5f7fb;font-size:15px;line-height:1.65;">
                  ${escapeHtml(issue).replace(/\n/g, "<br />")}
                </div>
              </div>

              <div style="margin-top:18px;padding:16px;border-radius:16px;background:rgba(255,193,7,0.08);border:1px solid rgba(255,193,7,0.22);">
                <div style="color:#ffd166;font-size:14px;font-weight:700;">
                  Uploaded Files: ${escapeHtml(String(filesCount))}
                </div>
                <p style="margin:8px 0 0;color:#c7ced9;font-size:13px;line-height:1.55;">
                  Files are not attached to this email yet. Current warranty uploads are stored locally and will be connected to backend storage later.
                </p>
              </div>
            </div>

            <div style="padding:18px 28px;background:rgba(0,0,0,0.22);border-top:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0;color:#7f8a99;font-size:12px;line-height:1.5;">
                Primitive Repairs • Warranty Support Notification
              </p>
            </div>

          </div>
        </div>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [notifyEmail],
        subject: `New Warranty Claim - ${fullName}`,
        html: emailHtml,
        reply_to: email !== "Not provided" ? email : undefined,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      return res.status(500).json({
        success: false,
        error: "Email failed to send.",
        details: resendResult,
      });
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Unexpected server error.",
      details: error.message,
    });
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
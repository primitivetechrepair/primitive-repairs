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

    const claimId = claim.claimId || `W-${Date.now()}`;
    const fullName = claim.fullName || claim.name || "Not provided";
    const phone = claim.phone || "Not provided";
    const email = claim.email || "Not provided";

    const originalRepairDate =
      claim.originalRepairDate ||
      claim.repairDate ||
      "Not provided";

    const device = claim.device || "Not provided";

    const originalRepairType =
      claim.originalRepairType ||
      claim.repairType ||
      "Not provided";

    const issue = claim.issue || "Not provided";

    const filesCount = Array.isArray(claim.attachments)
      ? claim.attachments.length
      : Array.isArray(claim.files)
        ? claim.files.length
        : claim.filesCount || 0;

    const submittedAt =
      claim.submittedAt ||
      claim.createdAt ||
      new Date().toISOString();

        const emailHtml = `
      <div style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#111827;">
        <div style="max-width:680px;margin:0 auto;padding:24px 14px;">
          
          <div style="background:#ffffff;border:1px solid #d9e1ea;border-radius:18px;overflow:hidden;">
            
            <div style="padding:26px 26px 20px;background:#0b1220;">
              <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:#e8fffb;color:#064e4b;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                Warranty Claim
              </div>

              <h1 style="margin:18px 0 8px;font-size:28px;line-height:1.15;color:#ffffff;">
                New Warranty Review Request
              </h1>

              <p style="margin:0;color:#e5edf7;font-size:15px;line-height:1.6;">
                A customer submitted a warranty claim from the Primitive Repairs website.
              </p>
            </div>

            <div style="padding:24px 26px;background:#ffffff;color:#111827;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 0;color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Claim ID</td>
                  <td style="padding:12px 0;color:#111827;font-size:15px;font-weight:700;text-align:right;">${escapeHtml(claimId)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Submitted</td>
                  <td style="padding:12px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(submittedAt)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Full Name</td>
                  <td style="padding:12px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(fullName)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Phone</td>
                  <td style="padding:12px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(phone)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Email</td>
                  <td style="padding:12px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(email)}</td>
                </tr>
              </table>

              <div style="height:1px;background:#d9e1ea;margin:18px 0;"></div>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 0;color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Original Repair Date</td>
                  <td style="padding:12px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(originalRepairDate)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Device</td>
                  <td style="padding:12px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(device)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Repair Type</td>
                  <td style="padding:12px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(originalRepairType)}</td>
                </tr>
              </table>

              <div style="margin-top:22px;padding:18px;border-radius:14px;background:#f8fafc;border:1px solid #d9e1ea;">
                <div style="margin-bottom:8px;color:#0f766e;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;">
                  Customer Issue
                </div>
                <div style="color:#111827;font-size:15px;line-height:1.65;">
                  ${escapeHtml(issue).replace(/\n/g, "<br />")}
                </div>
              </div>

              <div style="margin-top:18px;padding:16px;border-radius:14px;background:#fff8e1;border:1px solid #f2d27a;">
                <div style="color:#7a4b00;font-size:14px;font-weight:800;">
                  Uploaded Files: ${escapeHtml(String(filesCount))}
                </div>
                <p style="margin:8px 0 0;color:#374151;font-size:13px;line-height:1.55;">
                  Files are not attached to this email yet. Current warranty uploads are stored locally and will be connected to backend storage later.
                </p>
              </div>
            </div>

            <div style="padding:18px 26px;background:#f8fafc;border-top:1px solid #d9e1ea;">
              <p style="margin:0;color:#374151;font-size:12px;line-height:1.5;">
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
      claimId,
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
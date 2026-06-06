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
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2>New Warranty Claim</h2>

        <p><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>

        <hr />

        <p><strong>Full Name:</strong> ${escapeHtml(fullName)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>

        <hr />

        <p><strong>Original Repair Date:</strong> ${escapeHtml(originalRepairDate)}</p>
        <p><strong>Device:</strong> ${escapeHtml(device)}</p>
        <p><strong>Original Repair Type:</strong> ${escapeHtml(originalRepairType)}</p>

        <hr />

        <p><strong>Customer Issue:</strong></p>
        <p>${escapeHtml(issue).replace(/\n/g, "<br />")}</p>

        <hr />

        <p><strong>Uploaded Files Count:</strong> ${escapeHtml(String(filesCount))}</p>
        <p style="font-size: 13px; color: #555;">
          Files are not attached to this email yet. Current warranty uploads are stored locally
          and will be connected to backend storage later.
        </p>
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
// api/submit-repair.js

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

    const lead = req.body || {};

    const requestId =
      lead.requestId ||
      lead.leadId ||
      lead.leadID ||
      lead.id ||
      `R-${Date.now()}`;

    const customerName =
      lead.customerName ||
      lead.name ||
      lead.fullName ||
      "Not provided";

    const phone =
      lead.phone ||
      lead.contactNumber ||
      lead.customerPhone ||
      "Not provided";

    const email =
      lead.email ||
      lead.customerEmail ||
      "Not provided";

    const device =
      lead.device ||
      lead.deviceType ||
      lead.selectedDevice ||
      "Not provided";

    const brand =
      lead.brand ||
      lead.selectedBrand ||
      "Not provided";

    const series =
      lead.series ||
      lead.selectedSeries ||
      "Not provided";

    const model =
      lead.model ||
      lead.selectedModel ||
      "Not provided";

    const repair =
      lead.repair ||
      lead.repairType ||
      lead.selectedRepair ||
      "Not provided";

    const repairDetails =
      lead.repairDetails ||
      lead.issue ||
      lead.notes ||
      lead.description ||
      "Not provided";

    const appointmentDate =
      lead.appointmentDate ||
      lead.date ||
      lead.selectedDate ||
      "Not provided";

    const appointmentTime =
      lead.appointmentTime ||
      lead.time ||
      lead.selectedTime ||
      "Not provided";

    const address =
      lead.address ||
      lead.customerAddress ||
      lead.serviceAddress ||
      "Not provided";

    const submittedAt =
      lead.submittedAt ||
      lead.createdAt ||
      new Date().toISOString();

    const emailHtml = `
      <div style="margin:0;padding:0;background:#05070b;font-family:Arial,Helvetica,sans-serif;color:#f5f7fb;">
        <div style="max-width:680px;margin:0 auto;padding:28px 16px;">
          
          <div style="background:linear-gradient(135deg,#101827,#070b12);border:1px solid rgba(255,255,255,0.12);border-radius:22px;overflow:hidden;box-shadow:0 18px 45px rgba(0,0,0,0.35);">
            
            <div style="padding:28px 28px 22px;border-bottom:1px solid rgba(255,255,255,0.1);">
              <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:rgba(102,252,241,0.12);border:1px solid rgba(102,252,241,0.35);color:#66fcf1;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                Repair Request
              </div>

              <h1 style="margin:18px 0 8px;font-size:28px;line-height:1.15;color:#ffffff;">
                New Repair Request Submitted
              </h1>

              <p style="margin:0;color:#b8c0cc;font-size:15px;line-height:1.6;">
                A customer submitted a repair request from the Primitive Repairs website.
              </p>
            </div>

            <div style="padding:24px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 0;color:#8d98a8;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">Request ID</td>
                  <td style="padding:12px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(requestId)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#8d98a8;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">Submitted</td>
                  <td style="padding:12px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(submittedAt)}</td>
                </tr>
              </table>

              <div style="height:1px;background:rgba(255,255,255,0.1);margin:18px 0;"></div>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 0;color:#8d98a8;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">Customer</td>
                  <td style="padding:12px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(customerName)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#8d98a8;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">Phone</td>
                  <td style="padding:12px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(phone)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#8d98a8;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">Email</td>
                  <td style="padding:12px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(email)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#8d98a8;font-size:13px;text-transform:uppercase;letter-spacing:0.06em;">Address</td>
                  <td style="padding:12px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(address)}</td>
                </tr>
              </table>

              <div style="margin-top:22px;padding:18px;border-radius:16px;background:rgba(102,252,241,0.07);border:1px solid rgba(102,252,241,0.22);">
                <div style="margin-bottom:12px;color:#66fcf1;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
                  Device + Repair
                </div>

                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 0;color:#8d98a8;font-size:13px;">Device</td>
                    <td style="padding:8px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(device)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#8d98a8;font-size:13px;">Brand</td>
                    <td style="padding:8px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(brand)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#8d98a8;font-size:13px;">Series</td>
                    <td style="padding:8px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(series)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#8d98a8;font-size:13px;">Model</td>
                    <td style="padding:8px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(model)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#8d98a8;font-size:13px;">Repair</td>
                    <td style="padding:8px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(repair)}</td>
                  </tr>
                </table>
              </div>

              <div style="margin-top:18px;padding:18px;border-radius:16px;background:rgba(255,255,255,0.055);border:1px solid rgba(255,255,255,0.1);">
                <div style="margin-bottom:8px;color:#66fcf1;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
                  Repair Details
                </div>
                <div style="color:#f5f7fb;font-size:15px;line-height:1.65;">
                  ${escapeHtml(repairDetails).replace(/\n/g, "<br />")}
                </div>
              </div>

              <div style="margin-top:18px;padding:18px;border-radius:16px;background:rgba(255,255,255,0.055);border:1px solid rgba(255,255,255,0.1);">
                <div style="margin-bottom:12px;color:#66fcf1;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
                  Appointment
                </div>

                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 0;color:#8d98a8;font-size:13px;">Date</td>
                    <td style="padding:8px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(appointmentDate)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#8d98a8;font-size:13px;">Time</td>
                    <td style="padding:8px 0;color:#ffffff;font-size:15px;text-align:right;">${escapeHtml(appointmentTime)}</td>
                  </tr>
                </table>
              </div>
            </div>

            <div style="padding:18px 28px;background:rgba(0,0,0,0.22);border-top:1px solid rgba(255,255,255,0.08);">
              <p style="margin:0;color:#7f8a99;font-size:12px;line-height:1.5;">
                Primitive Repairs • Public Repair Request Notification
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
        subject: `New Repair Request - ${customerName}`,
        html: emailHtml,
        reply_to: email !== "Not provided" ? email : undefined,
      }),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      return res.status(500).json({
        success: false,
        error: "Repair request email failed to send.",
        details: resendResult,
      });
    }

    return res.status(200).json({
      success: true,
      requestId,
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
// api/submit-repair.js

import { verifyRecaptchaToken } from "./verify-recaptcha.js";

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

    const recaptchaCheck = await verifyRecaptchaToken({
      token: lead.recaptchaToken,
      expectedAction: "submit_repair",
      minimumScore: 0.5,
    });

    if (!recaptchaCheck.success) {
      return res.status(403).json({
        success: false,
        error: recaptchaCheck.error,
      });
    }

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

    const deviceImage =
      String(
        lead.deviceImage ||
        lead.modelImage ||
        lead.selectedModelImage ||
        ""
      ).trim();

    const emailDeviceImage =
      deviceImage.replace(/\.webp$/i, ".png");

    const deviceImageUrl =
      /^\/images\/.+\.png$/i.test(emailDeviceImage)
        ? `https://www.primitiverepairs.com${emailDeviceImage}`
        : /^https:\/\/(www\.)?primitiverepairs\.com\/images\/.+\.png$/i.test(emailDeviceImage)
          ? emailDeviceImage
          : "";

    const makeModel =
      [brand, model]
        .filter((value) => value && value !== "Not provided")
        .join(" ") ||
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

    const mapsUrl =
      address !== "Not provided"
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
        : "";

    const submittedAt =
      lead.submittedAt ||
      lead.createdAt ||
      new Date().toISOString();

    const deviceImageHtml =
      deviceImageUrl
        ? `
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="border-collapse:collapse;margin:0 0 18px;"
          >
            <tr>
              <td
                align="center"
                style="
                  padding:18px 14px;
                  background:#ffffff;
                  border:1px solid #d9e1ea;
                  border-radius:12px 12px 0 0;
                "
              >
                <img
                  src="${escapeHtml(deviceImageUrl)}"
                  alt="${escapeHtml(makeModel)}"
                  width="90"
                  style="
                    display:block;
                    width:90px;
                    max-width:100%;
                    height:auto;
                    margin:0 auto;
                    border:0;
                    outline:none;
                    text-decoration:none;
                  "
                >
              </td>
            </tr>

            <tr>
              <td
                align="center"
                style="
                  padding:14px 16px 16px;
                  background:#f8fafc;
                  border-right:1px solid #d9e1ea;
                  border-bottom:1px solid #d9e1ea;
                  border-left:1px solid #d9e1ea;
                  border-radius:0 0 12px 12px;
                "
              >
                <div
                  style="
                    margin:0 0 6px;
                    color:#0f766e;
                    font-size:11px;
                    font-weight:800;
                    line-height:1.2;
                    letter-spacing:0.1em;
                    text-transform:uppercase;
                  "
                >
                  Make / Model
                </div>

                <div
                  style="
                    margin:0;
                    color:#111827;
                    font-size:18px;
                    font-weight:800;
                    line-height:1.35;
                  "
                >
                  ${escapeHtml(makeModel)}
                </div>
              </td>
            </tr>
          </table>
        `
        : "";

    const emailHtml = `
      <div style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#111827;">
        <div style="max-width:680px;margin:0 auto;padding:24px 14px;">
          
          <div style="background:#ffffff;border:1px solid #d9e1ea;border-radius:18px;overflow:hidden;">
            
            <div style="padding:26px 26px 20px;background:#0b1220;">
              <div style="display:inline-block;padding:7px 12px;border-radius:999px;background:#e8fffb;color:#064e4b;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">
                Repair Request
              </div>

              <h1 style="margin:18px 0 8px;font-size:28px;line-height:1.15;color:#ffffff;">
                New Repair Request Submitted
              </h1>

              <p style="margin:0;color:#e5edf7;font-size:15px;line-height:1.6;">
                A customer submitted a repair request from the Primitive Tech Repairs website.
              </p>
            </div>

            <div style="padding:24px 26px;background:#ffffff;color:#111827;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 0;color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Request ID</td>
                  <td style="padding:12px 0;color:#111827;font-size:15px;font-weight:700;text-align:right;">${escapeHtml(requestId)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Submitted</td>
                  <td style="padding:12px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(submittedAt)}</td>
                </tr>
              </table>

              <div style="height:1px;background:#d9e1ea;margin:18px 0;"></div>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td style="padding:12px 0;color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Customer</td>
                  <td style="padding:12px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(customerName)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Phone</td>
                  <td style="padding:12px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(phone)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Email</td>
                  <td style="padding:12px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(email)}</td>
                </tr>
                <tr>
                  <td style="padding:12px 0;color:#374151;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Address</td>
                  <td style="padding:12px 0;color:#111827;font-size:15px;text-align:right;">
                    ${
                      mapsUrl
                        ? `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="color:#0f766e;text-decoration:underline;font-weight:800;">${escapeHtml(address)}</a>`
                        : escapeHtml(address)
                    }
                  </td>
                </tr>
              </table>

              <div style="margin-top:22px;padding:18px;border-radius:14px;background:#ecfdf5;border:1px solid #a7f3d0;">
                <div style="margin-bottom:12px;color:#0f766e;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;">
                  Device + Repair
                </div>

                ${deviceImageHtml}

                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 0;color:#374151;font-size:13px;font-weight:700;">Device</td>
                    <td style="padding:8px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(device)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#374151;font-size:13px;font-weight:700;">Brand</td>
                    <td style="padding:8px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(brand)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#374151;font-size:13px;font-weight:700;">Series</td>
                    <td style="padding:8px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(series)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#374151;font-size:13px;font-weight:700;">Model</td>
                    <td style="padding:8px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(model)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#374151;font-size:13px;font-weight:700;">Repair</td>
                    <td style="padding:8px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(repair)}</td>
                  </tr>
                </table>
              </div>

              <div style="margin-top:18px;padding:18px;border-radius:14px;background:#f8fafc;border:1px solid #d9e1ea;">
                <div style="margin-bottom:8px;color:#0f766e;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;">
                  Repair Details
                </div>
                <div style="color:#111827;font-size:15px;line-height:1.65;">
                  ${escapeHtml(repairDetails).replace(/\n/g, "<br />")}
                </div>
              </div>

              <div style="margin-top:18px;padding:18px;border-radius:14px;background:#f8fafc;border:1px solid #d9e1ea;">
                <div style="margin-bottom:12px;color:#0f766e;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;">
                  Appointment
                </div>

                <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 0;color:#374151;font-size:13px;font-weight:700;">Date</td>
                    <td style="padding:8px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(appointmentDate)}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#374151;font-size:13px;font-weight:700;">Time</td>
                    <td style="padding:8px 0;color:#111827;font-size:15px;text-align:right;">${escapeHtml(appointmentTime)}</td>
                  </tr>
                </table>
              </div>
            </div>

            <div style="padding:18px 26px;background:#f8fafc;border-top:1px solid #d9e1ea;">
              <p style="margin:0;color:#374151;font-size:12px;line-height:1.5;">
                Prim • Public Repair Request Notification
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
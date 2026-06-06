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
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
        <h2>New Repair Request</h2>

        <p><strong>Request ID:</strong> ${escapeHtml(requestId)}</p>
        <p><strong>Submitted:</strong> ${escapeHtml(submittedAt)}</p>

        <hr />

        <p><strong>Customer Name:</strong> ${escapeHtml(customerName)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phone)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Service Address:</strong> ${escapeHtml(address)}</p>

        <hr />

        <p><strong>Device:</strong> ${escapeHtml(device)}</p>
        <p><strong>Brand:</strong> ${escapeHtml(brand)}</p>
        <p><strong>Series:</strong> ${escapeHtml(series)}</p>
        <p><strong>Model:</strong> ${escapeHtml(model)}</p>
        <p><strong>Repair:</strong> ${escapeHtml(repair)}</p>

        <hr />

        <p><strong>Repair Details:</strong></p>
        <p>${escapeHtml(repairDetails).replace(/\n/g, "<br />")}</p>

        <hr />

        <p><strong>Appointment Date:</strong> ${escapeHtml(appointmentDate)}</p>
        <p><strong>Appointment Time:</strong> ${escapeHtml(appointmentTime)}</p>

        <hr />

        <p style="font-size: 13px; color: #555;">
          This repair request was submitted from the Primitive Repairs public website.
          Later this route can be connected directly into Primitive Tech Hub.
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
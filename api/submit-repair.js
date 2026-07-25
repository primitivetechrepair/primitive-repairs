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

    const formatRepairDetailsForEmail = (value) => {
      const humanizeKey = (key) =>
        String(key)
          .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
          .replace(/[_-]+/g, " ")
          .replace(/\b\w/g, (character) => character.toUpperCase())
          .trim();

      const formatValue = (item) => {
        if (item === null || item === undefined || item === "") {
          return "";
        }

        if (Array.isArray(item)) {
          return item
            .map((entry) => formatValue(entry))
            .filter(Boolean)
            .join(", ");
        }

        if (typeof item === "object") {
          return Object.entries(item)
            .map(([key, nestedValue]) => {
              const formattedValue = formatValue(nestedValue);

              return formattedValue
                ? `${humanizeKey(key)}: ${formattedValue}`
                : "";
            })
            .filter(Boolean)
            .join("; ");
        }

        return String(item).trim();
      };

      if (value === null || value === undefined || value === "") {
        return "Not provided";
      }

      if (typeof value !== "object" || Array.isArray(value)) {
        return formatValue(value) || "Not provided";
      }

      const lines = Object.entries(value)
        .map(([key, item]) => {
          const formattedValue = formatValue(item);

          return formattedValue
            ? `${humanizeKey(key)}: ${formattedValue}`
            : "";
        })
        .filter(Boolean);

      return lines.length
        ? lines.join("\n")
        : "Not provided";
    };
    const repairDetails =
      formatRepairDetailsForEmail(lead.repairDetails ||
      lead.issue ||
      lead.notes ||
      lead.description ||
      "Not provided");

    const rawAddOns =
      Array.isArray(lead.addOns) &&
      lead.addOns.length
        ? lead.addOns
        : Array.isArray(lead.repairItems)
          ? lead.repairItems.filter((item) => {
              const category =
                String(
                  item?.category || ""
                ).toLowerCase();

              const type =
                String(
                  item?.type || ""
                ).toLowerCase();

              return (
                category === "add-on" ||
                type.includes("screen protector") ||
                type.includes("tempered glass")
              );
            })
          : [];

    const selectedAddOns = rawAddOns
      .map((addOn) => {
        const name = String(
          addOn?.label ||
          addOn?.name ||
          addOn?.type ||
          "Premium Screen Protector"
        ).trim();

        const numericPrice = Number(
          addOn?.price ??
          addOn?.amount ??
          0
        );

        const numericQuantity = Number(
          addOn?.quantity || 1
        );

        return {
          name,

          price:
            Number.isFinite(numericPrice) &&
            numericPrice >= 0
              ? numericPrice
              : 0,

          quantity:
            Number.isFinite(numericQuantity) &&
            numericQuantity > 0
              ? numericQuantity
              : 1,

          installed:
            addOn?.installed !== false
        };
      })
      .filter((addOn) => addOn.name);

    const screenProtectorSummary =
      selectedAddOns
        .map((addOn) => {
          const priceText =
            addOn.price > 0
              ? `$${addOn.price.toFixed(2)}`
              : "$19.00";

          const quantityText =
            addOn.quantity > 1
              ? ` × ${addOn.quantity}`
              : "";

          const installationText =
            addOn.installed
              ? " installed"
              : "";

          return (
            `${addOn.name}${quantityText}` +
            ` — ${priceText}${installationText}`
          );
        })
        .join(", ");

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

    const formatEmailDate = (value) => {
      const normalizedValue =
        String(value || "").trim();

      if (
        !normalizedValue ||
        normalizedValue === "Not provided"
      ) {
        return "Not provided";
      }

      const dateOnlyMatch =
        normalizedValue.match(
          /^(\d{4})-(\d{2})-(\d{2})$/
        );

      if (dateOnlyMatch) {
        return (
          `${dateOnlyMatch[2]}/` +
          `${dateOnlyMatch[3]}/` +
          `${dateOnlyMatch[1]}`
        );
      }

      const parsedDate =
        new Date(normalizedValue);

      if (
        Number.isNaN(
          parsedDate.getTime()
        )
      ) {
        return normalizedValue;
      }

      return new Intl.DateTimeFormat(
        "en-US",
        {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
          timeZone: "America/New_York"
        }
      ).format(parsedDate);
    };

    const receivedDate =
      formatEmailDate(submittedAt);

    const scheduledDate =
      formatEmailDate(appointmentDate);

    const deviceImageHtml =
      deviceImageUrl
        ? `
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="border-collapse:collapse;margin:0 0 12px;"
          >
            <tr>
              <td
                align="center"
                style="
                  padding:12px 12px;
                  background:#081a2a;
                  border:1px solid #16486f;
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
                  padding:10px 12px 12px;
                  background:#102f4f;
                  border-right:1px solid #16486f;
                  border-bottom:1px solid #16486f;
                  border-left:1px solid #16486f;
                  border-radius:0 0 12px 12px;
                "
              >
                <div
                  style="
                    margin:0 0 6px;
                    color:#90ffdc;
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
                    color:#ffffff;
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
      <div
        style="
          display:none;
          max-height:0;
          overflow:hidden;
          opacity:0;
          color:transparent;
        "
      >
        ${escapeHtml(customerName)} submitted a repair request for ${escapeHtml(makeModel)}.
      </div>

      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        border="0"
        role="presentation"
        style="
          width:100%;
          margin:0;
          padding:0;
          border-collapse:collapse;
          background:#04111d;
        "
      >
        <tr>
          <td
            align="center"
            style="
              padding:28px 10px;
              background:#04111d;
            "
          >
            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              border="0"
              role="presentation"
              style="
                width:100%;
                max-width:680px;
                border-collapse:separate;
                border-spacing:0;
                background:#081b2b;
                border:1px solid #174665;
                border-radius:24px;
                overflow:hidden;
                box-shadow:0 20px 60px rgba(0,0,0,0.35);
              "
            >
              <tr>
                <td
                  style="
                    height:6px;
                    background:#90ffdc;
                    font-size:0;
                    line-height:0;
                  "
                >
                  &nbsp;
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding:32px 30px 28px;
                    background:#0b263d;
                    border-bottom:1px solid #174665;
                  "
                >
                  <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    role="presentation"
                    style="
                      width:100%;
                      border-collapse:collapse;
                    "
                  >
                    <tr>
                      <td valign="top">
                        <div
                          style="
                            margin:0 0 12px;
                            color:#90ffdc;
                            font-family:'Space Grotesk','Avenir Next','Segoe UI',Arial,sans-serif;
                            font-size:11px;
                            font-weight:700;
                            line-height:1.2;
                            letter-spacing:0.16em;
                            text-transform:uppercase;
                          "
                        >
                          Primitive Tech Repairs
                        </div>

                        <h1
                          style="
                            margin:0;
                            color:#ffffff;
                            font-family:'Space Grotesk','Avenir Next','Segoe UI',Arial,sans-serif;
                            font-size:32px;
                            font-weight:700;
                            line-height:1.1;
                            letter-spacing:-0.03em;
                          "
                        >
                          Repair Request
                        </h1>

                        <p
                          style="
                            margin:12px 0 0;
                            color:#c6d4ff;
                            font-family:'Manrope','Avenir Next','Segoe UI',Arial,sans-serif;
                            font-size:16px;
                            font-weight:600;
                            line-height:1.5;
                          "
                        >
                          ${escapeHtml(customerName)}
                        </p>

                        <p
                          style="
                            margin:3px 0 0;
                            color:#8faec6;
                            font-family:'Manrope','Avenir Next','Segoe UI',Arial,sans-serif;
                            font-size:14px;
                            font-weight:500;
                            line-height:1.5;
                          "
                        >
                          ${escapeHtml(makeModel)}
                        </p>
                      </td>

                      <td
                        width="76"
                        align="right"
                        valign="top"
                        style="width:76px;"
                      >
                        <div
                          style="
                            width:58px;
                            height:58px;
                            border-radius:18px;
                            background:#90ffdc;
                            color:#071b2b;
                            font-family:'Space Grotesk','Segoe UI',Arial,sans-serif;
                            font-size:23px;
                            font-weight:800;
                            line-height:58px;
                            text-align:center;
                          "
                        >
                          PT
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding:0 30px;
                    background:#081b2b;
                  "
                >
                  <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    role="presentation"
                    style="
                      width:100%;
                      margin-top:24px;
                      border-collapse:separate;
                      border-spacing:0;
                    "
                  >
                    <tr>
                      <td
                        width="50%"
                        valign="top"
                        style="
                          width:50%;
                          padding:15px 16px;
                          background:#0d2940;
                          border:1px solid #174665;
                          border-radius:14px 0 0 14px;
                        "
                      >
                        <div
                          style="
                            margin:0 0 5px;
                            color:#789ab4;
                            font-family:'Manrope','Segoe UI',Arial,sans-serif;
                            font-size:10px;
                            font-weight:800;
                            letter-spacing:0.12em;
                            text-transform:uppercase;
                          "
                        >
                          Request ID
                        </div>

                        <div
                          style="
                            color:#ffffff;
                            font-family:'Space Grotesk','Segoe UI',Arial,sans-serif;
                            font-size:14px;
                            font-weight:700;
                            line-height:1.4;
                            word-break:break-word;
                          "
                        >
                          ${escapeHtml(requestId)}
                        </div>
                      </td>

                      <td
                        width="50%"
                        valign="top"
                        style="
                          width:50%;
                          padding:15px 16px;
                          background:#0d2940;
                          border-top:1px solid #174665;
                          border-right:1px solid #174665;
                          border-bottom:1px solid #174665;
                          border-radius:0 14px 14px 0;
                        "
                      >
                        <div
                          style="
                            margin:0 0 5px;
                            color:#789ab4;
                            font-family:'Manrope','Segoe UI',Arial,sans-serif;
                            font-size:10px;
                            font-weight:800;
                            letter-spacing:0.12em;
                            text-transform:uppercase;
                          "
                        >
                          Received
                        </div>

                        <div
                          style="
                            color:#ffffff;
                            font-family:'Space Grotesk','Segoe UI',Arial,sans-serif;
                            font-size:14px;
                            font-weight:700;
                            line-height:1.4;
                          "
                        >
                          ${escapeHtml(receivedDate)}
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td
                  style="
                    padding:28px 30px 30px;
                    background:#081b2b;
                  "
                >
                  <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    role="presentation"
                    style="
                      width:100%;
                      border-collapse:collapse;
                    "
                  >
                    <tr>
                      <td
                        style="
                          padding:0 0 10px;
                          color:#90ffdc;
                          font-family:'Space Grotesk','Segoe UI',Arial,sans-serif;
                          font-size:12px;
                          font-weight:700;
                          letter-spacing:0.13em;
                          text-transform:uppercase;
                        "
                      >
                        01&nbsp;&nbsp;Customer
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding:4px 18px;
                          background:#0d2940;
                          border:1px solid #174665;
                          border-radius:16px;
                        "
                      >
                        <table
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                          border="0"
                          role="presentation"
                          style="
                            width:100%;
                            border-collapse:collapse;
                          "
                        >
                          <tr>
                            <td
                              style="
                                padding:14px 0;
                                color:#789ab4;
                                font-family:'Manrope','Segoe UI',Arial,sans-serif;
                                font-size:12px;
                                font-weight:700;
                                border-bottom:1px solid #174665;
                              "
                            >
                              Name
                            </td>

                            <td
                              align="right"
                              style="
                                padding:14px 0;
                                color:#ffffff;
                                font-family:'Manrope','Segoe UI',Arial,sans-serif;
                                font-size:14px;
                                font-weight:700;
                                border-bottom:1px solid #174665;
                              "
                            >
                              ${escapeHtml(customerName)}
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding:14px 0;
                                color:#789ab4;
                                font-family:'Manrope','Segoe UI',Arial,sans-serif;
                                font-size:12px;
                                font-weight:700;
                                border-bottom:1px solid #174665;
                              "
                            >
                              Phone
                            </td>

                            <td
                              align="right"
                              style="
                                padding:14px 0;
                                font-family:'Manrope','Segoe UI',Arial,sans-serif;
                                font-size:14px;
                                font-weight:700;
                                border-bottom:1px solid #174665;
                              "
                            >
                              ${
                                phone !== "Not provided"
                                  ? `
                                    <a
                                      href="tel:${escapeHtml(
                                        String(phone).replace(/[^\d+]/g, "")
                                      )}"
                                      style="
                                        color:#90ffdc;
                                        text-decoration:none;
                                      "
                                    >
                                      ${escapeHtml(phone)}
                                    </a>
                                  `
                                  : `
                                    <span style="color:#ffffff;">
                                      ${escapeHtml(phone)}
                                    </span>
                                  `
                              }
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding:14px 0;
                                color:#789ab4;
                                font-family:'Manrope','Segoe UI',Arial,sans-serif;
                                font-size:12px;
                                font-weight:700;
                              "
                            >
                              Email
                            </td>

                            <td
                              align="right"
                              style="
                                padding:14px 0;
                                font-family:'Manrope','Segoe UI',Arial,sans-serif;
                                font-size:14px;
                                font-weight:700;
                                word-break:break-word;
                              "
                            >
                              ${
                                email !== "Not provided"
                                  ? `
                                    <a
                                      href="mailto:${escapeHtml(email)}"
                                      style="
                                        color:#90ffdc;
                                        text-decoration:none;
                                      "
                                    >
                                      ${escapeHtml(email)}
                                    </a>
                                  `
                                  : `
                                    <span style="color:#ffffff;">
                                      ${escapeHtml(email)}
                                    </span>
                                  `
                              }
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    role="presentation"
                    style="
                      width:100%;
                      margin-top:26px;
                      border-collapse:collapse;
                    "
                  >
                    <tr>
                      <td
                        style="
                          padding:0 0 10px;
                          color:#90ffdc;
                          font-family:'Space Grotesk','Segoe UI',Arial,sans-serif;
                          font-size:12px;
                          font-weight:700;
                          letter-spacing:0.13em;
                          text-transform:uppercase;
                        "
                      >
                        02&nbsp;&nbsp;Repair
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding:18px;
                          background:#0d2940;
                          border:1px solid #174665;
                          border-radius:16px;
                        "
                      >
                        ${deviceImageHtml}

                        <table
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                          border="0"
                          role="presentation"
                          style="
                            width:100%;
                            border-collapse:collapse;
                          "
                        >
                          <tr>
                            <td
                              style="
                                padding:14px 0;
                                color:#789ab4;
                                font-family:'Manrope','Segoe UI',Arial,sans-serif;
                                font-size:12px;
                                font-weight:700;
                                border-bottom:1px solid #174665;
                              "
                            >
                              Model
                            </td>

                            <td
                              align="right"
                              style="
                                padding:14px 0;
                                color:#ffffff;
                                font-family:'Space Grotesk','Segoe UI',Arial,sans-serif;
                                font-size:15px;
                                font-weight:700;
                                border-bottom:1px solid #174665;
                              "
                            >
                              ${escapeHtml(makeModel)}
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding:14px 0;
                                color:#789ab4;
                                font-family:'Manrope','Segoe UI',Arial,sans-serif;
                                font-size:12px;
                                font-weight:700;
                              "
                            >
                              Service
                            </td>

                            <td
                              align="right"
                              style="
                                padding:14px 0;
                                color:#ffffff;
                                font-family:'Space Grotesk','Segoe UI',Arial,sans-serif;
                                font-size:15px;
                                font-weight:700;
                              "
                            >
                              ${escapeHtml(repair)}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  ${
                    selectedAddOns.length
                      ? `
                        <table
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                          border="0"
                          role="presentation"
                          style="
                            width:100%;
                            margin-top:14px;
                            border-collapse:collapse;
                          "
                        >
                          <tr>
                            <td
                              style="
                                padding:17px 18px;
                                background:#103b37;
                                border:1px solid #2f8c77;
                                border-radius:16px;
                              "
                            >
                              <table
                                width="100%"
                                cellpadding="0"
                                cellspacing="0"
                                border="0"
                                role="presentation"
                                style="
                                  width:100%;
                                  border-collapse:collapse;
                                "
                              >
                                <tr>
                                  <td
                                    width="42"
                                    valign="middle"
                                    style="width:42px;"
                                  >
                                    <div
                                      style="
                                        width:32px;
                                        height:32px;
                                        border-radius:10px;
                                        background:#90ffdc;
                                        color:#071b2b;
                                        font-family:'Space Grotesk','Segoe UI',Arial,sans-serif;
                                        font-size:16px;
                                        font-weight:800;
                                        line-height:32px;
                                        text-align:center;
                                      "
                                    >
                                      +
                                    </div>
                                  </td>

                                  <td valign="middle">
                                    <div
                                      style="
                                        margin:0 0 3px;
                                        color:#90ffdc;
                                        font-family:'Space Grotesk','Segoe UI',Arial,sans-serif;
                                        font-size:11px;
                                        font-weight:700;
                                        letter-spacing:0.1em;
                                        text-transform:uppercase;
                                      "
                                    >
                                      Add-On Selected
                                    </div>

                                    <div
                                      style="
                                        color:#ffffff;
                                        font-family:'Manrope','Segoe UI',Arial,sans-serif;
                                        font-size:14px;
                                        font-weight:700;
                                        line-height:1.45;
                                      "
                                    >
                                      ${escapeHtml(screenProtectorSummary)}
                                    </div>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      `
                      : ""
                  }

                  <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    role="presentation"
                    style="
                      width:100%;
                      margin-top:26px;
                      border-collapse:collapse;
                    "
                  >
                    <tr>
                      <td
                        style="
                          padding:0 0 10px;
                          color:#90ffdc;
                          font-family:'Space Grotesk','Segoe UI',Arial,sans-serif;
                          font-size:12px;
                          font-weight:700;
                          letter-spacing:0.13em;
                          text-transform:uppercase;
                        "
                      >
                        03&nbsp;&nbsp;Appointment
                      </td>
                    </tr>

                    <tr>
                      <td
                        style="
                          padding:4px 18px;
                          background:#0d2940;
                          border:1px solid #174665;
                          border-radius:16px;
                        "
                      >
                        <table
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                          border="0"
                          role="presentation"
                          style="
                            width:100%;
                            border-collapse:collapse;
                          "
                        >
                          <tr>
                            <td
                              style="
                                padding:14px 0;
                                color:#789ab4;
                                font-family:'Manrope','Segoe UI',Arial,sans-serif;
                                font-size:12px;
                                font-weight:700;
                                border-bottom:1px solid #174665;
                              "
                            >
                              Date
                            </td>

                            <td
                              align="right"
                              style="
                                padding:14px 0;
                                color:#ffffff;
                                font-family:'Space Grotesk','Segoe UI',Arial,sans-serif;
                                font-size:15px;
                                font-weight:700;
                                border-bottom:1px solid #174665;
                              "
                            >
                              ${escapeHtml(scheduledDate)}
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding:14px 0;
                                color:#789ab4;
                                font-family:'Manrope','Segoe UI',Arial,sans-serif;
                                font-size:12px;
                                font-weight:700;
                                ${address !== "Not provided"
                                  ? "border-bottom:1px solid #174665;"
                                  : ""}
                              "
                            >
                              Time
                            </td>

                            <td
                              align="right"
                              style="
                                padding:14px 0;
                                color:#ffffff;
                                font-family:'Space Grotesk','Segoe UI',Arial,sans-serif;
                                font-size:15px;
                                font-weight:700;
                                ${address !== "Not provided"
                                  ? "border-bottom:1px solid #174665;"
                                  : ""}
                              "
                            >
                              ${escapeHtml(appointmentTime)}
                            </td>
                          </tr>

                          ${
                            address !== "Not provided"
                              ? `
                                <tr>
                                  <td
                                    style="
                                      padding:14px 0;
                                      color:#789ab4;
                                      font-family:'Manrope','Segoe UI',Arial,sans-serif;
                                      font-size:12px;
                                      font-weight:700;
                                    "
                                  >
                                    Location
                                  </td>

                                  <td
                                    align="right"
                                    style="
                                      padding:14px 0;
                                      font-family:'Manrope','Segoe UI',Arial,sans-serif;
                                      font-size:14px;
                                      font-weight:700;
                                    "
                                  >
                                    ${
                                      mapsUrl
                                        ? `
                                          <a
                                            href="${escapeHtml(mapsUrl)}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style="
                                              color:#90ffdc;
                                              text-decoration:none;
                                            "
                                          >
                                            ${escapeHtml(address)}
                                          </a>
                                        `
                                        : `
                                          <span style="color:#ffffff;">
                                            ${escapeHtml(address)}
                                          </span>
                                        `
                                    }
                                  </td>
                                </tr>
                              `
                              : ""
                          }
                        </table>
                      </td>
                    </tr>
                  </table>

                  ${
                    repairDetails &&
                    repairDetails !== "Not provided"
                      ? `
                        <table
                          width="100%"
                          cellpadding="0"
                          cellspacing="0"
                          border="0"
                          role="presentation"
                          style="
                            width:100%;
                            margin-top:26px;
                            border-collapse:collapse;
                          "
                        >
                          <tr>
                            <td
                              style="
                                padding:0 0 10px;
                                color:#90ffdc;
                                font-family:'Space Grotesk','Segoe UI',Arial,sans-serif;
                                font-size:12px;
                                font-weight:700;
                                letter-spacing:0.13em;
                                text-transform:uppercase;
                              "
                            >
                              04&nbsp;&nbsp;Notes
                            </td>
                          </tr>

                          <tr>
                            <td
                              style="
                                padding:18px;
                                color:#e8f0f6;
                                font-family:'Manrope','Segoe UI',Arial,sans-serif;
                                font-size:14px;
                                font-weight:500;
                                line-height:1.7;
                                background:#0d2940;
                                border:1px solid #174665;
                                border-radius:16px;
                              "
                            >
                              ${escapeHtml(repairDetails).replace(/\n/g, "<br />")}
                            </td>
                          </tr>
                        </table>
                      `
                      : ""
                  }
                </td>
              </tr>

              <tr>
                <td
                  align="center"
                  style="
                    padding:18px 24px;
                    background:#061522;
                    border-top:1px solid #174665;
                  "
                >
                  <p
                    style="
                      margin:0;
                      color:#68879e;
                      font-family:'Manrope','Segoe UI',Arial,sans-serif;
                      font-size:11px;
                      font-weight:600;
                      line-height:1.5;
                      letter-spacing:0.04em;
                    "
                  >
                    Primitive Tech Repairs &nbsp;·&nbsp; Internal Request
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
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
        subject: `Repair Request ${requestId} - ${customerName}`,
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
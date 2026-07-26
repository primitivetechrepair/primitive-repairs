export function mapWizardPayloadToLead(payload) {
  if (!payload) {
    throw new Error("Missing wizard payload.");
  }

  const repairs = Array.isArray(payload.repairs)
    ? payload.repairs
    : [];

  const repairNames = repairs
    .map((repair) => repair.name)
    .filter(Boolean);

  const addOns = Array.isArray(payload.addOns)
    ? payload.addOns
        .map((addOn) => ({
          id: String(
            addOn?.id ||
            addOn?.sku ||
            ""
          ).trim(),
          sku: String(addOn?.sku || "").trim(),
          name: String(
            addOn?.name ||
            addOn?.label ||
            ""
          ).trim(),
          price: Number(addOn?.price || 0),
          quantity: Math.max(
            1,
            Number(addOn?.quantity || 1)
          ),
          installed: Boolean(addOn?.installed),
          compatibleBrand: String(
            addOn?.compatibleBrand ||
            ""
          ).trim(),
          compatibleModel: String(
            addOn?.compatibleModel ||
            ""
          ).trim(),
          stockQuantityAtSelection: Math.max(
            0,
            Number(
              addOn?.stockQuantityAtSelection ||
              0
            )
          )
        }))
        .filter((addOn) => addOn.name)
    : [];

  const repairDetails = repairs.map((repair) => ({
    repair: repair.name || "Repair",
    time: repair.time || null,
    warranty: repair.warranty || null,
    symptoms: Array.isArray(repair.symptoms) ? repair.symptoms : [],
    details: repair.details || ""
  }));

  const generalNotes = String(payload.notes || "").trim();

  const promotion =
    payload.promotion &&
    typeof payload.promotion === "object"
      ? payload.promotion
      : payload.savings &&
          typeof payload.savings === "object"
        ? payload.savings
        : {};

  const promotionCode =
    String(promotion.code || "")
      .trim()
      .toUpperCase();

  const promotionStatus =
    promotionCode
      ? String(
          promotion.status ||
          "Pending verification"
        ).trim()
      : "";

  const promotionSource =
    promotionCode
      ? String(
          promotion.source ||
          "Customer-entered promotion code"
        ).trim()
      : "";

  const promotionOfferType =
    promotionCode
      ? String(
          promotion.offerType ||
          "Coupon, promotion, referral, or bundle"
        ).trim()
      : "";

  const promotionVerification =
    promotionCode
      ? String(
          promotion.verification ||
          "Offer details, value, terms, and eligibility require verification before final pricing."
        ).trim()
      : "";

  const promotionNote =
    promotionCode
      ? [
          "Promotion Redemption",
          `Code: ${promotionCode}`,
          `Offer Type: ${promotionOfferType}`,
          `Status: ${promotionStatus}`,
          promotionVerification
        ].join(" | ")
      : "";

  const repairNotes = repairDetails
    .filter((item) => item.details)
    .map((item) => `${item.repair}: ${item.details}`);

  const addOnNotes = addOns.map((addOn) => {
    const priceText =
      addOn.price > 0
        ? ` — $${addOn.price.toFixed(2)}`
        : "";

    const installText =
      addOn.installed
        ? " installed"
        : "";

    const compatibilityText =
      addOn.compatibleModel
        ? ` for ${addOn.compatibleModel}`
        : "";

    const skuText =
      addOn.sku
        ? ` | SKU: ${addOn.sku}`
        : "";

    return `Protection Add-On: ${addOn.name}${compatibilityText}${priceText}${installText}${skuText}`;
  });

  const combinedNotes = [
    ...repairNotes,
    ...addOnNotes,
    promotionNote,
    generalNotes ? `General Notes: ${generalNotes}` : ""
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    leadID: payload.requestId,

    customerName: payload.customer?.name || "",
    contactNumber: payload.customer?.phone || "",
    email: payload.customer?.email || "",

    address: payload.customer?.serviceLocation || payload.customer?.address || "",
    apt: payload.customer?.apt || "",
    zip: payload.customer?.zip || "",

    device: payload.device?.type || "",
    brand: payload.device?.brand || "",
    series: payload.device?.series || "",
    model: payload.device?.model || "",
    modelId: payload.device?.modelId || "",
    deviceImage: payload.device?.image || "",

    repairType: repairNames.join(", "),
    repairTypes: repairNames,
    repairDetails,

    addOns,

    promotion: {
      code: promotionCode,
      status: promotionStatus,
      source: promotionSource,
      offerType: promotionOfferType,
      verification: promotionVerification
    },

    promotionCode,
    promotionStatus,
    promotionOfferType,

    repairItems: [
      ...repairNames.map((name) => ({
        type: name,
        amount: 0
      })),
      ...addOns.map((addOn) => ({
        type: addOn.name,
        amount: Number(
          addOn.price * addOn.quantity
        ),
        category: "add-on",
        sku: addOn.sku,
        compatibleBrand:
          addOn.compatibleBrand,
        compatibleModel:
          addOn.compatibleModel
      }))
    ],

    issueDescription: combinedNotes,

    notes: combinedNotes
      ? [
          {
            id: `note-${Date.now()}`,
            text: combinedNotes,
            at: new Date().toLocaleString(),
            tag: "repair",
            files: []
          }
        ]
      : [],

    files: Array.isArray(payload.attachments)
      ? payload.attachments
      : [],

    appointment: {
      serviceType: payload.appointment?.serviceType || "",
      date: payload.appointment?.date || "",
      time: payload.appointment?.time || "",
      technician: payload.appointment?.technician || null,
      pickupRequired: Boolean(payload.appointment?.pickupRequired),
      mailIn: Boolean(payload.appointment?.mailIn),
      onsite: Boolean(payload.appointment?.onsite),
      afterHours: Boolean(payload.appointment?.afterHours),
      convenienceFee: Number(payload.appointment?.convenienceFee || 0),
      convenienceFeeLabel: payload.appointment?.convenienceFeeLabel || null
    },

    convenienceFee: Number(payload.appointment?.convenienceFee || 0),
    afterHoursConvenienceFee: Boolean(payload.appointment?.afterHours),

    serviceType: payload.appointment?.serviceType || "",
    appointmentDate: payload.appointment?.date || "",
    appointmentTime: payload.appointment?.time || "",

    repairCost: 0,
    laborAmount: 0,
    paymentMethod: "Cash",
    paymentStatus: "Unpaid",

    inventoryUsed: [],
    inventoryUsedQty: {},

    source: payload.source || "repair-wizard",
    status: payload.status || "New",

    dateReported: payload.createdAt || new Date().toISOString(),
    createdAt: payload.createdAt || new Date().toISOString(),
    lastUpdated: new Date().toISOString()
  };
}
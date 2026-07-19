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

  const repairDetails = repairs.map((repair) => ({
    repair: repair.name || "Repair",
    time: repair.time || null,
    warranty: repair.warranty || null,
    symptoms: Array.isArray(repair.symptoms) ? repair.symptoms : [],
    details: repair.details || ""
  }));

  const generalNotes = String(payload.notes || "").trim();

  const repairNotes = repairDetails
    .filter((item) => item.details)
    .map((item) => `${item.repair}: ${item.details}`);

  const combinedNotes = [
    ...repairNotes,
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

    repairItems: repairNames.map((name) => ({
      type: name,
      amount: 0
    })),

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
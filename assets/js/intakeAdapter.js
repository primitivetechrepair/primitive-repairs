const SERVICE_CHANNELS = Object.freeze({
  pickup: "pickup_delivery",
  onsite: "mobile",
  "mail-in": "mail_in",
  "meet-up": "mobile"
});

export class IntakeMappingError extends Error {
  constructor(code = "intake_validation_failed") {
    super("The repair request is not ready to submit.");
    this.name = "IntakeMappingError";
    this.code = code;
  }
}

function invalid(code = "intake_validation_failed") {
  throw new IntakeMappingError(code);
}

function clean(value, { required = false, max = 4000 } = {}) {
  if (value != null && typeof value !== "string") invalid();
  const result = String(value || "").trim();
  if ((required && !result) || result.length > max || /\u0000/u.test(result)) {
    invalid();
  }
  return result;
}

function record(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value;
}

function mapRepair(repair) {
  const value = record(repair);
  const name = clean(value.name || value.repair, { required: true, max: 160 });
  const symptoms = Array.isArray(value.symptoms) ? value.symptoms : [];
  if (symptoms.length > 20) invalid();
  return {
    name,
    time: clean(value.time, { max: 120 }),
    warranty: clean(value.warranty, { max: 240 }),
    symptoms: symptoms.map((symptom) => clean(symptom, { required: true, max: 160 })),
    details: clean(value.details, { max: 2000 })
  };
}

function mapAddOn(addOn) {
  const value = record(addOn);
  const name = clean(value.name || value.label, { required: true, max: 160 });
  const quantity = Number(value.quantity || 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) invalid();
  return {
    id: clean(value.id, { max: 120 }),
    sku: clean(value.sku, { max: 120 }),
    name,
    label: clean(value.label || name, { max: 160 }),
    quantity,
    installed: Boolean(value.installed),
    compatibleBrand: clean(value.compatibleBrand, { max: 120 }),
    compatibleModel: clean(value.compatibleModel, { max: 160 })
  };
}

export function serviceChannelForWebsiteMode(mode) {
  return SERVICE_CHANNELS[String(mode || "").trim().toLowerCase()] || null;
}

export function mapRepairFlowToPublicIntake(wizardPayload, { submissionId } = {}) {
  const source = record(wizardPayload);
  const customer = record(source.customer);
  const device = record(source.device);
  const appointment = record(source.appointment);
  const serviceType = clean(appointment.serviceType, { required: true, max: 20 }).toLowerCase();
  if (!serviceChannelForWebsiteMode(serviceType)) invalid("unsupported_service_type");

  const serviceLocation = clean(customer.serviceLocation || customer.address, { max: 500 });
  const zip = clean(customer.zip, { max: 12 });
  if (new Set(["meet-up", "pickup", "onsite"]).has(serviceType)
    && (!serviceLocation || !zip)) {
    invalid("service_location_required");
  }

  const repairs = Array.isArray(source.repairs) ? source.repairs.map(mapRepair) : [];
  if (!repairs.length || repairs.length > 12) invalid();
  if (Array.isArray(source.attachments) && source.attachments.length) {
    invalid("attachments_not_supported");
  }

  const promotion = source.promotion && typeof source.promotion === "object"
    && !Array.isArray(source.promotion) ? source.promotion : {};
  const promotionCode = clean(promotion.code, { max: 80 }).toUpperCase();
  const addOns = Array.isArray(source.addOns) ? source.addOns.map(mapAddOn) : [];
  if (addOns.length > 10) invalid();

  const payload = {
    schemaVersion: 1,
    requestId: clean(submissionId, { required: true, max: 80 }),
    customer: {
      name: clean(customer.name, { required: true, max: 120 }),
      phone: clean(customer.phone, { required: true, max: 32 }),
      email: clean(customer.email, { required: true, max: 254 }).toLowerCase(),
      address: clean(customer.address, { max: 500 }),
      serviceLocation,
      apt: clean(customer.apt, { max: 40 }),
      zip
    },
    device: {
      type: clean(device.type, { required: true, max: 80 }),
      brand: clean(device.brand, { max: 120 }),
      series: clean(device.series, { max: 120 }),
      model: clean(device.model, { required: true, max: 160 }),
      modelId: clean(device.modelId, { max: 160 }),
      image: clean(device.image, { max: 500 })
    },
    repairs,
    repair: { ...repairs[0] },
    addOns,
    promotion: {
      code: promotionCode,
      status: promotionCode ? clean(promotion.status, { max: 120 }) : "",
      source: promotionCode ? clean(promotion.source, { max: 160 }) : "",
      offerType: promotionCode ? clean(promotion.offerType, { max: 160 }) : "",
      verification: promotionCode ? clean(promotion.verification, { max: 500 }) : ""
    },
    appointment: {
      serviceType,
      date: clean(appointment.date, { required: true, max: 10 }),
      time: clean(appointment.time, { required: true, max: 8 }).toUpperCase(),
      pickupRequired: serviceType === "pickup",
      mailIn: serviceType === "mail-in",
      onsite: serviceType === "onsite",
      afterHours: Boolean(appointment.afterHours)
    },
    notes: clean(source.notes, { max: 4000 }),
    attachments: []
  };

  return payload;
}

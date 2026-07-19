import { state } from "./state.js";

function generateRequestId() {
  const now = new Date();

  const datePart = [
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    now.getFullYear()
  ].join("");

  const randomPart = String(Math.floor(1000 + Math.random() * 9000));

  return `PTR-${datePart}-${randomPart}`;
}

function normalizeRepair(repair) {
  if (!repair) {
    return null;
  }

  const repairName = repair?.repair || repair;

  return {
    name: repairName,
    time: repair?.time || null,
    warranty: repair?.warranty || null,
    symptoms: Array.isArray(repair?.symptoms) ? repair.symptoms : [],
    details: state.repairDetails?.[repairName] || ""
  };
}

function getSelectedRepairs() {
  if (Array.isArray(state.repairs) && state.repairs.length) {
    return state.repairs;
  }

  if (state.repair) {
    return [state.repair];
  }

  return [];
}

function getAppointmentHour24(timeValue) {
  const match = String(timeValue || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const period = match[3].toUpperCase();

  if (hour === 12) {
    hour = 0;
  }

  if (period === "PM") {
    hour += 12;
  }

  return hour;
}

export function applyAfterHoursBookingDetails(payload) {
  if (!payload.appointment) {
    payload.appointment = {};
  }

  const appointmentHour = getAppointmentHour24(
    payload.appointment.time
  );

  const isAfterHours =
    appointmentHour !== null &&
    (appointmentHour < 7 || appointmentHour >= 19);

  payload.appointment.afterHours = isAfterHours;
  payload.appointment.convenienceFee = isAfterHours ? 35 : 0;
  payload.appointment.convenienceFeeLabel = isAfterHours
    ? "$35 after-hours convenience fee"
    : null;

  return payload;
}

export function buildLeadPayload(form) {
  const formData = new FormData(form);

  const selectedRepairs = getSelectedRepairs();
  const normalizedRepairs = selectedRepairs
    .map(normalizeRepair)
    .filter(Boolean);

  const primaryRepair = normalizedRepairs[0] || {
    name: null,
    time: null,
    warranty: null,
    symptoms: []
  };
  const payload = {
    requestId: generateRequestId(),

    customer: {
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      email: String(formData.get("email") || "").trim(),

      address: String(formData.get("address") || "").trim(),
      serviceLocation: String(formData.get("address") || "").trim(),

      apt: String(formData.get("apt") || "").trim(),
      zip: String(formData.get("zip") || "").trim()
    },

    device: {
      type: state.device,
      brand: state.brand,
      series: state.series,
      model: state.model?.model || state.model,
      modelId: state.model?.id || null,
      image: state.model?.image || null
    },

    repairs: normalizedRepairs,

    repair: primaryRepair,

    appointment: {
      serviceType: state.appointment?.serviceType || null,
      date: state.appointment?.date || null,
      time: state.appointment?.time || null,
      technician: state.appointment?.technician || null,
      pickupRequired: Boolean(state.appointment?.pickupRequired),
      mailIn: Boolean(state.appointment?.mailIn),
      onsite: Boolean(state.appointment?.onsite)
    },

    notes: String(formData.get("notes") || "").trim(),

    attachments: Array.from(form.querySelector("#cf-files")?.files || []).map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size
    })),

    source: "repair-wizard",

    status: "New",

    createdAt: new Date().toISOString()
  };

  return applyAfterHoursBookingDetails(payload);
}

export function validateLeadPayload(payload) {
  const errors = [];

  if (!payload.customer.name) {
    errors.push("Full name is required.");
  }

  if (!payload.customer.phone) {
    errors.push("Phone number is required.");
  }

  if (!payload.customer.email) {
    errors.push("Email is required.");
  }

  if (!payload.repairs.length) {
    errors.push("Please select at least one repair.");
  }

  const requiresAddress =
    payload.appointment.serviceType === "meet-up" ||
    payload.appointment.serviceType === "pickup" ||
    payload.appointment.serviceType === "onsite";

  if (requiresAddress && !payload.customer.serviceLocation) {
    errors.push("A meet-up or service location is required for meet-up, pickup, or onsite service.");
  }

  if (requiresAddress && !payload.customer.zip) {
    errors.push("ZIP Code is required for meet-up, pickup, or onsite service.");
  }

  return errors;
}
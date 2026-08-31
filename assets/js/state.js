export const state = {
  device: null,
  brand: null,
  series: null,
  model: null,

  repair: null,
  repairs: [],
  repairDetails: {},
  repairDetailsViewed: false,
  repairInfoViewed: false,

  protectionViewed: false,
  addOns: [],

  appointmentSelected: false,
  reviewViewed: false,

  appointment: {
    date: null,
    time: null,
    serviceType: null,
    technician: null,
    pickupRequired: false,
    mailIn: false,
    onsite: false
  },

  catalogCache: {},
  catalogProvider: null,
  catalogSelection: {
    deviceId: null,
    brandId: null,
    seriesId: null,
    modelId: null,
    repairIds: []
  },
  searchTerm: ""
};

const CATALOG_RESET_MAP = {
  device: ["deviceId", "brandId", "seriesId", "modelId", "repairIds"],
  brand: ["brandId", "seriesId", "modelId", "repairIds"],
  series: ["seriesId", "modelId", "repairIds"],
  model: ["modelId", "repairIds"],
  repair: ["repairIds"]
};

const RESET_MAP = {
  device: [
    "brand",
    "series",
    "model",
    "repair",
    "repairs",
    "repairDetails",
    "repairDetailsViewed",
    "repairInfoViewed",
    "protectionViewed",
    "addOns",
    "appointmentSelected",
    "reviewViewed"
  ],

  brand: [
    "series",
    "model",
    "repair",
    "repairs",
    "repairDetails",
    "repairDetailsViewed",
    "repairInfoViewed",
    "protectionViewed",
    "addOns",
    "appointmentSelected",
    "reviewViewed"
  ],

  series: [
    "model",
    "repair",
    "repairs",
    "repairDetails",
    "repairDetailsViewed",
    "repairInfoViewed",
    "protectionViewed",
    "addOns",
    "appointmentSelected",
    "reviewViewed"
  ],

  model: [
    "repair",
    "repairs",
    "repairDetails",
    "repairDetailsViewed",
    "repairInfoViewed",
    "protectionViewed",
    "addOns",
    "appointmentSelected",
    "reviewViewed"
  ]
};

function resetStateKey(key) {
  if (key === "repairs" || key === "addOns") {
    state[key] = [];
    return;
  }

  if (key === "repairDetails") {
    state.repairDetails = {};
    return;
  }

  if (
    key === "repairDetailsViewed" ||
    key === "repairInfoViewed" ||
    key === "protectionViewed" ||
    key === "appointmentSelected" ||
    key === "reviewViewed"
  ) {
    state[key] = false;
    return;
  }

  state[key] = null;
}

export function resetStep(step) {
  const keys = RESET_MAP[step];

  if (Array.isArray(keys)) {
    keys.forEach(resetStateKey);
  }

  (CATALOG_RESET_MAP[step] || []).forEach((key) => {
    state.catalogSelection[key] = key === "repairIds" ? [] : null;
  });
}

export function resetAllState() {
  state.device = null;
  state.brand = null;
  state.series = null;
  state.model = null;

  state.repair = null;
  state.repairs = [];
  state.repairDetails = {};
  state.repairDetailsViewed = false;
  state.repairInfoViewed = false;

  state.protectionViewed = false;
  state.addOns = [];

  state.appointmentSelected = false;
  state.reviewViewed = false;

  state.appointment = {
    date: null,
    time: null,
    serviceType: null,
    technician: null,
    pickupRequired: false,
    mailIn: false,
    onsite: false
  };

  state.catalogSelection = {
    deviceId: null,
    brandId: null,
    seriesId: null,
    modelId: null,
    repairIds: []
  };

  state.searchTerm = "";
}

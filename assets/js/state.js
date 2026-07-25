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
  searchTerm: ""
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

  if (!Array.isArray(keys)) {
    return;
  }

  keys.forEach(resetStateKey);
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

  state.searchTerm = "";
}
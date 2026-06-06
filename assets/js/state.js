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

export function resetStep(step) {
  const resetMap = {
  device: ["brand", "series", "model", "repair", "repairs", "repairDetails", "repairDetailsViewed", "repairInfoViewed", "appointmentSelected", "reviewViewed"],
  brand: ["series", "model", "repair", "repairs", "repairDetails", "repairDetailsViewed", "repairInfoViewed", "appointmentSelected", "reviewViewed"],
  series: ["model", "repair", "repairs", "repairDetails", "repairDetailsViewed", "repairInfoViewed", "appointmentSelected", "reviewViewed"],
  model: ["repair", "repairs", "repairDetails", "repairDetailsViewed", "repairInfoViewed", "appointmentSelected", "reviewViewed"]
};

  if (!resetMap[step]) return;

  resetMap[step].forEach((key) => {
  if (key === "repairs") {
  state.repairs = [];
  return;
}

if (key === "repairDetails") {
  state.repairDetails = {};
  return;
}

  if (
  key === "repairDetailsViewed" ||
  key === "repairInfoViewed" ||
  key === "appointmentSelected" ||
  key === "reviewViewed"
) {
  state[key] = false;
  return;
}

  state[key] = null;
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
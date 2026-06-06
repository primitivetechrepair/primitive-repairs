const LOCAL_LEADS_KEY = "primitiveTechHub_wizardLeadTestQueue";

export function saveMappedLeadLocally(mappedLead) {
  if (!mappedLead?.leadID) {
    throw new Error("Cannot save lead locally: missing leadID.");
  }

  const existingLeads = JSON.parse(
    localStorage.getItem(LOCAL_LEADS_KEY) || "[]"
  );

  const nextLeads = [
    mappedLead,
    ...existingLeads.filter((lead) => lead.leadID !== mappedLead.leadID)
  ];

  localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(nextLeads));

  return nextLeads;
}

export function getLocalMappedLeads() {
  return JSON.parse(localStorage.getItem(LOCAL_LEADS_KEY) || "[]");
}

export function clearLocalMappedLeads() {
  localStorage.removeItem(LOCAL_LEADS_KEY);
}
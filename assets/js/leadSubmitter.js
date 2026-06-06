const FORCE_SUBMIT_FAILURE = false;

export async function submitWizardLead(mappedLead) {
  if (!mappedLead?.leadID) {
    throw new Error("Cannot submit wizard lead: missing leadID.");
  }

  if (FORCE_SUBMIT_FAILURE) {
    throw new Error("Forced submit failure test.");
  }

  return {
    success: true,
    leadID: mappedLead.leadID,
    submittedAt: new Date().toISOString(),
    mode: "placeholder"
  };
}
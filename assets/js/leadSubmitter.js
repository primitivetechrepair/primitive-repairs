const FORCE_SUBMIT_FAILURE = false;

export async function submitWizardLead(mappedLead) {
  if (!mappedLead?.leadID) {
    throw new Error("Cannot submit wizard lead: missing leadID.");
  }

  if (FORCE_SUBMIT_FAILURE) {
    throw new Error("Forced submit failure test.");
  }

  const response = await fetch("/api/submit-repair", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(mappedLead)
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.error || "Repair request submission failed.");
  }

  return {
    success: true,
    leadID: result.requestId || mappedLead.leadID,
    submittedAt: new Date().toISOString(),
    mode: "email"
  };
}
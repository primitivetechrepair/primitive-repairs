import { mapRepairFlowToPublicIntake } from "./intakeAdapter.js?v=20260901-1";
import {
  fetchIntakeRuntimeConfig,
  IntakeClientError,
  PublicIntakeClient
} from "./intakeClient.js?v=20260901-1";
import { SubmissionStateStore } from "./submissionState.js?v=20260901-1";

const FORCE_SUBMIT_FAILURE = false;
const RECAPTCHA_SITE_KEY = "6Lcv8hAtAAAAAGIK3yYGXxQXmic7isOxGx5odnYV";
let intakeConfigPromise = null;
let intakeClient = null;
let submissionStateStore = null;

function loadRecaptchaScript() {
  return new Promise((resolve, reject) => {
    if (window.grecaptcha) {
      resolve();
      return;
    }

    const existingScript = document.querySelector("script[data-recaptcha-script]");

    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.dataset.recaptchaScript = "true";

    script.onload = resolve;
    script.onerror = reject;

    document.head.appendChild(script);
  });
}

async function getRecaptchaToken(action) {
  await loadRecaptchaScript();

  return new Promise((resolve, reject) => {
    window.grecaptcha.ready(async () => {
      try {
        const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, {
          action
        });

        resolve(token);
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function submitLegacyLead(mappedLead) {
  if (!mappedLead?.leadID) {
    throw new Error("Cannot submit wizard lead: missing leadID.");
  }

  if (FORCE_SUBMIT_FAILURE) {
    throw new Error("Forced submit failure test.");
  }

  const recaptchaToken = await getRecaptchaToken("submit_repair");

  const response = await fetch("/api/submit-repair", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...mappedLead,
      recaptchaToken
    })
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

export function getSubmissionStateStore() {
  if (!submissionStateStore) submissionStateStore = new SubmissionStateStore();
  return submissionStateStore;
}

export function fetchSubmissionProvider() {
  if (!intakeConfigPromise) {
    intakeConfigPromise = fetchIntakeRuntimeConfig().catch((error) => {
      intakeConfigPromise = null;
      throw error;
    });
  }
  return intakeConfigPromise;
}

export async function configureSubmissionProvider({ fileInput, filePreviews, attachmentNote } = {}) {
  const config = await fetchSubmissionProvider();
  const deferred = config.provider === "benchlayer";
  if (fileInput) {
    if (deferred) fileInput.value = "";
    fileInput.disabled = deferred;
    fileInput.setAttribute("aria-disabled", String(deferred));
  }
  if (filePreviews && deferred) filePreviews.replaceChildren();
  if (attachmentNote && deferred) {
    attachmentNote.textContent =
      "Photo and video attachments are not included with online BenchLayer requests yet. You can provide them after we contact you.";
  }
  return config.provider;
}

function benchLayerClient(config) {
  if (!intakeClient || intakeClient.endpoint !== new URL(config.endpoint).toString()) {
    intakeClient = new PublicIntakeClient({
      endpoint: config.endpoint,
      credential: config.credential,
      stateStore: getSubmissionStateStore()
    });
  }
  return intakeClient;
}

export async function submitWizardLead({ wizardPayload, legacyLead }) {
  if (FORCE_SUBMIT_FAILURE) {
    throw new Error("Forced submit failure test.");
  }

  const config = await fetchSubmissionProvider();
  if (config.provider === "legacy") return submitLegacyLead(legacyLead);

  const store = getSubmissionStateStore();
  const submissionId = store.identity().submissionId;
  const intakePayload = mapRepairFlowToPublicIntake(wizardPayload, { submissionId });
  const result = await benchLayerClient(config).submit(intakePayload);
  return {
    ...result,
    leadID: result.confirmationReference,
    submittedAt: new Date().toISOString(),
    mode: "benchlayer"
  };
}

export function resetWizardSubmission() {
  getSubmissionStateStore().clear();
}

export function submissionErrorPresentation(error) {
  const code = error?.code || "intake_failed";
  if (code === "idempotency_conflict" || code === "submission_payload_changed"
    || code === "submission_conflict_unresolved") {
    return {
      title: "Request needs review",
      message: "This request changed after an earlier submission attempt. Please start a new request or restore the original details before retrying."
    };
  }
  if (code === "rate_limited") {
    const seconds = Number(error?.retryAfterSeconds || 0);
    return {
      title: "Please wait before retrying",
      message: seconds > 0
        ? `Please wait about ${seconds} seconds, then retry this same request.`
        : "Please wait a moment, then retry this same request."
    };
  }
  if (code === "validation_failed" || code === "intake_validation_failed"
    || code === "service_location_required" || code === "unsupported_service_type") {
    return {
      title: "Review your request",
      message: "Some repair details need attention. Please review the form and try again."
    };
  }
  if (code === "request_too_large" || code === "attachments_not_supported") {
    return {
      title: "Request is too large",
      message: "Please shorten the notes and submit without attachments, then try again."
    };
  }
  if (error instanceof IntakeClientError && error.ambiguous) {
    return {
      title: "Confirmation not received",
      message: "We could not confirm the result. Retry this request safely; the same submission reference will be reused so a duplicate is not created."
    };
  }
  if (code === "intake_unavailable" || code === "intake_configuration_unavailable"
    || code === "intake_configuration_invalid" || code === "intake_server_error") {
    return {
      title: "Repair requests are temporarily unavailable",
      message: "Please try this same request again shortly or contact us directly if the problem continues."
    };
  }
  return {
    title: "Request not submitted",
    message: "Please check your connection and retry this same request. You may also contact us directly if the problem continues."
  };
}

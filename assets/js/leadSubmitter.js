const FORCE_SUBMIT_FAILURE = false;
const RECAPTCHA_SITE_KEY = "6Lcv8hAtAAAAAGIK3yYGXxQXmic7isOxGx5odnYV";

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

export async function submitWizardLead(mappedLead) {
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
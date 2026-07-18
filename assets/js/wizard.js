import { state, resetStep, resetAllState } from "./state.js";
import { loadCatalog } from "./catalog.js";
import {
  renderDeviceStep,
  renderBrandStep,
  renderSeriesStep,
  renderModelStep,
  renderRepairStep,
  renderRepairDetailsStep,
  renderRepairInfoStep,
  renderSelectionCards,
  renderSuccessStep,
  renderReviewStep,
  renderSummary
} from "./renderer.js";

import { renderAppointmentStep } from "./appointments.js";
import { buildLeadPayload, validateLeadPayload } from "./leadSubmission.js";
import { mapWizardPayloadToLead } from "./leadMapper.js";
import { submitWizardLead } from "./leadSubmitter.js";

const devices = [
  "Phone",
  "Tablet",
  "Computer",
  "Console",
  "Smartwatch",
  "Mods",
  "Other"
];

const brandsByDevice = {
  Phone: [
    "Apple",
    "Samsung",
    "Google",
    "Motorola",
    "Alcatel",
    "ASUS",
    "BlackBerry",
    "Huawei",
    "HTC",
    "LG",
    "Nokia",
    "Nothing",
    "Oppo",
    "Realme",
    "Sony",
    "Xiaomi",
    "ZTE"
  ],
  Tablet: ["Apple", "Samsung", "Microsoft", "Lenovo", "Amazon"],
  Computer: ["Apple", "Dell", "HP", "Lenovo", "ASUS", "Acer", "Microsoft"],
  Console: ["Sony", "Microsoft", "Nintendo"],
  Smartwatch: ["Apple", "Samsung", "Garmin"],
  Mods: ["Phones", "Consoles", "Wearables", "Meta Glasses", "Other"],
  Other: ["Generic"]
};

let activeCatalog = [];

document.addEventListener("DOMContentLoaded", () => {
  const stepsArea = document.getElementById("pr-steps-area");
  const formArea = document.getElementById("pr-form-area");
  const summaryBox = document.getElementById("summary-box");
  const customerForm = document.getElementById("pr-customer-form");
  const backBtn = document.getElementById("cf-back");
  const fileInput = document.getElementById("cf-files");
  const filePreviews = document.getElementById("cf-previews");
  const repairPolicyToggle = document.getElementById("toggle-repair-policy");
  const repairPolicyBox = document.getElementById("repair-policy-box");

  const repairPageLoadedAt = Date.now();
  const repairMinimumSubmitTime = 8000;
  const repairCooldownMs = 60000;
  const repairCooldownKey = "primitiveRepairRequestLastSubmit";
  let repairSubmitLocked = false;

  function updateProgress() {
    const progressBar = document.getElementById("pr-progress-bar");

    if (!progressBar) return;

    const steps = [
      state.device,
      state.brand,
      state.series,
      state.model,
      state.repair,
      state.repairDetailsViewed,
      state.repairInfoViewed,
      state.appointmentSelected,
      state.reviewViewed
    ];

    const completed = steps.filter(Boolean).length;
    const percent = Math.round((completed / steps.length) * 100);

    progressBar.style.width = `${percent}%`;

    if (percent >= 100) {
      progressBar.classList.add("full");
    } else {
      progressBar.classList.remove("full");
    }
  }

  function scrollWizardStepIntoView() {
    if (!stepsArea) return;

    requestAnimationFrame(() => {
      stepsArea.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }

  function updateServiceLocationHelp() {
    const help = document.getElementById("service-location-help");
    const addressLabel = document.querySelector('label[for="cf-address"]');
    const zipLabel = document.querySelector('label[for="cf-zip"]');
    const addressInput = document.getElementById("cf-address");
    const zipInput = document.getElementById("cf-zip");

    if (!help) return;

    const serviceType = state.appointment?.serviceType;

    const messages = {
      "meet-up": "For meet-up, enter a public place or business location. Do not enter a private home address.",
      pickup: "For pickup service, enter the pickup address where the device will be collected.",
      onsite: "For onsite service, enter the location where service is being requested.",
      "mail-in": "For mail-in repair, this field is optional. Shipping instructions will be provided after review."
    };

    const placeholders = {
      "meet-up": {
        address: "Example: Starbucks, Best Buy, library, or other public/business location",
        zip: "ZIP code for the meet-up location"
      },
      pickup: {
        address: "Enter pickup address",
        zip: "ZIP code for pickup address"
      },
      onsite: {
        address: "Enter onsite service location",
        zip: "ZIP code for onsite location"
      },
      "mail-in": {
        address: "Optional for mail-in repair",
        zip: "Optional for mail-in repair"
      }
    };

    const requiresLocation =
      serviceType === "meet-up" ||
      serviceType === "pickup" ||
      serviceType === "onsite";

    if (addressLabel) {
      addressLabel.textContent = requiresLocation
        ? "Meet-up / service location *"
        : "Meet-up / service location (optional)";
    }

    if (zipLabel) {
      zipLabel.textContent = requiresLocation
        ? "ZIP Code *"
        : "ZIP Code (optional)";
    }

    if (addressInput) {
      addressInput.placeholder =
        placeholders[serviceType]?.address ||
        "Enter the location related to your selected service option";
    }

    if (zipInput) {
      zipInput.placeholder =
        placeholders[serviceType]?.zip ||
        "Enter ZIP code";
    }

    help.textContent =
      messages[serviceType] ||
      "Enter the location related to your selected service option.";
  }

  function escapeSummaryValue(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getSummaryText(value) {
    if (!value) return "";

    if (typeof value === "string") {
      return value;
    }

    return (
      value.name ||
      value.model ||
      value.label ||
      value.title ||
      value.repair ||
      value.serviceType ||
      ""
    );
  }

  function getRepairSummaryText() {
    const selectedRepairs = state.repairs?.length
      ? state.repairs
      : [state.repair].filter(Boolean);

    return selectedRepairs
      .map((repair) => getSummaryText(repair))
      .filter(Boolean)
      .join(", ");
  }

  function getAppointmentSummaryText() {
    const serviceType = state.appointment?.serviceType;

    const appointmentLabels = {
      "meet-up": "Meet-Up",
      pickup: "Pickup",
      onsite: "Onsite",
      "mail-in": "Mail-In"
    };

    return appointmentLabels[serviceType] || getSummaryText(serviceType);
  }

  function renderLiveRepairSummary() {
    if (!stepsArea) return;

    const summaryItems = [
      {
        label: "Device",
        value: state.device
      },
      {
        label: "Brand",
        value: state.brand
      },
      {
        label: "Series",
        value: state.series
      },
      {
        label: "Model",
        value: getSummaryText(state.model)
      },
      {
        label: "Repair",
        value: getRepairSummaryText()
      },
      {
        label: "Appointment",
        value: getAppointmentSummaryText()
      },
      {
        label: "Warranty",
        value: state.repair ? "1-Year Warranty" : ""
      }
    ].filter((item) => item.value);

    if (!summaryItems.length) return;

    const summaryCard = document.createElement("section");
    summaryCard.className = "wizard-live-summary";
    summaryCard.setAttribute("aria-label", "Repair request summary");

    summaryCard.innerHTML = `
      <div class="wizard-live-summary-header">
        <span>Repair Request Summary</span>
        <strong>${summaryItems.length} step${summaryItems.length === 1 ? "" : "s"} selected</strong>
      </div>

      <div class="wizard-live-summary-grid">
        ${summaryItems
          .map((item) => {
            return `
              <div class="wizard-live-summary-item">
                <span>${escapeSummaryValue(item.label)}</span>
                <strong>${escapeSummaryValue(item.value)}</strong>
              </div>
            `;
          })
          .join("")}
      </div>
    `;

    stepsArea.prepend(summaryCard);
  }

  function renderFilePreviews() {
    if (!fileInput || !filePreviews) return;

    const files = Array.from(fileInput.files || []);
    const maxFiles = 10;
    const maxSize = 8 * 1024 * 1024;

    filePreviews.innerHTML = "";

    if (!files.length) {
      return;
    }

    const errors = [];

    if (files.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} files allowed.`);
    }

    files.forEach((file) => {
      if (file.size > maxSize) {
        errors.push(`${file.name} is larger than 8MB.`);
      }
    });

    if (errors.length) {
      alert(errors.join("\n"));
      fileInput.value = "";
      filePreviews.innerHTML = "";
      return;
    }

    files.forEach((file) => {
      const item = document.createElement("div");
      item.className = "file-preview-item";

      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");

      if (isImage || isVideo) {
        const previewUrl = URL.createObjectURL(file);

        item.innerHTML = `
          <div class="file-preview-thumb">
            ${
              isImage
                ? `<img src="${previewUrl}" alt="${file.name}">`
                : `<video src="${previewUrl}" muted playsinline></video>`
            }
          </div>

          <div class="file-preview-info">
            <strong>${file.name}</strong>
            <span>${Math.round(file.size / 1024)} KB</span>
          </div>
        `;
      } else {
        item.innerHTML = `
          <div class="file-preview-thumb file-preview-thumb-generic">📎</div>

          <div class="file-preview-info">
            <strong>${file.name}</strong>
            <span>${Math.round(file.size / 1024)} KB</span>
          </div>
        `;
      }

      filePreviews.appendChild(item);
    });
  }

  async function renderWizard(shouldScroll = false) {
    if (!stepsArea) return;

    stepsArea.innerHTML = "";
    stepsArea.style.display = "";

    updateProgress();

    renderSelectionCards(() => {
      if (formArea) {
        formArea.style.display = "none";
      }

      if (stepsArea) {
        stepsArea.style.display = "";
      }

      renderWizard(true);
    });

    if (!state.device) {
      renderDeviceStep(stepsArea, devices, (device) => {
        state.device = device;
        resetStep("device");
        renderWizard(true);
      });

      if (shouldScroll) {
        scrollWizardStepIntoView();
      }

      return;
    }

    if (!state.brand) {
      const brands = brandsByDevice[state.device] || [];

      renderBrandStep(stepsArea, brands, async (brand) => {
        state.brand = brand;
        resetStep("brand");

        activeCatalog = await loadCatalog(state.device, state.brand);

        renderWizard(true);
      });

      renderLiveRepairSummary();

      if (shouldScroll) {
        scrollWizardStepIntoView();
      }

      return;
    }

    if (!state.series) {
      const seriesList = [
        ...new Set(activeCatalog.map((item) => item.series))
      ];

      renderSeriesStep(stepsArea, seriesList, (series) => {
        state.series = series;
        resetStep("series");
        renderWizard(true);
      });

      renderLiveRepairSummary();

      if (shouldScroll) {
        scrollWizardStepIntoView();
      }

      return;
    }
    if (!state.model) {
      const models = activeCatalog.filter((item) => {
        return item.series === state.series;
      });

      renderModelStep(stepsArea, models, (model) => {
        state.model = model;
        resetStep("model");
        renderWizard(true);
      });

      renderLiveRepairSummary();

      if (shouldScroll) {
        scrollWizardStepIntoView();
      }

      return;
    }

    if (!state.repair) {
      const repairs = state.model?.repairs || [];

      renderRepairStep(
        stepsArea,
        repairs,
        state.repairs,
        (repair) => {
          const exists = state.repairs.some((item) => {
            return item.repair === repair.repair;
          });

          if (exists) {
            state.repairs = state.repairs.filter((item) => {
              return item.repair !== repair.repair;
            });
          } else {
            state.repairs = [...state.repairs, repair];
          }

          state.repairDetailsViewed = false;
          state.repairInfoViewed = false;
          state.appointmentSelected = false;
          state.reviewViewed = false;

          renderWizard();
        },
        () => {
          state.repair = state.repairs[0] || null;
          state.repairDetailsViewed = false;
          state.repairInfoViewed = false;
          renderWizard(true);
        }
      );

      renderLiveRepairSummary();

      if (shouldScroll) {
        scrollWizardStepIntoView();
      }

      return;
    }

    if (!state.repairDetailsViewed) {
      renderRepairDetailsStep(
        stepsArea,
        state.repairs.length ? state.repairs : [state.repair].filter(Boolean),
        state.repairDetails,
        (details) => {
          state.repairDetails = details;
          state.repairDetailsViewed = true;
          state.repairInfoViewed = false;
          renderWizard(true);
        }
      );

      renderLiveRepairSummary();

      if (shouldScroll) {
        scrollWizardStepIntoView();
      }

      return;
    }

    if (!state.repairInfoViewed) {
      renderRepairInfoStep(
        stepsArea,
        state.repairs.length ? state.repairs : state.repair,
        () => {
          state.repairInfoViewed = true;
          renderWizard(true);
        }
      );

      renderLiveRepairSummary();

      if (shouldScroll) {
        scrollWizardStepIntoView();
      }

      return;
    }

    if (!state.appointmentSelected) {
      renderAppointmentStep(stepsArea, () => {
        state.appointmentSelected = true;
        renderWizard(true);
      });

      renderLiveRepairSummary();

      if (shouldScroll) {
        scrollWizardStepIntoView();
      }

      return;
    }

    updateProgress();

    stepsArea.style.display = "none";

    if (formArea) {
      formArea.style.display = "block";
      formArea.hidden = false;
      formArea.classList.remove("hidden");
      formArea.style.visibility = "visible";
      formArea.style.opacity = "1";
    }

    renderSummary(summaryBox);
    updateServiceLocationHelp();

    if (formArea) {
      formArea.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
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

      if (formArea) {
        formArea.style.display = "none";
      }

      if (stepsArea) {
        stepsArea.style.display = "";
      }

      renderWizard(true);
    });
  }

  if (customerForm) {
  customerForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(customerForm);
    const honeypotValue = String(formData.get("website") || "").trim();

    if (honeypotValue) {
      console.warn("Repair request blocked by honeypot.");
      return;
    }

    const timeOnPage = Date.now() - repairPageLoadedAt;

    if (timeOnPage < repairMinimumSubmitTime) {
      console.warn("Repair request blocked because it was submitted too quickly.");
      return;
    }

    const leadPayload = buildLeadPayload(customerForm);
      const validationErrors = validateLeadPayload(leadPayload);

      if (validationErrors.length) {
        alert(validationErrors.join("\n"));
        return;
      }

      if (formArea) {
        formArea.style.display = "none";
      }

      if (!stepsArea) return;

      stepsArea.style.display = "";

      state.reviewViewed = true;
      updateProgress();

      renderReviewStep(stepsArea, leadPayload, {
        onBack: () => {
          state.reviewViewed = false;
          updateProgress();

          stepsArea.innerHTML = "";

          if (formArea) {
            formArea.style.display = "block";
            formArea.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }
        },

        onSubmit: async () => {
  if (repairSubmitLocked) {
    return;
  }

  const lastSubmit = Number(
    localStorage.getItem(repairCooldownKey) || 0
  );

  const now = Date.now();

  if (lastSubmit && now - lastSubmit < repairCooldownMs) {
    console.warn("Repair request blocked by local cooldown.");
    return;
  }

  repairSubmitLocked = true;

  const reviewSubmitButton = stepsArea?.querySelector(".review-submit");

  if (reviewSubmitButton) {
    reviewSubmitButton.disabled = true;
    reviewSubmitButton.textContent = "Submitting...";
  }

  let mappedLead;
  let submitResult;

  try {
    mappedLead = mapWizardPayloadToLead(leadPayload);
    submitResult = await submitWizardLead(mappedLead);

    if (!submitResult?.success) {
      throw new Error(
        submitResult?.error || "Wizard lead submit returned unsuccessful."
      );
    }

    localStorage.setItem(repairCooldownKey, String(now));

  } catch (err) {
    console.error("Wizard lead submit failed:", err);

    repairSubmitLocked = false;

    if (reviewSubmitButton) {
      reviewSubmitButton.disabled = false;
      reviewSubmitButton.textContent = "Submit Request";
    }

    alert(
      "Your request could not be submitted. Please try again or contact us directly."
    );

    return;
  }

  customerForm.reset();

  if (filePreviews) {
    filePreviews.innerHTML = "";
  }

  repairSubmitLocked = false;

  if (reviewSubmitButton) {
    reviewSubmitButton.disabled = false;
    reviewSubmitButton.textContent = "Submit Request";
  }

  renderSuccessStep(stepsArea, leadPayload, () => {
    resetAllState();
    renderWizard(true);
  });

  stepsArea.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}
      });

      stepsArea.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }

if (repairPolicyToggle && repairPolicyBox) {
  repairPolicyToggle.addEventListener("click", () => {
    const isHidden = repairPolicyBox.hidden;

    repairPolicyBox.hidden = !isHidden;
    repairPolicyToggle.textContent = isHidden
      ? "Hide Repair Policy"
      : "View Repair Policy";
  });
}

  if (fileInput) {
    fileInput.addEventListener("change", renderFilePreviews);
  }

  renderWizard();
});
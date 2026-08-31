import { state, resetStep, resetAllState } from "./state.js?v=20260831-1";
import { createCatalogProvider } from "./catalogProviders.js?v=20260831-1";
import {
  renderDeviceStep,
  renderBrandStep,
  renderSeriesStep,
  renderModelStep,
  renderRepairStep,
  renderRepairDetailsStep,
  renderRepairInfoStep,
  renderProtectionUpsellStep,
  renderSelectionCards,
  renderCatalogLoading,
  renderCatalogError,
  renderCatalogEmptyState,
  renderSuccessStep,
  renderReviewStep,
  renderSummary
} from "./renderer.js?v=20260831-1";

import { renderAppointmentStep } from "./appointments.js?v=20260831-1";
import {
  applyAfterHoursBookingDetails,
  buildLeadPayload,
  validateLeadPayload
} from "./leadSubmission.js?v=20260831-1";
import { mapWizardPayloadToLead } from "./leadMapper.js?v=20260726-2";
import { submitWizardLead } from "./leadSubmitter.js";

let catalogProvider = null;
let catalogProviderPromise = null;
let catalogRenderSequence = 0;

async function getCatalogProvider() {
  if (!catalogProviderPromise) {
    catalogProviderPromise = createCatalogProvider().then((provider) => {
      catalogProvider = provider;
      state.catalogProvider = provider.kind;
      return provider;
    });
  }

  return catalogProviderPromise;
}

function resetCatalogProvider() {
  catalogProvider = null;
  catalogProviderPromise = null;
  state.catalogProvider = null;
  resetAllState();
}

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
      state.repair
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
    const target = document.getElementById("pr-main") || stepsArea;

    if (!target) return;

    requestAnimationFrame(() => {
      const targetTop = window.scrollY + target.getBoundingClientRect().top;
      const offset = window.matchMedia("(max-width: 760px)").matches
        ? 162
        : 178;

      window.scrollTo({
        top: Math.max(0, targetTop - offset),
        behavior: "smooth"
      });

      window.setTimeout(() => {
        target.focus?.({ preventScroll: true });
      }, 420);
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

  function getSelectedRepairs() {
    return state.repairs?.length
      ? state.repairs
      : [state.repair].filter(Boolean);
  }

  function getRepairSummaryText() {
    return getSelectedRepairs()
      .map((repair) => getSummaryText(repair))
      .filter(Boolean)
      .join(", ");
  }

  function getRepairCountSummaryText() {
    const count = getSelectedRepairs().length;

    if (!count) return "";

    return count === 1
      ? "1 Repair Selected"
      : `${count} Repairs Selected`;
  }

  function getRepairTimeSummaryText() {
    const times = [
      ...new Set(
        getSelectedRepairs()
          .map((repair) => {
            return (
              repair.time ||
              repair.estimatedTime ||
              repair.duration ||
              ""
            );
          })
          .filter(Boolean)
      )
    ];

    if (!times.length) return "";

    return times.length === 1
      ? times[0]
      : times.join(" + ");
  }

  function getWarrantySummaryText() {
    const warranties = [
      ...new Set(
        getSelectedRepairs()
          .map((repair) => {
            return (
              repair.warranty ||
              repair.warrantyLabel ||
              ""
            );
          })
          .filter(Boolean)
      )
    ];

    if (warranties.length) {
      return warranties.join(", ");
    }

    return getSelectedRepairs().length ? "1-Year Warranty" : "";
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

  function isAfterAppointmentCutoff() {
    const selectedTime = String(
      state.appointment?.time || ""
    ).trim();

    const match = selectedTime.match(
      /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
    );

    if (!match) {
      return false;
    }

    let hour = Number(match[1]);
    const period = match[3].toUpperCase();

    if (hour === 12) {
      hour = 0;
    }

    if (period === "PM") {
      hour += 12;
    }

    return hour < 7 || hour >= 19;
  }

  function getAfterHoursSummaryText() {
    if (!isAfterAppointmentCutoff()) return "";

    return "$35 after-hours convenience fee";
  }

  function getSelectedScreenProtector() {
    const brand =
      String(state.brand || "").trim();

    const model =
      String(
        state.model?.model ||
        state.model?.name ||
        ""
      ).trim();

    const skuPart =
      [brand, model]
        .filter(Boolean)
        .join("-")
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    return {
      id:
        `premium-screen-protector-${skuPart.toLowerCase() || "universal"}`,

      sku:
        `SP-${skuPart || "UNIVERSAL"}-PREMIUM`,

      brand,
      model,

      name: "Premium Tempered Glass",
      label: "Premium Screen Protector",

      price: 19,
      quantity: 1,
      available: true,
      installed: true
    };
  }

  function isScreenProtectionEligible() {
    return (
      state.device === "Phone" &&
      Boolean(state.model)
    );
  }
  function getProtectionAddOnSummaryText() {
    const selectedAddOn = Array.isArray(state.addOns)
      ? state.addOns[0]
      : null;

    if (!selectedAddOn) {
      return "";
    }

    const name =
      selectedAddOn.label ||
      selectedAddOn.name ||
      "Screen Protector";

    const price = Number(selectedAddOn.price || 0);

    return price > 0
      ? `${name} — $${price.toFixed(0)} installed`
      : name;
  }

  function renderLiveRepairSummary() {
    document
      .querySelectorAll(".wizard-live-summary")
      .forEach((summary) => summary.remove());
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

    const renderSequence = ++catalogRenderSequence;

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

    let provider;

    try {
      if (!catalogProvider) {
        renderCatalogLoading(stepsArea);
      }

      provider = await getCatalogProvider();

      if (renderSequence !== catalogRenderSequence) return;
      stepsArea.innerHTML = "";
    } catch {
      if (renderSequence !== catalogRenderSequence) return;

      renderCatalogError(stepsArea, () => {
        resetCatalogProvider();
        renderWizard(true);
      });
      return;
    }

    async function catalogOptions(loader) {
      try {
        const options = await loader();
        if (renderSequence !== catalogRenderSequence) return null;
        return Array.isArray(options) ? options : [];
      } catch {
        if (renderSequence === catalogRenderSequence) {
          renderCatalogError(stepsArea, () => {
            resetCatalogProvider();
            renderWizard(true);
          });
        }
        return null;
      }
    }

    if (!state.device) {
      const devices = await catalogOptions(() => provider.getDevices());
      if (!devices) return;
      if (!devices.length) {
        renderCatalogEmptyState(stepsArea);
        return;
      }

      renderDeviceStep(stepsArea, devices, (device) => {
        resetStep("device");
        state.device = device.label;
        state.catalogSelection.deviceId = device.id;
        renderWizard(true);
      });

      if (shouldScroll) {
        scrollWizardStepIntoView();
      }

      return;
    }

    if (!state.brand) {
      const brands = await catalogOptions(() => {
        return provider.getBrands(state.catalogSelection.deviceId);
      });
      if (!brands) return;
      if (!brands.length) {
        renderCatalogEmptyState(stepsArea, "No brands are available for this device yet.");
        return;
      }

      renderBrandStep(stepsArea, brands, async (brand) => {
        resetStep("brand");
        state.brand = brand.label;
        state.catalogSelection.brandId = brand.id;
        renderWizard(true);
      });

      renderLiveRepairSummary();

      if (shouldScroll) {
        scrollWizardStepIntoView();
      }

      return;
    }

    if (!state.series) {
      const seriesList = await catalogOptions(() => {
        return provider.getSeries(
          state.catalogSelection.deviceId,
          state.catalogSelection.brandId
        );
      });
      if (!seriesList) return;
      if (!seriesList.length) {
        renderCatalogEmptyState(stepsArea, "No series are available for this brand yet.");
        return;
      }

      renderSeriesStep(stepsArea, seriesList, (series) => {
        resetStep("series");
        state.series = series.label;
        state.catalogSelection.seriesId = series.id;
        renderWizard(true);
      });

      renderLiveRepairSummary();

      if (shouldScroll) {
        scrollWizardStepIntoView();
      }

      return;
    }
    if (!state.model) {
      const models = await catalogOptions(() => {
        return provider.getModels(
          state.catalogSelection.deviceId,
          state.catalogSelection.brandId,
          state.catalogSelection.seriesId
        );
      });
      if (!models) return;
      if (!models.length) {
        renderCatalogEmptyState(stepsArea, "No models are available for this series yet.");
        return;
      }

      renderModelStep(stepsArea, models, (model) => {
        resetStep("model");
        state.model = model;
        state.catalogSelection.modelId = model.id;
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

      if (!repairs.length) {
        renderCatalogEmptyState(stepsArea, "No repair options are available for this model yet.");
        return;
      }

      renderRepairStep(
        stepsArea,
        repairs,
        state.repairs,
        (repair) => {
          const exists = state.repairs.some((item) => {
            return item.id === repair.id;
          });
          const shouldRevealContinue =
            !exists && state.repairs.length === 0;

          if (exists) {
            state.repairs = state.repairs.filter((item) => {
              return item.id !== repair.id;
            });
          } else {
            state.repairs = [...state.repairs, repair];
          }

          state.catalogSelection.repairIds = state.repairs.map((item) => item.id);

          state.repairDetailsViewed = false;
          state.repairInfoViewed = false;
          state.protectionViewed = false;
          state.addOns = [];
          state.appointmentSelected = false;
          state.reviewViewed = false;

          renderWizard(shouldRevealContinue);
        },
        () => {
          state.repair = state.repairs[0] || null;
          state.catalogSelection.repairIds = state.repairs.map((item) => item.id);
          state.repairDetailsViewed = false;
          state.repairInfoViewed = false;
          state.protectionViewed = false;
          state.addOns = [];
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
          state.protectionViewed = false;
          state.addOns = [];
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
        state.repairs.length ? state.repairs : [state.repair].filter(Boolean),
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

    if (
      !state.protectionViewed &&
      isScreenProtectionEligible()
    ) {
      renderProtectionUpsellStep(
        stepsArea,
        getSelectedScreenProtector(),
        Array.isArray(state.addOns) ? state.addOns : [],
        (selectedAddOns) => {
          state.addOns = selectedAddOns;
          state.protectionViewed = true;

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
      state.catalogSelection.repairIds = [];
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
          const reviewSubmitButton =
            stepsArea?.querySelector(".review-submit");

          const submissionStatus =
            stepsArea?.querySelector(".review-submission-status");

          function clearSubmissionStatus() {
            if (!submissionStatus) return;

            submissionStatus.hidden = true;
            submissionStatus.className = "review-submission-status";
            submissionStatus.removeAttribute("role");
            submissionStatus.setAttribute("role", "status");
            submissionStatus.textContent = "";
          }

          function showSubmissionStatus(type, title, message) {
            if (!submissionStatus) return;

            submissionStatus.hidden = false;
            submissionStatus.className =
              `review-submission-status is-${type}`;

            submissionStatus.setAttribute(
              "role",
              type === "error" ? "alert" : "status"
            );

            submissionStatus.innerHTML = `
              <strong>${title}</strong>
              <span>${message}</span>
            `;

            submissionStatus.scrollIntoView({
              behavior: "smooth",
              block: "nearest"
            });
          }

          function resetReviewSubmitButton() {
            if (!reviewSubmitButton) return;

            reviewSubmitButton.disabled = false;
            reviewSubmitButton.textContent = "Submit Repair Request";
          }

          clearSubmissionStatus();

          if (repairSubmitLocked) {
            resetReviewSubmitButton();

            showSubmissionStatus(
              "warning",
              "Submission already in progress",
              "Please wait while your repair request is being submitted."
            );

            return;
          }

          const lastSubmit = Number(
            localStorage.getItem(repairCooldownKey) || 0
          );

          const now = Date.now();
          const cooldownRemaining = Math.max(
            0,
            repairCooldownMs - (now - lastSubmit)
          );

          if (lastSubmit && cooldownRemaining > 0) {
            console.warn("Repair request blocked by local cooldown.");

            resetReviewSubmitButton();

            showSubmissionStatus(
              "warning",
              "Request already submitted",
              "A repair request was recently submitted from this device. Please wait about one minute before trying again."
            );

            return;
          }

          repairSubmitLocked = true;

          if (reviewSubmitButton) {
            reviewSubmitButton.disabled = true;
            reviewSubmitButton.textContent = "Submitting...";
          }

          let mappedLead;
          let submitResult;

          try {
            applyAfterHoursBookingDetails(leadPayload);
            mappedLead = mapWizardPayloadToLead(leadPayload);
            submitResult = await submitWizardLead(mappedLead);

            if (!submitResult?.success) {
              throw new Error(
                submitResult?.error ||
                  "Wizard lead submit returned unsuccessful."
              );
            }

            localStorage.setItem(repairCooldownKey, String(now));
          } catch (err) {
            console.error("Wizard lead submit failed:", err);

            repairSubmitLocked = false;
            resetReviewSubmitButton();

            showSubmissionStatus(
              "error",
              "Request not submitted",
              "Your request could not be submitted. Please check your connection and try again. You may also contact us directly if the problem continues."
            );

            return;
          }

          customerForm.reset();

          if (filePreviews) {
            filePreviews.innerHTML = "";
          }

          repairSubmitLocked = false;
          resetReviewSubmitButton();

          renderSuccessStep(stepsArea, leadPayload, () => {
            resetAllState();
            state.protectionViewed = false;
            state.addOns = [];
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
  repairPolicyToggle.setAttribute("aria-expanded", "false");
  repairPolicyToggle.setAttribute(
    "aria-controls",
    repairPolicyBox.id
  );

  repairPolicyToggle.addEventListener("click", () => {
    const isHidden = repairPolicyBox.hidden;

    repairPolicyBox.hidden = !isHidden;
    repairPolicyToggle.setAttribute(
      "aria-expanded",
      `${isHidden}`
    );
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
// ===============================
// CALL CUTOFF AFTER 7 PM EASTERN
// ===============================

const CALL_OPEN_HOUR_ET = 7;
const CALL_CUTOFF_HOUR_ET = 19;

function getEasternTimeParts() {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());

  return {
    hour: Number(parts.find((part) => part.type === "hour")?.value || 0),
    minute: Number(parts.find((part) => part.type === "minute")?.value || 0),
  };
}

function isAfterCallCutoff() {
  const { hour } = getEasternTimeParts();
  return hour < CALL_OPEN_HOUR_ET || hour >= CALL_CUTOFF_HOUR_ET;
}

function updateCallAvailability() {
  const afterCutoff = isAfterCallCutoff();
  const callLinks = document.querySelectorAll('a[href^="tel:"], a[data-call-href^="tel:"]');

  callLinks.forEach((link) => {
    if (!link.dataset.callHref && link.getAttribute("href")?.startsWith("tel:")) {
      link.dataset.callHref = link.getAttribute("href");
    }

    if (afterCutoff) {
      link.classList.add("is-call-disabled-after-hours");
      link.setAttribute("aria-disabled", "true");
      link.setAttribute("tabindex", "-1");
      link.setAttribute("title", "Calling is available from 7:00 AM to 7:00 PM Eastern. Please text or submit a repair request.");

      if (link.dataset.callHref) {
        link.removeAttribute("href");
      }

      return;
    }

    link.classList.remove("is-call-disabled-after-hours");
    link.removeAttribute("aria-disabled");
    link.removeAttribute("tabindex");
    link.removeAttribute("title");

    if (link.dataset.callHref) {
      link.setAttribute("href", link.dataset.callHref);
    }
  });
}

document.addEventListener(
  "click",
  (event) => {
    const callLink = event.target.closest('a[href^="tel:"], a[data-call-href^="tel:"]');

    if (!callLink || !isAfterCallCutoff()) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (typeof window.notify === "function") {
      window.notify("Calling is available from 7:00 AM to 7:00 PM Eastern. Please text or submit a repair request.");
    } else {
      alert("Calling is available from 7:00 AM to 7:00 PM Eastern. Please text or submit a repair request.");
    }
  },
  true
);

document.addEventListener("DOMContentLoaded", updateCallAvailability);
window.addEventListener("load", updateCallAvailability);
setInterval(updateCallAvailability, 60000);

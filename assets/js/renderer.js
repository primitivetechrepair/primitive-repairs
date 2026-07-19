import { state, resetStep } from "./state.js";
import {
  renderCardGrid,
  getDeviceImage,
  getBrandImage,
  getRepairImage,
  getResolvedRepairImage
} from "./cardRenderer.js";

function formatDisplayDate(dateValue) {
  if (!dateValue) return "Not selected";

  const [year, month, day] = String(dateValue).split("-");

  if (!year || !month || !day) {
    return dateValue;
  }

  return `${month}/${day}/${year}`;
}

const serviceLabels = {
  "meet-up": "Meet-Up",
  pickup: "Pickup Service",
  onsite: "Onsite Service",
  "mail-in": "Mail-In Repair"
};

function getSelectedRepairLabel() {
  const selectedRepairs = Array.isArray(state.repairs) && state.repairs.length
    ? state.repairs
    : state.repair
      ? [state.repair]
      : [];

  if (!selectedRepairs.length) {
    return "Not selected";
  }

  return selectedRepairs
    .map((repair) => {
      return repair?.repair || repair?.name || repair?.label || repair;
    })
    .filter(Boolean)
    .join(" + ");
}

function normalizeSeriesImageName(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  const seriesImageOverrides = {
    "original & early": "iphone",
    "iphone 3 series": "iphone3g"
  };

  if (seriesImageOverrides[normalized]) {
    return seriesImageOverrides[normalized];
  }

  return normalized
    .replace(/\s+series$/i, "")
    .replace(/\s+/g, "")
    .replace(/[()&]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getSeriesCardImage(brand, series) {
  const selectedBrand = String(brand || "").trim();
  const seriesImageName = normalizeSeriesImageName(series);

  if (selectedBrand === "Apple") {
    if (series === "iPhone SE Series") {
      return "/images/models/apple/iphonese3.webp";
    }

    const appleSeriesImageMap = {
      "Original & Early": "iphone2g",
      "iPhone 3 Series": "iphone3gs",
      "iPhone 4 Series": "iphone4s",
      "iPhone 5 Series": "iphone5s",
      "iPhone 6 Series": "iphone6splus",
      "iPhone 7 Series": "iphone7plus",
      "iPhone 8 Series": "iphone8plus",
      "iPhone X Series": "iphonexsmax",
      "iPhone 11 Series": "iphone11promax",
      "iPhone 12 Series": "iphone12promax",
      "iPhone 13 Series": "iphone13promax",
      "iPhone 14 Series": "iphone14promax",
      "iPhone 15 Series": "iphone15promax",
      "iPhone 16 Series": "iphone16promax",
      "iPhone 17 Series": "iphone17promax"
    };

    const appleImageName = appleSeriesImageMap[series] || seriesImageName;

    return `/images/series/apple/${appleImageName}.webp`;
  }

  if (selectedBrand === "Motorola" && series === "Moto G Series") {
    return "/images/models/motorola/motogmax5g.webp";
  }

  const brandFolder = selectedBrand
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9-]/g, "");

  return `/images/series/${brandFolder}/${seriesImageName}.png`;
}

export function renderDeviceStep(container, devices, onSelect) {
  if (!container) return;

  container.innerHTML = `
    <div id="device-card-results" class="device-card-results"></div>
  `;

  const results = container.querySelector("#device-card-results");

  const cards = devices.map((device) => ({
    label: device,
    image: getDeviceImage(device),
    onClick: () => onSelect(device)
  }));

  renderCardGrid(results, cards);
}

export function renderBrandStep(container, brands, onSelect) {
  if (!container) return;

  const selectedDevice = state.device || "Device";

  container.innerHTML = `
    <div class="option-section-header">
      <span>Select Brand</span>
      <h3>Choose your ${selectedDevice} brand.</h3>
      <p>Select the brand so we can match your device with the right repair catalog.</p>
    </div>

    <div id="brand-card-results" class="brand-card-results"></div>
  `;

  const results = container.querySelector("#brand-card-results");

  const cards = brands.map((brand) => ({
    label: brand,
    image: getBrandImage(state.device, brand),
    badge: selectedDevice,
    onClick: () => onSelect(brand)
  }));

  renderCardGrid(results, cards);
}

export function renderSeriesStep(container, seriesList, onSelect) {
  if (!container) return;

  const selectedBrand = state.brand || "brand";

  container.innerHTML = `
    <div class="option-section-header">
      <span>Select Series</span>
      <h3>Choose your ${selectedBrand} series.</h3>
      <p>Select the device series so we can narrow down the exact model.</p>
    </div>

    <div id="series-card-results" class="series-card-results"></div>
  `;

  const results = container.querySelector("#series-card-results");

  const cards = seriesList.map((series) => ({
    label: series,
    image: getSeriesCardImage(selectedBrand, series),
    badge: "Series",
    onClick: () => onSelect(series)
  }));

  renderCardGrid(results, cards);
}

export function renderModelStep(container, models, onSelect) {
  if (!container) return;

  const selectedBrand = state.brand || "brand";

  container.innerHTML = `
    <div class="option-section-header model-option-header">
      <span>Select Model</span>
      <h3>Choose your ${selectedBrand} model.</h3>
      <p>Search or select the exact model so we can match the right repair options.</p>
    </div>

    <div class="model-search-panel">
      <label for="model-search-input">Search Model</label>

      <div class="model-search-row">
        <input
          id="model-search-input"
          class="model-search-input"
          type="search"
          placeholder="Search by model name..."
          autocomplete="off"
        >

        <button type="button" id="model-search-clear" class="model-search-clear">
          Clear
        </button>
      </div>

      <div id="model-search-count" class="model-search-count"></div>
    </div>

    <div id="model-card-results" class="model-card-results"></div>
  `;

  const input = container.querySelector("#model-search-input");
  const clearBtn = container.querySelector("#model-search-clear");
  const results = container.querySelector("#model-card-results");
  const count = container.querySelector("#model-search-count");

  function renderFilteredModels(searchTerm = "") {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const getRegularIpadNumber = (modelName) => {
  const name = String(modelName || "").toLowerCase();

  if (name.includes("a16")) return 11;

  const simpleMatch = name.match(/^ipad\s+(\d+)/);

  if (simpleMatch) {
    return Number(simpleMatch[1]);
  }

  if (name.includes("1st generation")) return 1;
  if (name.includes("2nd generation")) return 2;
  if (name.includes("3rd generation")) return 3;
  if (name.includes("4th generation")) return 4;
  if (name.includes("5th generation")) return 5;
  if (name.includes("6th generation")) return 6;
  if (name.includes("7th generation")) return 7;
  if (name.includes("8th generation")) return 8;
  if (name.includes("9th generation")) return 9;
  if (name.includes("10th generation")) return 10;

  return 999;
};

const getModelDisplayLabel = (model) => {
  if (String(model.series || "") !== "iPad Series") {
    return model.model;
  }

  const ipadNumber = getRegularIpadNumber(model.model);

  return ipadNumber !== 999 ? `iPad ${ipadNumber}` : model.model;
};

const filteredModels = models
  .filter((model) => {
    const modelName = String(model.model || "").toLowerCase();
    const displayName = String(getModelDisplayLabel(model) || "").toLowerCase();

    return modelName.includes(normalizedSearch) || displayName.includes(normalizedSearch);
  })
  .sort((a, b) => {
    const bothRegularIpads =
      String(a.series || "") === "iPad Series" &&
      String(b.series || "") === "iPad Series";

    if (!bothRegularIpads) return 0;

    return getRegularIpadNumber(a.model) - getRegularIpadNumber(b.model);
  });

    if (count) {
      count.textContent = filteredModels.length
        ? `${filteredModels.length} model${filteredModels.length === 1 ? "" : "s"} found`
        : "No models found";
    }

    if (clearBtn) {
      clearBtn.disabled = !normalizedSearch;
    }

    if (!results) return;

    if (!filteredModels.length) {
      results.innerHTML = `
        <div class="model-empty-state">
          No models match your search. Try a different model name.
        </div>
      `;
      return;
    }

    const cards = filteredModels.map((model) => ({
  label: getModelDisplayLabel(model),
  image: model.image,
  badge: model.series,
  onClick: () => onSelect({
    ...model,
    model: getModelDisplayLabel(model)
  })
}));

    renderCardGrid(results, cards);
  }

  renderFilteredModels();

  if (input) {
    input.addEventListener("input", () => {
      renderFilteredModels(input.value);
    });
  }

  if (clearBtn && input) {
    clearBtn.addEventListener("click", () => {
      input.value = "";
      input.focus();
      renderFilteredModels();
    });
  }
}

export function renderRepairStep(
  container,
  repairs,
  selectedRepairs = [],
  onChange,
  onContinue
) {
  if (!container) return;

  const selectedNames = selectedRepairs.map((repair) => repair.repair);

  container.innerHTML = `
    <div class="repair-select-panel">
      <div class="option-section-header repair-option-header">
        <span>Select Repairs</span>
        <h3>What needs to be fixed?</h3>
        <p>Choose one or more repairs needed for your device.</p>
      </div>

      <div class="repair-selected-summary">
        ${
          selectedRepairs.length
            ? selectedRepairs.map((repair) => `<span>${repair.repair}</span>`).join("")
            : `<span class="repair-none-selected">No repairs selected yet</span>`
        }
      </div>

      <div id="repair-card-results" class="repair-card-results"></div>

      <button
        type="button"
        class="repair-select-continue"
        ${selectedRepairs.length ? "" : "disabled"}
      >
        Continue
      </button>
    </div>
  `;

  const results = container.querySelector("#repair-card-results");
  const continueBtn = container.querySelector(".repair-select-continue");

  if (results) {
    const cards = repairs.map((repair) => {
      const isSelected = selectedNames.includes(repair.repair);

      return {
        label: repair.repair,
        image: getResolvedRepairImage(repair),
        subtext: repair.time || "",
        badge: isSelected ? "Selected" : repair.warranty || "",
        className: isSelected ? "is-selected" : "",
        onClick: () => {
          if (typeof onChange === "function") {
            onChange(repair);
          }
        }
      };
    });

    renderCardGrid(results, cards);
  }

  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      if (!selectedRepairs.length) return;

      if (typeof onContinue === "function") {
        onContinue();
      }
    });
  }
}

function escapeSummaryHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getSelectedRepairsForSummary() {
  if (Array.isArray(state.repairs) && state.repairs.length) {
    return state.repairs;
  }

  return state.repair ? [state.repair] : [];
}

function getRepairCountLabel() {
  const count = getSelectedRepairsForSummary().length;

  if (!count) return "Not selected";

  return count === 1
    ? "1 Repair Selected"
    : `${count} Repairs Selected`;
}

function getRepairTimeLabel() {
  const times = [
    ...new Set(
      getSelectedRepairsForSummary()
        .map((repair) => {
          return repair?.time || repair?.estimatedTime || repair?.duration || "";
        })
        .filter(Boolean)
    )
  ];

  return times.length ? times.join(" + ") : "Contact for estimate";
}

function getRepairWarrantyLabel() {
  const warranties = [
    ...new Set(
      getSelectedRepairsForSummary()
        .map((repair) => {
          return repair?.warranty || repair?.warrantyLabel || "";
        })
        .filter(Boolean)
    )
  ];

  if (warranties.length) {
    return warranties.join(", ");
  }

  return getSelectedRepairsForSummary().length
    ? "1-Year Warranty"
    : "Not selected";
}

export function renderSummary(container) {
  if (!container) return;

  const device = state.device || "Not selected";
  const brand = state.brand || "Not selected";
  const series = state.series || "Not selected";
  const model = state.model?.model || state.model || "Not selected";
  const repair = getSelectedRepairLabel();
  const repairCount = getRepairCountLabel();
  const estimatedTime = getRepairTimeLabel();
  const warranty = getRepairWarrantyLabel();
  const serviceType = serviceLabels[state.appointment?.serviceType] || "Not selected";
  const preferredDate = formatDisplayDate(state.appointment?.date);
  const preferredTime = state.appointment?.time || "Not selected";

  container.innerHTML = `
    <section class="customer-repair-summary">
      <div class="customer-repair-summary-header">
        <span>Repair Summary</span>
        <h3>Your request so far.</h3>
        <p class="repair-details-instruction-centered">Confirm the repair details below, then add your contact information.</p>
      </div>

      <div class="customer-repair-summary-grid">
        <div class="customer-repair-summary-item">
          <span>Device</span>
          <strong>${escapeSummaryHtml(device)}</strong>
        </div>

        <div class="customer-repair-summary-item">
          <span>Brand</span>
          <strong>${escapeSummaryHtml(brand)}</strong>
        </div>

        <div class="customer-repair-summary-item">
          <span>Series</span>
          <strong>${escapeSummaryHtml(series)}</strong>
        </div>

        <div class="customer-repair-summary-item">
          <span>Model</span>
          <strong>${escapeSummaryHtml(model)}</strong>
        </div>

        <div class="customer-repair-summary-item customer-repair-summary-wide">
          <span>Selected Repair</span>
          <strong>${escapeSummaryHtml(repair)}</strong>
        </div>

        <div class="customer-repair-summary-item">
          <span>Repair Count</span>
          <strong>${escapeSummaryHtml(repairCount)}</strong>
        </div>

        <div class="customer-repair-summary-item">
          <span>Estimated Time</span>
          <strong>${escapeSummaryHtml(estimatedTime)}</strong>
        </div>

        <div class="customer-repair-summary-item">
          <span>Warranty</span>
          <strong>${escapeSummaryHtml(warranty)}</strong>
        </div>

        <div class="customer-repair-summary-item">
          <span>Service Type</span>
          <strong>${escapeSummaryHtml(serviceType)}</strong>
        </div>

        <div class="customer-repair-summary-item">
          <span>Preferred Date</span>
          <strong>${escapeSummaryHtml(preferredDate)}</strong>
        </div>

        <div class="customer-repair-summary-item">
          <span>Preferred Time</span>
          <strong>${escapeSummaryHtml(preferredTime)}</strong>
        </div>
      </div>
    </section>
  `;
}

export function renderRepairDetailsStep(container, selectedRepairs = [], repairDetails = {}, onContinue) {
  if (!container) return;

  container.innerHTML = `
    <section class="repair-details-panel">
      <div class="option-section-header repair-details-option-header">
        <span>Repair Details</span>
        <h3>Add issue details.</h3>
        <p>Add anything that helps us understand the problem before your appointment.</p>
      </div>

      <div class="repair-details-list">
        ${
          selectedRepairs.length
            ? selectedRepairs.map((repair, index) => {
                const repairName = repair.repair || `Repair ${index + 1}`;
                const savedValue = repairDetails[repairName] || "";

                return `
                  <div class="repair-detail-card">
                    <label for="repair-detail-${index}">${repairName}</label>
                    <textarea
                      id="repair-detail-${index}"
                      class="repair-detail-input"
                      data-repair-name="${repairName}"
                      placeholder="Example: screen is cracked but touch still works..."
                    >${savedValue}</textarea>
                  </div>
                `;
              }).join("")
            : `<p class="repair-details-empty">No repairs selected.</p>`
        }
      </div>

      <div class="repair-details-actions">
        <button type="button" class="repair-details-continue">
          Continue to Repair Info
        </button>
      </div>
    </section>
  `;

  const continueBtn = container.querySelector(".repair-details-continue");

  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      const details = {};

      container.querySelectorAll(".repair-detail-input").forEach((input) => {
        const repairName = input.dataset.repairName;

        if (repairName) {
          details[repairName] = input.value.trim();
        }
      });

      if (typeof onContinue === "function") {
        onContinue(details);
      }
    });
  }
}

export function renderRepairInfoStep(container, repairData, onContinue) {
  if (!container || !repairData) return;

  const repairList = Array.isArray(repairData)
    ? repairData
    : [repairData];

  const primaryRepair = repairList[0];

  const allSymptoms = repairList.flatMap((repair) => {
    return Array.isArray(repair.symptoms) ? repair.symptoms : [];
  });

  container.innerHTML = `
    <section class="repair-info-panel ${repairList.length === 1 ? "is-single-repair" : "is-multiple-repairs"}">
      <div class="option-section-header repair-info-option-header">
        <span>Repair Info</span>
        <h3>
          ${
            repairList.length > 1
              ? `${repairList.length} selected repairs.`
              : primaryRepair.repair
          }
        </h3>
        <p>Review symptoms, repair timing, and warranty details before scheduling.</p>
      </div>

      <div class="repair-info-hero">
        <div
          class="repair-info-image"
          style="--repair-info-image: url('${getResolvedRepairImage(primaryRepair)}')"
        ></div>

        <div class="repair-info-content">

          <div class="repair-info-meta">
  ${repairList.map((repair) => {
    const repairName = repair.repair || "Repair";
    const details = state.repairDetails?.[repairName] || "";

    return `
      <div>
        <strong>${repairName}</strong>
        <span>${repair.time || "Contact for estimate"} · ${repair.warranty || "Warranty details after inspection"}</span>
        ${
          details
            ? `<em class="repair-info-detail">Details: ${details}</em>`
            : `<em class="repair-info-detail is-empty">No extra details provided</em>`
        }
      </div>
    `;
  }).join("")}
</div>
        </div>
      </div>

      <div class="repair-info-section">
        <h4>Common Symptoms</h4>

        ${
          allSymptoms.length
            ? `<ul>${allSymptoms.map((item) => `<li>${item}</li>`).join("")}</ul>`
            : `<p>Symptoms will vary depending on the device condition. We will confirm the issue after inspection.</p>`
        }
      </div>

      <div class="repair-info-actions">
        <button type="button" class="repair-info-continue">
          Continue to Appointment
        </button>
      </div>
    </section>
  `;

  const continueBtn = container.querySelector(".repair-info-continue");

  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      if (typeof onContinue === "function") {
        onContinue();
      }
    });
  }
}

export function renderSelectionCards(onChange) {
  const steps = [
    {
      key: "device",
      label: "Device",
      value: state.device
    },
    {
      key: "brand",
      label: "Brand",
      value: state.brand
    },
    {
      key: "series",
      label: "Series",
      value: state.series
    },
    {
      key: "model",
      label: "Model",
      value: state.model?.model || state.model
    },
    {
      key: "repair",
      label: "Repair",
      value: getSelectedRepairLabel() === "Not selected"
        ? null
        : getSelectedRepairLabel()
    }
  ];

  const currentStepIndex = (() => {
    const firstIncompleteIndex = steps.findIndex((step) => !step.value);
    return firstIncompleteIndex === -1 ? steps.length - 1 : firstIncompleteIndex;
  })();

  const completeStepCount = steps.filter((step) => Boolean(step.value)).length;
  const progressPercent = Math.round((completeStepCount / steps.length) * 100);
  const progressBar = document.getElementById("pr-progress-bar");
  const selectionCards = document.getElementById("pr-selection-cards");

  if (selectionCards) {
    selectionCards.dataset.completedSteps = `${completeStepCount}`;
    selectionCards.dataset.totalSteps = `${steps.length}`;
  }

  if (progressBar) {
    progressBar.style.width = `${progressPercent}%`;
    progressBar.setAttribute("aria-valuenow", `${progressPercent}`);
    progressBar.classList.toggle("full", completeStepCount === steps.length);
  }
steps.forEach((step) => {
    const card = document.getElementById(`card-${step.key}`);

    if (!card) return;


    const stepIndex = steps.findIndex((item) => item.key === step.key);
    const isComplete = Boolean(step.value);
    const isCurrent = !isComplete && stepIndex === currentStepIndex;

    card.classList.remove("is-current-step", "is-complete-step", "is-upcoming-step");
    card.dataset.stepNumber = `${stepIndex + 1}`;
    card.dataset.mobileStepLabel = `Step ${stepIndex + 1}`;
    card.dataset.stepStatus = isComplete ? "complete" : isCurrent ? "current" : "upcoming";

    card.setAttribute(
      "aria-label",
      isComplete
        ? `${step.label} complete: ${step.value}`
        : isCurrent
          ? `${step.label} current step`
          : `${step.label} upcoming step`
    );

    if (isComplete) {
      card.classList.add("is-complete-step");
    } else if (isCurrent) {
      card.classList.add("is-current-step");
    } else {
      card.classList.add("is-upcoming-step");
    }
const label = card.querySelector(".card-label");
    const button = card.querySelector(".card-back");
    const image = card.querySelector(".card-img");

    if (!label || !button || !image) return;

    if (step.value) {
      label.textContent = step.value;
      button.textContent = "EDIT";
      button.disabled = false;
      button.style.display = "flex";
      card.classList.add("filled");
      card.classList.remove("is-missing-choice");

      if (step.key === "device") {
        image.style.backgroundImage = `url('${getDeviceImage(state.device)}')`;
      }

      if (step.key === "brand") {
        image.style.backgroundImage = `url('${getBrandImage(state.device, state.brand)}')`;
      }

      if (step.key === "series") {
  image.style.backgroundImage = `url('${getSeriesCardImage(state.brand, state.series)}')`;
}

      if (step.key === "model") {
        image.style.backgroundImage = `url('${state.model?.image || "/images/models/default.webp"}')`;
      }

      if (step.key === "repair") {
  const selectedRepairs = Array.isArray(state.repairs) && state.repairs.length
    ? state.repairs
    : state.repair
      ? [state.repair]
      : [];

  const primaryRepair = selectedRepairs[0];

  image.style.backgroundImage = primaryRepair
    ? `url('${getResolvedRepairImage(primaryRepair)}')`
    : "none";

  image.classList.toggle(
    "selected-card-image-multiple",
    selectedRepairs.length > 1
  );
}

      button.onclick = (event) => {
        event.stopPropagation();

        if (step.key === "repair") {
          state.repair = null;
          state.repairs = [];
          state.repairDetails = {};
          state.repairDetailsViewed = false;
          state.repairInfoViewed = false;
          state.appointmentSelected = false;
          state.reviewViewed = false;
        } else {
          state[step.key] = null;
          resetStep(step.key);
        }

        if (typeof onChange === "function") {
          onChange(step.key);
        }
      };
    } else {
      label.textContent = "Waiting for choice";
      button.textContent = "";
      button.disabled = true;
      button.style.display = "flex";
      card.classList.add("is-missing-choice");
      image.style.backgroundImage = "none";
      card.classList.remove("filled");
      button.onclick = null;
    }
  });
}

export function renderSuccessStep(container, leadPayload, onStartNew) {
  if (!container) return;

  function escapeSuccessHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function successValue(value, fallback = "Not provided") {
    const cleanValue = String(value || "").trim();

    return cleanValue || fallback;
  }

  function renderSuccessItem(label, value, fallback = "Not provided") {
    return `
      <div>
        <strong>${escapeSuccessHtml(label)}</strong>
        <span>${escapeSuccessHtml(successValue(value, fallback))}</span>
      </div>
    `;
  }

  function getSelectedRepairsFromPayload() {
    if (Array.isArray(leadPayload?.repairs) && leadPayload.repairs.length) {
      return leadPayload.repairs;
    }

    if (leadPayload?.repair) {
      return [leadPayload.repair];
    }

    return [];
  }

  const customer = leadPayload?.customer || {};
  const device = leadPayload?.device || {};
  const appointment = leadPayload?.appointment || {};

  const customerName = successValue(customer.name, "Customer");
  const requestId = successValue(leadPayload?.requestId, "Pending");
  const status = successValue(leadPayload?.status, "New");

  const serviceType =
    serviceLabels[appointment.serviceType] ||
    appointment.serviceType ||
    "Not selected";

  const preferredDate = formatDisplayDate(appointment.date);
  const preferredTime = appointment.time || "Not selected";

  const selectedRepairs = getSelectedRepairsFromPayload();

  const repairList = selectedRepairs.length
    ? selectedRepairs
        .map((repair, index) => {
          const repairName =
            repair.name ||
            repair.repair ||
            repair.label ||
            `Repair ${index + 1}`;

          const repairDetails =
            repair.details ||
            repair.notes ||
            "";

          return repairDetails
            ? `${repairName} - ${repairDetails}`
            : repairName;
        })
        .join(", ")
    : "Repair request";

  const attachments = Array.isArray(leadPayload?.attachments)
    ? leadPayload.attachments
    : [];

  const contactLine = [
    customer.phone,
    customer.email
  ].filter(Boolean).join(" / ");

  container.innerHTML = `
    <section class="success-panel">
      <div class="success-hero">
        <div class="success-icon">&#10003;</div>

        <div class="option-section-header success-option-header">
          <span>Request Submitted</span>
          <h3>Thank you, ${escapeSuccessHtml(customerName)}.</h3>
          <p class="success-message">
            Your repair request has been received. We will review the details and contact you to confirm availability, timing, and next steps.
          </p>
        </div>
      </div>

      <div class="success-summary success-summary-request-layout">
        ${renderSuccessItem("Request ID", requestId, "Pending")}
        ${renderSuccessItem("Status", status, "New")}
        ${renderSuccessItem("Next Step", "We will contact you to confirm the repair details.")}
        ${renderSuccessItem("Device", device.type, "Not selected")}
        ${renderSuccessItem("Brand", device.brand, "Not selected")}
        ${renderSuccessItem("Series", device.series, "Not selected")}
        ${renderSuccessItem("Model", device.model, "Not selected")}
        ${renderSuccessItem("Selected Repairs", repairList, "Repair request")}
        ${renderSuccessItem("Repair Count", selectedRepairs.length ? `${selectedRepairs.length}` : "0")}
        ${renderSuccessItem("Service Type", serviceType, "Not selected")}
        ${renderSuccessItem("Preferred Date", preferredDate, "Not selected")}
        ${renderSuccessItem("Preferred Time", preferredTime, "Not selected")}
        ${renderSuccessItem("Customer", customerName, "Customer")}
        ${renderSuccessItem("Contact", contactLine, "Not provided")}
        ${renderSuccessItem("Location", customer.serviceLocation, "Not provided")}
        ${renderSuccessItem("Attachments", `${attachments.length}`)}
      </div>

      <button type="button" class="success-start-new">
        Start New Request
      </button>
    </section>
  `;

  const startBtn = container.querySelector(".success-start-new");

  if (startBtn) {
    startBtn.addEventListener("click", () => {
      if (typeof onStartNew === "function") {
        onStartNew();
      }
    });
  }
}

export function renderReviewStep(container, leadPayload, { onBack, onSubmit }) {
  if (!container || !leadPayload) return;

  function escapeReviewHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function reviewValue(value, fallback = "Not provided") {
    const cleanValue = String(value || "").trim();

    return cleanValue || fallback;
  }

  function renderReviewRow(label, value, fallback = "Not provided") {
    return `
      <p>
        <strong>${escapeReviewHtml(label)}</strong>
        <span>${escapeReviewHtml(reviewValue(value, fallback))}</span>
      </p>
    `;
  }

  function getSelectedRepairsFromPayload() {
    if (Array.isArray(leadPayload.repairs) && leadPayload.repairs.length) {
      return leadPayload.repairs;
    }

    if (leadPayload.repair) {
      return [leadPayload.repair];
    }

    return [];
  }

  const requestId = reviewValue(leadPayload.requestId, "Pending");
  const status = reviewValue(leadPayload.status, "New");
  const source = reviewValue(leadPayload.source, "Repair Wizard");

  const customer = leadPayload.customer || {};
  const device = leadPayload.device || {};
  const appointment = leadPayload.appointment || {};

  const selectedRepairs = getSelectedRepairsFromPayload();

  const attachments = Array.isArray(leadPayload.attachments)
    ? leadPayload.attachments
    : [];

  const attachmentCount = attachments.length;

  const repairsMarkup = selectedRepairs.length
    ? selectedRepairs
        .map((repair, index) => {
          const repairName = reviewValue(
            repair.name || repair.repair || repair.label,
            `Repair ${index + 1}`
          );

          const repairDetails = reviewValue(
            repair.details || repair.notes,
            "No extra details provided"
          );

          const estimatedTime = reviewValue(
            repair.time || repair.estimatedTime || repair.duration,
            "Contact for estimate"
          );

          const warranty = reviewValue(
            repair.warranty || repair.warrantyLabel,
            "Warranty details after inspection"
          );

          return `
            <div class="review-repair-item">
              ${renderReviewRow("Repair", repairName, "Not selected")}
              ${renderReviewRow("Estimated Time", estimatedTime, "Contact for estimate")}
              ${renderReviewRow("Warranty", warranty, "Warranty details after inspection")}
              ${renderReviewRow("Issue Details", repairDetails, "No extra details provided")}
            </div>
          `;
        })
        .join("")
    : `
        <div class="review-repair-item">
          ${renderReviewRow("Repair", "Not selected")}
        </div>
      `;

  const attachmentsMarkup = attachments.length
    ? `
        <div class="review-attachments-list">
          ${attachments
            .map((file) => {
              const fileName = reviewValue(file.name, "Attachment");
              const fileSize = file.size
                ? `${Math.round(file.size / 1024)} KB`
                : "";

              return `
                <div class="review-attachment-item">
                  <span class="review-attachment-icon">File</span>
                  <span class="review-attachment-name">${escapeReviewHtml(fileName)}</span>
                  <span class="review-attachment-size">${escapeReviewHtml(fileSize)}</span>
                </div>
              `;
            })
            .join("")}
        </div>
      `
    : `<p><strong>Attachments</strong><span>None</span></p>`;

  const serviceType = serviceLabels[appointment.serviceType] || appointment.serviceType || "Not selected";
  const preferredDate = formatDisplayDate(appointment.date);
  const preferredTime = appointment.time || "Not selected";

  container.innerHTML = `
    <section class="review-panel">
      <div class="option-section-header review-option-header">
        <span>Final Review</span>
        <h3>Confirm your repair request.</h3>
        <p>Review everything below before submitting. You can go back if anything needs to be changed.</p>
      </div>

      <div class="review-grid">
        <div class="review-card review-card-request">
          <h4>Request Overview</h4>
          ${renderReviewRow("Request ID", requestId, "Pending")}
          ${renderReviewRow("Status", status, "New")}
          ${renderReviewRow("Source", source, "Repair Wizard")}
          ${renderReviewRow("Repair Count", selectedRepairs.length ? `${selectedRepairs.length}` : "0")}
          ${renderReviewRow("Attachment Count", `${attachmentCount}`)}
        </div>

        <div class="review-card review-card-customer">
          <h4>Customer</h4>
          ${renderReviewRow("Name", customer.name)}
          ${renderReviewRow("Phone", customer.phone)}
          ${renderReviewRow("Email", customer.email)}
          ${renderReviewRow("Location", customer.serviceLocation)}
          ${renderReviewRow("Apt / Suite", customer.apt, "N/A")}
          ${renderReviewRow("ZIP", customer.zip)}
        </div>

        <div class="review-card review-card-device">
          <h4>Device</h4>
          ${renderReviewRow("Device", device.type, "Not selected")}
          ${renderReviewRow("Brand", device.brand, "Not selected")}
          ${renderReviewRow("Series", device.series, "Not selected")}
          ${renderReviewRow("Model", device.model, "Not selected")}
        </div>

        <div class="review-card review-card-selected-repairs">
          <h4>Selected Repairs</h4>
          ${repairsMarkup}
        </div>

        <div class="review-card review-card-appointment">
          <h4>Appointment</h4>
          ${renderReviewRow("Service Type", serviceType, "Not selected")}
          ${renderReviewRow("Preferred Date", preferredDate, "Not selected")}
          ${renderReviewRow("Preferred Time", preferredTime, "Not selected")}
        </div>

        <div class="review-card review-card-notes">
          <h4>Notes & Files</h4>
          ${renderReviewRow("Notes", leadPayload.notes, "None")}
          ${renderReviewRow("Attachments", `${attachmentCount}`)}
          ${attachmentsMarkup}
        </div>
      </div>

      <div class="review-actions">
        <button type="button" class="review-back">Back to Customer Info</button>
        <button type="button" class="review-submit">Submit Request</button>
      </div>
    </section>
  `;

  const backBtn = container.querySelector(".review-back");
  const submitBtn = container.querySelector(".review-submit");

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (typeof onBack === "function") {
        onBack();
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      if (submitBtn.disabled) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";

      try {
        if (typeof onSubmit === "function") {
          await onSubmit();
        }
      } catch (err) {
        console.error("Review submit failed:", err);
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Request";
      }
    });
  }
}
/* =========================================================
   CENTER REPAIR DETAILS INSTRUCTION TEXT WATCHER
========================================================= */

function centerRepairDetailsInstructionText() {
  const targetText = "Confirm the repair details below, then add your contact information.";

  document
    .querySelectorAll("#primitive-wizard-container p, #primitive-wizard-container div, #primitive-wizard-container span")
    .forEach((element) => {
      const directText = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      const fullText = (element.textContent || "")
        .replace(/\s+/g, " ")
        .trim();

      if (directText === targetText || fullText === targetText) {
        element.classList.add("repair-details-instruction-centered");
      }
    });
}

document.addEventListener("DOMContentLoaded", centerRepairDetailsInstructionText);
window.addEventListener("load", centerRepairDetailsInstructionText);

const repairDetailsInstructionObserver = new MutationObserver(() => {
  centerRepairDetailsInstructionText();
});

repairDetailsInstructionObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

/* END CENTER REPAIR DETAILS INSTRUCTION TEXT WATCHER */
/* =========================================================
   REPAIR BLUEPRINT FULL CARD CLICK TARGETS
========================================================= */

function syncBlueprintCardClickTargets() {
  const root = document.querySelector("#pr-selection-cards.blueprint-selection-module");

  if (!root) return;

  root.querySelectorAll(".pr-progress-card").forEach((card) => {
    const editButton = card.querySelector(".card-back");
    const canEdit =
      editButton &&
      !editButton.disabled &&
      (editButton.textContent || "").trim().length > 0;

    card.classList.toggle("is-clickable-blueprint-card", Boolean(canEdit));
  });
}

document.addEventListener(
  "click",
  (event) => {
    const card = event.target.closest(
      "#pr-selection-cards.blueprint-selection-module .pr-progress-card.is-clickable-blueprint-card"
    );

    if (!card) return;

    if (event.target.closest(".card-back")) return;

    const editButton = card.querySelector(".card-back:not(:disabled)");

    if (!editButton) return;

    event.preventDefault();
    editButton.click();
  },
  true
);

document.addEventListener("DOMContentLoaded", syncBlueprintCardClickTargets);
window.addEventListener("load", syncBlueprintCardClickTargets);

const blueprintCardClickObserver = new MutationObserver(() => {
  syncBlueprintCardClickTargets();
});

blueprintCardClickObserver.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "disabled"]
});

/* END REPAIR BLUEPRINT FULL CARD CLICK TARGETS */

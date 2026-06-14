import { state, resetStep } from "./state.js";
import {
  renderCardGrid,
  getDeviceImage,
  getBrandImage
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
  if (Array.isArray(state.repairs) && state.repairs.length) {
    return state.repairs.length === 1
      ? state.repairs[0].repair
      : `${state.repairs.length} repairs selected`;
  }

  return state.repair?.repair || state.repair || "Not selected";
}

function normalizeSeriesImageName(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();

  if (normalized === "original & early") {
    return "iphone";
  }

  return normalized
    .replace(/\s+series$/i, "")
    .replace(/\s+/g, "")
    .replace(/[()&]/g, "")
    .replace(/[^a-z0-9]/g, "");
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
  const brandFolder = String(selectedBrand || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9-]/g, "");

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
    image: `/images/series/${brandFolder}/${normalizeSeriesImageName(series)}.webp`,
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

    const filteredModels = models.filter((model) => {
      return String(model.model || "")
        .toLowerCase()
        .includes(normalizedSearch);
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
      label: model.model,
      image: model.image,
      badge: model.series,
      onClick: () => onSelect(model)
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
        image: repair.image || "/images/repairs/default.webp",
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

export function renderSummary(container) {
  if (!container) return;

  container.innerHTML = `
    <p><strong>Device:</strong> ${state.device || "Not selected"}</p>
    <p><strong>Brand:</strong> ${state.brand || "Not selected"}</p>
    <p><strong>Series:</strong> ${state.series || "Not selected"}</p>
    <p><strong>Model:</strong> ${state.model?.model || state.model || "Not selected"}</p>
    <p><strong>Repair:</strong> ${getSelectedRepairLabel()}</p>
    <p><strong>Service Type:</strong> ${serviceLabels[state.appointment?.serviceType] || "Not selected"}</p>
    <p><strong>Preferred Date:</strong> ${formatDisplayDate(state.appointment?.date)}</p>
    <p><strong>Preferred Time:</strong> ${state.appointment?.time || "Not selected"}</p>
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
          style="--repair-info-image: url('${primaryRepair.image || "/images/repairs/default.webp"}')"
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

  steps.forEach((step) => {
    const card = document.getElementById(`card-${step.key}`);

    if (!card) return;

    const label = card.querySelector(".card-label");
    const button = card.querySelector(".card-back");
    const image = card.querySelector(".card-img");

    if (!label || !button || !image) return;

    if (step.value) {
      label.textContent = step.value;
      button.style.display = "flex";
      card.classList.add("filled");

      if (step.key === "device") {
        image.style.backgroundImage = `url('${getDeviceImage(state.device)}')`;
      }

      if (step.key === "brand") {
        image.style.backgroundImage = `url('${getBrandImage(state.device, state.brand)}')`;
      }

      if (step.key === "series") {
        const brandFolder = String(state.brand || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[()]/g, "")
          .replace(/[^a-z0-9-]/g, "");

        image.style.backgroundImage = `url('/images/series/${brandFolder}/${normalizeSeriesImageName(state.series)}.webp')`;
      }

      if (step.key === "model") {
        image.style.backgroundImage = `url('${state.model?.image || "/images/models/default.webp"}')`;
      }

      if (step.key === "repair") {
        image.style.backgroundImage = `url('${state.repair?.image || "/images/repairs/default.webp"}')`;
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
      label.textContent = step.label;
      button.style.display = "none";
      image.style.backgroundImage = "none";
      card.classList.remove("filled");
      button.onclick = null;
    }
  });
}

export function renderSuccessStep(container, leadPayload, onStartNew) {
  if (!container) return;

  const customerName = leadPayload?.customer?.name || "Customer";
const serviceType = leadPayload?.appointment?.serviceType || "service";
const date = formatDisplayDate(leadPayload?.appointment?.date) || "selected date";
const time = leadPayload?.appointment?.time || "selected time";
const requestId = leadPayload?.requestId || "Pending";

const deviceType = leadPayload?.device?.type || "Not selected";
const deviceBrand = leadPayload?.device?.brand || "Not selected";
const deviceSeries = leadPayload?.device?.series || "Not selected";
const deviceModel = leadPayload?.device?.model || "Not selected";

  const selectedRepairs =
    Array.isArray(leadPayload?.repairs) && leadPayload.repairs.length
      ? leadPayload.repairs
      : leadPayload?.repair
        ? [leadPayload.repair]
        : [];

  const repairList = selectedRepairs.length
  ? selectedRepairs
      .map((repair) => {
        const repairName = repair.name || "Repair";
        const details = repair.details ? ` — ${repair.details}` : "";

        return `${repairName}${details}`;
      })
      .join(", ")
  : "Repair request";

const attachments = Array.isArray(leadPayload?.attachments)
  ? leadPayload.attachments
  : [];

const attachmentList = attachments.length
  ? attachments
      .map((file) => {
        return `
          <div class="success-attachment-item">
            <span class="success-attachment-icon">📎</span>
            <span class="success-attachment-name">${file.name || "Attachment"}</span>
            <span class="success-attachment-size">
              ${file.size ? `${Math.round(file.size / 1024)} KB` : ""}
            </span>
          </div>
        `;
      })
      .join("")
  : `<span>None</span>`;

container.innerHTML = `
    <section class="success-panel">
      <div class="success-hero">
        <div class="success-icon">✓</div>

        <div class="option-section-header success-option-header">
          <span>Request Submitted</span>
          <h3>Thank you, ${customerName}.</h3>
          <p>Your repair request has been received. We will review your details and follow up to confirm the next steps.</p>
        </div>
      </div>

      <div class="success-summary success-summary-request-layout">
  <div>
    <strong>Request ID</strong>
    <span>${requestId}</span>
  </div>

  <div>
    <strong>Device</strong>
    <span>${deviceType}</span>
  </div>

  <div>
    <strong>Brand</strong>
    <span>${deviceBrand}</span>
  </div>

  <div>
    <strong>Series</strong>
    <span>${deviceSeries}</span>
  </div>

  <div>
    <strong>Model</strong>
    <span>${deviceModel}</span>
  </div>

  <div>
    <strong>Selected Repairs</strong>
    <span>${repairList}</span>
  </div>

  <div>
    <strong>Service Type</strong>
    <span>${serviceLabels[serviceType] || serviceType}</span>
  </div>

  <div>
    <strong>Preferred Date</strong>
    <span>${date}</span>
  </div>

  <div>
    <strong>Preferred Time</strong>
    <span>${time}</span>
  </div>
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

  const requestId = leadPayload.requestId || "Pending";

  const attachments = Array.isArray(leadPayload.attachments)
  ? leadPayload.attachments
  : [];

const attachmentCount = attachments.length;

const attachmentsMarkup = attachments.length
  ? `
      <div class="review-attachments-list">
        ${attachments.map((file) => `
          <div class="review-attachment-item">
            <span class="review-attachment-icon">📎</span>
            <span class="review-attachment-name">${file.name || "Attachment"}</span>
            <span class="review-attachment-size">
              ${file.size ? `${Math.round(file.size / 1024)} KB` : ""}
            </span>
          </div>
        `).join("")}
      </div>
    `
  : `<p><strong>Attachments:</strong> None</p>`;

  const selectedRepairs =
    Array.isArray(leadPayload.repairs) && leadPayload.repairs.length
      ? leadPayload.repairs
      : leadPayload.repair
        ? [leadPayload.repair]
        : [];

  const repairsMarkup = selectedRepairs.length
    ? selectedRepairs
        .map((repair) => {
          return `
            <div class="review-repair-item">
              <p><strong>Repair:</strong> ${repair.name || "Not selected"}</p>
              <p><strong>Estimated Time:</strong> ${repair.time || "Contact for estimate"}</p>
              <p><strong>Warranty:</strong> ${repair.warranty || "Provided after inspection"}</p>
            </div>
          `;
        })
        .join("")
    : `<p><strong>Repair:</strong> Not selected</p>`;

  container.innerHTML = `
    <section class="review-panel">
      <div class="option-section-header review-option-header">
        <span>Review Request</span>
        <h3>Confirm your repair request.</h3>
        <p>Please review your device, service, appointment, notes, and attachments before submitting.</p>
      </div>

      <div class="review-grid">
        <div class="review-card review-card-wide">
          <h4>Request</h4>
          <p><strong>Request ID:</strong> ${requestId}</p>
          <p><strong>Status:</strong> ${leadPayload.status || "New"}</p>
          <p><strong>Source:</strong> ${leadPayload.source || "repair-wizard"}</p>
        </div>

        <div class="review-card">
          <h4>Customer</h4>
          <p><strong>Name:</strong> ${leadPayload.customer.name || "Not provided"}</p>
          <p><strong>Phone:</strong> ${leadPayload.customer.phone || "Not provided"}</p>
          <p><strong>Email:</strong> ${leadPayload.customer.email || "Not provided"}</p>
          <p><strong>Location:</strong> ${leadPayload.customer.serviceLocation || "Not provided"}</p>
          <p><strong>Apt / Suite:</strong> ${leadPayload.customer.apt || "N/A"}</p>
          <p><strong>ZIP:</strong> ${leadPayload.customer.zip || "Not provided"}</p>
        </div>

        <div class="review-card">
          <h4>Device</h4>
          <p><strong>Device:</strong> ${leadPayload.device.type || "Not selected"}</p>
          <p><strong>Brand:</strong> ${leadPayload.device.brand || "Not selected"}</p>
          <p><strong>Series:</strong> ${leadPayload.device.series || "Not selected"}</p>
          <p><strong>Model:</strong> ${leadPayload.device.model || "Not selected"}</p>
        </div>

        <div class="review-card review-card-repairs">
          <h4>Repairs</h4>
          ${repairsMarkup}
        </div>

        <div class="review-card">
          <h4>Appointment</h4>
          <p><strong>Service Type:</strong> ${serviceLabels[leadPayload.appointment.serviceType] || "Not selected"}</p>
          <p><strong>Date:</strong> ${formatDisplayDate(leadPayload.appointment.date)}</p>
          <p><strong>Time:</strong> ${leadPayload.appointment.time || "Not selected"}</p>
        </div>

        <div class="review-card">
  <h4>Notes & Attachments</h4>
  <p><strong>Notes:</strong> ${leadPayload.notes || "None"}</p>
  <p><strong>Attachments:</strong> ${attachmentCount}</p>
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
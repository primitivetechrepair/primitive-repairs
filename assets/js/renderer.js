import { state, resetStep } from "./state.js?v=20260831-1";
import {
  renderCardGrid,
  getDeviceImage,
  getBrandImage,
  getRepairImage,
  getSelectionCardImageSources
} from "./cardRenderer.js?v=20260913-2";

function optionLabel(option) {
  return typeof option === "string"
    ? option
    : String(option?.label || option?.name || "").trim();
}

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
  const selectedDevice = String(state.device || "").trim();
  const seriesImageName = normalizeSeriesImageName(series);

  if (selectedDevice === "Tablet" && selectedBrand === "Apple") {
    return "/images/series/apple/ipad.webp";
  }

  if (selectedDevice === "Smart Glasses") {
    if (selectedBrand === "Meta" || selectedBrand === "Ray-Ban") {
      return "/images/series/meta-glasses/raybanmeta.png";
    }

    return "/images/supported-devices/thumbs/meta-glasses.webp";
  }

  if (selectedDevice === "Phone" && selectedBrand === "Apple") {
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

  if (
    selectedDevice === "Phone" &&
    selectedBrand === "Motorola" &&
    series === "Moto G Series"
  ) {
    return "/images/models/motorola/motogmax5g.webp";
  }

  return getBrandImage(selectedDevice, selectedBrand);
}

const selectionCardImageRequests = new WeakMap();
const initializedSelectionSummaryPanels = new WeakSet();

function setSelectionCardBackground(image, sources) {
  const request = {};
  selectionCardImageRequests.set(image, request);

  if (!sources.length) {
    image.style.backgroundImage = "none";
    return;
  }

  const fallbackImage = sources[sources.length - 1];
  image.style.backgroundImage = `url('${fallbackImage}')`;

  const loadSource = (index) => {
    if (index >= sources.length - 1) return;

    const loader = new Image();

    loader.onload = () => {
      if (selectionCardImageRequests.get(image) === request) {
        image.style.backgroundImage = `url('${sources[index]}')`;
      }
    };

    loader.onerror = () => {
      if (selectionCardImageRequests.get(image) === request) {
        loadSource(index + 1);
      }
    };

    loader.src = sources[index];
  };

  loadSource(0);
}

function selectionSummaryValue(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value;
  }

  return String(
    value.model ||
    value.label ||
    value.name ||
    value.repair ||
    ""
  ).trim();
}

function getSelectionSummaryStage() {
  if (!state.device) {
    return {
      title: "Choose your device",
      action: "Continue to device options"
    };
  }

  if (!state.brand) {
    return {
      title: "Choose a brand",
      action: "Continue to brand options"
    };
  }

  if (!state.series) {
    return {
      title: "Choose a series",
      action: "Continue to series options"
    };
  }

  if (!state.model) {
    return {
      title: "Choose a model",
      action: "Continue to model options"
    };
  }

  if (!state.repair) {
    return {
      title: "Choose a repair",
      action: "Continue to repair options"
    };
  }

  if (!state.repairDetailsViewed) {
    return {
      title: "Describe the issue",
      action: "Continue to repair details"
    };
  }

  if (!state.repairInfoViewed) {
    return {
      title: "Review service details",
      action: "Continue to service details"
    };
  }

  if (state.device === "Phone" && !state.protectionViewed) {
    return {
      title: "Choose device protection",
      action: "Continue to protection options"
    };
  }

  if (!state.appointmentSelected) {
    return {
      title: "Choose an appointment",
      action: "Continue to appointment options"
    };
  }

  if (state.reviewViewed) {
    return {
      title: "Review and submit",
      action: "Continue reviewing"
    };
  }

  return {
    title: "Add your contact details",
    action: "Continue to contact details"
  };
}

function getSelectionSummaryVisual() {
  const model = selectionSummaryValue(state.model);
  const primaryRepair = Array.isArray(state.repairs) && state.repairs.length
    ? state.repairs[0]
    : state.repair;

  if (model) {
    return {
      label: model,
      sources: getSelectionCardImageSources({
        stepKey: "model",
        device: state.device,
        brand: state.brand,
        model
      })
    };
  }

  if (state.series) {
    return {
      label: selectionSummaryValue(state.series),
      sources: getSelectionCardImageSources({
        stepKey: "series",
        device: state.device,
        brand: state.brand,
        seriesImage: getSeriesCardImage(state.brand, state.series)
      })
    };
  }

  if (state.brand) {
    return {
      label: selectionSummaryValue(state.brand),
      sources: getSelectionCardImageSources({
        stepKey: "brand",
        device: state.device,
        brand: state.brand
      })
    };
  }

  if (state.device) {
    return {
      label: selectionSummaryValue(state.device),
      sources: getSelectionCardImageSources({
        stepKey: "device",
        device: state.device
      })
    };
  }

  return {
    label: primaryRepair
      ? selectionSummaryValue(primaryRepair)
      : "Start with your device",
    sources: getSelectionCardImageSources({
      stepKey: "device",
      device: "Other Electronics"
    })
  };
}

function setSelectionSummaryOpen(
  selectionCards,
  requestedOpen,
  { restoreFocus = true } = {}
) {
  if (!selectionCards) return;

  const trigger = selectionCards.querySelector(
    ".pr-summary-mobile-trigger"
  );
  const surface = selectionCards.querySelector(
    ".pr-summary-surface"
  );
  const isMobile = typeof window.matchMedia === "function"
    ? window.matchMedia("(max-width: 960px)").matches
    : false;
  const isOpen = Boolean(requestedOpen && isMobile);
  const hadFocusInSurface = Boolean(
    surface?.contains(document.activeElement)
  );

  selectionCards.dataset.mobileOpen = `${isOpen}`;
  trigger?.setAttribute("aria-expanded", `${isOpen}`);

  if (surface) {
    if (isMobile) {
      surface.setAttribute("role", "dialog");
      surface.setAttribute("aria-modal", "true");
      surface.setAttribute("aria-hidden", `${!isOpen}`);
      surface.toggleAttribute("inert", !isOpen);
    } else {
      surface.setAttribute("role", "region");
      surface.removeAttribute("aria-modal");
      surface.removeAttribute("aria-hidden");
      surface.removeAttribute("inert");
    }
  }

  document.body?.classList.toggle("pr-summary-sheet-open", isOpen);

  if (isOpen) {
    const closeButton = selectionCards.querySelector(".pr-summary-close");
    window.requestAnimationFrame(() => closeButton?.focus());
    return;
  }

  if (
    restoreFocus &&
    trigger &&
    hadFocusInSurface
  ) {
    trigger.focus();
  }
}

function continueFromSelectionSummary(selectionCards) {
  setSelectionSummaryOpen(selectionCards, false, {
    restoreFocus: false
  });

  const target = document.getElementById("pr-main");

  window.requestAnimationFrame(() => {
    target?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
    target?.focus?.({ preventScroll: true });
  });
}

function initializeSelectionSummaryPanel(selectionCards) {
  if (!selectionCards) return;

  const trigger = selectionCards.querySelector(
    ".pr-summary-mobile-trigger"
  );
  const closeButton = selectionCards.querySelector(
    ".pr-summary-close"
  );
  const backdrop = selectionCards.querySelector(
    ".pr-summary-backdrop"
  );
  const continueButton = selectionCards.querySelector(
    ".pr-summary-mobile-continue"
  );

  trigger.onclick = () => {
    setSelectionSummaryOpen(selectionCards, true);
  };
  closeButton.onclick = () => {
    setSelectionSummaryOpen(selectionCards, false);
  };
  backdrop.onclick = () => {
    setSelectionSummaryOpen(selectionCards, false);
  };
  continueButton.onclick = () => {
    continueFromSelectionSummary(selectionCards);
  };

  if (!initializedSelectionSummaryPanels.has(selectionCards)) {
    initializedSelectionSummaryPanels.add(selectionCards);

    selectionCards.addEventListener("keydown", (event) => {
      if (selectionCards.dataset.mobileOpen !== "true") return;

      if (event.key === "Escape") {
        event.preventDefault();
        setSelectionSummaryOpen(selectionCards, false);
        return;
      }

      if (event.key !== "Tab") return;

      const surface = selectionCards.querySelector(
        ".pr-summary-surface"
      );
      const focusable = Array.from(
        surface?.querySelectorAll(
          "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])"
        ) || []
      ).filter((element) => !element.hasAttribute("inert"));

      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    if (typeof window.matchMedia === "function") {
      const summaryMedia = window.matchMedia("(max-width: 960px)");
      summaryMedia.addEventListener?.("change", () => {
        setSelectionSummaryOpen(selectionCards, false, {
          restoreFocus: false
        });
      });
    }

    const wizardContainer = selectionCards.closest(
      "#primitive-wizard-container"
    );

    if (wizardContainer && typeof IntersectionObserver === "function") {
      const observer = new IntersectionObserver((entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);

        selectionCards.classList.toggle(
          "is-mobile-visible",
          isVisible
        );
        document.body?.classList.toggle(
          "is-repair-summary-active",
          isVisible
        );

        if (!isVisible) {
          setSelectionSummaryOpen(selectionCards, false, {
            restoreFocus: false
          });
        }
      }, {
        rootMargin: "-12% 0px -12% 0px",
        threshold: 0
      });

      observer.observe(wizardContainer);
    } else {
      selectionCards.classList.add("is-mobile-visible");
    }
  }

  setSelectionSummaryOpen(
    selectionCards,
    selectionCards.dataset.mobileOpen === "true",
    { restoreFocus: false }
  );
}

export function renderDeviceStep(container, devices, onSelect) {
  if (!container) return;

  container.innerHTML = `
    <div class="option-section-header">
      <span>Step 1 of 5</span>
      <h3>What needs repair?</h3>
      <p>Choose a device type.</p>
    </div>

    <div id="device-card-results" class="device-card-results"></div>
  `;

  const results = container.querySelector("#device-card-results");

  const cards = devices.map((device) => ({
    label: optionLabel(device),
    image: getDeviceImage(optionLabel(device)),
    catalogOrder: device?.catalogOrder,
    onClick: () => onSelect(device)
  }));

  renderCardGrid(results, cards);
}

export function renderBrandStep(container, brands, onSelect) {
  if (!container) return;

  const selectedDevice = state.device || "Device";

  container.innerHTML = `
    <div class="option-section-header brand-option-header">
      <span>Step 2 of 5</span>
      <h3>Choose the brand.</h3>
      <p>Select the brand.</p>
    </div>

    <div id="brand-card-results" class="brand-card-results"></div>
  `;

  const results = container.querySelector("#brand-card-results");

  const cards = brands.map((brand) => ({
    label: optionLabel(brand),
    image: getBrandImage(state.device, optionLabel(brand)),
    fallbackImage: getDeviceImage(state.device),
    badge: selectedDevice,
    catalogOrder: brand?.catalogOrder,
    onClick: () => onSelect(brand)
  }));

  renderCardGrid(results, cards);
}

export function renderSeriesStep(container, seriesList, onSelect) {
  if (!container) return;

  const selectedBrand = state.brand || "brand";

  container.innerHTML = `
    <div class="option-section-header">
      <span>Step 3 of 5</span>
      <h3>Choose the series.</h3>
      <p>Select the closest product family.</p>
    </div>

    <div id="series-card-results" class="series-card-results"></div>
  `;

  const results = container.querySelector("#series-card-results");

  const cards = seriesList.map((series) => ({
    label: optionLabel(series),
    image: getSeriesCardImage(selectedBrand, optionLabel(series)),
    fallbackImage:
      getBrandImage(state.device, selectedBrand) ||
      getDeviceImage(state.device),
    badge: "Series",
    catalogOrder: series?.catalogOrder,
    onClick: () => onSelect(series)
  }));

  renderCardGrid(results, cards);
}

export function renderCatalogLoading(container) {
  if (!container) return;

  container.innerHTML = `
    <section class="catalog-status-panel" role="status" aria-live="polite">
      <div class="catalog-status-indicator" aria-hidden="true"></div>
      <div>
        <span>Repair Catalog</span>
        <h3>Loading repair options...</h3>
        <p>This should only take a moment.</p>
      </div>
    </section>
  `;
}

export function renderCatalogError(container, onRetry) {
  if (!container) return;

  container.innerHTML = `
    <section class="catalog-status-panel is-error" role="alert">
      <div>
        <span>Repair Catalog</span>
        <h3>Repair options are temporarily unavailable.</h3>
        <p>Please check your connection and try again. You can also contact us directly if the problem continues.</p>
      </div>
      <button type="button" class="catalog-retry-button">Try Again</button>
    </section>
  `;

  container.querySelector(".catalog-retry-button")?.addEventListener("click", () => {
    if (typeof onRetry === "function") onRetry();
  });
}

export function renderCatalogEmptyState(
  container,
  message = "No repair options are available right now. Please contact us for help with your device."
) {
  if (!container) return;

  container.innerHTML = `
    <section class="catalog-status-panel is-empty" role="status">
      <div>
        <span>Repair Catalog</span>
        <h3>We can still help.</h3>
        <p>${escapeSummaryHtml(message)}</p>
      </div>
    </section>
  `;
}

export function renderModelStep(container, models, onSelect) {
  if (!container) return;

  const selectedBrand = state.brand || "brand";

  container.innerHTML = `
    <div class="option-section-header model-option-header">
      <span>Step 4 of 5</span>
      <h3>Choose the model.</h3>
      <p>Search or select your exact ${escapeSummaryHtml(selectedBrand)} model.</p>
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

    const cards = filteredModels.map((model) => {
      const displayLabel = getModelDisplayLabel(model);
      const imageSources = getSelectionCardImageSources({
        stepKey: "model",
        device: state.device,
        brand: selectedBrand,
        model: displayLabel
      });

      return {
        label: displayLabel,
        image: imageSources[0] || getDeviceImage(state.device),
        fallbackImage:
          imageSources[1] ||
          imageSources[0] ||
          getDeviceImage(state.device),
        badge: model.series,
        catalogOrder: model.catalogOrder,
        onClick: () => onSelect({
          ...model,
          model: displayLabel
        })
      };
    });

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

  const selectedIds = new Set(selectedRepairs.map((repair) => {
    return repair.id || repair.repair;
  }));

  container.innerHTML = `
    <div class="repair-select-panel">
      ${
        selectedRepairs.length
          ? `
            <div class="repair-select-top-action">
              <button
                type="button"
                class="repair-select-continue"
              >
                Continue to Details
              </button>
            </div>
          `
          : ""
      }

      <div class="option-section-header repair-option-header">
        <span>Step 5 of 5</span>
        <h3>What is wrong?</h3>
        <p>Select one or more repairs. Not sure? Choose Diagnostic.</p>
      </div>

      <div class="repair-selected-summary">
        ${
          selectedRepairs.length
            ? selectedRepairs
                .map((repair) => `<span>${escapeSummaryHtml(repair.repair)}</span>`)
                .join("")
            : `<span class="repair-none-selected">No repairs selected yet</span>`
        }
      </div>

      <div id="repair-card-results" class="repair-card-results"></div>
    </div>
  `;

  const results = container.querySelector("#repair-card-results");
  const continueBtn = container.querySelector(".repair-select-continue");

  if (results) {
    const cards = repairs.map((repair) => {
      const isSelected = selectedIds.has(repair.id || repair.repair);

      return {
        label: repair.repair,
        image: getRepairImage(repair),
        subtext: repair.time || "",
        badge: isSelected ? "Selected" : repair.warranty || "",
        className: isSelected ? "is-selected" : "",
        catalogOrder: repair.catalogOrder,
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
        <h3>Your repair plan, in one view.</h3>
        <p class="repair-details-instruction-centered">Confirm the selected repair and appointment details before adding your contact information.</p>
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
        <span>Optional Details</span>
        <h3>Anything we should know?</h3>
        <p>Add a short note, or continue without one.</p>
      </div>

      <div class="repair-details-list">
        ${
          selectedRepairs.length
            ? selectedRepairs.map((repair, index) => {
                const repairName = repair.repair || `Repair ${index + 1}`;
                const savedValue = repairDetails[repairName] || "";

                return `
                  <div class="repair-detail-card">
                    <label for="repair-detail-${index}">${escapeSummaryHtml(repairName)}</label>
                    <textarea
                      id="repair-detail-${index}"
                      class="repair-detail-input"
                      data-repair-name="${escapeSummaryHtml(repairName)}"
                      placeholder="Example: screen is cracked but touch still works..."
                    >${escapeSummaryHtml(savedValue)}</textarea>
                  </div>
                `;
              }).join("")
            : `<p class="repair-details-empty">No repairs selected.</p>`
        }
      </div>

      <div class="repair-details-actions">
        <button type="button" class="repair-details-continue">
          Continue to Appointment
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
              : escapeSummaryHtml(primaryRepair.repair)
          }
        </h3>
        <p>Review the selected work, expected timing, warranty, and common symptoms before scheduling.</p>
      </div>

      <div class="repair-info-hero">
        <div
          class="repair-info-image"
          style="--repair-info-image: url('${escapeSummaryHtml(getRepairImage(primaryRepair))}')"
        ></div>

        <div class="repair-info-content">

          <div class="repair-info-meta">
  ${repairList.map((repair) => {
    const repairName = repair.repair || "Repair";
    const details = state.repairDetails?.[repairName] || "";

    return `
      <div>
        <strong>${escapeSummaryHtml(repairName)}</strong>
        <span>${escapeSummaryHtml(repair.time || "Contact for estimate")} · ${escapeSummaryHtml(repair.warranty || "Warranty details after inspection")}</span>
        ${
          details
            ? `<em class="repair-info-detail">Details: ${escapeSummaryHtml(details)}</em>`
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
            ? `<ul>${allSymptoms.map((item) => `<li>${escapeSummaryHtml(item)}</li>`).join("")}</ul>`
            : `<p>Symptoms will vary depending on the device condition. We will confirm the issue after inspection.</p>`
        }
      </div>

      <div class="repair-info-actions">
        <div class="repair-booking-bridge">
          <div class="repair-booking-bridge-copy">
            <span>Your repair plan is ready</span>
            <h4>Select a preferred appointment time to continue.</h4>
            <p>No repair begins until availability and repair details are confirmed.</p>
          </div>

          <button type="button" class="repair-info-continue">
            Choose Appointment Time
          </button>

          <p class="repair-booking-bridge-note">
            We will confirm your request and appointment availability by text.
          </p>
        </div>
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

export function renderProtectionUpsellStep(
  container,
  protectorProduct,
  selectedAddOns = [],
  onContinue
) {
  if (!container || !protectorProduct) return;

  const protector = {
    id: String(
      protectorProduct.id ||
      protectorProduct.sku ||
      ""
    ).trim(),
    sku: String(
      protectorProduct.sku ||
      ""
    ).trim(),
    name: String(
      protectorProduct.name ||
      "Premium Tempered Glass"
    ).trim(),
    label: String(
      protectorProduct.label ||
      protectorProduct.name ||
      "Premium Screen Protector"
    ).trim(),
    price: Math.max(
      0,
      Number(protectorProduct.price || 0)
    ),
    quantity: 1,
    installed:
      protectorProduct.installed !== false,
    available:
      protectorProduct.available === true,
    compatibleBrand: String(
      protectorProduct.compatibleBrand ||
      ""
    ).trim(),
    compatibleModel: String(
      protectorProduct.compatibleModel ||
      ""
    ).trim(),
    stockQuantity: Math.max(
      0,
      Number(protectorProduct.quantity || 0)
    )
  };

  const isSelected = Array.isArray(selectedAddOns) &&
    selectedAddOns.some((item) => item?.id === protector.id);

  container.innerHTML = `
    <section class="protection-upsell-panel">
      <div class="option-section-header protection-upsell-header">
        <span>Optional Protection</span>
        <h3>Protect your repair.</h3>
        <p>
          Add professional screen protection while your device is already
          being serviced.
        </p>
      </div>

      <div class="protection-upsell-card">
        <div class="protection-upsell-icon" aria-hidden="true">
          <svg
            viewBox="0 0 48 48"
            role="img"
            focusable="false"
          >
            <path
              d="M24 5 39 11v11c0 10.2-6.1 17.1-15 21-8.9-3.9-15-10.8-15-21V11L24 5Z"
              fill="none"
              stroke="currentColor"
              stroke-width="2.6"
              stroke-linejoin="round"
            />
            <path
              d="m17 24 4.6 4.6L31.5 18"
              fill="none"
              stroke="currentColor"
              stroke-width="2.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        <div class="protection-upsell-copy">
          <div class="protection-upsell-title-row">
            <div>
              <span class="protection-upsell-kicker">
                ${protector.compatibleModel
                  ? `For ${protector.compatibleModel}`
                  : "Installed During Service"}
              </span>

              <h4>${protector.name}</h4>
            </div>

            <strong class="protection-upsell-price">
              +$19
              <small>installed</small>
            </strong>
          </div>

          <p>
            Professionally cleaned, precisely aligned, and installed before
            your device is returned.
          </p>

          <ul class="protection-upsell-benefits">
            <li>Professional alignment</li>
            <li>Bubble-free installation</li>
            <li>Ready when your repair is complete</li>
          </ul>
        </div>
      </div>

      <div class="protection-upsell-actions">
        <button
          type="button"
          class="protection-upsell-add"
        >
          ${isSelected
            ? "Keep Screen Protector"
            : "Add Screen Protector"}
        </button>

        <button
          type="button"
          class="protection-upsell-skip"
        >
          ${isSelected
            ? "Remove and Continue"
            : "No Thanks, Continue"}
        </button>
      </div>

      <p class="protection-upsell-note">
        The add-on is noted on your request. Nothing is charged when you
        submit the appointment request.
      </p>
    </section>
  `;

  const addButton = container.querySelector(
    ".protection-upsell-add"
  );

  const skipButton = container.querySelector(
    ".protection-upsell-skip"
  );

  if (addButton) {
    addButton.addEventListener("click", () => {
      if (typeof onContinue === "function") {
        onContinue([protector]);
      }
    });
  }

  if (skipButton) {
    skipButton.addEventListener("click", () => {
      if (typeof onContinue === "function") {
        onContinue([]);
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
  const selectionStatus = selectionCards?.querySelector(
    ".blueprint-profile-status"
  );
  const summaryStage = getSelectionSummaryStage();
  const summaryVisual = getSelectionSummaryVisual();

  if (selectionCards) {
    selectionCards.dataset.completedSteps = `${completeStepCount}`;
    selectionCards.dataset.totalSteps = `${steps.length}`;
    selectionCards.dataset.summaryStage = summaryStage.title;
    initializeSelectionSummaryPanel(selectionCards);

    const stageTitle = selectionCards.querySelector(
      "#pr-summary-stage-title"
    );
    const mobileTitle = selectionCards.querySelector(
      "#pr-summary-mobile-title"
    );
    const mobileStage = selectionCards.querySelector(
      "#pr-summary-mobile-stage"
    );
    const mobileProgress = selectionCards.querySelector(
      ".pr-summary-mobile-progress"
    );
    const visualLabel = selectionCards.querySelector(
      "#pr-summary-visual-label"
    );
    const summaryImage = selectionCards.querySelector(
      "#pr-summary-image"
    );
    const mobileImage = selectionCards.querySelector(
      ".pr-summary-mobile-thumb"
    );
    const continueButton = selectionCards.querySelector(
      ".pr-summary-mobile-continue"
    );

    if (stageTitle) stageTitle.textContent = summaryStage.title;
    if (mobileTitle) mobileTitle.textContent = summaryVisual.label;
    if (mobileStage) mobileStage.textContent = summaryStage.title;
    if (mobileProgress) {
      mobileProgress.textContent = `${completeStepCount}/${steps.length}`;
    }
    if (visualLabel) visualLabel.textContent = summaryVisual.label;
    if (continueButton) continueButton.textContent = summaryStage.action;

    if (summaryImage) {
      setSelectionCardBackground(summaryImage, summaryVisual.sources);
    }
    if (mobileImage) {
      setSelectionCardBackground(mobileImage, summaryVisual.sources);
    }
  }

  if (selectionStatus) {
    selectionStatus.textContent = completeStepCount === steps.length
      ? `${steps.length} of ${steps.length} selected`
      : `Step ${completeStepCount + 1} of ${steps.length}`;
  }

  if (progressBar) {
    progressBar.style.width = `${progressPercent}%`;
    progressBar.setAttribute("role", "progressbar");
    progressBar.setAttribute("aria-label", "Repair selection progress");
    progressBar.setAttribute("aria-valuemin", "0");
    progressBar.setAttribute("aria-valuemax", "100");
    progressBar.setAttribute("aria-valuenow", `${progressPercent}`);
    progressBar.classList.toggle("full", completeStepCount === steps.length);
  }
  if (selectionCards) {
    const protectionSlot = selectionCards.querySelector(
      ".pr-summary-add-on-slot"
    );

    protectionSlot?.replaceChildren();

    const selectedProtection = Array.isArray(state.addOns)
      ? state.addOns[0]
      : null;

    if (selectedProtection) {
      const protectionStatus =
        document.createElement("div");

      protectionStatus.className =
        "blueprint-protection-status";

      const protectionLabel =
        selectedProtection.label ||
        selectedProtection.name ||
        "Screen Protector";

      const protectionPrice =
        Number(selectedProtection.price || 0);

      protectionStatus.innerHTML = `
        <span>Protection Add-On</span>
        <strong></strong>
      `;

      protectionStatus.querySelector("strong").textContent =
        protectionPrice > 0
          ? `${protectionLabel} — $${protectionPrice.toFixed(0)} installed`
          : protectionLabel;

      protectionSlot?.appendChild(protectionStatus);
    }
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

    if (!label || !button) return;

    if (step.value) {
      label.textContent = step.value;
      button.textContent = "EDIT";
      button.disabled = false;
      button.style.display = "flex";
      button.setAttribute("aria-label", `Edit ${step.label}`);
      card.classList.add("filled");
      card.classList.remove("is-missing-choice");

      button.onclick = (event) => {
        event.stopPropagation();

        setSelectionSummaryOpen(selectionCards, false, {
          restoreFocus: false
        });

        if (step.key === "repair") {
          state.repair = null;
          state.repairs = [];
          resetStep("repair");
          state.repairDetails = {};
          state.repairDetailsViewed = false;
          state.repairInfoViewed = false;
          state.protectionViewed = false;
          state.addOns = [];
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
      label.textContent = "Select";
      button.textContent = "";
      button.disabled = true;
      button.style.display = "flex";
      button.removeAttribute("aria-label");
      card.classList.add("is-missing-choice");
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
  const promotion =
    leadPayload?.promotion ||
    leadPayload?.savings ||
    {};

  const promotionCode =
    String(promotion.code || "").trim();

  const promotionStatus =
    String(
      promotion.status ||
      (promotionCode
        ? "Pending verification"
        : "")
    ).trim();

  const promotionOfferType =
    String(
      promotion.offerType ||
      (promotionCode
        ? "Promotion or bundle"
        : "")
    ).trim();

  const customerName = successValue(customer.name, "Customer");
  const requestId = successValue(leadPayload?.requestId, "Pending");
  const status = successValue(leadPayload?.status, "New");

  const serviceType =
    serviceLabels[appointment.serviceType] ||
    appointment.serviceType ||
    "Not selected";

  const preferredDate = formatDisplayDate(appointment.date);
  const preferredTime = appointment.time || "Not selected";
  const convenienceFee = Number(appointment.convenienceFee || 0);
  const hasAfterHoursFee = convenienceFee > 0;
  const convenienceFeeLabel =
    appointment.convenienceFeeLabel ||
    (hasAfterHoursFee
      ? `$${convenienceFee.toFixed(2)} after-hours convenience fee`
      : "");

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

  const selectedAddOns = Array.isArray(leadPayload?.addOns)
    ? leadPayload.addOns
    : [];

  const protectionAddOnSummary = selectedAddOns
    .map((addOn) => {
      const addOnName =
        addOn?.label ||
        addOn?.name ||
        "Screen Protector";

      const addOnPrice =
        Number(addOn?.price || 0);

      return addOnPrice > 0
        ? `${addOnName} — $${addOnPrice.toFixed(2)} installed`
        : addOnName;
    })
    .join(", ");

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
          <h3>Repair Request Received</h3>
          <p class="success-message">
            Thank you, ${escapeSuccessHtml(customerName)}. Your request was submitted successfully and is now pending review. We will contact you by text to confirm availability and final service details.
          </p>
        </div>
      </div>

      <div class="success-request-confirmation">
        <span>Request ID</span>
        <strong>${escapeSuccessHtml(requestId)}</strong>
        <small>Save this number for reference.</small>
        <button
          type="button"
          class="success-copy-request-id"
          aria-label="Copy repair request ID"
        >Copy ID</button>
      </div>

      <div class="success-next-steps">
        <div class="success-next-steps-header">
          <span>What Happens Next</span>
          <h4>Your request is pending confirmation.</h4>
        </div>

        <div class="success-next-steps-grid">
          <div>
            <strong>1</strong>
            <span>We review your device, repair details, and preferred appointment.</span>
          </div>

          <div>
            <strong>2</strong>
            <span>We contact you by text to confirm availability and service details.</span>
          </div>

          <div>
            <strong>3</strong>
            <span>No repair work begins until the final details are confirmed with you.</span>
          </div>
        </div>
      </div>


      <div class="success-receipt-heading">
        <span>YOUR REQUEST</span>
        <h4>Request details</h4>
        <p>Here is a summary of the information you submitted.</p>
      </div>

      <div class="success-receipt-grid" aria-label="Submitted repair request details">

        <section class="success-receipt-card success-receipt-device">

          <div class="success-receipt-card-heading">
            <span>01 / DEVICE & REPAIR</span>
            <h4>Your repair</h4>
          </div>

          <div class="success-receipt-rows">

            ${renderSuccessItem("Device", device.type, "Not selected")}
            ${renderSuccessItem("Brand", device.brand, "Not selected")}
            ${renderSuccessItem("Series", device.series, "Not selected")}
            ${renderSuccessItem("Model", device.model, "Not selected")}
            ${renderSuccessItem("Selected repairs", repairList, "Repair request")}
            ${renderSuccessItem("Repair count", selectedRepairs.length ? `${selectedRepairs.length}` : "0")}

            ${selectedAddOns.length
              ? renderSuccessItem(
                  "Protection add-on",
                  protectionAddOnSummary
                )
              : ""}

          </div>

        </section>

        <section class="success-receipt-card success-receipt-appointment">

          <div class="success-receipt-card-heading">
            <span>02 / APPOINTMENT</span>
            <h4>Your appointment request</h4>
          </div>

          <div class="success-receipt-status">
            <span class="success-receipt-status-dot" aria-hidden="true"></span>
            Pending confirmation
          </div>

          <div class="success-receipt-rows">

            ${renderSuccessItem("Service type", serviceType, "Not selected")}
            ${renderSuccessItem("Preferred date", preferredDate, "Not selected")}
            ${renderSuccessItem("Preferred time", preferredTime, "Not selected")}

            ${hasAfterHoursFee
              ? renderSuccessItem(
                  "Convenience fee",
                  convenienceFeeLabel
                )
              : ""}

          </div>

        </section>

        <section class="success-receipt-card success-receipt-customer">

          <div class="success-receipt-card-heading">
            <span>03 / CUSTOMER</span>
            <h4>Your contact information</h4>
          </div>

          <div class="success-receipt-rows">

            ${renderSuccessItem("Name", customerName, "Customer")}
            ${renderSuccessItem("Phone", customer.phone, "Not provided")}
            ${renderSuccessItem("Email", customer.email, "Not provided")}
            ${renderSuccessItem("Service location", customer.serviceLocation, "Not provided")}

            ${customer.apt
              ? renderSuccessItem("Apt / Suite", customer.apt)
              : ""}

            ${customer.zip
              ? renderSuccessItem("ZIP code", customer.zip)
              : ""}

          </div>

        </section>

      </div>

      <details class="success-receipt-extra">

        <summary>Additional request information</summary>

        <div class="success-receipt-rows">

          ${renderSuccessItem("Request status", status, "Received")}
          ${renderSuccessItem("Attachments", `${attachments.length}`)}

          ${promotionCode
            ? renderSuccessItem("Promotion code", promotionCode)
            : ""}

          ${promotionCode
            ? renderSuccessItem("Offer type", promotionOfferType)
            : ""}

          ${promotionCode
            ? renderSuccessItem("Promotion status", promotionStatus)
            : ""}

        </div>

      </details>

      <button type="button" class="success-start-new">
        Start New Request
      </button>
    </section>
  `;


  // Keep the repair summary consistent after successful submission.
  const confirmationSummary = document.getElementById(
    "pr-selection-cards"
  );

  if (confirmationSummary) {
    const desktopStage = confirmationSummary.querySelector(
      "#pr-summary-stage-title"
    );

    const mobileStage = confirmationSummary.querySelector(
      "#pr-summary-mobile-stage"
    );

    const desktopStatus = confirmationSummary.querySelector(
      ".blueprint-profile-status"
    );

    if (desktopStage) {
      desktopStage.textContent = "Request received";
    }

    if (mobileStage) {
      mobileStage.textContent = "Request received";
    }

    if (desktopStatus) {
      desktopStatus.textContent = "Received";
    }

    // Submitted requests must not remain editable.
    confirmationSummary.querySelectorAll(".card-back").forEach((button) => {
      button.disabled = true;
      button.style.display = "none";
    });
  }

  const copyRequestButton = container.querySelector(
    ".success-copy-request-id"
  );

  if (copyRequestButton) {

    copyRequestButton.addEventListener(
      "click",
      async () => {

        try {

          if (!navigator.clipboard?.writeText) {
            throw new Error("Clipboard unavailable");
          }

          await navigator.clipboard.writeText(requestId);

          copyRequestButton.textContent = "Copied!";

        } catch {

          copyRequestButton.textContent =
            "Copy unavailable";

        }

        window.setTimeout(() => {

          if (copyRequestButton.isConnected) {
            copyRequestButton.textContent = "Copy ID";
          }

        }, 2200);

      }
    );

  }
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
  const promotion =
    leadPayload.promotion ||
    leadPayload.savings ||
    {};

  const promotionCode =
    String(promotion.code || "").trim();

  const promotionStatus =
    String(
      promotion.status ||
      (promotionCode
        ? "Pending verification"
        : "")
    ).trim();

  const promotionOfferType =
    String(
      promotion.offerType ||
      (promotionCode
        ? "Promotion or bundle"
        : "")
    ).trim();

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
  const convenienceFee = Number(appointment.convenienceFee || 0);
  const convenienceFeeLabel =
    appointment.convenienceFeeLabel ||
    (convenienceFee > 0
      ? `$${convenienceFee.toFixed(2)} after-hours convenience fee`
      : "None");


  const selectedAddOns = Array.isArray(leadPayload.addOns)
    ? leadPayload.addOns
    : [];

  const addOnsMarkup = selectedAddOns.length
    ? `
        <div class="review-card review-card-addons">
          <h4>Protection Add-On</h4>

          ${selectedAddOns
            .map((addOn) => {
              const addOnName =
                addOn?.label ||
                addOn?.name ||
                "Screen Protector";

              const addOnPrice =
                Number(addOn?.price || 0);

              const addOnValue =
                addOnPrice > 0
                  ? `${addOnName} — $${addOnPrice.toFixed(2)} installed`
                  : addOnName;

              return renderReviewRow(
                "Selected",
                addOnValue
              );
            })
            .join("")}
        </div>
      `
    : "";
  container.innerHTML = `
    <section class="review-panel">
      <div class="option-section-header review-option-header">
        <span>Final Review</span>
        <h3>Review and submit your repair request.</h3>
        <p>Confirm the details below before submitting. Nothing is charged or authorized by submitting this request.</p>
      </div>

      <button type="button" class="review-jump-to-actions">
        Jump to Submit &#8595;
      </button>

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

        ${addOnsMarkup}
        <div class="review-card review-card-appointment ${convenienceFee > 0 ? "has-after-hours-fee" : ""}">
          <h4>Appointment</h4>
          ${renderReviewRow("Service Type", serviceType, "Not selected")}
          ${renderReviewRow("Preferred Date", preferredDate, "Not selected")}
          ${renderReviewRow("Preferred Time", preferredTime, "Not selected")}
          ${renderReviewRow("Convenience Fee", convenienceFeeLabel, "None")}
        </div>

        ${promotionCode
          ? `
              <div class="review-card review-card-savings">
                <h4>Promotion Redemption</h4>

                ${renderReviewRow(
                  "Promotion Code",
                  promotionCode
                )}

                ${renderReviewRow(
                  "Offer Type",
                  promotionOfferType
                )}

                ${renderReviewRow(
                  "Status",
                  promotionStatus
                )}

                ${renderReviewRow(
                  "Application",
                  "Offer details verified before final pricing"
                )}
              </div>
            `
          : ""}

        <div class="review-card review-card-notes">
          <h4>Notes & Files</h4>
          ${renderReviewRow("Notes", leadPayload.notes, "None")}
          ${renderReviewRow("Attachments", `${attachmentCount}`)}
          ${attachmentsMarkup}
        </div>
      </div>

      <div class="review-submit-reassurance">
        <strong>Ready when you are</strong>
        <span>We will review your request and contact you by text.</span>
      </div>

      <div
        class="review-submission-status"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        hidden
      ></div>

      <div class="review-actions" id="pr-review-actions">
        <button type="button" class="review-back">Back to Contact Details</button>
        <button type="button" class="review-submit">Submit Repair Request</button>
      </div>
    </section>
  `;

  const jumpBtn = container.querySelector(
    ".review-jump-to-actions"
  );

  if (jumpBtn) {
    jumpBtn.addEventListener("click", () => {

      if (!window.matchMedia("(max-width: 960px)").matches) {
        return;
      }

      const actions = container.querySelector(
        "#pr-review-actions"
      );

      if (!actions) return;

      const navigationBottom =
        document.querySelector(".site-nav")
          ?.getBoundingClientRect().bottom ?? 0;

      const bannerBottom =
        document.querySelector(".appointment-deadline-banner")
          ?.getBoundingClientRect().bottom ?? 0;

      const baseOffset = window.matchMedia(
        "(max-width: 760px)"
      ).matches ? 162 : 178;

      const offset = Math.max(
        baseOffset,
        navigationBottom,
        bannerBottom
      ) + 16;

      const targetTop =
        window.scrollY +
        actions.getBoundingClientRect().top;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      window.scrollTo({
        top: Math.max(0, targetTop - offset),
        behavior: reducedMotion ? "auto" : "smooth"
      });

    });
  }

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
        submitBtn.textContent = "Submit Repair Request";
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

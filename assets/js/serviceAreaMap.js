/* =========================================================
   CONTACT PAGE SERVICE AREA MAP
========================================================= */

(function () {
  "use strict";

  const trigger = document.getElementById("view-service-area");

  if (!trigger) return;

  const modalRoot = document.createElement("div");

  modalRoot.id = "service-area-modal-root";

  modalRoot.innerHTML = `
    <div
      class="service-area-modal-backdrop"
      id="service-area-modal-backdrop"
      hidden
    >
      <section
        class="service-area-modal"
        id="service-area-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-area-modal-title"
        aria-describedby="service-area-modal-description"
        tabindex="-1"
      >
        <div class="service-area-modal-header">
          <div>
            <span class="service-area-modal-eyebrow">
              Mobile Repair Coverage
            </span>

            <h2 id="service-area-modal-title">
              South Florida Service Area
            </h2>

            <p id="service-area-modal-description">
              Mobile repair availability is focused throughout South Florida.
              Exact appointment availability depends on your address, repair
              type, travel distance, and scheduling.
            </p>
          </div>

          <button
            type="button"
            class="service-area-modal-close"
            data-service-area-close
            aria-label="Close service area map"
          >
            &times;
          </button>
        </div>

        <div class="service-area-map-panel">
          <svg
            class="service-area-florida-map"
            viewBox="0 0 520 760"
            role="img"
            aria-labelledby="service-area-map-title service-area-map-description"
          >
            <title id="service-area-map-title">
              Florida map with South Florida highlighted
            </title>

            <desc id="service-area-map-description">
              A simplified outline of Florida with a highlighted perimeter
              around Miami-Dade, Broward, and southern Palm Beach County.
            </desc>

            <defs>
              <linearGradient
                id="service-area-florida-fill"
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0%" stop-color="#edf6ff"></stop>
                <stop offset="100%" stop-color="#dbeaff"></stop>
              </linearGradient>

              <filter
                id="service-area-region-glow"
                x="-40%"
                y="-40%"
                width="180%"
                height="180%"
              >
                <feGaussianBlur
                  stdDeviation="8"
                  result="blur"
                ></feGaussianBlur>

                <feMerge>
                  <feMergeNode in="blur"></feMergeNode>
                  <feMergeNode in="SourceGraphic"></feMergeNode>
                </feMerge>
              </filter>
            </defs>

            <path
              class="service-area-florida-shadow"
              d="
                M92 66
                L207 55
                L260 65
                L310 99
                L355 109
                L387 130
                L400 164
                L411 191
                L432 221
                L444 260
                L450 304
                L446 346
                L454 387
                L450 430
                L436 474
                L424 519
                L413 563
                L397 606
                L379 650
                L358 694
                L335 719
                L315 699
                L300 666
                L287 630
                L276 589
                L265 547
                L249 510
                L233 478
                L217 447
                L207 412
                L202 379
                L187 348
                L169 320
                L153 290
                L141 259
                L128 229
                L117 197
                L105 165
                L95 130
                L76 109
                L48 108
                L33 91
                L45 73
                Z
              "
            ></path>

            <path
              class="service-area-florida-outline"
              d="
                M92 66
                L207 55
                L260 65
                L310 99
                L355 109
                L387 130
                L400 164
                L411 191
                L432 221
                L444 260
                L450 304
                L446 346
                L454 387
                L450 430
                L436 474
                L424 519
                L413 563
                L397 606
                L379 650
                L358 694
                L335 719
                L315 699
                L300 666
                L287 630
                L276 589
                L265 547
                L249 510
                L233 478
                L217 447
                L207 412
                L202 379
                L187 348
                L169 320
                L153 290
                L141 259
                L128 229
                L117 197
                L105 165
                L95 130
                L76 109
                L48 108
                L33 91
                L45 73
                Z
              "
            ></path>

            <path
              class="service-area-gulf-detail"
              d="
                M92 66
                C130 87 162 99 196 102
                C229 104 252 94 273 76
              "
            ></path>

            <ellipse
              class="service-area-region-glow"
              cx="345"
              cy="615"
              rx="92"
              ry="112"
            ></ellipse>

            <ellipse
              class="service-area-region-perimeter"
              cx="345"
              cy="615"
              rx="82"
              ry="102"
            ></ellipse>

            <circle
              class="service-area-city-marker"
              cx="352"
              cy="663"
              r="7"
            ></circle>

            <circle
              class="service-area-city-marker"
              cx="343"
              cy="615"
              r="7"
            ></circle>

            <circle
              class="service-area-city-marker"
              cx="336"
              cy="561"
              r="7"
            ></circle>

            <text
              class="service-area-city-label"
              x="368"
              y="668"
            >
              Miami-Dade
            </text>

            <text
              class="service-area-city-label"
              x="359"
              y="620"
            >
              Broward
            </text>

            <text
              class="service-area-city-label"
              x="352"
              y="566"
            >
              Palm Beach
            </text>

            <text
              class="service-area-map-state-label"
              x="225"
              y="310"
            >
              FLORIDA
            </text>
          </svg>

          <div class="service-area-map-legend">
            <span class="service-area-map-legend-ring"></span>

            <div>
              <strong>Primary Mobile Service Region</strong>
              <span>
                Miami-Dade, Broward, and southern Palm Beach County
              </span>
            </div>
          </div>
        </div>

        <div class="service-area-modal-footer">
          <p>
            Submit your address through the repair request wizard so we can
            confirm service availability and appointment options.
          </p>

          <div class="service-area-modal-actions">
            <button
              type="button"
              class="service-area-modal-secondary"
              data-service-area-close
            >
              Close
            </button>

            <a
              href="/#primitive-wizard-container"
              class="service-area-modal-primary"
            >
              Start Repair Request
            </a>
          </div>
        </div>
      </section>
    </div>
  `;

  document.body.appendChild(modalRoot);

  const backdrop = document.getElementById(
    "service-area-modal-backdrop"
  );

  const modal = document.getElementById(
    "service-area-modal"
  );

  let lastFocusedElement = null;

  function openModal() {
    lastFocusedElement = document.activeElement;

    backdrop.hidden = false;

    requestAnimationFrame(() => {
      backdrop.classList.add("is-visible");
    });

    document.documentElement.classList.add(
      "service-area-modal-open"
    );

    modal.focus();
  }

  function closeModal() {
    backdrop.classList.remove("is-visible");

    document.documentElement.classList.remove(
      "service-area-modal-open"
    );

    window.setTimeout(() => {
      backdrop.hidden = true;

      if (
        lastFocusedElement &&
        typeof lastFocusedElement.focus === "function"
      ) {
        lastFocusedElement.focus();
      }
    }, 180);
  }

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    openModal();
  });

  document.addEventListener("click", (event) => {
    const closeButton = event.target.closest(
      "[data-service-area-close]"
    );

    if (closeButton) {
      closeModal();
      return;
    }

    if (event.target === backdrop) {
      closeModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      !backdrop.hidden
    ) {
      closeModal();
    }
  });
})();
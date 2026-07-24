/* =========================================================
   CONTACT PAGE MIAMI-DADE SERVICE AREA MAP
========================================================= */

(function () {
  "use strict";

  const trigger = document.getElementById("view-service-area");

  if (!trigger) return;

  const URBAN_AREA_GEOJSON_URL =
    "https://gisweb.miamidade.gov/arcgis/rest/services/MD_TreeCanopy/MapServer/0/query" +
    "?where=1%3D1" +
    "&outFields=*" +
    "&returnGeometry=true" +
    "&outSR=4326" +
    "&f=geojson";

  const MIAMI_DADE_FALLBACK_BOUNDS = [
    [25.12, -80.90],
    [25.98, -80.03],
  ];

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
              Miami-Dade Urban Service Area
            </h2>

            <p id="service-area-modal-description">
              Mobile repair service is focused throughout Miami-Dade's populated and developed areas.
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

        <div class="service-area-map-shell">
          <div
            id="miami-dade-service-map"
            class="service-area-leaflet-map"
            role="application"
            aria-label="Interactive map of the Miami-Dade County mobile repair service area"
          ></div>

          <div
            class="service-area-map-loading"
            id="service-area-map-loading"
          >
            Loading Miami-Dade urban service boundary...
          </div>

          <div
            class="service-area-map-status"
            id="service-area-map-status"
            hidden
          ></div>

          <div class="service-area-map-legend">
            <span class="service-area-map-legend-swatch"></span>

            <div>
              <strong>Miami-Dade Urban Service Area</strong>
              <span>
                Populated and developed Miami-Dade service region
              </span>
            </div>
          </div>
        </div>

        <div class="service-area-modal-footer">
          <p>
            Submit your address through the repair request wizard so we can
            confirm availability and appointment options for your location.
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

  const loadingElement = document.getElementById(
    "service-area-map-loading"
  );

  const statusElement = document.getElementById(
    "service-area-map-status"
  );

  let map = null;
  let mapInitializationPromise = null;
  let lastFocusedElement = null;
  let closeTimer = null;

  function setMapStatus(message) {
    if (!statusElement) return;

    statusElement.textContent = message;
    statusElement.hidden = !message;
  }

  function hideLoading() {
    if (loadingElement) {
      loadingElement.hidden = true;
    }
  }

  async function loadUrbanAreaBoundary() {
    const response = await fetch(URBAN_AREA_GEOJSON_URL, {
      headers: {
        Accept: "application/geo+json, application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Miami-Dade boundary request failed: ${response.status}`
      );
    }

    const geoJson = await response.json();

    if (
      !geoJson ||
      geoJson.type !== "FeatureCollection" ||
      !Array.isArray(geoJson.features) ||
      geoJson.features.length === 0
    ) {
      throw new Error(
        "Miami-Dade boundary response contained no features."
      );
    }

    return geoJson;
  }

  async function initializeMap() {
    if (map) return map;

    if (!window.L) {
      throw new Error("Leaflet did not load.");
    }

    map = window.L.map("miami-dade-service-map", {
      zoomControl: true,
      scrollWheelZoom: true,
      touchZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      keyboard: true,
      dragging: true,
      minZoom: 8,
      maxZoom: 18,
      maxBoundsViscosity: 0.75,
    });

    window.L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }
    ).addTo(map);

    window.L.control.scale({
      imperial: true,
      metric: false,
      position: "bottomleft",
    }).addTo(map);

    map.fitBounds(MIAMI_DADE_FALLBACK_BOUNDS, {
      padding: [18, 18],
    });

    map.setMaxBounds(
      window.L.latLngBounds(MIAMI_DADE_FALLBACK_BOUNDS).pad(0.35)
    );

    try {
      const urbanAreaGeoJson = await loadUrbanAreaBoundary();

      const urbanAreaLayer = window.L.geoJSON(
        urbanAreaGeoJson,
        {
          style: {
            color: "#087bc1",
            weight: 4,
            opacity: 1,
            fillColor: "#66fcf1",
            fillOpacity: 0.14,

          },
        }
      ).addTo(map);

      const urbanAreaBounds = urbanAreaLayer.getBounds();

      if (urbanAreaBounds.isValid()) {
        map.fitBounds(urbanAreaBounds, {
          padding: [20, 20],
          maxZoom: 10,
        });

        map.setMaxBounds(
          urbanAreaBounds.pad(0.25)
        );
      }

      urbanAreaLayer.bindTooltip(
        "Miami-Dade Urban Mobile Service Area",
        {
          sticky: true,
          direction: "top",
          className: "service-area-map-tooltip",
        }
      );
    } catch (error) {
      console.error(
        "[Service Area Map] Boundary loading failed:",
        error
      );

      setMapStatus(
        "The detailed map is available, but the official urban service boundary could not be loaded."
      );
    } finally {
      hideLoading();
    }

    return map;
  }

  function ensureMapInitialized() {
    if (!mapInitializationPromise) {
      mapInitializationPromise = initializeMap().catch(
        (error) => {
          console.error(
            "[Service Area Map] Initialization failed:",
            error
          );

          hideLoading();

          setMapStatus(
            "The service-area map could not be loaded. Please submit your address so availability can be confirmed."
          );

          throw error;
        }
      );
    }

    return mapInitializationPromise;
  }

  function openModal() {
    if (closeTimer) {
      window.clearTimeout(closeTimer);
      closeTimer = null;
    }

    lastFocusedElement = document.activeElement;

    backdrop.hidden = false;

    requestAnimationFrame(() => {
      backdrop.classList.add("is-visible");
    });

    document.documentElement.classList.add(
      "service-area-modal-open"
    );

    modal.focus();

    ensureMapInitialized()
      .then((initializedMap) => {
        window.setTimeout(() => {
          initializedMap.invalidateSize();

          if (
            initializedMap.getZoom() < 8 ||
            initializedMap.getZoom() > 11
          ) {
            initializedMap.fitBounds(
              MIAMI_DADE_FALLBACK_BOUNDS,
              {
                padding: [18, 18],
              }
            );
          }
        }, 220);
      })
      .catch(() => {
        // Visible status messaging is handled above.
      });
  }

  function closeModal() {
    backdrop.classList.remove("is-visible");

    document.documentElement.classList.remove(
      "service-area-modal-open"
    );

    closeTimer = window.setTimeout(() => {
      backdrop.hidden = true;
      closeTimer = null;

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
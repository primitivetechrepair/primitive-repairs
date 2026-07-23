/* =========================================================
   PRIMITIVE TECH REPAIRS COOKIE CONSENT
========================================================= */

(function () {
  "use strict";

  const STORAGE_KEY = "primitiveCookieConsent";
  const CONSENT_VERSION = 1;

  /*
    No Google Analytics measurement ID was found in the current
    project audit. Add the ID here when Analytics is installed.

    Example:
    const GA_MEASUREMENT_ID = "G-XXXXXXXXXX";
  */
  const GA_MEASUREMENT_ID = "";

  let preferences = readPreferences();

  function createDefaultPreferences() {
    return {
      version: CONSENT_VERSION,
      necessary: true,
      analytics: false,
      updatedAt: null
    };
  }

  function readPreferences() {
    try {
      const storedValue = localStorage.getItem(STORAGE_KEY);

      if (!storedValue) {
        return null;
      }

      const parsedValue = JSON.parse(storedValue);

      if (
        !parsedValue ||
        parsedValue.version !== CONSENT_VERSION ||
        parsedValue.necessary !== true ||
        typeof parsedValue.analytics !== "boolean"
      ) {
        return null;
      }

      return parsedValue;
    } catch {
      return null;
    }
  }

  function savePreferences(nextPreferences) {
    preferences = {
      version: CONSENT_VERSION,
      necessary: true,
      analytics: Boolean(nextPreferences.analytics),
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(preferences)
      );
    } catch {
      // Consent still applies for the current page session.
    }

    applyPreferences();
    closeBanner();
    closeSettings();
  }

  function loadGoogleAnalytics() {
    if (!GA_MEASUREMENT_ID) {
      console.info(
        "Analytics consent granted, but no Google Analytics measurement ID is configured."
      );
      return;
    }

    if (document.querySelector("script[data-primitive-google-analytics]")) {
      return;
    }

    window.dataLayer = window.dataLayer || [];

    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, {
      anonymize_ip: true
    });

    const analyticsScript = document.createElement("script");

    analyticsScript.async = true;
    analyticsScript.src =
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
        GA_MEASUREMENT_ID
      )}`;

    analyticsScript.dataset.primitiveGoogleAnalytics = "true";

    document.head.appendChild(analyticsScript);
  }

  function disableGoogleAnalytics() {
    if (!GA_MEASUREMENT_ID) {
      return;
    }

    window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  }

  function applyPreferences() {
    if (preferences?.analytics === true) {
      if (GA_MEASUREMENT_ID) {
        window[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
      }

      loadGoogleAnalytics();
      return;
    }

    disableGoogleAnalytics();
  }

  function createConsentMarkup() {
    if (document.getElementById("primitive-cookie-banner")) {
      return;
    }

    const consentRoot = document.createElement("div");

    consentRoot.id = "primitive-cookie-consent-root";

    consentRoot.innerHTML = `
      <section
        class="primitive-cookie-banner"
        id="primitive-cookie-banner"
        aria-labelledby="primitive-cookie-title"
        aria-describedby="primitive-cookie-description"
        role="dialog"
      >
        <div class="primitive-cookie-banner-copy">
          <span class="primitive-cookie-eyebrow">
            Privacy Controls
          </span>

          <h2 id="primitive-cookie-title">
            Your privacy choices
          </h2>

          <p id="primitive-cookie-description">
            We use necessary security technologies to operate and protect
            this website. With your permission, we may also use Google
            Analytics to understand website usage.
          </p>

          <div class="primitive-cookie-policy-links">
            <a href="/privacy-policy">Privacy Policy</a>
            <a href="/cookie-policy">Cookie Policy</a>
          </div>
        </div>

        <div
          class="primitive-cookie-banner-actions"
          aria-label="Cookie consent choices"
        >
          <button
            type="button"
            class="primitive-cookie-button primitive-cookie-button-primary"
            data-cookie-action="accept"
          >
            Accept Analytics
          </button>

          <button
            type="button"
            class="primitive-cookie-button"
            data-cookie-action="reject"
          >
            Reject Analytics
          </button>

          <button
            type="button"
            class="primitive-cookie-button primitive-cookie-button-text"
            data-cookie-action="settings"
          >
            Customize
          </button>
        </div>
      </section>

      <div
        class="primitive-cookie-modal-backdrop"
        id="primitive-cookie-modal-backdrop"
        hidden
      >
        <section
          class="primitive-cookie-modal"
          id="primitive-cookie-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="primitive-cookie-settings-title"
        >
          <div class="primitive-cookie-modal-header">
            <div>
              <span class="primitive-cookie-eyebrow">
                Cookie Settings
              </span>

              <h2 id="primitive-cookie-settings-title">
                Choose what you allow
              </h2>
            </div>

            <button
              type="button"
              class="primitive-cookie-modal-close"
              data-cookie-action="close-settings"
              aria-label="Close cookie settings"
            >
              &times;
            </button>
          </div>

          <div class="primitive-cookie-category-list">
            <article class="primitive-cookie-category">
              <div class="primitive-cookie-category-copy">
                <h3>Necessary and Security</h3>
                <p>
                  Required for website operation, form protection,
                  fraud prevention, and Google reCAPTCHA.
                </p>
              </div>

              <span class="primitive-cookie-required">
                Always Active
              </span>
            </article>

            <article class="primitive-cookie-category">
              <div class="primitive-cookie-category-copy">
                <label for="primitive-cookie-analytics">
                  Analytics
                </label>

                <p>
                  Allows Google Analytics to measure visits and website
                  usage after permission is granted.
                </p>
              </div>

              <label class="primitive-cookie-switch">
                <input
                  type="checkbox"
                  id="primitive-cookie-analytics"
                >
                <span aria-hidden="true"></span>
                <span class="sr-only">
                  Allow analytics cookies
                </span>
              </label>
            </article>
          </div>

          <div class="primitive-cookie-modal-actions">
            <button
              type="button"
              class="primitive-cookie-button"
              data-cookie-action="reject"
            >
              Reject Analytics
            </button>

            <button
              type="button"
              class="primitive-cookie-button primitive-cookie-button-primary"
              data-cookie-action="save"
            >
              Save Preferences
            </button>
          </div>
        </section>
      </div>
    `;

    document.body.appendChild(consentRoot);
  }

  function getBanner() {
    return document.getElementById("primitive-cookie-banner");
  }

  function getModalBackdrop() {
    return document.getElementById(
      "primitive-cookie-modal-backdrop"
    );
  }

  function getAnalyticsToggle() {
    return document.getElementById(
      "primitive-cookie-analytics"
    );
  }

  function openBanner() {
    getBanner()?.classList.add("is-visible");
  }

  function closeBanner() {
    getBanner()?.classList.remove("is-visible");
  }

  function openSettings() {
    const backdrop = getModalBackdrop();
    const analyticsToggle = getAnalyticsToggle();

    if (!backdrop || !analyticsToggle) {
      return;
    }

    analyticsToggle.checked =
      preferences?.analytics === true;

    backdrop.hidden = false;

    requestAnimationFrame(() => {
      backdrop.classList.add("is-visible");
    });

    document.documentElement.classList.add(
      "cookie-settings-open"
    );

    document
      .getElementById("primitive-cookie-modal")
      ?.focus();
  }

  function closeSettings() {
    const backdrop = getModalBackdrop();

    if (!backdrop) {
      return;
    }

    backdrop.classList.remove("is-visible");

    window.setTimeout(() => {
      backdrop.hidden = true;
    }, 180);

    document.documentElement.classList.remove(
      "cookie-settings-open"
    );
  }

  function handleConsentAction(action) {
    switch (action) {
      case "accept":
        savePreferences({
          analytics: true
        });
        break;

      case "reject":
        savePreferences({
          analytics: false
        });
        break;

      case "settings":
        openSettings();
        break;

      case "save":
        savePreferences({
          analytics: getAnalyticsToggle()?.checked === true
        });
        break;

      case "close-settings":
        closeSettings();
        break;

      default:
        break;
    }
  }

  function wireEvents() {
    document.addEventListener("click", (event) => {
      const actionButton = event.target.closest(
        "[data-cookie-action]"
      );

      if (actionButton) {
        handleConsentAction(
          actionButton.dataset.cookieAction
        );

        return;
      }

      const settingsButton = event.target.closest(
        "[data-open-cookie-settings]"
      );

      if (settingsButton) {
        event.preventDefault();
        openSettings();
      }

      if (
        event.target.id ===
        "primitive-cookie-modal-backdrop"
      ) {
        closeSettings();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSettings();
      }
    });
  }

  function initialize() {
    createConsentMarkup();
    wireEvents();

    if (preferences) {
      applyPreferences();
      return;
    }

    preferences = createDefaultPreferences();
    openBanner();
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );
  } else {
    initialize();
  }

  window.PrimitiveCookieConsent = {
    openSettings,
    getPreferences: () => ({
      ...(preferences || createDefaultPreferences())
    })
  };
})();
(() => {
  "use strict";

  const ENDPOINT =
    "https://gorjynnsbmdifnkzxame.supabase.co/functions/v1/primitive-repairs-claim-email-discount";

  const DISPLAY_DELAY_MS = 15000;
  const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

  const STORAGE_KEYS = {
    dismissedAt: "primitiveRepairsEmailOfferDismissedAt",
    subscribed: "primitiveRepairsEmailOfferSubscribed"
  };

  const SESSION_KEYS = {
    shown: "primitiveRepairsEmailOfferShown"
  };

  let lastFocusedElement = null;
  let isOpen = false;

  function safelyGetStorage(storage, key) {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  function safelySetStorage(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch {
      // Storage may be unavailable in private browsing modes.
    }
  }

  function shouldSuppressOffer() {
    const subscribed = safelyGetStorage(
      localStorage,
      STORAGE_KEYS.subscribed
    );

    if (subscribed === "true") {
      return true;
    }

    const shownThisSession = safelyGetStorage(
      sessionStorage,
      SESSION_KEYS.shown
    );

    if (shownThisSession === "true") {
      return true;
    }

    const dismissedAt = Number(
      safelyGetStorage(
        localStorage,
        STORAGE_KEYS.dismissedAt
      ) || 0
    );

    if (
      dismissedAt &&
      Date.now() - dismissedAt < DISMISS_DURATION_MS
    ) {
      return true;
    }

    return false;
  }

  function createOfferMarkup() {
    const overlay = document.createElement("div");

    overlay.className = "email-offer-overlay";
    overlay.id = "email-offer-overlay";
    overlay.hidden = true;

    overlay.innerHTML = `
      <section
        class="email-offer-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-offer-title"
        aria-describedby="email-offer-description"
      >
        <div class="email-offer-topbar">
          <span class="email-offer-kicker">
            Repair Blueprint
          </span>

          <span class="email-offer-reference">
            Savings Authorization
          </span>
        </div>

        <button
          class="email-offer-close"
          type="button"
          aria-label="Close savings offer"
        >
          ×
        </button>

        <div class="email-offer-content">
          <div class="email-offer-eyebrow">
            Primitive Tech Repairs
          </div>

          <h2 id="email-offer-title">
            Save $10 on your repair.
          </h2>

          <p
            class="email-offer-description"
            id="email-offer-description"
          >
            Register your email and receive a one-time savings
            authorization code for a qualifying completed repair.
          </p>

          <div class="email-offer-value-card">
            <div class="email-offer-value-label">
              Customer Savings Authorization
            </div>

            <div class="email-offer-value">
              $10 OFF
            </div>

            <div class="email-offer-value-note">
              Qualifying completed repair
            </div>
          </div>

          <form
            class="email-offer-form"
            id="email-offer-form"
            novalidate
          >
            <div class="email-offer-field">
              <label for="email-offer-email">
                Email address
              </label>

              <input
                id="email-offer-email"
                name="email"
                type="email"
                autocomplete="email"
                inputmode="email"
                maxlength="254"
                placeholder="you@example.com"
                required
              >
            </div>

            <div
              class="email-offer-honeypot"
              aria-hidden="true"
            >
              <label for="email-offer-company">
                Company
              </label>

              <input
                id="email-offer-company"
                name="company"
                type="text"
                tabindex="-1"
                autocomplete="off"
              >
            </div>

            <label class="email-offer-consent">
              <input
                id="email-offer-consent"
                name="consent"
                type="checkbox"
                required
              >

              <span>
                Email me my $10 savings code and occasional
                repair offers. I can unsubscribe anytime.
              </span>
            </label>

            <div
              class="email-offer-message"
              id="email-offer-message"
              role="status"
              aria-live="polite"
            ></div>

            <button
              class="email-offer-submit"
              type="submit"
            >
              Send My $10 Code
            </button>
          </form>

          <div class="email-offer-terms">
            Minimum $75 repair subtotal. One offer per customer
            and email address. Excludes diagnostic fees,
            parts-only purchases, accessories, and after-hours fees.
          </div>
        </div>
      </section>
    `;

    return overlay;
  }

  function getFocusableElements(container) {
    return Array.from(
      container.querySelectorAll(
        [
          "button:not([disabled])",
          "input:not([disabled])",
          "a[href]",
          "[tabindex]:not([tabindex='-1'])"
        ].join(",")
      )
    ).filter((element) => !element.hidden);
  }

  function closeOffer({
    rememberDismissal = true
  } = {}) {
    const overlay =
      document.getElementById("email-offer-overlay");

    if (!overlay || !isOpen) {
      return;
    }

    overlay.classList.remove("is-visible");
    document.body.classList.remove("email-offer-open");

    isOpen = false;

    if (rememberDismissal) {
      safelySetStorage(
        localStorage,
        STORAGE_KEYS.dismissedAt,
        String(Date.now())
      );
    }

    window.setTimeout(() => {
      overlay.hidden = true;
    }, 220);

    lastFocusedElement?.focus?.();
  }

  function openOffer() {
    const overlay =
      document.getElementById("email-offer-overlay");

    if (!overlay || isOpen || shouldSuppressOffer()) {
      return;
    }

    lastFocusedElement = document.activeElement;

    safelySetStorage(
      sessionStorage,
      SESSION_KEYS.shown,
      "true"
    );

    overlay.hidden = false;

    requestAnimationFrame(() => {
      overlay.classList.add("is-visible");
    });

    document.body.classList.add("email-offer-open");
    isOpen = true;

    const emailInput =
      overlay.querySelector("#email-offer-email");

    window.setTimeout(() => {
      emailInput?.focus();
    }, 240);
  }

  function setMessage(message, type = "") {
    const messageElement =
      document.getElementById("email-offer-message");

    if (!messageElement) {
      return;
    }

    messageElement.textContent = message;
    messageElement.className =
      "email-offer-message";

    if (type) {
      messageElement.classList.add(`is-${type}`);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;
    const emailInput =
      form.querySelector("#email-offer-email");
    const consentInput =
      form.querySelector("#email-offer-consent");
    const companyInput =
      form.querySelector("#email-offer-company");
    const submitButton =
      form.querySelector(".email-offer-submit");

    const email = emailInput.value.trim();

    setMessage("");

    if (!email || !emailInput.validity.valid) {
      setMessage(
        "Enter a valid email address.",
        "error"
      );

      emailInput.focus();
      return;
    }

    if (!consentInput.checked) {
      setMessage(
        "Consent is required to receive the savings code.",
        "error"
      );

      consentInput.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending Code...";

    try {
      const response = await fetch(
        ENDPOINT,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            consent: true,
            company: companyInput.value,
            sourcePage:
              document.body.dataset.page ||
              document.title ||
              window.location.pathname,
            sourceUrl: window.location.href
          })
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || data.success !== true) {
        throw new Error(
          data.message ||
          "We could not send your savings code."
        );
      }

      safelySetStorage(
        localStorage,
        STORAGE_KEYS.subscribed,
        "true"
      );

      form.innerHTML = `
        <div class="email-offer-success">
          <div class="email-offer-success-mark">
            ✓
          </div>

          <h3>Check your email.</h3>

          <p>
            Your $10 Repair Blueprint savings code is on the way.
          </p>

          <button
            class="email-offer-success-close"
            type="button"
          >
            Continue
          </button>
        </div>
      `;

      form
        .querySelector(".email-offer-success-close")
        ?.addEventListener("click", () => {
          closeOffer({
            rememberDismissal: false
          });
        });
    } catch (error) {
      console.error(
        "Email savings offer failed:",
        error
      );

      setMessage(
        error.message ||
        "We could not send your savings code. Please try again.",
        "error"
      );

      submitButton.disabled = false;
      submitButton.textContent = "Send My $10 Code";
    }
  }

  function wireOfferEvents(overlay) {
    const closeButton =
      overlay.querySelector(".email-offer-close");

    const form =
      overlay.querySelector("#email-offer-form");

    closeButton?.addEventListener("click", () => {
      closeOffer();
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closeOffer();
      }
    });

    form?.addEventListener(
      "submit",
      handleSubmit
    );

    document.addEventListener("keydown", (event) => {
      if (!isOpen) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        closeOffer();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusable =
        getFocusableElements(overlay);

      if (!focusable.length) {
        return;
      }

      const first = focusable[0];
      const last =
        focusable[focusable.length - 1];

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  function initEmailOfferPopup() {
    if (
      document.getElementById("email-offer-overlay") ||
      shouldSuppressOffer()
    ) {
      return;
    }

    const overlay = createOfferMarkup();

    document.body.appendChild(overlay);
    wireOfferEvents(overlay);

    window.setTimeout(() => {
      openOffer();
    }, DISPLAY_DELAY_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initEmailOfferPopup,
      { once: true }
    );
  } else {
    initEmailOfferPopup();
  }
})();
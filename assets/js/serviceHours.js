/* =========================================================
   UNIVERSAL SERVICE HOURS LOCKOUT
   Closed: 7:00 PM - 7:00 AM Eastern
========================================================= */

(() => {
  const OPEN_HOUR_ET = 7;
  const CUTOFF_HOUR_ET = 19;

  const CALL_CLOSED_MESSAGE =
    "Calling is available from 7:00 AM to 7:00 PM Eastern. Please text us or check back during business hours.";

  const BOOKING_CLOSED_MESSAGE =
    "Booking is available from 7:00 AM to 7:00 PM Eastern. Please check back during business hours.";

  const AFTER_HOURS_BANNER_TEXT =
    "Online booking and calls reopen at 7:00 AM ET. You can still text us or browse repair options.";

  const BOOKING_CLOSED_LABEL = "Booking Opens at 7 AM";
  const CALL_CLOSED_LABEL = "Call Opens at 7 AM";

  const LOCKED_CLASS = "service-hours-disabled";
  const CALL_LOCKED_CLASS = "service-hours-call-disabled";
  const BOOKING_LOCKED_CLASS = "service-hours-booking-disabled";
  const BANNER_CLASS = "service-hours-banner";

  function getEasternHour() {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hourCycle: "h23",
    });

    const parts = formatter.formatToParts(new Date());
    const hourValue = Number(parts.find((part) => part.type === "hour")?.value || 0);

    return hourValue === 24 ? 0 : hourValue;
  }

  function isServiceClosed() {
    const hour = getEasternHour();
    return hour < OPEN_HOUR_ET || hour >= CUTOFF_HOUR_ET;
  }

  function notifyUser(message) {
    if (typeof window.notify === "function") {
      window.notify(message);
      return;
    }

    window.alert(message);
  }

  function getStoredHref(element) {
    return element.dataset.serviceHoursHref || element.getAttribute("href") || "";
  }

  function isCallLink(element) {
    if (!element || element.tagName !== "A") return false;

    const href = getStoredHref(element).trim().toLowerCase();

    return href.startsWith("tel:");
  }

  function isBookingLink(element) {
    if (!element || element.tagName !== "A") return false;

    const href = getStoredHref(element).trim().toLowerCase();

    return (
      element.dataset.bookingLink === "true" ||
      href.includes("primitive-wizard-container") ||
      href.includes("repair-request") ||
      href.includes("book-repair")
    );
  }

  function isBookingButton(element) {
    if (!element || !("matches" in element)) return false;

    return (
      element.matches("#cf-submit") ||
      element.matches(".review-submit") ||
      element.matches("[data-booking-submit='true']") ||
      element.matches("#pr-customer-form button[type='submit']") ||
      element.matches("#pr-customer-form input[type='submit']")
    );
  }

  function storeOriginalLabel(element) {
    if (element.tagName === "INPUT") {
      if (!element.dataset.serviceHoursText) {
        element.dataset.serviceHoursText = element.value || "";
      }

      return;
    }

    if (!element.dataset.serviceHoursText) {
      element.dataset.serviceHoursText = element.textContent || "";
    }
  }

  function setElementLabel(element, label) {
    storeOriginalLabel(element);

    if (element.tagName === "INPUT") {
      if (element.value !== label) {
        element.value = label;
      }

      return;
    }

    if ((element.textContent || "").trim() !== label) {
      element.textContent = label;
    }
  }

  function restoreElementLabel(element) {
    if (!element.dataset.serviceHoursText) return;

    if (element.tagName === "INPUT") {
      element.value = element.dataset.serviceHoursText;
    } else {
      element.textContent = element.dataset.serviceHoursText;
    }

    delete element.dataset.serviceHoursText;
  }

  function disableAnchor(anchor, type, message) {
    if (!anchor.dataset.serviceHoursHref && anchor.getAttribute("href")) {
      anchor.dataset.serviceHoursHref = anchor.getAttribute("href");
    }

    anchor.removeAttribute("href");
    anchor.setAttribute("aria-disabled", "true");
    anchor.setAttribute("tabindex", "-1");
    anchor.setAttribute("title", message);

    anchor.classList.add(LOCKED_CLASS);

    if (type === "call") {
      anchor.classList.add(CALL_LOCKED_CLASS);
      setElementLabel(anchor, CALL_CLOSED_LABEL);
    }

    if (type === "booking") {
      anchor.classList.add(BOOKING_LOCKED_CLASS);
      setElementLabel(anchor, BOOKING_CLOSED_LABEL);
    }
  }

  function enableAnchor(anchor) {
    if (anchor.dataset.serviceHoursHref) {
      anchor.setAttribute("href", anchor.dataset.serviceHoursHref);
      delete anchor.dataset.serviceHoursHref;
    }

    anchor.removeAttribute("aria-disabled");
    anchor.removeAttribute("tabindex");
    anchor.removeAttribute("title");

    anchor.classList.remove(LOCKED_CLASS, CALL_LOCKED_CLASS, BOOKING_LOCKED_CLASS);

    restoreElementLabel(anchor);
  }

  function disableButton(button, type, message) {
    if (!button.disabled) {
      button.dataset.serviceHoursDisabled = "true";
      button.disabled = true;
    }

    button.setAttribute("aria-disabled", "true");
    button.setAttribute("title", message);

    button.classList.add(LOCKED_CLASS);

    if (type === "booking") {
      button.classList.add(BOOKING_LOCKED_CLASS);
      setElementLabel(button, BOOKING_CLOSED_LABEL);
    }
  }

  function enableButton(button) {
    if (button.dataset.serviceHoursDisabled === "true") {
      button.disabled = false;
      delete button.dataset.serviceHoursDisabled;
    }

    button.removeAttribute("aria-disabled");
    button.removeAttribute("title");

    button.classList.remove(LOCKED_CLASS, BOOKING_LOCKED_CLASS);

    restoreElementLabel(button);
  }

  function removeAfterHoursBanner() {
    document.querySelectorAll(`.${BANNER_CLASS}`).forEach((banner) => {
      banner.remove();
    });
  }

  function getBannerTarget() {
    const wizardHeader = document.querySelector("#primitive-wizard-container .pr-header");

    if (wizardHeader) {
      return {
        mode: "prepend",
        element: wizardHeader,
      };
    }

    const landingActions = document.querySelector(".landing-actions");

    if (landingActions) {
      return {
        mode: "after",
        element: landingActions,
      };
    }

    const heroPanel = document.querySelector(".hero-glass-panel");

    if (heroPanel) {
      return {
        mode: "append",
        element: heroPanel,
      };
    }

    const main = document.querySelector("main");

    if (main) {
      return {
        mode: "prepend",
        element: main,
      };
    }

    return {
      mode: "prepend",
      element: document.body,
    };
  }

  function renderAfterHoursBanner(closed) {
    if (!closed) {
      removeAfterHoursBanner();
      return;
    }

    if (document.querySelector(`.${BANNER_CLASS}`)) {
      return;
    }

    const target = getBannerTarget();

    if (!target || !target.element) {
      return;
    }

    const banner = document.createElement("aside");
    banner.className = BANNER_CLASS;
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");

    banner.innerHTML = `
      <span class="service-hours-banner-label">After Hours</span>
      <span class="service-hours-banner-message">${AFTER_HOURS_BANNER_TEXT}</span>
    `;

    if (target.mode === "after") {
      target.element.insertAdjacentElement("afterend", banner);
      return;
    }

    if (target.mode === "append") {
      target.element.appendChild(banner);
      return;
    }

    target.element.prepend(banner);
  }

  function applyServiceHours() {
    const closed = isServiceClosed();

    document.querySelectorAll("a, button, input[type='submit']").forEach((element) => {
      if (element.closest(`.${BANNER_CLASS}`)) return;

      if (isCallLink(element)) {
        if (closed) {
          disableAnchor(element, "call", CALL_CLOSED_MESSAGE);
        } else {
          enableAnchor(element);
        }

        return;
      }

      if (isBookingLink(element)) {
        if (closed) {
          disableAnchor(element, "booking", BOOKING_CLOSED_MESSAGE);
        } else {
          enableAnchor(element);
        }

        return;
      }

      if (isBookingButton(element)) {
        if (closed) {
          disableButton(element, "booking", BOOKING_CLOSED_MESSAGE);
        } else {
          enableButton(element);
        }
      }
    });

    renderAfterHoursBanner(closed);
    document.documentElement.classList.toggle("service-hours-closed", closed);
  }

  document.addEventListener(
    "click",
    (event) => {
      if (!isServiceClosed()) return;

      const callTarget = event.target.closest("a[href^='tel:'], a[data-service-hours-href^='tel:']");

      if (callTarget) {
        event.preventDefault();
        event.stopPropagation();
        notifyUser(CALL_CLOSED_MESSAGE);
        return;
      }

      const bookingTarget = event.target.closest(
        "a[data-service-hours-href*='primitive-wizard-container'], a[href*='primitive-wizard-container'], a[data-booking-link='true'], button, input[type='submit']"
      );

      if (
        bookingTarget &&
        (isBookingLink(bookingTarget) || isBookingButton(bookingTarget))
      ) {
        event.preventDefault();
        event.stopPropagation();
        notifyUser(BOOKING_CLOSED_MESSAGE);
      }
    },
    true
  );

  document.addEventListener(
    "submit",
    (event) => {
      if (!isServiceClosed()) return;

      if (event.target && event.target.matches("#pr-customer-form")) {
        event.preventDefault();
        event.stopPropagation();
        notifyUser(BOOKING_CLOSED_MESSAGE);
      }
    },
    true
  );

  document.addEventListener("DOMContentLoaded", applyServiceHours);
  window.addEventListener("load", applyServiceHours);

  const observer = new MutationObserver(() => {
    applyServiceHours();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  setInterval(applyServiceHours, 60000);
})();
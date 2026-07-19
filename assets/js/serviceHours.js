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

  const LOCKED_CLASS = "service-hours-disabled";
  const CALL_LOCKED_CLASS = "service-hours-call-disabled";
  const BOOKING_LOCKED_CLASS = "service-hours-booking-disabled";

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
    }

    if (type === "booking") {
      anchor.classList.add(BOOKING_LOCKED_CLASS);
    }
  }

  function enableAnchor(anchor) {
    if (anchor.dataset.serviceHoursHref) {
      anchor.setAttribute("href", anchor.dataset.serviceHoursHref);
    }

    anchor.removeAttribute("aria-disabled");
    anchor.removeAttribute("tabindex");
    anchor.removeAttribute("title");

    anchor.classList.remove(LOCKED_CLASS, CALL_LOCKED_CLASS, BOOKING_LOCKED_CLASS);
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
  }

  function applyServiceHours() {
    const closed = isServiceClosed();

    document.querySelectorAll("a, button, input[type='submit']").forEach((element) => {
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
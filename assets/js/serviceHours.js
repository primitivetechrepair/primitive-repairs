/* =========================================================
   UNIVERSAL CALL HOURS LOCKOUT
   Calls closed: 7:00 PM - 7:00 AM Eastern
   Online appointments remain available 24/7.
========================================================= */

(() => {
  const OPEN_HOUR_ET = 7;
  const CUTOFF_HOUR_ET = 19;

  const CALL_CLOSED_MESSAGE =
    "Calling is available from 7:00 AM to 7:00 PM Eastern. Please text us or book an appointment online.";

  const AFTER_HOURS_BANNER_TEXT =
    "Online appointments remain available. A $35 after-hours convenience fee applies from 7:00 PM to 7:00 AM ET. Calls reopen at 7:00 AM ET.";

  const CALL_CLOSED_LABEL = "Calls Resume at 7 AM";

  const LOCKED_CLASS = "service-hours-disabled";
  const CALL_LOCKED_CLASS = "service-hours-call-disabled";
  const BANNER_CLASS = "service-hours-banner";

  function getEasternHour() {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hourCycle: "h23",
    });

    const parts = formatter.formatToParts(new Date());
    const hourValue = Number(
      parts.find((part) => part.type === "hour")?.value || 0
    );

    return hourValue === 24 ? 0 : hourValue;
  }

  function isCallClosed() {
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
    return (
      element.dataset.serviceHoursHref ||
      element.getAttribute("href") ||
      ""
    );
  }

  function isCallLink(element) {
    if (!element || element.tagName !== "A") return false;

    const href = getStoredHref(element).trim().toLowerCase();

    return href.startsWith("tel:");
  }

  function storeOriginalLabel(element) {
    if (!element.dataset.serviceHoursText) {
      element.dataset.serviceHoursText = element.textContent || "";
    }
  }

  function setElementLabel(element, label) {
    storeOriginalLabel(element);

    if ((element.textContent || "").trim() !== label) {
      element.textContent = label;
    }
  }

  function restoreElementLabel(element) {
    if (!element.dataset.serviceHoursText) return;

    element.textContent = element.dataset.serviceHoursText;
    delete element.dataset.serviceHoursText;
  }

  function disableCallAnchor(anchor) {
    if (!anchor.dataset.serviceHoursHref && anchor.getAttribute("href")) {
      anchor.dataset.serviceHoursHref = anchor.getAttribute("href");
    }

    anchor.removeAttribute("href");
    anchor.setAttribute("aria-disabled", "true");
    anchor.setAttribute("tabindex", "-1");
    anchor.setAttribute("title", CALL_CLOSED_MESSAGE);

    anchor.classList.add(LOCKED_CLASS, CALL_LOCKED_CLASS);

    setElementLabel(anchor, CALL_CLOSED_LABEL);
  }

  function enableCallAnchor(anchor) {
    if (anchor.dataset.serviceHoursHref) {
      anchor.setAttribute("href", anchor.dataset.serviceHoursHref);
      delete anchor.dataset.serviceHoursHref;
    }

    anchor.removeAttribute("aria-disabled");
    anchor.removeAttribute("tabindex");
    anchor.removeAttribute("title");

    anchor.classList.remove(LOCKED_CLASS, CALL_LOCKED_CLASS);

    restoreElementLabel(anchor);
  }

  function removeAfterHoursBanner() {
    document.querySelectorAll(`.${BANNER_CLASS}`).forEach((banner) => {
      banner.remove();
    });
  }

  function getBannerTarget() {
    const wizardHeader = document.querySelector(
      "#primitive-wizard-container .pr-header"
    );

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

    if (!target?.element) {
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
    const closed = isCallClosed();

    document.querySelectorAll("a").forEach((anchor) => {
      if (anchor.closest(`.${BANNER_CLASS}`)) return;
      if (!isCallLink(anchor)) return;

      if (closed) {
        disableCallAnchor(anchor);
      } else {
        enableCallAnchor(anchor);
      }
    });

    renderAfterHoursBanner(closed);

    document.documentElement.classList.toggle(
      "service-hours-closed",
      closed
    );
  }

  document.addEventListener(
    "click",
    (event) => {
      if (!isCallClosed()) return;

      const callTarget = event.target.closest(
        "a[href^='tel:'], a[data-service-hours-href^='tel:']"
      );

      if (!callTarget) return;

      event.preventDefault();
      event.stopPropagation();

      notifyUser(CALL_CLOSED_MESSAGE);
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
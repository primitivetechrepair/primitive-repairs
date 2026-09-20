/*
 * Primitive Tech Repairs
 * Phase 26: Guided Mobile Contact & Service Details
 *
 * Does not replace existing submission validation.
 */

export function requiresServiceLocation(serviceType) {
  return ["meet-up", "pickup", "onsite"].includes(serviceType);
}

export function initMobileContactGuide(form) {
  if (!form) return;

  const isMobile = () =>
    window.matchMedia("(max-width: 960px)").matches;

  const headings = Array.from(
    form.querySelectorAll(".contact-group-heading")
  );

  function headingFor(label) {
    return headings.find(heading =>
      heading.querySelector(".contact-group-number")
        ?.textContent.trim() === label
    );
  }

  const serviceHeading = headingFor("02 / SERVICE");
  const optionalHeading = headingFor("03 / OPTIONAL");
  const consentHeading = headingFor("04 / FINAL CHECK");

  if (!serviceHeading || !optionalHeading || !consentHeading) {
    return;
  }

  function createAction(before, id, label, note) {
    const wrapper = document.createElement("div");

    wrapper.className = "pr-mobile-contact-action";

    const button = document.createElement("button");
    button.type = "button";
    button.id = id;
    button.textContent = label;

    const help = document.createElement("p");
    help.className = "pr-mobile-action-note";
    help.textContent = note;

    wrapper.append(button, help);
    before.before(wrapper);

    return button;
  }

  const serviceButton = createAction(
    serviceHeading,
    "pr-continue-service",
    "Continue to Service Details",
    "Your contact details help us confirm your repair."
  );

  const consentButton = createAction(
    optionalHeading,
    "pr-continue-consent",
    "Continue to Review & Consent",
    "Promotional codes, notes, and photos are optional."
  );

  function scrollToTarget(target) {
    if (!isMobile() || !target) return;

    window.requestAnimationFrame(() => {
      if (!target.isConnected) return;

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

      const top =
        window.scrollY +
        target.getBoundingClientRect().top -
        offset;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      window.scrollTo({
        top: Math.max(0, top),
        behavior: reducedMotion ? "auto" : "smooth"
      });
    });
  }

  const contactIds = [
    "cf-name",
    "cf-phone",
    "cf-email"
  ];

  const locationIds = [
    "cf-zip",
    "cf-address"
  ];

  function firstIncomplete(ids) {
    for (const id of ids) {
      const input = form.querySelector(`#${id}`);

      if (!input) continue;

      if (
        !input.value.trim() ||
        !input.validity.valid
      ) {
        return input;
      }
    }

    return null;
  }

  function contactError() {
    return firstIncomplete(contactIds);
  }

  function serviceError() {
    const missingContact = contactError();

    if (missingContact) return missingContact;

    return firstIncomplete(
      locationIds.filter(id =>
        form.querySelector(`#${id}`)?.required
      )
    );
  }

  function clearError(input) {
    if (!input) return;

    input.removeAttribute("aria-invalid");

    input.closest(".customer-field")
      ?.querySelector(".pr-contact-field-error")
      ?.remove();
  }

  function showError(input) {
    if (!input) return;

    clearError(input);

    input.setAttribute("aria-invalid", "true");

    const wrapper = input.closest(".customer-field");

    if (wrapper) {
      const error = document.createElement("p");

      error.className = "pr-contact-field-error";
      error.setAttribute("role", "alert");

      error.textContent =
        input.value.trim() && !input.validity.valid
          ? input.validationMessage
          : "Please complete this field before continuing.";

      wrapper.appendChild(error);
    }

    scrollToTarget(input);

    window.setTimeout(() => {
      if (input.isConnected && isMobile()) {
        input.focus({ preventScroll: true });
      }
    }, 350);
  }

  serviceButton.addEventListener("click", () => {
    if (!isMobile()) return;

    const missing = contactError();

    if (missing) {
      showError(missing);
      return;
    }

    scrollToTarget(serviceHeading);
  });

  consentButton.addEventListener("click", () => {
    if (!isMobile()) return;

    const missing = serviceError();

    if (missing) {
      showError(missing);
      return;
    }

    scrollToTarget(consentHeading);
  });

  form.addEventListener("input", event => {
    clearError(event.target);
  });

  form.addEventListener("change", event => {
    clearError(event.target);
  });

  /*
   * Native validation still applies.
   * On mobile, show the location of the invalid field.
   */

  let handlingInvalid = false;

  form.addEventListener("invalid", event => {
    if (!isMobile()) return;

    event.preventDefault();

    if (handlingInvalid) return;

    handlingInvalid = true;
    showError(event.target);

    window.setTimeout(() => {
      handlingInvalid = false;
    }, 0);
  }, true);

  /*
   * Catch whitespace-only values before the existing
   * wizard submit handler receives the event.
   */

  form.addEventListener("submit", event => {
    if (!isMobile()) return;

    const missing = serviceError();

    if (!missing) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    showError(missing);
  }, true);
}

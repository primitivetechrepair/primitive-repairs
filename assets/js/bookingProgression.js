/*
 * Primitive Tech Repairs
 * Phase 23: responsive booking progression
 *
 * Presentation-only navigation proxies.
 *
 * The original buttons keep their own event handlers,
 * validation, and booking-state transitions.
 */

const ACTION_SELECTORS = [
  ".repair-select-continue",
  ".repair-details-continue",
  ".repair-info-continue",
  ".appointment-continue"
];

export function initBookingProgression({
  stepsArea,
  formArea
}) {

  if (!stepsArea || !formArea) return;

  const summary = document.getElementById(
    "pr-selection-cards"
  );

  if (!summary) return;

  const desktop = summary.querySelector(
    ".pr-flow-actions-desktop"
  );

  const mobile = summary.querySelector(
    ".pr-flow-actions-mobile"
  );

  if (!desktop || !mobile) return;

  const slots = [desktop, mobile];

  function findSource() {

    if (stepsArea.style.display === "none") {
      return null;
    }

    if (formArea.style.display === "block") {
      return null;
    }

    if (stepsArea.querySelector(
      ".success-panel, .review-panel"
    )) {
      return null;
    }

    for (const selector of ACTION_SELECTORS) {

      const button = stepsArea.querySelector(
        selector
      );

      if (button) return button;

    }

    return null;
  }

  function sync() {

    const source = findSource();

    slots.forEach((slot) => {

      const button = slot.querySelector(
        ".pr-flow-next"
      );

      if (!button) return;

      slot.hidden = !source;

      if (!source) {
        button.textContent = "";
        button.disabled = true;
        return;
      }

      button.textContent =
        source.textContent.trim().replace(/\s+/g, " ");

      button.disabled = source.disabled;

    });

    /*
     * Hide only the original progression control.
     * Its click handler remains attached and active.
     */

    if (source) {
      source.dataset.prActionSource = "true";
    }

  }

  slots.forEach((slot) => {

    const button = slot.querySelector(
      ".pr-flow-next"
    );

    if (!button) return;

    button.addEventListener("click", () => {

      const source = findSource();

      if (!source || source.disabled) return;

      /*
       * Invoke the original button.
       *
       * Appointment validation, repair selection,
       * state updates, and navigation remain owned
       * by their original modules.
       */

      source.click();

    });

  });

  /*
   * The wizard replaces step markup during navigation.
   * Appointment selections can also rerender a step.
   *
   * Reconnect the visual progression controls whenever
   * those existing elements are replaced.
   */

  const observer = new MutationObserver(sync);

  observer.observe(stepsArea, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "disabled",
      "style"
    ]
  });

  sync();

}

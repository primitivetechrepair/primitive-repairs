import { state } from "./state.js?v=20260831-1";

const SERVICE_TYPES = [
  {
  id: "meet-up",
  label: "Meet-Up",
  description: "Schedule a local meet-up at a public place or business location."
},
  {
    id: "pickup",
    label: "Pickup Service",
    description: "Schedule a pickup if available in your service area."
  },
  {
    id: "onsite",
    label: "Onsite Service",
    description: "Request a technician visit when eligible."
  },
  {
    id: "mail-in",
    label: "Mail-In Repair",
    description: "Ship your device in for repair service."
  }
];

const TIME_SLOTS = [
  "7:00 AM",
  "7:30 AM",
  "8:00 AM",
  "8:30 AM",
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "5:30 PM",
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
  "9:30 PM",
  "10:00 PM",
  "10:30 PM",
  "11:00 PM",
  "11:30 PM",
  "12:00 AM",
  "12:30 AM",
  "1:00 AM",
  "1:30 AM",
  "2:00 AM",
  "2:30 AM",
  "3:00 AM",
  "3:30 AM",
  "4:00 AM",
  "4:30 AM",
  "5:00 AM",
  "5:30 AM",
  "6:00 AM",
  "6:30 AM"
];

function getMinDateValue() {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function formatAppointmentDate(dateValue) {
  if (!dateValue) return "";

  const [year, month, day] = dateValue.split("-").map(Number);

  if (!year || !month || !day) return dateValue;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(year, month - 1, day));
}

function renderServiceButtons(selectedServiceType) {
  return SERVICE_TYPES.map((service) => {
    const isSelected = selectedServiceType === service.id;

    return `
      <button
        type="button"
        class="appointment-service-card ${isSelected ? "is-selected" : ""}"
        data-service-type="${service.id}"
      >
        <strong>${service.label}</strong>
        <span>${service.description}</span>
      </button>
    `;
  }).join("");
}

function isAfterHoursTimeSlot(timeSlot) {
  const match = String(timeSlot || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) return false;

  let hour = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (hour === 12) {
    hour = 0;
  }

  if (period === "PM") {
    hour += 12;
  }

  const totalMinutes = (hour * 60) + minutes;

  return totalMinutes >= (19 * 60) || totalMinutes < (7 * 60);
}

function renderTimeSlots(selectedTime, afterHoursOnly = false) {
  return TIME_SLOTS
    .filter((slot) => isAfterHoursTimeSlot(slot) === afterHoursOnly)
    .map((slot) => {
    const isSelected = selectedTime === slot;
    const isAfterHours = isAfterHoursTimeSlot(slot);

    return `
      <button
        type="button"
        class="appointment-time-slot ${isSelected ? "is-selected" : ""} ${isAfterHours ? "is-after-hours" : ""}"
        data-time-slot="${slot}"
        aria-label="${slot}${isAfterHours ? ", includes a $35 after-hours convenience fee" : ""}"
      >
        <span>${slot}</span>
        ${isAfterHours ? `<small>+$35</small>` : ""}
      </button>
    `;
  }).join("");
}

function syncAppointmentFlags(serviceType) {
  state.appointment.pickupRequired = serviceType === "pickup";
  state.appointment.onsite = serviceType === "onsite";
  state.appointment.mailIn = serviceType === "mail-in";
}


/*
 * PHASE 25: GUIDED MOBILE APPOINTMENT
 *
 * Service -> Date -> Time -> Continue
 */

let appointmentScrollSequence = 0;

function scrollToNextAppointmentTarget(container, destination) {

  if (!window.matchMedia("(max-width: 960px)").matches) {
    return;
  }

  const sequence = ++appointmentScrollSequence;

  const actionButton = document.querySelector(
    "#pr-selection-cards " +
    ".pr-flow-actions-mobile .pr-flow-next"
  );

  actionButton?.classList.remove(
    "pr-appointment-ready"
  );

  window.requestAnimationFrame(() => {

    window.requestAnimationFrame(() => {

      if (sequence !== appointmentScrollSequence) {
        return;
      }

      if (!container.querySelector(".appointment-panel")) {
        return;
      }

      const selectors = {

        service: "#pr-appointment-service-section",

        date: "#pr-appointment-date-section",

        time: "#pr-appointment-time-section",

        continue:
          "#pr-selection-cards " +
          ".pr-flow-actions-mobile:not([hidden]) " +
          ".pr-flow-next"

      };

      const target = document.querySelector(
        selectors[destination]
      );

      if (!target || !target.getClientRects().length) {
        return;
      }

      const navigationBottom =
        document.querySelector(".site-nav")
          ?.getBoundingClientRect().bottom ?? 0;

      const bannerBottom =
        document.querySelector(
          ".appointment-deadline-banner"
        )?.getBoundingClientRect().bottom ?? 0;

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
        target.getBoundingClientRect().top;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      window.scrollTo({

        top: Math.max(
          0,
          targetTop - offset
        ),

        behavior: reducedMotion
          ? "auto"
          : "smooth"

      });

      /*
       * Draw attention to the progression button
       * after the final appointment selection.
       */

      if (destination !== "continue" || reducedMotion) {
        return;
      }

      window.setTimeout(() => {

        if (sequence !== appointmentScrollSequence) {
          return;
        }

        if (!container.querySelector(".appointment-panel")) {
          return;
        }

        const complete = Boolean(
          state.appointment.serviceType &&
          state.appointment.date &&
          state.appointment.time
        );

        if (!complete || !target.isConnected) {
          return;
        }

        const rect = target.getBoundingClientRect();

        if (
          rect.bottom <= 0 ||
          rect.top >= window.innerHeight
        ) {
          return;
        }

        target.classList.remove(
          "pr-appointment-ready"
        );

        void target.offsetWidth;

        target.classList.add(
          "pr-appointment-ready"
        );

      }, 650);

    });

  });

}
export function renderAppointmentStep(container, onContinue) {
  if (!container) return;

  container.innerHTML = `
  <section class="appointment-panel">
    <div class="option-section-header appointment-option-header">
      <span>Appointment</span>
      <h3>When should we help?</h3>
      <p>Choose a service option, date, and preferred time. We will confirm availability by text.</p>
    </div>

    <div class="appointment-section" id="pr-appointment-service-section">
        <h4>01 / Service Type</h4>

        <div class="appointment-service-grid">
          ${renderServiceButtons(state.appointment.serviceType)}
        </div>
      </div>

      <div class="appointment-section" id="pr-appointment-date-section">
  <h4>02 / Preferred Date</h4>

  <div class="appointment-date-field ${state.appointment.date ? "has-date" : "is-empty"}">
  <div class="appointment-date-control">
    <input
      type="date"
      class="appointment-date-input"
      id="appointment-date"
      min="${getMinDateValue()}"
      value="${state.appointment.date || ""}"
      required
      aria-label="Preferred date"
      aria-describedby="appointment-date-help"
    >
    <span class="appointment-date-placeholder" aria-hidden="true">Select a date</span>
    <span class="appointment-date-value" aria-hidden="true">${formatAppointmentDate(state.appointment.date)}</span>
  </div>

  <div
    id="appointment-date-help"
    class="appointment-date-help ${state.appointment.date ? "is-selected" : ""}"
  >
    No preferred date selected
  </div>
</div>
</div>

      <div class="appointment-section" id="pr-appointment-time-section">
        <h4>03 / Preferred Time</h4>

        <div class="appointment-time-group">
          <div class="appointment-time-group-header">
            <strong>Standard Hours</strong>
            <span>7:00 AM&ndash;6:30 PM ET</span>
          </div>

          <div class="appointment-time-grid">
            ${renderTimeSlots(state.appointment.time, false)}
          </div>
        </div>

        <details
          class="appointment-after-hours-disclosure"
          ${isAfterHoursTimeSlot(state.appointment.time) ? "open" : ""}
        >
          <summary>
            <span>
              <strong>After-Hours Times</strong>
              <small>7:00 PM&ndash;6:30 AM ET</small>
            </span>
            <span class="appointment-after-hours-fee">
              $35 convenience fee
            </span>
          </summary>

          <div class="appointment-time-grid">
            ${renderTimeSlots(state.appointment.time, true)}
          </div>
        </details>

        <p class="appointment-after-hours-note">
          Your selected time remains a preference until we confirm availability by text.
        </p>
      </div>

      <div class="appointment-actions">
        <button type="button" class="appointment-continue">
          Continue to Contact Details
        </button>
      </div>
    </section>
  `;

  container.querySelectorAll(".appointment-service-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const serviceType = btn.dataset.serviceType;

      state.appointment.serviceType = serviceType;
      syncAppointmentFlags(serviceType);

      renderAppointmentStep(container, onContinue);

      scrollToNextAppointmentTarget(
        container,
        "date"
      );
    });
  });

  const dateInput = container.querySelector("#appointment-date");

  if (dateInput) {
    dateInput.addEventListener("change", () => {
      state.appointment.date = dateInput.value;

      const dateField = dateInput.closest(".appointment-date-field");

      if (dateField) {
        dateField.classList.toggle("is-empty", !dateInput.value);
        dateField.classList.toggle("has-date", Boolean(dateInput.value));

        const dateValue = dateField.querySelector(".appointment-date-value");

        if (dateValue) {
          dateValue.textContent = formatAppointmentDate(dateInput.value);
        }
      }

      const dateHelp = container.querySelector(
        "#appointment-date-help"
      );

      if (dateHelp) {
        dateHelp.classList.toggle(
          "is-selected",
          Boolean(dateInput.value)
        );
      }

      if (state.appointment.date) {

        scrollToNextAppointmentTarget(
          container,
          "time"
        );

      }
    });
  }

  container.querySelectorAll(".appointment-time-slot").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.appointment.time = btn.dataset.timeSlot;

      renderAppointmentStep(container, onContinue);

      /*
       * Guide the customer to the next required
       * field or back to the progression button.
       */

      if (!state.appointment.serviceType) {

        scrollToNextAppointmentTarget(
          container,
          "service"
        );

      } else if (!state.appointment.date) {

        scrollToNextAppointmentTarget(
          container,
          "date"
        );

      } else {

        scrollToNextAppointmentTarget(
          container,
          "continue"
        );

      }
    });
  });

  const continueBtn = container.querySelector(".appointment-continue");

  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      if (!state.appointment.serviceType) {
        alert("Please select a service type.");
        return;
      }

      if (!state.appointment.date) {
        alert("Please select a preferred date.");
        return;
      }

      if (!state.appointment.time) {
        alert("Please select a preferred time.");
        return;
      }

      if (typeof onContinue === "function") {
        onContinue();
      }
    });
  }
}

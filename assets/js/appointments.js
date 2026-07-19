import { state } from "./state.js";

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

function renderTimeSlots(selectedTime) {
  return TIME_SLOTS.map((slot) => {
    const isSelected = selectedTime === slot;

    return `
      <button
        type="button"
        class="appointment-time-slot ${isSelected ? "is-selected" : ""}"
        data-time-slot="${slot}"
      >
        ${slot}
      </button>
    `;
  }).join("");
}

function syncAppointmentFlags(serviceType) {
  state.appointment.pickupRequired = serviceType === "pickup";
  state.appointment.onsite = serviceType === "onsite";
  state.appointment.mailIn = serviceType === "mail-in";
}

export function renderAppointmentStep(container, onContinue) {
  if (!container) return;

  container.innerHTML = `
  <section class="appointment-panel">
    <div class="option-section-header appointment-option-header">
      <span>Appointment</span>
      <h3>Choose your service option.</h3>
      <p>Select how you would like to complete your repair request. Availability and final details will be confirmed after submission.</p>
    </div>

    <div class="appointment-section">
        <h4>Service Type</h4>

        <div class="appointment-service-grid">
          ${renderServiceButtons(state.appointment.serviceType)}
        </div>
      </div>

      <div class="appointment-section">
  <h4>Preferred Date</h4>

  <div class="appointment-date-field">
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

  <div
    id="appointment-date-help"
    class="appointment-date-help ${state.appointment.date ? "is-selected" : ""}"
  >
    No preferred date selected
  </div>
</div>
</div>

      <div class="appointment-section">
        <h4>Preferred Time</h4>

        <div class="appointment-time-grid">
          ${renderTimeSlots(state.appointment.time)}
        </div>

        <p class="appointment-after-hours-note">
          Appointments scheduled from 7:00 PM through 6:30 AM include a $35 after-hours convenience fee.
        </p>
      </div>

      <div class="appointment-actions">
        <button type="button" class="appointment-continue">
          Continue to Customer Info
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
    });
  });

  const dateInput = container.querySelector("#appointment-date");

  if (dateInput) {
    dateInput.addEventListener("change", () => {
      state.appointment.date = dateInput.value;
    });
  }

  container.querySelectorAll(".appointment-time-slot").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.appointment.time = btn.dataset.timeSlot;

      renderAppointmentStep(container, onContinue);
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
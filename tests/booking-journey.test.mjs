import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import {
  getMinDateValue,
  isAfterHoursTimeSlot
} from "../assets/js/appointments.js";

import {
  validateLeadPayload,
  applyAfterHoursBookingDetails
} from "../assets/js/leadSubmission.js";

import {
  requiresServiceLocation
} from "../assets/js/contactGuide.js";

const read = path =>
  readFileSync(
    new URL(`../${path}`, import.meta.url),
    "utf8"
  );

function bookingFixture(serviceType) {
  return {
    customer: {
      name: "Booking QA",
      phone: "3055550199",
      email: "qa@example.com",
      serviceLocation: "",
      zip: ""
    },
    repairs: [
      { name: "Screen Repair" }
    ],
    appointment: {
      serviceType,
      date: "2026-09-20",
      time: "10:00 AM"
    }
  };
}

test("meet-up requires service location and ZIP", () => {
  const payload = bookingFixture("meet-up");
  const errors = validateLeadPayload(payload);

  assert.equal(
    requiresServiceLocation("meet-up"),
    true
  );

  assert.equal(errors.length, 2);
  assert.match(errors.join(" "), /location/i);
  assert.match(errors.join(" "), /ZIP/i);
});

test("pickup requires service location and ZIP", () => {
  const payload = bookingFixture("pickup");
  const errors = validateLeadPayload(payload);

  assert.equal(
    requiresServiceLocation("pickup"),
    true
  );

  assert.equal(errors.length, 2);
});

test("onsite requires service location and ZIP", () => {
  const payload = bookingFixture("onsite");
  const errors = validateLeadPayload(payload);

  assert.equal(
    requiresServiceLocation("onsite"),
    true
  );

  assert.equal(errors.length, 2);
});

test("mail-in does not require service location or ZIP", () => {
  const payload = bookingFixture("mail-in");

  assert.equal(
    requiresServiceLocation("mail-in"),
    false
  );

  assert.deepEqual(
    validateLeadPayload(payload),
    []
  );
});

test("completed local service details pass validation", () => {
  for (const type of [
    "meet-up",
    "pickup",
    "onsite"
  ]) {
    const payload = bookingFixture(type);

    payload.customer.serviceLocation =
      "Public Library, Miami";

    payload.customer.zip = "33101";

    assert.deepEqual(
      validateLeadPayload(payload),
      [],
      type
    );
  }
});

test("calendar uses local date rather than UTC date", () => {
  const moduleUrl = new URL(
    "../assets/js/appointments.js",
    import.meta.url
  ).href;

  const script = `
    import { getMinDateValue } from ${JSON.stringify(moduleUrl)};

    process.stdout.write(JSON.stringify([
      getMinDateValue(
        new Date("2026-09-20T00:30:00Z")
      ),
      getMinDateValue(
        new Date("2026-01-20T02:30:00Z")
      )
    ]));
  `;

  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", script],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        TZ: "America/New_York"
      }
    }
  );

  assert.equal(
    result.status,
    0,
    result.stderr
  );

  assert.deepEqual(
    JSON.parse(result.stdout),
    [
      "2026-09-19",
      "2026-01-19"
    ]
  );
});

test("date helper produces a valid calendar input value", () => {
  const value = getMinDateValue(
    new Date(2026, 8, 20, 12)
  );

  assert.equal(value, "2026-09-20");
});

test("standard-hour boundaries are correct", () => {
  for (const time of [
    "7:00 AM",
    "12:00 PM",
    "6:30 PM"
  ]) {
    assert.equal(
      isAfterHoursTimeSlot(time),
      false,
      time
    );
  }
});

test("after-hours boundaries are correct", () => {
  for (const time of [
    "7:00 PM",
    "11:30 PM",
    "12:00 AM",
    "6:30 AM"
  ]) {
    assert.equal(
      isAfterHoursTimeSlot(time),
      true,
      time
    );
  }
});

test("after-hours fee matches selected time", () => {
  for (const [time, expectedFee] of [
    ["6:30 PM", 0],
    ["7:00 PM", 35],
    ["12:00 AM", 35],
    ["6:30 AM", 35],
    ["7:00 AM", 0]
  ]) {
    const payload = bookingFixture("meet-up");

    payload.appointment.time = time;

    applyAfterHoursBookingDetails(payload);

    assert.equal(
      payload.appointment.convenienceFee,
      expectedFee,
      time
    );

    assert.equal(
      payload.appointment.afterHours,
      expectedFee > 0,
      time
    );
  }
});

test("back to appointment preserves repair and appointment state", () => {
  const wizard = read("assets/js/wizard.js");

  const start = wizard.indexOf(
    '  if (backBtn) {'
  );

  const end = wizard.indexOf(
    '  if (customerForm) {',
    start
  );

  assert.ok(start >= 0);
  assert.ok(end > start);

  const backHandler = wizard.slice(start, end);

  assert.match(
    backHandler,
    /state\.appointmentSelected = false/
  );

  assert.doesNotMatch(
    backHandler,
    /state\.repairs\s*=\s*\[\]/
  );

  assert.doesNotMatch(
    backHandler,
    /state\.appointment\s*=\s*\{/
  );

  assert.doesNotMatch(
    backHandler,
    /customerForm\.reset\(/
  );
});

test("review back preserves the completed contact form", () => {
  const wizard = read("assets/js/wizard.js");

  const reviewBack = wizard.split(
    "        onBack: () => {"
  )[1]?.split(
    "        onSubmit: async"
  )[0];

  assert.ok(reviewBack);

  assert.match(
    reviewBack,
    /formArea\.style\.display = "block"/
  );

  assert.doesNotMatch(
    reviewBack,
    /customerForm\.reset\(/
  );
});

test("submission safety mechanisms remain connected", () => {
  const wizard = read("assets/js/wizard.js");

  assert.match(
    wizard,
    /repairSubmitLocked = true/
  );

  assert.match(
    wizard,
    /submitWizardLead\(/
  );

  assert.match(
    wizard,
    /submissionErrorPresentation\(err\)/
  );

  assert.match(
    wizard,
    /requiresNewRequest/
  );

  assert.match(
    wizard,
    /resetWizardSubmission\(\)/
  );
});

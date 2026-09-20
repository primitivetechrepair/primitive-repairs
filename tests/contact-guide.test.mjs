import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  requiresServiceLocation
} from "../assets/js/contactGuide.js";

const read = path => readFileSync(
  new URL(`../${path}`, import.meta.url),
  "utf8"
);

test("local services require location", () => {
  for (const type of ["meet-up", "pickup", "onsite"]) {
    assert.equal(requiresServiceLocation(type), true);
  }
});

test("mail-in location is optional", () => {
  assert.equal(requiresServiceLocation("mail-in"), false);
});

test("mobile contact navigation is present", () => {
  const source = read("assets/js/contactGuide.js");

  assert.match(source, /Continue to Service Details/);
  assert.match(source, /Continue to Review & Consent/);
  assert.match(source, /firstIncomplete/);
});

test("wizard retains submission validation", () => {
  const source = read("assets/js/wizard.js");

  assert.match(source, /validateLeadPayload\(leadPayload\)/);
  assert.match(source, /submitWizardLead\(/);

  assert.match(
    source,
    /addressInput\.required = requiresLocation/
  );

  assert.match(
    source,
    /zipInput\.required = requiresLocation/
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path =>
  readFileSync(
    new URL(`../${path}`, import.meta.url),
    "utf8"
  );

test("final review uses one submission button", () => {

  const renderer = read("assets/js/renderer.js");

  assert.match(
    renderer,
    /review-jump-to-actions/
  );

  assert.match(
    renderer,
    /id="pr-review-actions"/
  );

  assert.match(
    renderer,
    /class="review-submit"/
  );

});

test("existing submission system remains connected", () => {

  const wizard = read("assets/js/wizard.js");

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
    /repairSubmitLocked = true/
  );

  assert.match(
    wizard,
    /resetWizardSubmission\(\)/
  );

});

test("submission loading and recovery are presented", () => {

  const wizard = read("assets/js/wizard.js");

  assert.match(
    wizard,
    /Sending your repair request/
  );

  assert.match(
    wizard,
    /reviewBackButton\.disabled = true/
  );

  assert.match(
    wizard,
    /reviewBackButton\.disabled = false/
  );

  assert.match(
    wizard,
    /is-submitting/
  );

});

test("motion preferences are respected", () => {

  const css = read(
    "assets/css/booking-final-review-polish.css"
  );

  assert.match(
    css,
    /prefers-reduced-motion: reduce/
  );

  assert.match(
    css,
    /prReviewSpinnerP27/
  );

  assert.match(
    css,
    /prConfirmationEnterP27/
  );

});

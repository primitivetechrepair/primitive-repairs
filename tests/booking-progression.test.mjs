import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) =>
  readFileSync(
    new URL(`../${path}`, import.meta.url),
    "utf8"
  );

test("progression controls have separate desktop and mobile locations", () => {

  const html = read("index.html");

  assert.match(
    html,
    /pr-flow-actions pr-flow-actions-desktop/
  );

  assert.match(
    html,
    /pr-flow-actions pr-flow-actions-mobile/
  );

});

test("progression delegates to existing booking handlers", () => {

  const source = read(
    "assets/js/bookingProgression.js"
  );

  assert.match(
    source,
    /source\.click\(\)/
  );

  assert.match(
    source,
    /appointment-continue/
  );

  assert.match(
    source,
    /repair-details-continue/
  );

  assert.doesNotMatch(
    source,
    /\.review-submit/
  );

});

test("success screen provides a request ID copy action", () => {

  const source = read("assets/js/renderer.js");

  assert.match(
    source,
    /success-copy-request-id/
  );

  assert.match(
    source,
    /navigator\.clipboard\.writeText\(requestId\)/
  );

});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import test from "node:test";

import {
  IntakeMappingError,
  mapRepairFlowToPublicIntake,
  serviceChannelForWebsiteMode
} from "../assets/js/intakeAdapter.js";
import {
  fetchIntakeRuntimeConfig,
  IntakeClientError,
  PublicIntakeClient
} from "../assets/js/intakeClient.js";
import {
  SubmissionStateError,
  SubmissionStateStore
} from "../assets/js/submissionState.js";
import intakeConfigHandler, { readIntakeConfig } from "../api/intake-config.js";

const ENDPOINT = "https://benchlayer-preview.example/api/public/intake";
const CREDENTIAL = "public-preview-intake-credential-1234567890";
const CONFIRMATION = "PTR-0123456789ABCDEFABCD";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values: () => [...values.values()]
  };
}

function wizardFixture(overrides = {}) {
  const base = {
    requestId: "legacy-unsafe-id",
    customer: {
      name: "Preview Repair Test",
      phone: "+1 (305) 555-0199",
      email: "PREVIEW@EXAMPLE.COM",
      address: "Public Library, Miami",
      serviceLocation: "Public Library, Miami",
      apt: "",
      zip: "33101"
    },
    device: {
      type: "Phone",
      brand: "Apple",
      series: "iPhone 16 Series",
      model: "iPhone 16",
      modelId: "model-iphone-16-stable",
      image: "/images/models/apple/iphone16.webp"
    },
    repairs: [{
      id: "repair-screen-stable",
      name: "Screen Repair",
      time: "60-90 minutes",
      warranty: "Limited repair warranty",
      symptoms: [],
      details: "Controlled validation only."
    }],
    addOns: [{
      id: "protector",
      sku: "SP-16",
      name: "Screen Protector",
      label: "Screen Protector",
      price: 39.99,
      quantity: 1,
      installed: true,
      available: true,
      stockQuantityAtSelection: 7,
      compatibleBrand: "Apple",
      compatibleModel: "iPhone 16"
    }],
    promotion: {
      code: "TEST",
      status: "Pending verification",
      source: "Customer-entered promotion code",
      offerType: "Promotion",
      verification: "Validation required."
    },
    appointment: {
      serviceType: "meet-up",
      date: "2026-09-15",
      time: "7:30 PM",
      technician: "must-not-survive",
      pickupRequired: false,
      mailIn: false,
      onsite: false,
      afterHours: true,
      convenienceFee: 35,
      convenienceFeeLabel: "$35 after-hours convenience fee"
    },
    notes: "Synthetic Preview request.",
    attachments: [],
    organization_id: "must-not-survive",
    location_id: "must-not-survive",
    status: "Completed",
    assigned_to: "must-not-survive",
    repair_cost: 999,
    source: "must-not-survive"
  };
  return {
    ...base,
    ...overrides,
    customer: { ...base.customer, ...(overrides.customer || {}) },
    device: { ...base.device, ...(overrides.device || {}) },
    appointment: { ...base.appointment, ...(overrides.appointment || {}) }
  };
}

function mappedFixture(overrides = {}) {
  return mapRepairFlowToPublicIntake(wizardFixture(overrides), {
    submissionId: "11111111-1111-4111-8111-111111111111"
  });
}

function response(body, status = 201, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });
}

function store(storage = memoryStorage()) {
  return new SubmissionStateStore({ storage, cryptoImpl: webcrypto, now: () => 1000 });
}

function client({ fetchImpl, stateStore = store(), timeoutMs = 1000, now } = {}) {
  return new PublicIntakeClient({
    endpoint: ENDPOINT,
    credential: CREDENTIAL,
    fetchImpl,
    stateStore,
    timeoutMs,
    now
  });
}

test("pure mapper emits only Public Intake V1 fields and stable catalog model ID", () => {
  const payload = mappedFixture();
  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.requestId, "11111111-1111-4111-8111-111111111111");
  assert.equal(payload.customer.email, "preview@example.com");
  assert.equal(payload.device.modelId, "model-iphone-16-stable");
  assert.equal(payload.repairs[0].name, "Screen Repair");
  assert.equal(payload.appointment.serviceType, "meet-up");
  assert.deepEqual(payload.attachments, []);

  const output = JSON.stringify(payload);
  for (const forbidden of [
    "organization_id", "location_id", "lead_id", "assigned_to",
    "assigned_by", "payment_method", "payment_status", "repair_cost",
    "labor_amount", "inventory", "connection_id", "technician",
    "convenienceFee", "stockQuantityAtSelection", "available"
  ]) assert.equal(output.includes(forbidden), false, forbidden);
  assert.equal(Object.hasOwn(payload, "status"), false);
  assert.equal(Object.hasOwn(payload, "source"), false);
  assert.equal(output.includes("39.99"), false);
});

test("service modes retain the frozen website-to-Lead mapping", () => {
  assert.deepEqual(Object.fromEntries(
    ["pickup", "onsite", "mail-in", "meet-up"]
      .map((mode) => [mode, serviceChannelForWebsiteMode(mode)])), {
    pickup: "pickup_delivery",
    onsite: "mobile",
    "mail-in": "mail_in",
    "meet-up": "mobile"
  });
  assert.equal(mappedFixture().appointment.serviceType, "meet-up");
});

test("address semantics are preserved and attachment submission fails closed", () => {
  for (const serviceType of ["meet-up", "pickup", "onsite"]) {
    assert.throws(() => mappedFixture({
      customer: { serviceLocation: "", address: "", zip: "" },
      appointment: { serviceType }
    }), (error) => error instanceof IntakeMappingError && error.code === "service_location_required");
  }
  const mailIn = mappedFixture({
    customer: { serviceLocation: "", address: "", zip: "" },
    appointment: { serviceType: "mail-in" }
  });
  assert.equal(mailIn.customer.serviceLocation, "");
  assert.throws(() => mappedFixture({
    attachments: [{ name: "photo.jpg", size: 10 }]
  }), (error) => error.code === "attachments_not_supported");
});

test("submission identity is strong, persists across refresh, and stores no payload or bearer", async () => {
  const storage = memoryStorage();
  const first = store(storage);
  const payload = mappedFixture();
  const prepared = await first.prepare(payload);
  assert.match(prepared.idempotencyKey, /^pr_[0-9a-f-]{36}_[0-9a-f]{48}$/i);
  first.markAmbiguous();

  const refreshed = store(storage);
  const restored = await refreshed.prepare(payload);
  assert.equal(restored.idempotencyKey, prepared.idempotencyKey);
  assert.equal(restored.submissionId, prepared.submissionId);
  const stored = storage.values().join(" ");
  assert.equal(stored.includes(CREDENTIAL), false);
  assert.equal(stored.includes("Preview Repair Test"), false);
  assert.equal(stored.includes("preview@example.com"), false);
});

test("changed payload after an ambiguous attempt is blocked for state review", async () => {
  const stateStore = store();
  await stateStore.prepare(mappedFixture());
  stateStore.markAmbiguous();
  await assert.rejects(stateStore.prepare(mappedFixture({ notes: "Changed" })), (error) =>
    error instanceof SubmissionStateError && error.code === "submission_payload_changed");
});

test("normal submission uses headers, never bearer URLs, and maps safe confirmation", async () => {
  const calls = [];
  const result = await client({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response({ ok: true, confirmationReference: CONFIRMATION, status: "received", replayed: false });
    }
  }).submit(mappedFixture());
  assert.equal(result.confirmationReference, CONFIRMATION);
  assert.equal(result.replayed, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, ENDPOINT);
  assert.equal(calls[0].url.includes(CREDENTIAL), false);
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${CREDENTIAL}`);
  assert.match(calls[0].options.headers["Idempotency-Key"], /^pr_/);
  assert.equal(calls[0].options.credentials, "omit");
});

test("double click and concurrent submission share one network request", async () => {
  let calls = 0;
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const intake = client({
    fetchImpl: async () => {
      calls += 1;
      await pending;
      return response({ ok: true, confirmationReference: CONFIRMATION, status: "received", replayed: false });
    }
  });
  const first = intake.submit(mappedFixture());
  const second = intake.submit(mappedFixture());
  assert.equal(first, second);
  release();
  assert.equal((await first).confirmationReference, CONFIRMATION);
  assert.equal(calls, 1);
});

test("ambiguous network failure retries with the same idempotency key", async () => {
  const keys = [];
  let calls = 0;
  const intake = client({
    fetchImpl: async (_url, options) => {
      calls += 1;
      keys.push(options.headers["Idempotency-Key"]);
      if (calls === 1) throw new TypeError("network unavailable");
      return response({ ok: true, confirmationReference: CONFIRMATION, status: "received", replayed: true }, 200);
    }
  });
  await assert.rejects(intake.submit(mappedFixture()), (error) =>
    error instanceof IntakeClientError && error.code === "intake_network_error" && error.ambiguous);
  const retried = await intake.submit(mappedFixture());
  assert.equal(retried.replayed, true);
  assert.equal(keys[0], keys[1]);
});

test("429 honors Retry-After and reuses the same logical submission", async () => {
  const keys = [];
  let calls = 0;
  const intake = client({
    fetchImpl: async (_url, options) => {
      calls += 1;
      keys.push(options.headers["Idempotency-Key"]);
      if (calls === 1) return response({ ok: false, error: "rate_limited" }, 429, { "retry-after": "45" });
      return response({ ok: true, confirmationReference: CONFIRMATION, status: "received", replayed: false });
    }
  });
  await assert.rejects(intake.submit(mappedFixture()), (error) =>
    error.code === "rate_limited" && error.retryAfterSeconds === 45);
  await intake.submit(mappedFixture());
  assert.equal(keys[0], keys[1]);
});

test("idempotency conflict remains a safe terminal review state", async () => {
  let calls = 0;
  const intake = client({ fetchImpl: async () => {
    calls += 1;
    return response({ ok: false, error: "idempotency_conflict" }, 409);
  } });
  await assert.rejects(intake.submit(mappedFixture()), (error) =>
    error.code === "idempotency_conflict" && error.status === 409);
  await assert.rejects(intake.submit(mappedFixture()), (error) =>
    error.code === "submission_conflict_unresolved");
  assert.equal(calls, 1);
});

test("safe client errors cover validation, authentication, size, and provider failure", async () => {
  for (const [status, body, code] of [
    [400, { ok: false, error: "validation_failed", issues: [{ path: "customer.email", code: "invalid_email" }] }, "validation_failed"],
    [401, { ok: false, error: "intake_unavailable" }, "intake_unavailable"],
    [413, { ok: false, error: "request_too_large" }, "request_too_large"],
    [503, { ok: false, error: "public_intake_failed" }, "intake_server_error"]
  ]) {
    const intake = client({ fetchImpl: async () => response(body, status) });
    await assert.rejects(intake.submit(mappedFixture()), (error) => {
      assert.equal(error.code, code);
      assert.equal(error.status, status);
      assert.equal(error.message.includes(body.error), false);
      return true;
    });
  }
});

test("a saved success resolves after refresh without a second request; clear creates a new identity", async () => {
  const storage = memoryStorage();
  const firstStore = store(storage);
  const firstClient = client({
    stateStore: firstStore,
    fetchImpl: async () => response({ ok: true, confirmationReference: CONFIRMATION, status: "received", replayed: false })
  });
  await firstClient.submit(mappedFixture());
  const oldKey = firstStore.read().idempotencyKey;

  let calls = 0;
  const refreshed = client({ stateStore: store(storage), fetchImpl: async () => { calls += 1; } });
  const restored = await refreshed.submit(mappedFixture());
  assert.equal(restored.confirmationReference, CONFIRMATION);
  assert.equal(restored.restored, true);
  assert.equal(calls, 0);

  refreshed.stateStore.clear();
  const nextKey = refreshed.stateStore.identity().idempotencyKey;
  assert.notEqual(nextKey, oldKey);
});

test("runtime config has explicit legacy rollback and validates the intake endpoint", async () => {
  assert.deepEqual(readIntakeConfig({}), { provider: "legacy" });
  assert.deepEqual(readIntakeConfig({ INTAKE_PROVIDER: "legacy" }), { provider: "legacy" });
  assert.deepEqual(readIntakeConfig({
    INTAKE_PROVIDER: "benchlayer",
    BENCHLAYER_PUBLIC_INTAKE_URL: ENDPOINT,
    BENCHLAYER_PUBLIC_CONNECTION_TOKEN: CREDENTIAL
  }), { provider: "benchlayer", endpoint: ENDPOINT, credential: CREDENTIAL });
  assert.throws(() => readIntakeConfig({
    INTAKE_PROVIDER: "benchlayer",
    BENCHLAYER_PUBLIC_INTAKE_URL: "https://benchlayer-preview.example/api/customer/estimate",
    BENCHLAYER_PUBLIC_CONNECTION_TOKEN: CREDENTIAL
  }));

  const config = await fetchIntakeRuntimeConfig(async (url, options) => {
    assert.equal(url, "/api/intake-config");
    assert.equal(options.credentials, "same-origin");
    return response({ ok: true, provider: "legacy" }, 200);
  });
  assert.deepEqual(config, { provider: "legacy" });
});

test("config endpoint is GET-only, no-store, and does not grant cross-origin access", () => {
  const headers = new Map();
  const res = {
    statusCode: 0,
    body: null,
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  intakeConfigHandler({ method: "POST" }, res);
  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { ok: false, error: "method_not_allowed" });
  assert.match(headers.get("cache-control"), /no-store/);
  assert.equal(headers.has("access-control-allow-origin"), false);
});

test("source contains no bearer persistence and no Lead write outside public intake", async () => {
  const files = [
    "assets/js/intakeAdapter.js",
    "assets/js/intakeClient.js",
    "assets/js/submissionState.js",
    "assets/js/leadSubmitter.js",
    "api/intake-config.js"
  ];
  const sources = await Promise.all(files.map((file) =>
    readFile(new URL(`../${file}`, import.meta.url), "utf8")));
  const output = sources.join("\n");
  assert.doesNotMatch(output, /(?:localStorage|sessionStorage).*credential/i);
  assert.doesNotMatch(output, /supabase\.co\/rest|from\(["']leads|insert\(/i);
  assert.match(output, /\/api\/public\/intake/);
  assert.doesNotMatch(output, /[?&](?:token|credential|authorization)=/i);
});

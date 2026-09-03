import { SubmissionStateStore } from "./submissionState.js";

const CONFIG_PATH = "/api/intake-config";
const MAX_RESPONSE_BYTES = 64 * 1024;

export class IntakeClientError extends Error {
  constructor(code, { status = 0, retryAfterSeconds = 0, ambiguous = false, issues = [] } = {}) {
    super("The repair request could not be confirmed.");
    this.name = "IntakeClientError";
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
    this.ambiguous = ambiguous;
    this.issues = issues;
  }
}

function failure(code, options) {
  throw new IntakeClientError(code, options);
}

function validEndpoint(value) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash
      || url.pathname !== "/api/public/intake") {
      failure("intake_configuration_invalid");
    }
    return url.toString();
  } catch (error) {
    if (error instanceof IntakeClientError) throw error;
    failure("intake_configuration_invalid");
  }
}

function validCredential(value) {
  const credential = String(value || "").trim();
  if (credential.length < 32 || credential.length > 256
    || /[\u0000-\u0020\u007f]/u.test(credential)) {
    failure("intake_configuration_invalid");
  }
  return credential;
}

export async function fetchIntakeRuntimeConfig(fetchImpl = globalThis.fetch) {
  let response;
  try {
    response = await fetchImpl(CONFIG_PATH, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      redirect: "error"
    });
  } catch {
    failure("intake_configuration_unavailable");
  }
  if (!response?.ok) failure("intake_configuration_unavailable", { status: response?.status || 0 });

  let body;
  try {
    body = await response.json();
  } catch {
    failure("intake_configuration_invalid");
  }
  const provider = String(body?.provider || "").trim().toLowerCase();
  if (provider === "legacy") return { provider };
  if (provider !== "benchlayer") failure("intake_configuration_invalid");
  return {
    provider,
    endpoint: validEndpoint(body.endpoint),
    credential: validCredential(body.credential)
  };
}

function retryAfterSeconds(response, now = Date.now()) {
  const value = String(response.headers?.get?.("retry-after") || "").trim();
  if (/^\d+$/.test(value)) return Math.min(Number(value), 3600);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, Math.min(Math.ceil((date - now) / 1000), 3600)) : 0;
}

async function readBody(response) {
  const declared = Number(response.headers?.get?.("content-length") || 0);
  if (declared > MAX_RESPONSE_BYTES) failure("intake_response_invalid", { status: response.status, ambiguous: response.ok });
  const raw = await response.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_RESPONSE_BYTES) {
    failure("intake_response_invalid", { status: response.status, ambiguous: response.ok });
  }
  try {
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid");
    return body;
  } catch (error) {
    if (error instanceof IntakeClientError) throw error;
    failure("intake_response_invalid", { status: response.status, ambiguous: response.ok });
  }
}

export class PublicIntakeClient {
  constructor({
    endpoint,
    credential,
    fetchImpl = globalThis.fetch,
    stateStore = new SubmissionStateStore(),
    timeoutMs = 15000,
    now = () => Date.now()
  }) {
    this.endpoint = validEndpoint(endpoint);
    this.credential = validCredential(credential);
    this.fetchImpl = (...args) => fetchImpl(...args);
    this.stateStore = stateStore;
    this.timeoutMs = timeoutMs;
    this.now = now;
    this.inFlight = null;
  }

  submit(payload) {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.performSubmit(payload).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  async performSubmit(payload) {
    const prepared = await this.stateStore.prepare(payload);
    if (prepared.state === "succeeded" && /^PTR-[A-F0-9]{20}$/.test(prepared.confirmationReference || "")) {
      return {
        success: true,
        confirmationReference: prepared.confirmationReference,
        status: "received",
        replayed: true,
        restored: true
      };
    }
    this.stateStore.markSubmitting();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    try {
      response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.credential}`,
          "Content-Type": "application/json",
          "Idempotency-Key": prepared.idempotencyKey
        },
        body: JSON.stringify(payload),
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        redirect: "error",
        referrerPolicy: "no-referrer",
        signal: controller.signal
      });
    } catch (error) {
      this.stateStore.markAmbiguous();
      failure(error?.name === "AbortError" ? "intake_timeout" : "intake_network_error", {
        ambiguous: true
      });
    } finally {
      clearTimeout(timeout);
    }

    let body;
    try {
      body = await readBody(response);
    } catch (error) {
      if (error?.ambiguous) this.stateStore.markAmbiguous();
      else this.stateStore.markRetryable();
      throw error;
    }

    if (response.ok) {
      if (body.ok !== true || body.status !== "received"
        || !/^PTR-[A-F0-9]{20}$/.test(String(body.confirmationReference || ""))) {
        this.stateStore.markAmbiguous();
        failure("intake_response_invalid", { status: response.status, ambiguous: true });
      }
      this.stateStore.markSucceeded(body.confirmationReference);
      return {
        success: true,
        confirmationReference: body.confirmationReference,
        status: "received",
        replayed: body.replayed === true,
        restored: false
      };
    }

    const status = response.status;
    if (status === 409) {
      this.stateStore.markConflict();
      failure("idempotency_conflict", { status });
    }
    if (status === 429) {
      this.stateStore.markRetryable();
      failure("rate_limited", { status, retryAfterSeconds: retryAfterSeconds(response, this.now()) });
    }
    if (status === 400) {
      this.stateStore.markRejected();
      const issues = Array.isArray(body.issues) ? body.issues.slice(0, 32) : [];
      failure("validation_failed", { status, issues });
    }
    if (status === 413) {
      this.stateStore.markRejected();
      failure("request_too_large", { status });
    }
    if (status === 401 || status === 403) {
      this.stateStore.markRetryable();
      failure("intake_unavailable", { status });
    }
    if (status >= 500) {
      this.stateStore.markAmbiguous();
      failure("intake_server_error", { status, ambiguous: true });
    }
    this.stateStore.markRetryable();
    failure("intake_failed", { status });
  }
}

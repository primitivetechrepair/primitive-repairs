const VERSION = 1;
const DEFAULT_STORAGE_KEY = "primitive-repairs:public-intake:submission:v1";
const VALID_STATES = new Set([
  "draft", "ready", "submitting", "ambiguous", "retryable",
  "rejected", "conflict", "succeeded"
]);

export class SubmissionStateError extends Error {
  constructor(code) {
    super("The saved repair submission state requires review.");
    this.name = "SubmissionStateError";
    this.code = code;
  }
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])])
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalValue(value));
}

function hex(bytes) {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function validRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value)
    && value.version === VERSION
    && /^[0-9a-f-]{36}$/i.test(String(value.submissionId || ""))
    && /^pr_[A-Za-z0-9._:-]{40,120}$/.test(String(value.idempotencyKey || ""))
    && VALID_STATES.has(value.state)
    && (value.payloadFingerprint == null || /^[0-9a-f]{64}$/.test(value.payloadFingerprint))
    && Number.isFinite(value.createdAt)
    && Number.isFinite(value.updatedAt);
}

export class SubmissionStateStore {
  constructor({
    storage = globalThis.sessionStorage,
    cryptoImpl = globalThis.crypto,
    now = () => Date.now(),
    storageKey = DEFAULT_STORAGE_KEY
  } = {}) {
    this.storage = storage;
    this.crypto = cryptoImpl;
    this.now = now;
    this.storageKey = storageKey;
  }

  read() {
    try {
      const value = JSON.parse(this.storage?.getItem(this.storageKey) || "null");
      if (!validRecord(value)) {
        this.clear();
        return null;
      }
      if (value.state === "submitting") {
        value.state = "ambiguous";
        value.updatedAt = this.now();
        this.write(value);
      }
      return value;
    } catch {
      this.clear();
      return null;
    }
  }

  write(value) {
    this.storage?.setItem(this.storageKey, JSON.stringify(value));
    return value;
  }

  clear() {
    try {
      this.storage?.removeItem(this.storageKey);
    } catch {
      // Submission can continue in memory if browser storage is unavailable.
    }
  }

  createIdentity() {
    if (!this.crypto?.getRandomValues || !this.crypto?.randomUUID) {
      throw new SubmissionStateError("secure_random_unavailable");
    }
    const submissionId = this.crypto.randomUUID();
    const random = new Uint8Array(24);
    this.crypto.getRandomValues(random);
    const timestamp = this.now();
    return this.write({
      version: VERSION,
      submissionId,
      idempotencyKey: `pr_${submissionId}_${hex(random)}`,
      payloadFingerprint: null,
      state: "draft",
      createdAt: timestamp,
      updatedAt: timestamp,
      confirmationReference: null
    });
  }

  identity() {
    return this.read() || this.createIdentity();
  }

  async fingerprint(payload) {
    if (!this.crypto?.subtle?.digest) {
      throw new SubmissionStateError("secure_digest_unavailable");
    }
    const bytes = new TextEncoder().encode(canonicalJson(payload));
    return hex(new Uint8Array(await this.crypto.subtle.digest("SHA-256", bytes)));
  }

  async prepare(payload) {
    const current = this.identity();
    if (current.state === "conflict") {
      throw new SubmissionStateError("submission_conflict_unresolved");
    }
    const fingerprint = await this.fingerprint(payload);
    if (current.payloadFingerprint && current.payloadFingerprint !== fingerprint) {
      if (new Set(["submitting", "ambiguous", "retryable", "conflict", "succeeded"])
        .has(current.state)) {
        throw new SubmissionStateError("submission_payload_changed");
      }
    }
    return this.write({
      ...current,
      payloadFingerprint: fingerprint,
      state: current.state === "succeeded" ? "succeeded" : "ready",
      updatedAt: this.now()
    });
  }

  transition(state, extra = {}) {
    const current = this.read();
    if (!current || !VALID_STATES.has(state)) {
      throw new SubmissionStateError("submission_state_unavailable");
    }
    return this.write({ ...current, ...extra, state, updatedAt: this.now() });
  }

  markSubmitting() { return this.transition("submitting"); }
  markAmbiguous() { return this.transition("ambiguous"); }
  markRetryable() { return this.transition("retryable"); }
  markRejected() { return this.transition("rejected"); }
  markConflict() { return this.transition("conflict"); }
  markSucceeded(confirmationReference) {
    return this.transition("succeeded", { confirmationReference });
  }
}

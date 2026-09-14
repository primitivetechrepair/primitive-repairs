import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

import { buildWebsiteCatalog } from "./website-catalog-source.mjs";

const text = (value) => String(value ?? "").trim();

function required(name) {
  const value = text(process.env[name]);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function syncUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash
    || url.pathname !== "/api/public/catalog-sync") {
    throw new Error("BENCHLAYER_WEBSITE_CATALOG_SYNC_URL must be the exact HTTPS catalog-sync endpoint.");
  }
  return url.toString();
}

function gitRevision() {
  try {
    return text(execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }));
  } catch {
    return "revision-unavailable";
  }
}

const endpoint = syncUrl(required("BENCHLAYER_WEBSITE_CATALOG_SYNC_URL"));
const credential = required("BENCHLAYER_WEBSITE_CATALOG_SYNC_TOKEN");
if (credential.length < 32 || credential.length > 256) {
  throw new Error("BENCHLAYER_WEBSITE_CATALOG_SYNC_TOKEN is invalid.");
}
const catalog = await buildWebsiteCatalog();
const sourceRevision = gitRevision();
const payload = JSON.stringify({ catalog, sourceRevision });
const payloadHash = createHash("sha256").update(payload).digest("hex");
const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    authorization: `Bearer ${credential}`,
    "content-type": "application/json",
    "idempotency-key": `repairlab-${payloadHash.slice(0, 48)}`,
  },
  body: payload,
});
const result = await response.json().catch(() => ({}));
if (!response.ok || result?.ok !== true || result?.staged !== true) {
  throw new Error(`Website catalog sync was rejected (${response.status} ${text(result?.error) || "unknown_error"}).`);
}
console.log(
  result.replayed
    ? "Website catalog revision was already staged."
    : "Website catalog staged in BenchLayer for review and publish."
);

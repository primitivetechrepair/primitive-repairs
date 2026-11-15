import { readFile } from "node:fs/promises";
import { isBrandAllowedForDevice } from "../assets/js/categoryBrands.js";

const SOURCE_URL = new URL("../catalog/website-catalog.v4.json", import.meta.url);
const ENTITY_COLLECTIONS = ["devices", "brands", "series", "models", "repairs"];
const RETIRED_PLACEHOLDER_SERIES = new Set([
  "iphone 16 model",
  "iphone 17",
  "iphone 2 series"
]);
const clone = (value) => globalThis.structuredClone
  ? structuredClone(value)
  : JSON.parse(JSON.stringify(value));

function assertSourceShape(catalog) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog) || catalog.version !== 4) {
    throw new Error("The website catalog source must be a version 4 catalog document.");
  }
  for (const collection of [...ENTITY_COLLECTIONS, "modelRepairs"]) {
    if (!Array.isArray(catalog[collection])) {
      throw new Error(`The website catalog source is missing ${collection}.`);
    }
  }
  for (const series of catalog.series) {
    const label = String(series?.label ?? "").trim().toLowerCase();
    if (series?.active !== false && RETIRED_PLACEHOLDER_SERIES.has(label)) {
      throw new Error(`The retired placeholder series must remain inactive: ${series.id}.`);
    }
  }
  const devices = new Map(catalog.devices.map((device) => [device.id, device]));
  for (const brand of catalog.brands) {
    const device = devices.get(brand.parentId);
    if (device?.active && brand.active && !isBrandAllowedForDevice(device.label, brand.label)) {
      throw new Error(`Brand is not eligible for its device category: ${device.label} / ${brand.label}.`);
    }
  }
}

/**
 * Reads the source-controlled website catalog. Image metadata is stripped at
 * the boundary even if a future edit accidentally adds it: RepairLab owns its
 * image files locally, while BenchLayer presentation remains independent.
 */
export async function buildWebsiteCatalog() {
  const catalog = JSON.parse(await readFile(SOURCE_URL, "utf8"));
  assertSourceShape(catalog);
  const result = clone(catalog);
  for (const collection of ENTITY_COLLECTIONS) {
    for (const entry of result[collection]) {
      if (entry?.metadata && typeof entry.metadata === "object") {
        delete entry.metadata.imageUrl;
      }
    }
  }
  return result;
}

export const websiteCatalogSourceUrl = SOURCE_URL;

import { loadCatalog as loadLegacyCatalog } from "./catalog.js?v=20260831-1";
import {
  adaptPublicCatalogV1,
  createStableOptionId
} from "./catalogAdapter.js?v=20260831-1";
import {
  fetchCatalogRuntimeConfig,
  PublicCatalogClient
} from "./catalogClient.js?v=20260901-4";

const LEGACY_DEVICES = [
  "Phone",
  "Tablet",
  "Computer",
  "Console",
  "Smartwatch",
  "Mods",
  "Other"
];

const LEGACY_BRANDS = {
  Phone: [
    "Apple", "Samsung", "Google", "Motorola", "Alcatel", "ASUS",
    "BlackBerry", "Huawei", "HTC", "LG", "Nokia", "Nothing", "Oppo",
    "Realme", "Sony", "Xiaomi", "ZTE"
  ],
  Tablet: ["Apple", "Samsung", "Microsoft", "Lenovo", "Amazon"],
  Computer: ["Apple", "Dell", "HP", "Lenovo", "ASUS", "Acer", "Microsoft"],
  Console: ["Sony", "Microsoft", "Nintendo"],
  Smartwatch: ["Apple", "Samsung", "Garmin"],
  Mods: ["Phones", "Consoles", "Wearables", "Meta Glasses", "Other"],
  Other: ["Generic"]
};

function option(level, path, label, extra = {}) {
  return {
    id: createStableOptionId(level, [...path, label]),
    label,
    ...extra
  };
}

function findById(items, id) {
  return items.find((item) => item.id === id) || null;
}

function catalogUnavailable() {
  const error = new Error("The repair catalog is temporarily unavailable.");
  error.code = "catalog_unavailable";
  throw error;
}

export class BenchLayerCatalogProvider {
  constructor(catalog) {
    this.kind = "benchlayer";
    this.catalog = catalog;
  }

  getMetadata() {
    return {
      provider: this.kind,
      schemaVersion: this.catalog.schemaVersion,
      catalogVersion: this.catalog.catalogVersion,
      updatedAt: this.catalog.updatedAt
    };
  }

  async getDevices() {
    return this.catalog.devices;
  }

  async getBrands(deviceId) {
    return findById(this.catalog.devices, deviceId)?.brands || [];
  }

  async getSeries(deviceId, brandId) {
    const brands = await this.getBrands(deviceId);
    return findById(brands, brandId)?.series || [];
  }

  async getModels(deviceId, brandId, seriesId) {
    const series = await this.getSeries(deviceId, brandId);
    return findById(series, seriesId)?.models || [];
  }
}

export class LegacyCatalogProvider {
  constructor({ loadCatalog = loadLegacyCatalog } = {}) {
    this.kind = "legacy";
    this.loadCatalog = loadCatalog;
    this.cache = new Map();
    this.devices = LEGACY_DEVICES.map((label) => option("device", [], label));
  }

  getMetadata() {
    return { provider: this.kind, schemaVersion: null, catalogVersion: null };
  }

  async getDevices() {
    return this.devices;
  }

  async getBrands(deviceId) {
    const device = findById(this.devices, deviceId);
    if (!device) return [];

    return (LEGACY_BRANDS[device.label] || []).map((label) => {
      return option("brand", [device.label], label);
    });
  }

  async loadBranch(deviceId, brandId) {
    const device = findById(this.devices, deviceId);
    const brand = findById(await this.getBrands(deviceId), brandId);
    if (!device || !brand) return [];

    const cacheKey = `${device.id}:${brand.id}`;
    if (!this.cache.has(cacheKey)) {
      this.cache.set(cacheKey, await this.loadCatalog(device.label, brand.label));
    }

    return this.cache.get(cacheKey) || [];
  }

  async getSeries(deviceId, brandId) {
    const device = findById(this.devices, deviceId);
    const brand = findById(await this.getBrands(deviceId), brandId);
    if (!device || !brand) return [];

    const catalog = await this.loadBranch(deviceId, brandId);
    return [...new Set(catalog.map((item) => item.series).filter(Boolean))]
      .map((label) => option("series", [device.label, brand.label], label));
  }

  async getModels(deviceId, brandId, seriesId) {
    const device = findById(this.devices, deviceId);
    const brand = findById(await this.getBrands(deviceId), brandId);
    const series = findById(await this.getSeries(deviceId, brandId), seriesId);
    if (!device || !brand || !series) return [];

    const catalog = await this.loadBranch(deviceId, brandId);
    return catalog
      .filter((item) => item.series === series.label)
      .map((item) => {
        const modelId = createStableOptionId("model", [
          device.label,
          brand.label,
          series.label,
          item.model
        ]);

        return {
          ...item,
          id: modelId,
          label: item.model,
          repairs: (item.repairs || []).map((repair) => ({
            ...repair,
            id: createStableOptionId("repair", [
              device.label,
              brand.label,
              series.label,
              item.model,
              repair.repair
            ]),
            label: repair.repair
          }))
        };
      });
  }
}

export async function createCatalogProvider({
  fetchImpl = globalThis.fetch,
  storage = globalThis.sessionStorage,
  now = () => Date.now(),
  loadCatalog = loadLegacyCatalog
} = {}) {
  const config = await fetchCatalogRuntimeConfig(fetchImpl);

  if (config.provider === "legacy") {
    return new LegacyCatalogProvider({ loadCatalog });
  }

  const client = new PublicCatalogClient({
    ...config,
    fetchImpl,
    storage,
    now
  });

  let catalog;

  try {
    catalog = adaptPublicCatalogV1(await client.load());
  } catch (error) {
    client.clearCache();
    throw error;
  }

  if (!catalog.devices.length) catalogUnavailable();
  return new BenchLayerCatalogProvider(catalog);
}

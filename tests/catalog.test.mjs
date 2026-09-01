import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  adaptPublicCatalogV1,
  CatalogAdapterError
} from "../assets/js/catalogAdapter.js";
import {
  CatalogClientError,
  PublicCatalogClient,
  fetchCatalogRuntimeConfig
} from "../assets/js/catalogClient.js";
import {
  BenchLayerCatalogProvider,
  LegacyCatalogProvider
} from "../assets/js/catalogProviders.js";
import { createOptionCard } from "../assets/js/cardRenderer.js";
import { resetAllState, resetStep, state } from "../assets/js/state.js";
import { readCatalogConfig } from "../api/catalog-config.js";
import catalogConfigHandler from "../api/catalog-config.js";

const ENDPOINT = "https://benchlayer-preview.example/api/public/catalog";
const CREDENTIAL = "public-preview-credential-1234567890";
const ETAG = '"pc1-test-etag"';

function responseFixture(overrides = {}) {
  return {
    ok: true,
    schemaVersion: 1,
    catalogVersion: 3,
    updatedAt: "2026-08-31T12:00:00.000Z",
    devices: [
      {
        name: "Phone",
        brands: [
          {
            name: "Apple",
            series: [
              {
                name: "iPhone 16 Series",
                models: [
                  {
                    name: "iPhone 16",
                    price: 999,
                    internal_id: "must-not-survive",
                    repairs: [
                      { name: "Screen Repair", price: 199 },
                      { name: "Battery Replacement", cost: 50 }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    ...overrides
  };
}

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    keys: () => [...values.keys()]
  };
}

test("Public Catalog V1 adapter maps the complete hierarchy and stable IDs", async () => {
  const catalog = adaptPublicCatalogV1(responseFixture());
  const provider = new BenchLayerCatalogProvider(catalog);
  const [device] = await provider.getDevices();
  const [brand] = await provider.getBrands(device.id);
  const [series] = await provider.getSeries(device.id, brand.id);
  const [model] = await provider.getModels(device.id, brand.id, series.id);

  assert.equal(device.label, "Phone");
  assert.equal(brand.label, "Apple");
  assert.equal(series.label, "iPhone 16 Series");
  assert.equal(model.model, "iPhone 16");
  assert.deepEqual(model.repairs.map((repair) => repair.repair), [
    "Screen Repair",
    "Battery Replacement"
  ]);
  assert.match(device.id, /^device-/);
  assert.match(model.id, /^model-/);
  assert.equal(model.image, "/images/models/apple/iphone16.webp");
});

test("adapter rejects unsupported, malformed, empty, duplicate, and prototype-like data", () => {
  for (const payload of [
    responseFixture({ schemaVersion: 2 }),
    responseFixture({ devices: "Phone" }),
    responseFixture({ devices: [] }),
    responseFixture({ devices: [{ name: "Phone", brands: [] }, { name: "phone", brands: [] }] }),
    JSON.parse('{"ok":true,"schemaVersion":1,"catalogVersion":3,"updatedAt":"2026-08-31T12:00:00Z","devices":[],"__proto__":{}}')
  ]) {
    assert.throws(() => adaptPublicCatalogV1(payload), CatalogAdapterError);
  }
});

test("adapter projects only safe catalog fields and never carries pricing or internal IDs", () => {
  const output = JSON.stringify(adaptPublicCatalogV1(responseFixture()));

  for (const forbidden of ["price", "cost", "internal_id", "organization_id", "location_id"]) {
    assert.equal(output.includes(forbidden), false, forbidden);
  }
});

test("catalog labels are escaped before card HTML insertion", () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      return {
        setAttribute() {},
        addEventListener() {}
      };
    }
  };

  try {
    const card = createOptionCard({
      label: '<img src=x onerror="alert(1)">',
      image: 'javascript:alert(1)',
      badge: "<script>bad()</script>"
    });

    assert.equal(card.innerHTML.includes("<script>"), false);
    assert.equal(card.innerHTML.includes("<img src=x"), false);
    assert.match(card.innerHTML, /&lt;img/);
    assert.match(card.innerHTML, /\/images\/repairs\/default\.webp/);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("ETag 200 to 304 lifecycle reuses a schema-aware cached response", async () => {
  const storage = memoryStorage();
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });

    if (calls.length === 1) {
      return new Response(JSON.stringify(responseFixture()), {
        status: 200,
        headers: { "content-type": "application/json", etag: ETAG }
      });
    }

    return new Response(null, { status: 304, headers: { etag: ETAG } });
  };

  const client = new PublicCatalogClient({
    endpoint: ENDPOINT,
    credential: CREDENTIAL,
    cacheScope: "preview-a",
    fetchImpl,
    storage,
    now: () => 1000
  });

  const first = await client.load();
  const second = await client.load();

  assert.deepEqual(second, first);
  assert.equal(calls[0].url, ENDPOINT);
  assert.equal(new URL(calls[0].url).search, "");
  assert.equal(calls[0].options.headers.Authorization, `Bearer ${CREDENTIAL}`);
  assert.equal(calls[0].options.cache, "no-cache");
  assert.equal(calls[1].options.cache, "no-cache");
  assert.equal(Object.hasOwn(calls[1].options.headers, "If-None-Match"), false);
  assert.equal(storage.keys().every((key) => !key.includes(CREDENTIAL)), true);
});

test("native-style fetch implementations are not invoked with the client as receiver", async () => {
  function receiverSensitiveFetch() {
    assert.equal(this, undefined);
    return Promise.resolve(new Response(JSON.stringify(responseFixture()), {
      status: 200,
      headers: { "content-type": "application/json", etag: ETAG }
    }));
  }

  const client = new PublicCatalogClient({
    endpoint: ENDPOINT,
    credential: CREDENTIAL,
    cacheScope: "receiver-safe",
    fetchImpl: receiverSensitiveFetch,
    storage: memoryStorage()
  });

  assert.equal((await client.load()).schemaVersion, 1);
});

test("a repeated cacheless 304 fails safely after one unconditional retry", async () => {
  let callCount = 0;
  const client = new PublicCatalogClient({
    endpoint: ENDPOINT,
    credential: CREDENTIAL,
    cacheScope: "cacheless-304",
    fetchImpl: async () => {
      callCount += 1;
      return new Response(null, { status: 304 });
    },
    storage: memoryStorage()
  });

  await assert.rejects(client.load(), (error) => {
    return error instanceof CatalogClientError &&
      error.code === "catalog_response_invalid" &&
      error.status === 304;
  });
  assert.equal(callCount, 2);
});

test("cache records are isolated by public scope and endpoint without credential keys", () => {
  const storage = memoryStorage();
  const a = new PublicCatalogClient({
    endpoint: ENDPOINT,
    credential: CREDENTIAL,
    cacheScope: "preview-a",
    fetchImpl: async () => {},
    storage
  });
  const b = new PublicCatalogClient({
    endpoint: ENDPOINT,
    credential: `${CREDENTIAL}-rotated`,
    cacheScope: "preview-b",
    fetchImpl: async () => {},
    storage
  });

  assert.notEqual(a.cacheKey, b.cacheKey);
  assert.equal(a.cacheKey.includes(CREDENTIAL), false);
  assert.equal(b.cacheKey.includes(CREDENTIAL), false);
});

test("network and revoked-connection failures fail closed without stale fallback", async () => {
  const storage = memoryStorage();
  const networkClient = new PublicCatalogClient({
    endpoint: ENDPOINT,
    credential: CREDENTIAL,
    cacheScope: "network-failure",
    fetchImpl: async () => { throw new Error("provider detail"); },
    storage
  });

  await assert.rejects(networkClient.load(), (error) => {
    return error instanceof CatalogClientError && error.code === "catalog_network_error";
  });

  const revokedClient = new PublicCatalogClient({
    endpoint: ENDPOINT,
    credential: CREDENTIAL,
    cacheScope: "revoked",
    fetchImpl: async () => new Response("{}", { status: 401 }),
    storage
  });

  revokedClient.writeCache(ETAG, responseFixture());
  await assert.rejects(revokedClient.load(), (error) => error.status === 401);
  assert.equal(revokedClient.readCache(), null);
});

test("invalid API responses fail closed and do not log or place the credential in the URL", async () => {
  const calls = [];
  const originalConsole = { log: console.log, warn: console.warn, error: console.error };
  const logs = [];
  console.log = (...values) => logs.push(values);
  console.warn = (...values) => logs.push(values);
  console.error = (...values) => logs.push(values);

  try {
    const client = new PublicCatalogClient({
      endpoint: ENDPOINT,
      credential: CREDENTIAL,
      cacheScope: "invalid-body",
      fetchImpl: async (url, options) => {
        calls.push({ url, options });
        return new Response("not-json", { status: 200 });
      },
      storage: memoryStorage()
    });

    await assert.rejects(client.load(), (error) => {
      return error instanceof CatalogClientError && error.code === "catalog_response_invalid";
    });
  } finally {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  }

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, ENDPOINT);
  assert.equal(calls[0].url.includes(CREDENTIAL), false);
  assert.equal(JSON.stringify(logs).includes(CREDENTIAL), false);
});

test("runtime config client uses a fixed same-origin path", async () => {
  const calls = [];
  const config = await fetchCatalogRuntimeConfig(async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ provider: "legacy" }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  });

  assert.deepEqual(config, { provider: "legacy" });
  assert.equal(calls[0].url, "/api/catalog-config");
  assert.equal(calls[0].options.credentials, "same-origin");
});

test("runtime config supports explicit legacy rollback and validates BenchLayer values", () => {
  assert.deepEqual(readCatalogConfig({}), { provider: "legacy" });
  assert.deepEqual(readCatalogConfig({ CATALOG_PROVIDER: "legacy" }), { provider: "legacy" });

  const config = readCatalogConfig({
    CATALOG_PROVIDER: "benchlayer",
    BENCHLAYER_PUBLIC_CATALOG_URL: ENDPOINT,
    BENCHLAYER_PUBLIC_CONNECTION_TOKEN: CREDENTIAL,
    BENCHLAYER_PUBLIC_CATALOG_CACHE_SCOPE: "preview-a"
  });

  assert.equal(config.provider, "benchlayer");
  assert.equal(config.credential, CREDENTIAL);
  assert.throws(() => readCatalogConfig({ CATALOG_PROVIDER: "benchlayer" }));
});

test("runtime config endpoint is GET-only, no-store, and does not grant cross-origin access", () => {
  const headers = new Map();
  const res = {
    statusCode: 0,
    body: null,
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };

  catalogConfigHandler({ method: "POST" }, res);

  assert.equal(res.statusCode, 405);
  assert.deepEqual(res.body, { ok: false, error: "method_not_allowed" });
  assert.equal(headers.get("allow"), "GET");
  assert.match(headers.get("cache-control"), /no-store/);
  assert.equal(headers.has("access-control-allow-origin"), false);
});

test("legacy provider remains available as an explicit rollback path", async () => {
  const provider = new LegacyCatalogProvider({
    loadCatalog: async () => [{
      series: "Test Series",
      model: "Test Model",
      image: "/images/models/default.webp",
      repairs: [{ repair: "Diagnostic", time: "Diagnostic Required" }]
    }]
  });

  const device = (await provider.getDevices())[0];
  const brand = (await provider.getBrands(device.id))[0];
  const series = (await provider.getSeries(device.id, brand.id))[0];
  const model = (await provider.getModels(device.id, brand.id, series.id))[0];

  assert.equal(provider.kind, "legacy");
  assert.equal(model.repairs[0].repair, "Diagnostic");
});

test("parent resets clear incompatible child catalog IDs and repair selections", () => {
  resetAllState();
  state.device = "Phone";
  state.brand = "Apple";
  state.series = "iPhone";
  state.model = { id: "model-old", model: "Old Model" };
  state.repairs = [{ id: "repair-old", repair: "Screen" }];
  state.catalogSelection = {
    deviceId: "device-phone",
    brandId: "brand-apple",
    seriesId: "series-iphone",
    modelId: "model-old",
    repairIds: ["repair-old"]
  };

  resetStep("brand");

  assert.equal(state.series, null);
  assert.equal(state.model, null);
  assert.deepEqual(state.repairs, []);
  assert.equal(state.catalogSelection.brandId, null);
  assert.equal(state.catalogSelection.seriesId, null);
  assert.equal(state.catalogSelection.modelId, null);
  assert.deepEqual(state.catalogSelection.repairIds, []);
});

test("repair reset clears stable repair IDs before a new selection", () => {
  resetAllState();
  state.catalogSelection.repairIds = ["repair-old"];

  resetStep("repair");

  assert.deepEqual(state.catalogSelection.repairIds, []);
});

test("6C.3 catalog integration remains isolated from the 6C.4 intake adapter", async () => {
  const files = [
    "assets/js/catalogAdapter.js",
    "assets/js/catalogClient.js",
    "assets/js/catalogProviders.js",
    "assets/js/wizard.js",
    "api/catalog-config.js"
  ];
  const sources = await Promise.all(files.map((file) => readFile(new URL(`../${file}`, import.meta.url), "utf8")));
  const submitter = await readFile(new URL("../assets/js/leadSubmitter.js", import.meta.url), "utf8");
  const appointments = await readFile(new URL("../assets/js/appointments.js", import.meta.url), "utf8");

  assert.equal(sources.some((source) => source.includes("/api/public/intake")), false);
  assert.match(submitter, /fetch\("\/api\/submit-repair"/);
  assert.match(submitter, /mapRepairFlowToPublicIntake/);
  for (const serviceType of ["meet-up", "pickup", "onsite", "mail-in"]) {
    assert.equal(appointments.includes(`id: "${serviceType}"`), true);
  }
});

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
import {
  createOptionCard,
  getLocalModelImage,
  getSelectionCardImageSources,
  renderCardGrid
} from "../assets/js/cardRenderer.js";
import { resetAllState, resetStep, state } from "../assets/js/state.js";
import { readCatalogConfig } from "../api/catalog-config.js";
import catalogConfigHandler from "../api/catalog-config.js";
import { buildWebsiteCatalog } from "../tools/website-catalog-source.mjs";

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

test("BenchLayer catalog arrays retain canonical order in Repair Flow card grids", () => {
  const source = responseFixture();
  source.devices[0].brands[0].series[0].models = [
    { name: "Zeta Model", repairs: [] },
    { name: "Alpha Model", repairs: [] }
  ];
  const models = adaptPublicCatalogV1(source).devices[0].brands[0].series[0].models;
  const appended = [];
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      return {
        setAttribute(name, value) { this[name] = value; },
        addEventListener() {},
        className: "",
        innerHTML: ""
      };
    }
  };

  try {
    renderCardGrid({
      innerHTML: "",
      appendChild(card) { appended.push(card["aria-label"]); }
    }, models.map((model) => ({
      label: model.label,
      catalogOrder: model.catalogOrder
    })));
  } finally {
    globalThis.document = previousDocument;
  }

  assert.deepEqual(appended, ["Zeta Model", "Alpha Model"]);
});

test("server-issued IDs survive label changes while legacy responses retain deterministic fallbacks", () => {
  const first = responseFixture();
  first.catalogVersion = 4;
  first.devices[0].id = "dev_1234567890abcdef";
  first.devices[0].brands[0].id = "brd_1234567890abcdef";
  first.devices[0].brands[0].series[0].id = "ser_1234567890abcdef";
  first.devices[0].brands[0].series[0].models[0].id = "mdl_1234567890abcdef";
  first.devices[0].brands[0].series[0].models[0].repairs[0].id = "rep_1234567890abcdef";
  const original = adaptPublicCatalogV1(first);

  const renamed = structuredClone(first);
  renamed.devices[0].brands[0].series[0].models[0].name = "iPhone 16 (2026)";
  const updated = adaptPublicCatalogV1(renamed);
  assert.equal(original.devices[0].brands[0].series[0].models[0].id, "mdl_1234567890abcdef");
  assert.equal(updated.devices[0].brands[0].series[0].models[0].id, "mdl_1234567890abcdef");

  const invalidId = structuredClone(first);
  invalidId.devices[0].id = "<script>";
  assert.throws(() => adaptPublicCatalogV1(invalidId), CatalogAdapterError);
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
    assert.match(card.innerHTML, /\/images\/repairs\/diagnostic-not-sure\.png/);
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

// CATALOG IMAGE COMPATIBILITY REGRESSION COVERAGE

test("trusted organization-scoped catalog images are accepted and untrusted hosts fail closed", () => {
  const organizationId = "af53eab2-0499-47da-9e5a-68c0997a47fd";
  const trustedUrl =
    "https://gorjynnsbmdifnkzxame.supabase.co/storage/v1/object/public/intake-card-images/" +
    organizationId +
    "/models/iphone16.webp";

  const trusted = responseFixture();
  trusted.devices[0].brands[0].series[0].models[0].imageUrl = trustedUrl;

  const trustedModel =
    adaptPublicCatalogV1(trusted)
      .devices[0]
      .brands[0]
      .series[0]
      .models[0];

  assert.equal(trustedModel.publicImageUrl, trustedUrl);
  assert.equal(trustedModel.image, trustedUrl);

  const untrusted = responseFixture();
  untrusted.devices[0].brands[0].series[0].models[0].imageUrl =
    trustedUrl.replace(
      "gorjynnsbmdifnkzxame.supabase.co",
      "images.example.com"
    );

  const untrustedModel =
    adaptPublicCatalogV1(untrusted)
      .devices[0]
      .brands[0]
      .series[0]
      .models[0];

  assert.equal(untrustedModel.publicImageUrl, null);
  assert.equal(
    untrustedModel.image,
    "/images/models/apple/iphone16.webp"
  );
});

test("adapter preserves active brand and series branches even before models are populated", () => {
  const source = responseFixture();

  source.devices.push({
    name: "Empty Device",
    brands: []
  });

  source.devices[0].brands.push({
    name: "Empty Brand",
    series: []
  });

  source.devices[0].brands[0].series.push({
    name: "Empty Series",
    models: []
  });

  const catalog = adaptPublicCatalogV1(source);

  assert.deepEqual(
    catalog.devices.map((device) => device.label),
    ["Phone"]
  );

  assert.deepEqual(
    catalog.devices[0].brands.map((brand) => brand.label),
    ["Apple", "Empty Brand"]
  );

  assert.deepEqual(
    catalog.devices[0].brands[0].series.map((series) => series.label),
    ["iPhone 16 Series", "Empty Series"]
  );

  assert.equal(catalog.devices[0].brands[1].series.length, 0);
  assert.equal(catalog.devices[0].brands[0].series[1].models.length, 0);
});

test("non-phone models do not invent local model image paths", () => {
  const source = responseFixture({
    devices: [
      {
        name: "Computer / Laptop",
        brands: [
          {
            name: "Dell",
            series: [
              {
                name: "XPS Series",
                models: [
                  {
                    name: "XPS 13",
                    repairs: []
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  });

  const model =
    adaptPublicCatalogV1(source)
      .devices[0]
      .brands[0]
      .series[0]
      .models[0];

  assert.equal(model.image, null);
  assert.equal(model.publicImageUrl, null);
});

test("phone model fallback paths are only invented for local model asset brands", () => {
  const source = responseFixture();
  source.devices[0].brands[0].name = "Google";
  source.devices[0].brands[0].series[0].models[0].name = "Pixel 10";

  const model =
    adaptPublicCatalogV1(source)
      .devices[0]
      .brands[0]
      .series[0]
      .models[0];

  assert.equal(model.image, null);
  assert.equal(model.publicImageUrl, null);
});

test("option cards use a validated parent fallback image when the primary image fails", () => {
  const previousDocument = globalThis.document;

  globalThis.document = {
    createElement() {
      return {
        setAttribute() {},
        addEventListener() {},
        className: "",
        innerHTML: ""
      };
    }
  };

  try {
    const card = createOptionCard({
      label: "Fallback Test",
      image: "/images/models/apple/not-a-real-model.webp",
      fallbackImage: "/images/brands/apple.webp"
    });

    assert.match(card.innerHTML, /this\.src='\/images\/brands\/apple\.webp'/);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("option cards reject lookalike public-storage URLs on untrusted hosts", () => {
  const previousDocument = globalThis.document;

  globalThis.document = {
    createElement() {
      return {
        setAttribute() {},
        addEventListener() {},
        className: "",
        innerHTML: ""
      };
    }
  };

  try {
    const card = createOptionCard({
      label: "Image Test",
      image:
        "https://images.example.com/storage/v1/object/public/intake-card-images/" +
        "af53eab2-0499-47da-9e5a-68c0997a47fd/test.webp"
    });

    assert.equal(card.innerHTML.includes("images.example.com"), false);
    assert.match(
      card.innerHTML,
      /\/images\/repairs\/diagnostic-not-sure\.png/
    );
  } finally {
    globalThis.document = previousDocument;
  }
});

test("website cards reject managed image URLs even when the storage host is trusted", () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      return {
        setAttribute() {},
        addEventListener() {},
        className: "",
        innerHTML: ""
      };
    }
  };

  try {
    const managedImage =
      "https://gorjynnsbmdifnkzxame.supabase.co/storage/v1/object/public/" +
      "intake-card-images/af53eab2-0499-47da-9e5a-68c0997a47fd/test.webp";
    const card = createOptionCard({
      label: "Website-owned image",
      image: managedImage
    });

    assert.equal(card.innerHTML.includes("supabase.co"), false);
    assert.match(card.innerHTML, /\/images\/repairs\/diagnostic-not-sure\.png/);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("local selection model images never depend on managed catalog URLs", () => {
  assert.equal(
    getLocalModelImage("Phone", "Apple", "iPhone 16 Pro Max"),
    "/images/models/apple/iphone16promax.webp"
  );
  assert.equal(
    getLocalModelImage("Tablet", "Apple", "iPad 10"),
    "/images/models/ipads/ipad10.webp"
  );
  assert.equal(
    getLocalModelImage("Phone", "Google", "Pixel 9 Pro XL"),
    null
  );
});

test("selection summary cards use Primitive Repairs images only", () => {
  const managedImage =
    "https://gorjynnsbmdifnkzxame.supabase.co/storage/v1/object/public/" +
    "intake-card-images/af53eab2-0499-47da-9e5a-68c0997a47fd/" +
    "models/iphone16promax.webp";

  resetAllState();
  const repair = {
    repair: "Diagnostic / Not Sure",
    image: managedImage
  };

  const modelSources = getSelectionCardImageSources({
    stepKey: "model",
    device: "Phone",
    brand: "Apple",
    model: "iPhone 16 Pro Max"
  });
  const repairSources = getSelectionCardImageSources({
    stepKey: "repair",
    device: "Phone",
    brand: "Apple",
    repair
  });
  const googleModelSources = getSelectionCardImageSources({
    stepKey: "model",
    device: "Phone",
    brand: "Google",
    model: "Pixel 9 Pro XL"
  });

  assert.deepEqual(modelSources, [
    "/images/models/apple/iphone16promax.webp",
    "/images/brands/apple.webp",
    "/images/devices/thumbs/phone.webp"
  ]);
  assert.deepEqual(repairSources, [
    "/images/repairs/diagnostic-not-sure.png"
  ]);
  assert.deepEqual(googleModelSources, [
    "/images/brands/google.png",
    "/images/devices/thumbs/phone.webp"
  ]);
  assert.equal(modelSources.includes(managedImage), false);
  assert.equal(repairSources.includes(managedImage), false);
});

test("selection card renderer never reads managed catalog image fields", async () => {
  const rendererSource = await readFile(
    new URL("../assets/js/renderer.js", import.meta.url),
    "utf8"
  );
  const selectionStart = rendererSource.indexOf(
    "export function renderSelectionCards"
  );
  const selectionEnd = rendererSource.indexOf(
    "export function renderSuccessStep",
    selectionStart
  );
  const selectionSource = rendererSource.slice(selectionStart, selectionEnd);

  assert.ok(selectionStart >= 0);
  assert.ok(selectionEnd > selectionStart);
  assert.match(selectionSource, /getSelectionSummaryVisual/);
  assert.doesNotMatch(selectionSource, /state\.model\?\.image/);
  assert.doesNotMatch(selectionSource, /getResolvedRepairImage/);
  assert.doesNotMatch(selectionSource, /image\.style/);
  assert.doesNotMatch(selectionSource, /publicImageUrl/);
});

test("all website option cards ignore managed catalog image fields", async () => {
  const rendererSource = await readFile(
    new URL("../assets/js/renderer.js", import.meta.url),
    "utf8"
  );
  const optionStart = rendererSource.indexOf(
    "export function renderDeviceStep"
  );
  const optionEnd = rendererSource.indexOf(
    "function escapeSummaryHtml",
    optionStart
  );
  const optionSource = rendererSource.slice(optionStart, optionEnd);

  assert.ok(optionStart >= 0);
  assert.ok(optionEnd > optionStart);
  assert.doesNotMatch(optionSource, /device\?\.image/);
  assert.doesNotMatch(optionSource, /brand\?\.image/);
  assert.doesNotMatch(optionSource, /series\?\.image/);
  assert.doesNotMatch(optionSource, /model\.image/);
  assert.doesNotMatch(optionSource, /getResolvedRepairImage/);
  assert.match(optionSource, /getDeviceImage/);
  assert.match(optionSource, /getBrandImage/);
  assert.match(optionSource, /getSelectionCardImageSources/);
  assert.match(optionSource, /getRepairImage/);
});

test("sticky SaaS summary uses one desktop rail and an accessible mobile sheet", async () => {
  const indexSource = await readFile(
    new URL("../index.html", import.meta.url),
    "utf8"
  );
  const summaryStart = indexSource.indexOf('id="pr-selection-cards"');
  const summaryEnd = indexSource.indexOf("</aside>", summaryStart);
  const summarySource = indexSource.slice(summaryStart, summaryEnd);

  assert.ok(summaryStart > indexSource.indexOf('<div id="primitive-wizard-container">'));
  assert.ok(summaryEnd < indexSource.indexOf('<main id="pr-main"'));
  assert.ok(summaryEnd > summaryStart);
  assert.match(summarySource, /class="pr-summary-mobile-trigger"/);
  assert.match(summarySource, /aria-controls="pr-summary-sheet"/);
  assert.match(summarySource, /id="pr-summary-sheet"/);
  assert.match(summarySource, /aria-hidden="true"[\s\S]*inert/);
  assert.match(summarySource, /class="pr-summary-backdrop"/);
  assert.match(summarySource, /class="pr-summary-mobile-continue"/);
  assert.equal(
    (summarySource.match(/id="card-(device|brand|series|model|repair)"/g) || []).length,
    5
  );
});

test("sticky summary remains website-presented across desktop and mobile", async () => {
  const [rendererSource, cssSource] = await Promise.all([
    readFile(new URL("../assets/js/renderer.js", import.meta.url), "utf8"),
    readFile(new URL("../wizard.css", import.meta.url), "utf8")
  ]);
  const visualStart = rendererSource.indexOf(
    "function getSelectionSummaryVisual"
  );
  const visualEnd = rendererSource.indexOf(
    "function setSelectionSummaryOpen",
    visualStart
  );
  const visualSource = rendererSource.slice(visualStart, visualEnd);

  assert.ok(visualStart >= 0);
  assert.ok(visualEnd > visualStart);
  assert.match(visualSource, /getSelectionCardImageSources/);
  assert.doesNotMatch(visualSource, /publicImageUrl/);
  assert.doesNotMatch(visualSource, /state\.model\?\.image/);
  assert.match(rendererSource, /surface\.setAttribute\("aria-modal", "true"\)/);
  assert.match(rendererSource, /surface\.toggleAttribute\("inert", !isOpen\)/);
  assert.match(
    cssSource,
    /@media \(min-width: 961px\)[\s\S]*position: sticky !important/
  );
  assert.match(
    cssSource,
    /@media \(max-width: 960px\)[\s\S]*\.pr-summary-mobile-trigger[\s\S]*\.pr-summary-surface/
  );
  assert.match(
    cssSource,
    /@media \(max-width: 960px\)[\s\S]*grid-template-rows: auto auto minmax\(0, 1fr\) auto auto/
  );
  assert.match(
    cssSource,
    /\.blueprint-profile-grid \{[\s\S]*min-height: 0 !important;[\s\S]*overflow-y: auto !important;/
  );
});

test("the source-controlled website catalog is complete, bounded, and presentation-free", async () => {
  const catalog = await buildWebsiteCatalog();
  assert.equal(catalog.version, 4);
  assert.equal(Number.isInteger(catalog.revision), true);
  assert.equal(Number.isFinite(new Date(catalog.updatedAt).getTime()), true);
  for (const collection of [
    "devices",
    "brands",
    "series",
    "models",
    "repairs",
    "modelRepairs"
  ]) {
    assert.equal(Array.isArray(catalog[collection]), true, collection);
  }
  assert.equal(new TextEncoder().encode(JSON.stringify(catalog)).length < 2 * 1024 * 1024, true);
  assert.equal(JSON.stringify(catalog).includes("imageUrl"), false);

  const ids = new Set();
  for (const collection of ["devices", "brands", "series", "models", "repairs"]) {
    for (const entry of catalog[collection]) {
      assert.match(entry.id, /^[a-z][a-z0-9_-]{5,119}$/);
      assert.equal(ids.has(entry.id), false, entry.id);
      ids.add(entry.id);
    }
  }
  const modelIds = new Set(catalog.models.map((entry) => entry.id));
  const repairIds = new Set(catalog.repairs.map((entry) => entry.id));
  for (const relationship of catalog.modelRepairs) {
    assert.equal(modelIds.has(relationship.modelId), true, relationship.modelId);
    assert.equal(repairIds.has(relationship.repairId), true, relationship.repairId);
  }

  const retiredPlaceholderLabels = new Set([
    "iphone 16 model",
    "iphone 17",
    "iphone 2 series"
  ]);
  const retiredPlaceholders = catalog.series.filter((entry) =>
    retiredPlaceholderLabels.has(String(entry.label).trim().toLowerCase())
  );
  assert.equal(retiredPlaceholders.length, 1410);
  assert.equal(retiredPlaceholders.every((entry) => entry.active === false), true);
});

test("website catalog automation can only stage the exact authenticated BenchLayer endpoint", async () => {
  const [clientSource, packageSource, workflowSource] = await Promise.all([
    readFile(new URL("../tools/sync-website-catalog.mjs", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/catalog-sync.yml", import.meta.url), "utf8")
  ]);
  assert.match(clientSource, /url\.protocol !== "https:"/);
  assert.match(clientSource, /url\.pathname !== "\/api\/public\/catalog-sync"/);
  assert.match(clientSource, /authorization: `Bearer \$\{credential\}`/);
  assert.match(clientSource, /"idempotency-key": `repairlab-\$\{payloadHash\.slice\(0, 48\)\}`/);
  assert.doesNotMatch(clientSource, /searchParams\.set|console\.log\([^)]*credential/);
  assert.match(packageSource, /"catalog:sync": "node tools\/sync-website-catalog\.mjs"/);
  assert.match(workflowSource, /branches: \[main\]/);
  assert.match(workflowSource, /BENCHLAYER_WEBSITE_CATALOG_SYNC_TOKEN: \$\{\{ secrets\.BENCHLAYER_WEBSITE_CATALOG_SYNC_TOKEN \}\}/);
  assert.doesNotMatch(workflowSource, /pull_request:/);
});

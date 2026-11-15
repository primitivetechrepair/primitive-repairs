import assert from "node:assert/strict";
import test from "node:test";
import { isBrandAllowedForDevice } from "../assets/js/categoryBrands.js";
import { BenchLayerCatalogProvider } from "../assets/js/catalogProviders.js";
import { buildWebsiteCatalog } from "../tools/website-catalog-source.mjs";

test("category eligibility rejects the imported cross-category brands", () => {
  for (const [category, invalid] of [
    ["Phone", ["DJI", "GoPro", "Insta360", "Nintendo"]],
    ["Tablet", ["CAT", "Cricket", "Essential", "Revvl", "T Phone"]],
    ["Computer / Laptop", ["Alcatel", "BlackBerry", "Cricket", "GoPro"]],
    ["Game Console", ["Apple", "Alcatel", "Cricket", "Samsung", "Xiaomi"]],
    ["Smartwatch / Wearable", ["Cricket", "GoPro", "Essential"]],
    ["Smart Glasses", ["BlackBerry", "Cricket", "GoPro"]],
    ["Audio Device", ["CAT", "Cricket", "GoPro"]],
    ["Other Electronics", ["Cricket", "Revvl", "T Phone"]]
  ]) {
    for (const brand of invalid) assert.equal(isBrandAllowedForDevice(category, brand), false, `${category}/${brand}`);
  }
});

test("real cross-category and older repairable makes remain eligible", () => {
  for (const [category, valid] of [
    ["Phone", ["Apple", "Samsung", "BlackBerry", "LG", "Cricket"]],
    ["Tablet", ["Apple", "Samsung", "Microsoft", "Amazon", "Lenovo", "BlackBerry", "TCL"]],
    ["Computer / Laptop", ["Apple", "Dell", "HP", "Lenovo", "Huawei"]],
    ["Game Console", ["Sony", "Microsoft", "Nintendo", "Valve"]],
    ["Smartwatch / Wearable", ["Apple", "Samsung", "Garmin", "Fitbit"]],
    ["Smart Glasses", ["Meta", "Ray-Ban", "Xreal", "Huawei", "TCL", "Xiaomi"]],
    ["Audio Device", ["Apple", "Beats", "Sony", "Bose", "JBL", "Nothing"]],
    ["Other Electronics", ["Other", "DJI", "GoPro", "Insta360"]]
  ]) {
    for (const brand of valid) assert.equal(isBrandAllowedForDevice(category, brand), true, `${category}/${brand}`);
  }
  assert.equal(isBrandAllowedForDevice(" Console ", " NINTENDO "), true);
  assert.equal(isBrandAllowedForDevice("Mods", "Phones"), true);
  assert.equal(isBrandAllowedForDevice("Custom category", "Custom make"), true);
  assert.equal(isBrandAllowedForDevice("constructor", "Custom make"), true);
});

test("an old catalog cannot expose invalid brands or their descendants", async () => {
  const models = [{ id: "model-ps5", label: "PS5", repairs: [{ id: "repair-hdmi", label: "HDMI" }] }];
  const valid = { id: "brand-sony", label: "Sony", series: [{ id: "series-ps", label: "PlayStation", models }] };
  const invalid = { id: "brand-cricket", label: "Cricket", series: [{ id: "series-invalid", models: [{id: "model-invalid"}] }] };
  const catalog = { devices: [{ id: "device-console", label: "Game Console", brands: [valid, invalid] }] };
  const original = structuredClone(catalog);
  const provider = new BenchLayerCatalogProvider(catalog);
  assert.deepEqual(await provider.getBrands("device-console"), [valid]);
  assert.deepEqual(await provider.getModels("device-console", "brand-sony", "series-ps"), models);
  assert.deepEqual(await provider.getSeries("device-console", "brand-cricket"), []);
  assert.deepEqual(await provider.getModels("device-console", "brand-cricket", "series-invalid"), []);
  assert.deepEqual(await provider.getBrands("missing-device"), []);
  assert.deepEqual(catalog, original, "filtering must not mutate source records");
});

test("published source uses only eligible brands and preserves retired identities", async () => {
  const catalog = await buildWebsiteCatalog();
  const consoleDevice = catalog.devices.find(d => d.label === "Game Console");
  assert.deepEqual(catalog.brands.filter(b => b.active && b.parentId === consoleDevice.id).map(b => b.label), ["Sony", "Microsoft", "Nintendo", "Valve"]);
  const cricket = catalog.brands.find(b => b.label === "Cricket" && b.parentId === consoleDevice.id);
  assert.equal(cricket.active, false);
  assert.ok(catalog.series.some(s => s.parentId === cricket.id), "retirement preserves descendants");
  for (const device of catalog.devices.filter(d => d.active)) {
    const active = catalog.brands.filter(b => b.active && b.parentId === device.id);
    assert.ok(active.length, device.label);
    for (const brand of active) assert.ok(isBrandAllowedForDevice(device.label, brand.label));
  }
});

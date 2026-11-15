// Product-category eligibility, not a list of services we offer. A brand must
// also exist in the published catalog; this never creates models or repairs.
// Retain discontinued makes because customers still bring those in for repair.
const brands = {
  phone: ["Apple", "Samsung", "Google", "Motorola", "OnePlus", "LG", "Alcatel", "AT&T", "ASUS", "BlackBerry", "Blu", "Boost", "CAT", "Coolpad", "Cricket", "Essential", "Honor", "HTC", "Huawei", "Infinix", "Kyocera", "Nexus", "Nokia", "Nothing", "Oppo", "Oukitel", "Realme", "Revvl", "Sony", "TCL", "Tecno", "T Phone", "Vivo", "Xiaomi", "Zebra", "ZTE"],
  tablet: ["Apple", "Samsung", "Google", "Microsoft", "Amazon", "Lenovo", "ASUS", "Acer", "Dell", "HP", "LG", "Motorola", "OnePlus", "Alcatel", "AT&T", "BlackBerry", "Blu", "Coolpad", "Honor", "HTC", "Huawei", "Infinix", "Nexus", "Nokia", "Oppo", "Oukitel", "Realme", "Sony", "TCL", "Tecno", "Vivo", "Xiaomi", "Zebra", "ZTE"],
  computer: ["Apple", "Dell", "HP", "Lenovo", "ASUS", "Acer", "Microsoft", "Samsung", "LG", "Sony", "Honor", "Huawei", "Infinix", "Nokia", "Realme", "TCL", "Tecno", "Xiaomi", "MSI", "Razer", "Framework", "Toshiba", "Fujitsu", "Gigabyte"],
  console: ["Sony", "Microsoft", "Nintendo", "Valve", "ASUS", "Lenovo", "MSI", "Atari", "Sega", "SNK", "AYANEO", "GPD", "Anbernic", "Retroid"],
  wearable: ["Apple", "Samsung", "Google", "Garmin", "Fitbit", "Alcatel", "ASUS", "LG", "Motorola", "OnePlus", "Honor", "Huawei", "Infinix", "Nokia", "Nothing", "Oppo", "Oukitel", "Realme", "Sony", "TCL", "Tecno", "Vivo", "Xiaomi", "ZTE", "Amazfit", "Fossil", "Polar", "Suunto", "Withings"],
  glasses: ["Meta", "Ray-Ban", "Xreal", "Huawei", "TCL", "Xiaomi", "Bose", "Rokid", "Viture", "RayNeo", "Even Realities"],
  audio: ["Apple", "Beats", "Sony", "Bose", "JBL", "Samsung", "Google", "LG", "Motorola", "OnePlus", "Honor", "HTC", "Huawei", "Infinix", "Nokia", "Nothing", "Oppo", "Realme", "TCL", "Tecno", "Vivo", "Xiaomi", "ZTE", "Sennheiser", "Sonos", "Anker", "Soundcore", "Jabra", "Skullcandy"],
  other: ["Other", "Generic", "DJI", "GoPro", "Insta360"]
};

const aliases = {
  phone: "phone", "cell phone": "phone", tablet: "tablet",
  computer: "computer", "computer / laptop": "computer", pc: "computer", laptop: "computer",
  console: "console", "game console": "console",
  smartwatch: "wearable", wearable: "wearable", "smartwatch / wearable": "wearable",
  "smart glasses": "glasses", "audio device": "audio", ipod: "audio",
  other: "other", "other electronics": "other"
};
const normalize = (value) => String(value ?? "").trim().toLowerCase();
const allowed = new Map(Object.entries(brands).map(([category, labels]) =>
  [category, new Set(labels.map(normalize))]
));

export function isBrandAllowedForDevice(device, brand) {
  const key = normalize(device);
  const category = Object.hasOwn(aliases, key) ? aliases[key] : null;
  // Custom categories (including the legacy Mods workflow) retain their own
  // hierarchy. Known categories never inherit the global brand list.
  return category ? allowed.get(category).has(normalize(brand)) : true;
}

function normalizePathValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9-]/g, "");
}

function normalizeImageFileName(value) {
  const normalized = normalizePathValue(value);

  const imageNameOverrides = {
  "iphone-original": "iphone",

  "iphone-se": "iphonese",

  "iphone-se-1st-gen": "iphonese",
  "iphone-se-1st-generation": "iphonese",

  "iphone-se-2nd-gen": "iphonese2",
  "iphone-se-2nd-generation": "iphonese2",

  "iphone-se-3rd-gen": "iphonese3",
  "iphone-se-3rd-generation": "iphonese3"
};

  return imageNameOverrides[normalized] || normalized.replace(/-/g, "");
}

function normalizeDeviceFolder(device) {
  const map = {
    phone: "phones",
    tablet: "tablets",
    computer: "computers",
    console: "consoles",
    smartwatch: "smartwatches",
    mods: "mods",
    other: "other"
  };

  const key = normalizePathValue(device);

  return map[key] || key;
}

function getDefaultPhoneRepairs() {
  return [
    {
      repair: "Screen Repair",
      image: "/images/repairs/screen-repair.webp",
      time: "45-90 Minutes",
      warranty: "1 Year",
      symptoms: [
        "Cracked Glass",
        "No Display",
        "Touch Not Responding",
        "Lines On Screen"
      ]
    },
    {
      repair: "Battery Replacement",
      image: "/images/repairs/battery-replacement.webp",
      time: "30-60 Minutes",
      warranty: "1 Year",
      symptoms: [
        "Battery Drains Fast",
        "Phone Shuts Off",
        "Battery Swelling",
        "Device Gets Hot"
      ]
    },
    {
      repair: "Charging Port Repair",
      image: "/images/repairs/charging-port-repair.webp",
      time: "45-90 Minutes",
      warranty: "1 Year",
      symptoms: [
        "Not Charging",
        "Loose Charger",
        "Intermittent Charging",
        "Cable Must Be Held At An Angle"
      ]
    },
    {
      repair: "Back Glass Repair",
      image: "/images/repairs/back-glass-repair.webp",
      time: "Same Day",
      warranty: "1 Year",
      symptoms: [
        "Cracked Back Glass",
        "Sharp Glass",
        "Damaged Rear Housing"
      ]
    },
    {
      repair: "Camera Repair",
      image: "/images/repairs/camera-repair.webp",
      time: "45-90 Minutes",
      warranty: "1 Year",
      symptoms: [
        "Blurry Camera",
        "Camera Not Opening",
        "Black Camera Screen",
        "Camera Lens Damage"
      ]
    },
    {
      repair: "Speaker / Microphone Repair",
      image: "/images/repairs/speaker-microphone-repair.webp",
      time: "45-90 Minutes",
      warranty: "1 Year",
      symptoms: [
        "No Sound",
        "Muffled Audio",
        "Customer Cannot Hear You",
        "Microphone Not Working"
      ]
    },
    {
      repair: "Button Repair",
      image: "/images/repairs/button-repair.webp",
      time: "45-90 Minutes",
      warranty: "1 Year",
      symptoms: [
        "Power Button Not Working",
        "Volume Button Stuck",
        "Mute Switch Issue",
        "Button Feels Loose"
      ]
    },
    {
      repair: "Water Damage Diagnostic",
      image: "/images/repairs/water-damage-diagnostic.webp",
      time: "Diagnostic Required",
      warranty: "No Warranty On Liquid Damage",
      symptoms: [
        "Liquid Exposure",
        "No Power",
        "Random Restarting",
        "Screen Flickering After Water Exposure"
      ]
    },
    {
      repair: "Software Issue",
      image: "/images/repairs/software-issue.webp",
      time: "Diagnostic Required",
      warranty: "Service Dependent",
      symptoms: [
        "Boot Loop",
        "Frozen Screen",
        "Update Issue",
        "Device Running Slow"
      ]
    },
    {
      repair: "Diagnostic / Not Sure",
      image: "/images/repairs/default.webp",
      time: "Diagnostic Required",
      warranty: "Quoted After Inspection",
      symptoms: [
        "Not Sure What Is Wrong",
        "Multiple Issues",
        "Device Needs Inspection"
      ]
    }
  ];
}

function normalizePhoneMasterCatalog(masterCatalog, brand) {
  if (!masterCatalog || typeof masterCatalog !== "object") {
    return [];
  }

  const selectedBrandKey = Object.keys(masterCatalog).find((key) => {
    return normalizePathValue(key) === normalizePathValue(brand);
  });

  if (!selectedBrandKey) {
    console.warn("Phone brand not found in master catalog:", brand);
    console.warn("Available phone brands:", Object.keys(masterCatalog));
    return [];
  }

  const brandCatalog = masterCatalog[selectedBrandKey];

  if (!brandCatalog || typeof brandCatalog !== "object") {
    return [];
  }

  const repairs = getDefaultPhoneRepairs();

  return Object.entries(brandCatalog).flatMap(([series, models]) => {
    if (!Array.isArray(models)) return [];

    return models.map((model) => {
      return {
        series,
        model,
        image: `/images/models/${normalizePathValue(brand)}/${normalizeImageFileName(model)}.webp`,
        repairs
      };
    });
  });
}

async function loadPhoneCatalog(brand) {
  const path = "/catalog/phones/phones.json";

  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Phone catalog load failed: ${path}`);
  }

  const masterCatalog = await response.json();

return normalizePhoneMasterCatalog(masterCatalog, brand);
}

export async function loadCatalog(device, brand) {
  try {
    const deviceFolder = normalizeDeviceFolder(device);

    if (deviceFolder === "phones") {
      return await loadPhoneCatalog(brand);
    }

    const brandFile = normalizePathValue(brand);
    const path = `/catalog/${deviceFolder}/${brandFile}.json`;

    const response = await fetch(path);

    if (!response.ok) {
      throw new Error(`Catalog load failed: ${path}`);
    }

    return await response.json();
  } catch (err) {
    console.error("Catalog Error:", err);
    return [];
  }
}
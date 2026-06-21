const DEFAULT_CARD_IMAGE = "/images/repairs/default.webp";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSafeImage(image) {
  return String(image || DEFAULT_CARD_IMAGE).trim() || DEFAULT_CARD_IMAGE;
}

function normalizeImageFileName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9-]/g, "");
}

function getPhoneBrandImage(label) {
  const imageName = normalizeImageFileName(label);

  if (!imageName) {
    return DEFAULT_CARD_IMAGE;
  }

  return `/images/brands/${imageName}.png`;
}

export function getBrandImage(device, brand) {
  const normalizedDevice = normalizeImageFileName(device);
  const normalizedBrand = normalizeImageFileName(brand);

  if (!normalizedDevice || !normalizedBrand) {
    return DEFAULT_CARD_IMAGE;
  }

  const brandFolderMap = {
  tablet: "tablets",
  computer: "computers",
  console: "consoles",
  smartwatch: "smartwatches",
  mods: "mods",
  other: "other"
};

if (normalizedDevice === "phone" || normalizedDevice === "cell-phone") {
  return getPhoneBrandImage(brand);
}

const folder = brandFolderMap[normalizedDevice];

if (!folder) {
  return DEFAULT_CARD_IMAGE;
}

if (normalizedDevice === "tablet" && normalizedBrand === "apple") {
  return "/images/brands/tablets/apple.webp";
}

if (normalizedDevice === "tablet" && normalizedBrand === "amazon") {
  return "/images/brands/tablets/firemax11.webp";
}

if (normalizedDevice === "tablet" && normalizedBrand === "lenovo") {
  return "/images/brands/tablets/ideatabpro2.webp";
}

if (normalizedDevice === "tablet" && normalizedBrand === "microsoft") {
  return "/images/brands/tablets/surfacepro11.webp";
}

if (normalizedDevice === "tablet" && normalizedBrand === "samsung") {
  return "/images/brands/tablets/galaxytabs11ultra.webp";
}

return `/images/brands/${folder}/${normalizedBrand}.png`;
}

export function getDeviceImage(label) {
  const deviceImageMap = {
    "Cell Phone": "phone",
    Phone: "phone",
    Tablet: "tablet",
    Computer: "computer",
    Console: "console",
    Smartwatch: "smartwatch",
    Mods: "mods",
    Other: "other"
  };

  const imageName = deviceImageMap[String(label || "")];

  if (!imageName) {
    return DEFAULT_CARD_IMAGE;
  }

  return `/images/devices/thumbs/${imageName}.webp`;
}

function getRepairLabelValue(repair) {
  if (typeof repair === "string") {
    return repair;
  }

  return repair?.repair || repair?.name || repair?.label || "";
}

function normalizeRepairLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function getRepairImage(repair) {
  const label = normalizeRepairLabel(getRepairLabelValue(repair));

  if (!label) {
    return DEFAULT_CARD_IMAGE;
  }

  if (
    label.includes("back glass") ||
    label.includes("rear glass") ||
    label.includes("back cover") ||
    label.includes("rear panel")
  ) {
    return "/images/repairs/back-glass-repair.png";
  }

  if (label.includes("battery")) {
    return "/images/repairs/battery-replacement.png";
  }

  if (
    label.includes("button") ||
    label.includes("buttons") ||
    label.includes("power button") ||
    label.includes("volume button")
  ) {
    return "/images/repairs/button-repair.png";
  }

  if (
    label.includes("camera") ||
    label.includes("lens")
  ) {
    return "/images/repairs/camera-repair.png";
  }

  if (
    label.includes("charging port") ||
    label.includes("charge port") ||
    label.includes("usb-c") ||
    label.includes("lightning port") ||
    label.includes("charging issue") ||
    label.includes("not charging")
  ) {
    return "/images/repairs/charging-port-repair.png";
  }

  if (
    label.includes("diagnostic") ||
    label.includes("not sure") ||
    label.includes("unknown issue") ||
    label.includes("inspection")
  ) {
    return "/images/repairs/diagnostic-not-sure.png";
  }

  if (
    label.includes("screen") ||
    label.includes("display") ||
    label.includes("lcd") ||
    label.includes("oled") ||
    label.includes("glass replacement")
  ) {
    return "/images/repairs/screen-repair.png";
  }

  if (
    label.includes("software") ||
    label.includes("boot loop") ||
    label.includes("update issue") ||
    label.includes("firmware")
  ) {
    return "/images/repairs/software-issue.png";
  }

  if (
    label.includes("speaker") ||
    label.includes("microphone") ||
    label.includes("mic") ||
    label.includes("audio")
  ) {
    return "/images/repairs/speaker-microphone-repair.png";
  }

  if (
    label.includes("water damage") ||
    label.includes("liquid damage") ||
    label.includes("moisture")
  ) {
    return "/images/repairs/water-damage-diagnostic.png";
  }

  return DEFAULT_CARD_IMAGE;
}

export function getResolvedRepairImage(repair) {
  const mappedImage = getRepairImage(repair);

  if (mappedImage && mappedImage !== DEFAULT_CARD_IMAGE) {
    return mappedImage;
  }

  const explicitImage =
    typeof repair === "object" && repair
      ? String(repair.image || "").trim()
      : "";

  if (
    explicitImage &&
    !explicitImage.includes("/images/repairs/default.webp") &&
    !explicitImage.endsWith(".webp")
  ) {
    return explicitImage;
  }

  return mappedImage || DEFAULT_CARD_IMAGE;
}

function getIphoneSeriesRank(label) {
  const value = String(label || "");

  if (value === "Original & Early") return 1;
  if (value === "iPhone 3 Series") return 3;
  if (value === "iPhone 4 Series") return 4;
  if (value === "iPhone 5 Series") return 5;
  if (value === "iPhone 6 Series") return 6;
  if (value === "iPhone 7 Series") return 7;
  if (value === "iPhone 8 Series") return 8;
  if (value === "iPhone X Series") return 10;

  const match = value.match(/^iPhone\s+(\d+)\s+Series$/i);

  if (match) {
    return Number(match[1]);
  }

  if (value === "iPhone SE Series") return 999;

  return null;
}

function sortByNaturalLabel(a, b) {
  const labelA = String(a?.label || "");
  const labelB = String(b?.label || "");

  const iphoneRankA = getIphoneSeriesRank(labelA);
  const iphoneRankB = getIphoneSeriesRank(labelB);

  if (iphoneRankA !== null || iphoneRankB !== null) {
    return (iphoneRankA ?? 9999) - (iphoneRankB ?? 9999);
  }

  return labelA.localeCompare(labelB, undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

export function createOptionCard({
  label,
  image,
  subtext = "",
  badge = "",
  className = "",
  onClick
}) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `opt-card ${className}`.trim();
  card.setAttribute("aria-label", label);

  const safeLabel = escapeHtml(label);
  const safeSubtext = escapeHtml(subtext);
  const safeBadge = escapeHtml(badge);
  const safeImage = escapeHtml(getSafeImage(image));

  card.innerHTML = `
    <div class="opt-thumb">
      <img
  class="opt-thumb-img"
  src="${safeImage}"
  alt="${safeLabel}"
  width="76"
  height="76"
  loading="lazy"
  decoding="async"
  onerror="this.onerror=null; this.src='${DEFAULT_CARD_IMAGE}';"
>
    </div>

    <div class="opt-card-body">
      ${safeBadge ? `<div class="opt-badge">${safeBadge}</div>` : ""}
      <div class="opt-label">${safeLabel}</div>
      ${safeSubtext ? `<div class="opt-subtext">${safeSubtext}</div>` : ""}
    </div>
  `;

  card.addEventListener("click", () => {
    if (typeof onClick === "function") {
      onClick();
    }
  });

  return card;
}

export function renderCardGrid(container, items = []) {
  if (!container) return;

  container.innerHTML = "";

  const deviceOrder = [
  "Cell Phone",
  "Phone",
  "Tablet",
  "Computer",
  "Console",
  "Smartwatch",
  "Mods",
  "Other"
];

  const isDeviceGrid =
    items.length &&
    items.every((item) => {
      return deviceOrder.includes(String(item?.label || ""));
    });

  const phonePriorityOrder = [
    "Apple",
    "Samsung",
    "Motorola",
    "Google"
  ];

  const isPhoneBrandGrid =
    items.length &&
    items.some((item) => phonePriorityOrder.includes(String(item?.label || ""))) &&
    items.some((item) => String(item?.label || "") === "Alcatel") &&
    items.some((item) => String(item?.label || "") === "ZTE");
    
      const isModsBrandGrid =
    items.length &&
    items.some((item) => String(item?.label || "") === "Meta Glasses") &&
    items.some((item) => String(item?.label || "") === "Consoles") &&
    items.some((item) => String(item?.label || "") === "Wearables");

  const displayItems = isDeviceGrid
    ? items
    : isPhoneBrandGrid
      ? [...items].sort((a, b) => {
          const labelA = String(a?.label || "");
          const labelB = String(b?.label || "");

          const indexA = phonePriorityOrder.indexOf(labelA);
          const indexB = phonePriorityOrder.indexOf(labelB);

          const priorityA = indexA === -1 ? 999 : indexA;
          const priorityB = indexB === -1 ? 999 : indexB;

          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          return sortByNaturalLabel(a, b);
        })
      : [...items].sort(sortByNaturalLabel);

  displayItems.forEach((item) => {
    const cardItem = isDeviceGrid
      ? {
          ...item,
          image: getDeviceImage(item?.label)
        }
      : isPhoneBrandGrid
        ? {
            ...item,
            image: item?.image || getPhoneBrandImage(item?.label)
          }
        : isModsBrandGrid
          ? {
              ...item,
              image: item?.image || getBrandImage("Mods", item?.label)
            }
          : item;

    const card = createOptionCard(cardItem);
    container.appendChild(card);
  });
}
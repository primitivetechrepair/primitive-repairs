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
    other: "other"
  };

  if (normalizedDevice === "phone" || normalizedDevice === "cell-phone") {
    return getPhoneBrandImage(brand);
  }

  const folder = brandFolderMap[normalizedDevice];

  if (!folder) {
    return DEFAULT_CARD_IMAGE;
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
  "Meta Glasses": "meta-glasses",
  Mods: "mods",
  Other: "other"
};

  const imageName = deviceImageMap[String(label || "")];

  if (!imageName) {
    return DEFAULT_CARD_IMAGE;
  }

  return `/images/devices/${imageName}.png`;
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
        loading="lazy"
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
  "Meta Glasses",
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
      : item;

  const card = createOptionCard(cardItem);
  container.appendChild(card);
});
}
const SUPPORTED_SCHEMA_VERSION = 1;
const MAX_LABEL_LENGTH = 160;
const MAX_ITEMS_PER_LEVEL = 250;
const MAX_TOTAL_NODES = 20000;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/u;
const PUBLIC_IMAGE_PATH = "/storage/v1/object/public/intake-card-images/";
const UUID_PATTERN = /(?:^|[^0-9a-f])[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}(?:$|[^0-9a-f])/i;

export class CatalogAdapterError extends Error {
  constructor(code = "catalog_invalid") {
    super("The repair catalog response is not supported.");
    this.name = "CatalogAdapterError";
    this.code = code;
  }
}

function invalid(code = "catalog_invalid") {
  throw new CatalogAdapterError(code);
}

function plainRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalid();
  }

  for (const key of ["__proto__", "prototype", "constructor"]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      invalid();
    }
  }

  return value;
}

function safeLabel(value) {
  if (typeof value !== "string") {
    invalid();
  }

  const result = value.trim();

  if (
    !result ||
    result.length > MAX_LABEL_LENGTH ||
    CONTROL_CHARACTERS.test(result)
  ) {
    invalid();
  }

  return result;
}

function safeOptionalLabel(value) {
  if (value == null || value === "") return null;
  return safeLabel(value);
}

function safeList(value) {
  if (!Array.isArray(value) || value.length > MAX_ITEMS_PER_LEVEL) {
    invalid();
  }

  return value;
}

function safePublicImageUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !url.pathname.startsWith(PUBLIC_IMAGE_PATH)
    ) {
      return null;
    }

    const publicPath = decodeURIComponent(url.pathname.slice(PUBLIC_IMAGE_PATH.length));
    if (
      !publicPath ||
      publicPath.includes("\\") ||
      publicPath.split("/").some((part) => !part || part === "." || part === "..") ||
      UUID_PATTERN.test(publicPath)
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function slug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "option";
}

function fnv1a(value) {
  let hash = 0x811c9dc5;

  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}

export function createStableOptionId(level, path) {
  const canonicalPath = [level, ...path]
    .map((part) => String(part || "").trim().toLocaleLowerCase())
    .join("::");

  return `${slug(level)}-${slug(path[path.length - 1])}-${fnv1a(canonicalPath)}`;
}

function normalizeImageFileName(value) {
  const normalized = slug(value);
  const overrides = {
    "iphone-original": "iphone",
    "iphone-se": "iphonese",
    "iphone-se-1st-gen": "iphonese",
    "iphone-se-1st-generation": "iphonese",
    "iphone-se-2nd-gen": "iphonese2",
    "iphone-se-2nd-generation": "iphonese2",
    "iphone-se-3rd-gen": "iphonese3",
    "iphone-se-3rd-generation": "iphonese3"
  };

  return overrides[normalized] || normalized.replace(/-/g, "");
}

export function resolveLocalModelImage(deviceLabel, brandLabel, modelLabel) {
  const device = slug(deviceLabel);

  if (device === "phone" || device === "cell-phone") {
    return `/images/models/${slug(brandLabel)}/${normalizeImageFileName(modelLabel)}.webp`;
  }

  return `/images/models/${slug(modelLabel)}.webp`;
}

function uniqueSibling(seen, label) {
  const key = label.toLocaleLowerCase();

  if (seen.has(key)) invalid();
  seen.add(key);
}

export function adaptPublicCatalogV1(payload) {
  const source = plainRecord(payload);

  if (source.ok !== true || source.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    invalid("catalog_schema_unsupported");
  }

  if (!Number.isInteger(source.catalogVersion) || source.catalogVersion < 1) {
    invalid();
  }

  const updatedAt = new Date(source.updatedAt);

  if (!Number.isFinite(updatedAt.getTime())) {
    invalid();
  }

  let totalNodes = 0;
  const countNode = () => {
    totalNodes += 1;
    if (totalNodes > MAX_TOTAL_NODES) invalid();
  };

  const deviceNames = new Set();
  const devices = safeList(source.devices).map((rawDevice) => {
    const device = plainRecord(rawDevice);
    const deviceLabel = safeLabel(device.name);
    uniqueSibling(deviceNames, deviceLabel);
    countNode();

    const brandNames = new Set();
    const brands = safeList(device.brands).map((rawBrand) => {
      const brand = plainRecord(rawBrand);
      const brandLabel = safeLabel(brand.name);
      uniqueSibling(brandNames, brandLabel);
      countNode();

      const seriesNames = new Set();
      const series = safeList(brand.series).map((rawSeries) => {
        const seriesNode = plainRecord(rawSeries);
        const seriesLabel = safeLabel(seriesNode.name);
        uniqueSibling(seriesNames, seriesLabel);
        countNode();

        const modelNames = new Set();
        const models = safeList(seriesNode.models).map((rawModel) => {
          const model = plainRecord(rawModel);
          const modelLabel = safeLabel(model.name);
          uniqueSibling(modelNames, modelLabel);
          countNode();

          const repairNames = new Set();
          const repairs = safeList(model.repairs).map((rawRepair) => {
            const repair = plainRecord(rawRepair);
            const repairLabel = safeLabel(repair.name);
            uniqueSibling(repairNames, repairLabel);
            countNode();

            const repairPath = [
              deviceLabel,
              brandLabel,
              seriesLabel,
              modelLabel,
              repairLabel
            ];

            return {
              id: createStableOptionId("repair", repairPath),
              label: repairLabel,
              repair: repairLabel,
              image: safePublicImageUrl(repair.imageUrl),
              time: safeOptionalLabel(repair.repairTime ?? repair.repair_time),
              warranty: safeOptionalLabel(repair.warranty),
              symptoms: []
            };
          });

          const modelPath = [deviceLabel, brandLabel, seriesLabel, modelLabel];

          return {
            id: createStableOptionId("model", modelPath),
            label: modelLabel,
            model: modelLabel,
            series: seriesLabel,
            image: resolveLocalModelImage(deviceLabel, brandLabel, modelLabel),
            publicImageUrl: safePublicImageUrl(model.imageUrl),
            repairs
          };
        });

        const seriesPath = [deviceLabel, brandLabel, seriesLabel];

        return {
          id: createStableOptionId("series", seriesPath),
          label: seriesLabel,
          image: safePublicImageUrl(seriesNode.imageUrl),
          models
        };
      });

      const brandPath = [deviceLabel, brandLabel];

      return {
        id: createStableOptionId("brand", brandPath),
        label: brandLabel,
        image: safePublicImageUrl(brand.imageUrl),
        series
      };
    });

    return {
      id: createStableOptionId("device", [deviceLabel]),
      label: deviceLabel,
      image: safePublicImageUrl(device.imageUrl),
      brands
    };
  });

  if (!devices.length) invalid("catalog_empty");

  return {
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    catalogVersion: source.catalogVersion,
    updatedAt: updatedAt.toISOString(),
    devices
  };
}

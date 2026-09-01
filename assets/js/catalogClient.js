const CONFIG_PATH = "/api/catalog-config";
const CACHE_PREFIX = "primitive-repairs:public-catalog:v1";
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_RESPONSE_BYTES = 1024 * 1024;

export class CatalogClientError extends Error {
  constructor(code = "catalog_unavailable", status = 0) {
    super("The repair catalog is temporarily unavailable.");
    this.name = "CatalogClientError";
    this.code = code;
    this.status = status;
  }
}

function unavailable(code = "catalog_unavailable", status = 0) {
  throw new CatalogClientError(code, status);
}

function plainRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    unavailable("catalog_configuration_invalid");
  }

  return value;
}

function endpointHash(value) {
  let hash = 0x811c9dc5;

  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}

function validateEndpoint(value) {
  try {
    const url = new URL(String(value || ""));

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/api/public/catalog"
    ) {
      unavailable("catalog_configuration_invalid");
    }

    return url.toString();
  } catch (error) {
    if (error instanceof CatalogClientError) throw error;
    unavailable("catalog_configuration_invalid");
  }
}

function validateCredential(value) {
  const credential = String(value || "").trim();

  if (
    credential.length < 24 ||
    credential.length > 512 ||
    /[\u0000-\u0020\u007f]/u.test(credential)
  ) {
    unavailable("catalog_configuration_invalid");
  }

  return credential;
}

function validateScope(value) {
  const scope = String(value || "").trim();

  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(scope)) {
    unavailable("catalog_configuration_invalid");
  }

  return scope;
}

function validateEtag(value) {
  const etag = String(value || "").trim();

  if (!etag || etag.length > 256 || /[\u0000-\u001f\u007f]/u.test(etag)) {
    return null;
  }

  return etag;
}

export async function fetchCatalogRuntimeConfig(fetchImpl = globalThis.fetch) {
  let response;

  try {
    response = await fetchImpl(CONFIG_PATH, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      redirect: "error"
    });
  } catch {
    unavailable("catalog_configuration_unavailable");
  }

  if (!response?.ok) {
    unavailable("catalog_configuration_unavailable", response?.status || 0);
  }

  let body;

  try {
    body = plainRecord(await response.json());
  } catch (error) {
    if (error instanceof CatalogClientError) throw error;
    unavailable("catalog_configuration_invalid");
  }

  const provider = String(body.provider || "").trim().toLowerCase();

  if (provider === "legacy") {
    return { provider: "legacy" };
  }

  if (provider !== "benchlayer") {
    unavailable("catalog_configuration_invalid");
  }

  return {
    provider,
    endpoint: validateEndpoint(body.endpoint),
    credential: validateCredential(body.credential),
    cacheScope: validateScope(body.cacheScope)
  };
}

export class PublicCatalogClient {
  constructor({
    endpoint,
    credential,
    cacheScope,
    fetchImpl = globalThis.fetch,
    storage = globalThis.sessionStorage,
    now = () => Date.now()
  }) {
    this.endpoint = validateEndpoint(endpoint);
    this.credential = validateCredential(credential);
    this.cacheScope = validateScope(cacheScope);
    this.fetchImpl = fetchImpl;
    this.storage = storage;
    this.now = now;
    this.cacheKey = `${CACHE_PREFIX}:${this.cacheScope}:${endpointHash(this.endpoint)}`;
  }

  readCache() {
    try {
      const record = JSON.parse(this.storage?.getItem(this.cacheKey) || "null");

      if (
        !record ||
        record.schemaVersion !== 1 ||
        typeof record.storedAt !== "number" ||
        this.now() - record.storedAt > MAX_CACHE_AGE_MS ||
        !validateEtag(record.etag) ||
        !record.catalog ||
        typeof record.catalog !== "object" ||
        Array.isArray(record.catalog)
      ) {
        this.clearCache();
        return null;
      }

      return record;
    } catch {
      this.clearCache();
      return null;
    }
  }

  writeCache(etag, catalog) {
    const safeEtag = validateEtag(etag);
    if (!safeEtag) return;

    try {
      this.storage?.setItem(this.cacheKey, JSON.stringify({
        schemaVersion: 1,
        etag: safeEtag,
        storedAt: this.now(),
        catalog
      }));
    } catch {
      // Catalog availability must not depend on browser storage availability.
    }
  }

  clearCache() {
    try {
      this.storage?.removeItem(this.cacheKey);
    } catch {
      // Ignore disabled or quota-limited browser storage.
    }
  }

  async request(cacheRecord = this.readCache(), allowUnconditionalRetry = true) {
    const headers = {
      Accept: "application/json",
      Authorization: `Bearer ${this.credential}`
    };

    if (cacheRecord?.etag) {
      headers["If-None-Match"] = cacheRecord.etag;
    }

    let response;

    try {
      response = await this.fetchImpl(this.endpoint, {
        method: "GET",
        headers,
        mode: "cors",
        credentials: "omit",
        referrerPolicy: "no-referrer"
      });
    } catch {
      unavailable("catalog_network_error");
    }

    if (response.status === 304) {
      if (cacheRecord?.catalog) return cacheRecord.catalog;
      if (allowUnconditionalRetry) return this.request(null, false);
      unavailable("catalog_response_invalid", response.status);
    }

    if (!response.ok) {
      if ([401, 403, 404, 422].includes(response.status)) {
        this.clearCache();
      }
      unavailable("catalog_unavailable", response.status);
    }

    const contentLength = Number(response.headers?.get?.("content-length") || 0);
    if (contentLength > MAX_RESPONSE_BYTES) {
      unavailable("catalog_response_too_large", response.status);
    }

    let catalog;

    try {
      const rawBody = await response.text();
      if (new TextEncoder().encode(rawBody).byteLength > MAX_RESPONSE_BYTES) {
        unavailable("catalog_response_too_large", response.status);
      }
      catalog = JSON.parse(rawBody);
    } catch (error) {
      if (error instanceof CatalogClientError) throw error;
      unavailable("catalog_response_invalid", response.status);
    }

    if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
      unavailable("catalog_response_invalid", response.status);
    }

    this.writeCache(response.headers?.get?.("etag"), catalog);
    return catalog;
  }

  async load() {
    return this.request();
  }
}

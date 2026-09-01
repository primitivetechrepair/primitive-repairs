const PROVIDERS = new Set(["benchlayer", "legacy"]);

function clean(value) {
  return String(value || "").trim();
}

function validEndpoint(value) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/api/public/catalog"
    );
  } catch {
    return false;
  }
}

export function readCatalogConfig(env = process.env) {
  const provider = clean(env.CATALOG_PROVIDER || "legacy").toLowerCase();

  if (!PROVIDERS.has(provider)) {
    throw new Error("catalog_configuration_invalid");
  }

  if (provider === "legacy") {
    return { provider };
  }

  const endpoint = clean(env.BENCHLAYER_PUBLIC_CATALOG_URL);
  const credential = clean(env.BENCHLAYER_PUBLIC_CONNECTION_TOKEN);
  const cacheScope = clean(env.BENCHLAYER_PUBLIC_CATALOG_CACHE_SCOPE);

  if (
    !validEndpoint(endpoint) ||
    credential.length < 24 ||
    credential.length > 512 ||
    /[\u0000-\u0020\u007f]/u.test(credential) ||
    !/^[a-z0-9][a-z0-9._-]{0,63}$/i.test(cacheScope)
  ) {
    throw new Error("catalog_configuration_invalid");
  }

  return { provider, endpoint, credential, cacheScope };
}

function securityHeaders(res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Vary", "Origin");
}

export default function handler(req, res) {
  securityHeaders(res);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  try {
    return res.status(200).json({ ok: true, ...readCatalogConfig() });
  } catch {
    return res.status(503).json({ ok: false, error: "catalog_unavailable" });
  }
}


const PROVIDERS = new Set(["benchlayer", "legacy"]);

function clean(value) {
  return String(value || "").trim();
}

function validEndpoint(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password
      && !url.search && !url.hash && url.pathname === "/api/public/intake";
  } catch {
    return false;
  }
}

export function readIntakeConfig(env = process.env) {
  const provider = clean(env.INTAKE_PROVIDER || "legacy").toLowerCase();
  if (!PROVIDERS.has(provider)) throw new Error("intake_configuration_invalid");
  if (provider === "legacy") return { provider };

  const endpoint = clean(env.BENCHLAYER_PUBLIC_INTAKE_URL);
  const credential = clean(env.BENCHLAYER_PUBLIC_CONNECTION_TOKEN);
  if (!validEndpoint(endpoint) || credential.length < 32 || credential.length > 256
    || /[\u0000-\u0020\u007f]/u.test(credential)) {
    throw new Error("intake_configuration_invalid");
  }
  return { provider, endpoint, credential };
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
    return res.status(200).json({ ok: true, ...readIntakeConfig() });
  } catch {
    return res.status(503).json({ ok: false, error: "intake_unavailable" });
  }
}

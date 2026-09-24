// Shared helpers for the OTP + lead serverless functions (Vercel treats files starting with "_" as non-routes).
const crypto = require("crypto");

const PHONE_RE = /^[6-9]\d{9}$/;

function secret() {
  const s = process.env.OTP_SECRET;
  if (!s || s.length < 16) throw new Error("OTP_SECRET env var missing or too short");
  return s;
}

const b64 = buf => Buffer.from(buf).toString("base64url");

// Signed, expiring token: base64url(json).base64url(hmac)
function sign(payload) {
  const body = b64(JSON.stringify(payload));
  const mac = b64(crypto.createHmac("sha256", secret()).update(body).digest());
  return body + "." + mac;
}

function unsign(token) {
  if (typeof token !== "string" || !token.includes(".")) return null;
  const [body, mac] = token.split(".");
  const expected = b64(crypto.createHmac("sha256", secret()).update(body).digest());
  const a = Buffer.from(mac || ""), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString());
    return data.exp > Date.now() ? data : null;
  } catch (e) {
    return null;
  }
}

// Call an SEO Age Digital (DataGenIt) HTTP API endpoint, e.g. "generate_otp.php", and return its JSON.
async function smsApi(endpoint, params) {
  const base = (process.env.SMS_API_BASE || "http://sms.seoagedigital.com/API").replace(/\/$/, "");
  const r = await fetch(`${base}/${endpoint}?${new URLSearchParams(params)}`, { signal: AbortSignal.timeout(10000) });
  const text = await r.text();
  try { return JSON.parse(text); } catch (e) { return { status: "failure", code: r.status, desc: text.slice(0, 200) }; }
}

function send(res, status, data) {
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(data);
}

function body(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body || "{}"); } catch (e) { return {}; }
}

// Block calls made from other websites (browsers always send Origin on cross-site POSTs).
function sameOrigin(req) {
  const origin = req.headers && req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch (e) { return false; }
}

module.exports = { PHONE_RE, sign, unsign, send, body, sameOrigin, smsApi };

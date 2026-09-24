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

// Keyed hash of an OTP, bound to the phone and expiry, so the ticket never reveals the code.
function otpHash(phone, otp, exp) {
  return b64(crypto.createHmac("sha256", secret()).update(`otp:${phone}:${otp}:${exp}`).digest());
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

module.exports = { PHONE_RE, sign, unsign, otpHash, send, body, sameOrigin };

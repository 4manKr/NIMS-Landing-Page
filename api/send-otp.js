// POST /api/send-otp  { phone: "9876543210" }
// Generates a 6-digit OTP on the server and SMSes it through SEO Age Digital's Send SMS API
// (sms-api.php) using the account's DLT-approved OTP template. Returns a signed ticket that
// holds only a keyed hash of the OTP — the code itself never goes back to the browser.
const crypto = require("crypto");
const { PHONE_RE, sign, otpHash, send, body, sameOrigin, smsApi } = require("./_lib");

const OTP_TTL_MS = 5 * 60 * 1000;   // the approved template says "valid till 5 minutes"

// Defaults = the approved TABEDU OTP template on the SEO Age Digital account (override via env).
const DEFAULTS = {
  SMS_SENDER_ID: "TABEDU",
  SMS_ENTITY_ID: "1701160277700802420",
  SMS_TEMPLATE_ID: "1707163145165961393",
  SMS_TEMPLATE: "Thanks for registering with us. Your OTP to register/access TAB INDIA is {otp}. It will be valid till 5 minutes. -TAB INDIA (Admission Bureau)"
};
const env = k => process.env[k] || DEFAULTS[k] || "";

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { ok: false, code: "method" });
  if (!sameOrigin(req)) return send(res, 403, { ok: false, code: "forbidden" });

  const { phone } = body(req);
  if (!PHONE_RE.test(String(phone || ""))) return send(res, 400, { ok: false, code: "invalid_phone" });

  const template = env("SMS_TEMPLATE");
  if (!process.env.SMS_API_KEY || !process.env.OTP_SECRET || !template.includes("{otp}")) {
    return send(res, 500, { ok: false, code: "not_configured" });
  }

  const otp = String(crypto.randomInt(0, 1e6)).padStart(6, "0");
  const exp = Date.now() + OTP_TTL_MS;

  try {
    const ticket = sign({ t: "otp", p: phone, h: otpHash(phone, otp, exp), exp });
    const data = await smsApi("sms-api.php", {
      auth: process.env.SMS_API_KEY,
      msisdn: phone,
      senderid: env("SMS_SENDER_ID"),
      entity_id: env("SMS_ENTITY_ID"),
      template_id: env("SMS_TEMPLATE_ID"),
      message: template.replace("{otp}", otp)   // must match the DLT template word for word
    });
    if (data.status !== "success") {
      console.error("send-otp: provider error", JSON.stringify(data));
      return send(res, 502, { ok: false, code: "provider" });
    }
    return send(res, 200, { ok: true, ticket });
  } catch (err) {
    console.error("send-otp: request failed", err);
    return send(res, 502, { ok: false, code: "provider" });
  }
};

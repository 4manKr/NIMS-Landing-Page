// POST /api/send-otp  { phone: "9876543210" }
// Generates an OTP on the server, sends it by SMS through the SEO Age Digital panel
// (DataGenIt platform: /API/sms-api.php), and returns a signed ticket that holds only a
// keyed hash of the OTP — the code itself never goes back to the browser.
const crypto = require("crypto");
const { PHONE_RE, sign, otpHash, send, body, sameOrigin } = require("./_lib");

const OTP_TTL_MS = 10 * 60 * 1000;

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { ok: false, code: "method" });
  if (!sameOrigin(req)) return send(res, 403, { ok: false, code: "forbidden" });

  const { phone } = body(req);
  if (!PHONE_RE.test(String(phone || ""))) return send(res, 400, { ok: false, code: "invalid_phone" });

  const { SMS_API_KEY, SMS_SENDER_ID, SMS_TEMPLATE, SMS_TEMPLATE_ID, SMS_ENTITY_ID } = process.env;
  const apiUrl = process.env.SMS_API_URL || "https://global.datagenit.com/API/sms-api.php";
  if (!SMS_API_KEY || !SMS_SENDER_ID || !SMS_TEMPLATE || !SMS_TEMPLATE.includes("{otp}")) {
    return send(res, 500, { ok: false, code: "not_configured" });
  }

  const len = Number(process.env.OTP_LENGTH) || 6;
  const otp = String(crypto.randomInt(0, 10 ** len)).padStart(len, "0");
  const exp = Date.now() + OTP_TTL_MS;

  const params = {
    auth: SMS_API_KEY,
    msisdn: "91" + phone,
    senderid: SMS_SENDER_ID,
    message: SMS_TEMPLATE.replace("{otp}", otp)   // must match your DLT-approved template exactly
  };
  if (SMS_TEMPLATE_ID) params.template_id = SMS_TEMPLATE_ID;
  if (SMS_ENTITY_ID) params.entity_id = SMS_ENTITY_ID;

  try {
    let ticket;
    try { ticket = sign({ t: "otp", p: phone, h: otpHash(phone, otp, exp), exp }); }
    catch (e) { return send(res, 500, { ok: false, code: "not_configured" }); }

    const r = await fetch(apiUrl + "?" + new URLSearchParams(params), { signal: AbortSignal.timeout(10000) });
    const data = await r.json().catch(() => ({}));
    if (data.status !== "success") {
      console.error("send-otp: provider error", r.status, JSON.stringify(data));
      return send(res, 502, { ok: false, code: "provider" });
    }
    return send(res, 200, { ok: true, ticket });
  } catch (err) {
    console.error("send-otp: request failed", err);
    return send(res, 502, { ok: false, code: "provider" });
  }
};

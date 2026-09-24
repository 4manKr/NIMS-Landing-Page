// POST /api/send-otp  { phone: "9876543210" }
// Asks SEO Age Digital (Authkey.io platform) to generate and SMS an OTP, and returns a signed
// ticket that binds the returned LogID to this phone number for 10 minutes.
const { PHONE_RE, sign, send, body, sameOrigin } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { ok: false, code: "method" });
  if (!sameOrigin(req)) return send(res, 403, { ok: false, code: "forbidden" });

  const { phone } = body(req);
  if (!PHONE_RE.test(String(phone || ""))) return send(res, 400, { ok: false, code: "invalid_phone" });

  const { AUTHKEY_API_KEY, AUTHKEY_SID } = process.env;
  if (!AUTHKEY_API_KEY || !AUTHKEY_SID) return send(res, 500, { ok: false, code: "not_configured" });

  const url = "https://api.authkey.io/request?" + new URLSearchParams({
    authkey: AUTHKEY_API_KEY,
    mobile: phone,
    country_code: "91",
    sid: AUTHKEY_SID
  });

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await r.json().catch(() => ({}));
    const logId = data.LogID || data.logid || data.LogId;
    if (!logId) {
      console.error("send-otp: provider error", r.status, data);
      return send(res, 502, { ok: false, code: "provider" });
    }
    const ticket = sign({ t: "otp", l: logId, p: phone, exp: Date.now() + 10 * 60 * 1000 });
    return send(res, 200, { ok: true, ticket });
  } catch (err) {
    console.error("send-otp: request failed", err);
    return send(res, 502, { ok: false, code: "provider" });
  }
};

// POST /api/verify-otp  { phone, otp, ticket }
// Checks the OTP with SEO Age Digital (Authkey.io 2FA verify) and, if valid, returns a
// signed "verified" token for this phone that /api/submit-lead accepts for 30 minutes.
const { PHONE_RE, sign, unsign, send, body } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { ok: false, code: "method" });

  const { phone, otp, ticket } = body(req);
  if (!PHONE_RE.test(String(phone || ""))) return send(res, 400, { ok: false, code: "invalid_phone" });
  if (!/^\d{4,8}$/.test(String(otp || ""))) return send(res, 400, { ok: false, code: "invalid_otp" });

  let t;
  try { t = unsign(ticket); } catch (e) { return send(res, 500, { ok: false, code: "not_configured" }); }
  if (!t || t.t !== "otp") return send(res, 400, { ok: false, code: "expired" });
  if (t.p !== phone) return send(res, 400, { ok: false, code: "invalid_phone" });

  const url = "https://console.authkey.io/api/2fa_verify.php?" + new URLSearchParams({
    authkey: process.env.AUTHKEY_API_KEY || "",
    channel: "SMS",
    otp: String(otp),
    logid: t.l
  });

  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await r.json().catch(() => ({}));
    const valid = data.status === true || data.status === "true" || data.status === 1;
    if (!valid) return send(res, 400, { ok: false, code: "invalid_otp" });
    const token = sign({ t: "verified", p: phone, exp: Date.now() + 30 * 60 * 1000 });
    return send(res, 200, { ok: true, token });
  } catch (err) {
    console.error("verify-otp: request failed", err);
    return send(res, 502, { ok: false, code: "provider" });
  }
};

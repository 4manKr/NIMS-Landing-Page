// POST /api/verify-otp  { phone, otp, ticket }
// Step 2 of SEO Age Digital's 2Factor API (verify_otp.php). On success returns a signed
// "verified" token for this phone that /api/submit-lead accepts for 30 minutes.
const { PHONE_RE, sign, unsign, send, body, sameOrigin, smsApi } = require("./_lib");

// Provider failure codes → codes the page understands
const CODES = { 419: "invalid_otp", 421: "expired", 422: "expired" };

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { ok: false, code: "method" });
  if (!sameOrigin(req)) return send(res, 403, { ok: false, code: "forbidden" });

  const { phone, otp, ticket } = body(req);
  if (!PHONE_RE.test(String(phone || ""))) return send(res, 400, { ok: false, code: "invalid_phone" });
  if (!/^\d{4,8}$/.test(String(otp || ""))) return send(res, 400, { ok: false, code: "invalid_otp" });

  let t;
  try { t = unsign(ticket); } catch (e) { return send(res, 500, { ok: false, code: "not_configured" }); }
  if (!t || t.t !== "otp") return send(res, 400, { ok: false, code: "expired" });
  if (t.p !== phone) return send(res, 400, { ok: false, code: "invalid_phone" });

  try {
    const data = await smsApi("verify_otp.php", {
      auth: process.env.SMS_API_KEY || "", msisdn: phone, logid: t.l, otp: String(otp)
    });
    if (data.status !== "success") {
      const code = CODES[Number(data.code)];
      if (!code) console.error("verify-otp: provider error", JSON.stringify(data));
      return send(res, code ? 400 : 502, { ok: false, code: code || "provider" });
    }
    const token = sign({ t: "verified", p: phone, exp: Date.now() + 30 * 60 * 1000 });
    return send(res, 200, { ok: true, token });
  } catch (err) {
    console.error("verify-otp: request failed", err);
    return send(res, 502, { ok: false, code: "provider" });
  }
};

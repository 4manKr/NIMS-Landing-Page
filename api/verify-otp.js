// POST /api/verify-otp  { phone, otp, ticket }
// Checks the entered OTP against the keyed hash inside the signed ticket from /api/send-otp.
// On success returns a "verified" token for this phone that /api/submit-lead accepts for 30 minutes.
const crypto = require("crypto");
const { PHONE_RE, sign, unsign, otpHash, send, body, sameOrigin } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { ok: false, code: "method" });
  if (!sameOrigin(req)) return send(res, 403, { ok: false, code: "forbidden" });

  const { phone, otp, ticket } = body(req);
  if (!PHONE_RE.test(String(phone || ""))) return send(res, 400, { ok: false, code: "invalid_phone" });
  if (!/^\d{6}$/.test(String(otp || ""))) return send(res, 400, { ok: false, code: "invalid_otp" });

  let t;
  try { t = unsign(ticket); } catch (e) { return send(res, 500, { ok: false, code: "not_configured" }); }
  if (!t || t.t !== "otp") return send(res, 400, { ok: false, code: "expired" });
  if (t.p !== phone) return send(res, 400, { ok: false, code: "invalid_phone" });

  const a = Buffer.from(otpHash(phone, String(otp), t.exp)), b = Buffer.from(String(t.h || ""));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return send(res, 400, { ok: false, code: "invalid_otp" });

  const token = sign({ t: "verified", p: phone, exp: Date.now() + 30 * 60 * 1000 });
  return send(res, 200, { ok: true, token });
};

// POST /api/submit-lead  { token, name, phone, location, ...tracking }
// Accepts a lead only when it carries a valid "verified" token for the same phone number,
// then forwards it to the Google Sheet (LEAD_WEBHOOK_URL = Apps Script web-app URL).
const { PHONE_RE, unsign, send, body } = require("./_lib");

const FIELDS = ["name", "email", "location", "college", "course", "source_url",
                "utm_source", "utm_medium", "utm_campaign", "gclid", "fbclid"];

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { ok: false, code: "method" });

  const b = body(req);
  const phone = String(b.phone || "");
  if (!PHONE_RE.test(phone)) return send(res, 400, { ok: false, code: "invalid_phone" });

  let t;
  try { t = unsign(b.token); } catch (e) { return send(res, 500, { ok: false, code: "not_configured" }); }
  if (!t || t.t !== "verified" || t.p !== phone) return send(res, 401, { ok: false, code: "not_verified" });

  const lead = { submitted_at: new Date().toISOString(), phone: "+91" + phone, phone_verified: "yes" };
  FIELDS.forEach(f => { lead[f] = String(b[f] || "").slice(0, 300); });
  if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) lead.email = "";

  const hook = process.env.LEAD_WEBHOOK_URL;
  if (!hook) {
    console.log("submit-lead (no LEAD_WEBHOOK_URL set):", JSON.stringify(lead));
    return send(res, 200, { ok: true, stored: false });
  }
  try {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(lead),
      signal: AbortSignal.timeout(10000)
    });
    return send(res, 200, { ok: true, stored: true });
  } catch (err) {
    console.error("submit-lead: webhook failed", err, JSON.stringify(lead));
    return send(res, 200, { ok: true, stored: false });
  }
};

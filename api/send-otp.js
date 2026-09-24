// POST /api/send-otp  { phone: "9876543210" }
// Step 1 of SEO Age Digital's 2Factor API (generate_otp.php): the provider generates the OTP,
// SMSes it with the account's DLT template and returns a logid. We return a signed ticket that
// binds that logid to this phone number, so it can't be reused for another number.
const { PHONE_RE, sign, send, body, sameOrigin, smsApi } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return send(res, 405, { ok: false, code: "method" });
  if (!sameOrigin(req)) return send(res, 403, { ok: false, code: "forbidden" });

  const { phone } = body(req);
  if (!PHONE_RE.test(String(phone || ""))) return send(res, 400, { ok: false, code: "invalid_phone" });

  const { SMS_API_KEY, SMS_SENDER_ID, SMS_ENTITY_ID, SMS_TEMPLATE_ID, OTP_SECRET } = process.env;
  if (!SMS_API_KEY || !SMS_SENDER_ID || !OTP_SECRET) return send(res, 500, { ok: false, code: "not_configured" });

  const params = { auth: SMS_API_KEY, msisdn: phone, countrycode: "91", senderid: SMS_SENDER_ID };
  if (SMS_ENTITY_ID) params.entity_id = SMS_ENTITY_ID;
  if (SMS_TEMPLATE_ID) params.template_id = SMS_TEMPLATE_ID;

  try {
    const data = await smsApi("generate_otp.php", params);
    if (data.status !== "success" || !data.logid) {
      console.error("send-otp: provider error", JSON.stringify(data));
      return send(res, 502, { ok: false, code: "provider" });
    }
    const ticket = sign({ t: "otp", l: data.logid, p: phone, exp: Date.now() + 5 * 60 * 1000 });
    return send(res, 200, { ok: true, ticket });
  } catch (err) {
    console.error("send-otp: request failed", err);
    return send(res, 502, { ok: false, code: "provider" });
  }
};

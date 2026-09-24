# OTP verification with SEO Age Digital — step by step

The form uses SEO Age Digital's **2Factor OTP API** (<http://sms.seoagedigital.com>):

```
Visitor fills form ──► /api/send-otp ───► API/generate_otp.php   (SEO Age Digital creates + SMSes the OTP, returns logid)
Visitor types OTP  ──► /api/verify-otp ─► API/verify_otp.php     (checks OTP; valid 5 min, one-time use)
Verified           ──► /api/submit-lead ► Google Sheet           (only verified numbers are saved)
```
Your auth key stays on the Vercel server. It never reaches the browser.

---

## Step 1 — SEO Age Digital panel
1. Log in at <http://sms.seoagedigital.com>.
2. Recharge **OTP / transactional SMS credits**.
3. Open **HTTP API** and **generate your auth key**. Copy it.
4. Note your approved **Sender ID** (6 letters) and your **DLT Entity ID** (PE ID).
5. **Do NOT turn on IP whitelisting** for the API. Vercel's server IPs keep changing, and the API would
   reply `407 Access Denied`.

## Step 2 — Ask SEO Age Digital support
- *"Please enable the 2Factor OTP API (generate_otp.php) on my account with my Sender ID."*
- *"How many digits is the OTP, 4 or 6?"* The page expects **6**. If it's 4, change `otpLength: 6` to `4`
  in the `CONFIG` block of `index.html`. The form still accepts 4–8 digits, but only auto-submits at `otpLength`.
- Optional: the default SMS text is *"Use {otp} as your OTP to access your account…"*. You can ask them to
  set a custom DLT template, e.g. *"{otp} is your OTP for MBBS admission enquiry…"*.

## Step 3 — Test it in your browser (sends a real OTP to your phone)
```
http://sms.seoagedigital.com/API/generate_otp.php?auth=YOUR_KEY&msisdn=YOUR_10_DIGIT_NUMBER&senderid=YOUR_SENDER_ID&entity_id=YOUR_ENTITY_ID
```
✅ `{"status":"success","logid":"5feb7b51aca0d","desc":"OTP Sent",...}` and you receive the SMS.

Then verify it (use the `logid` from above and the OTP from the SMS):
```
http://sms.seoagedigital.com/API/verify_otp.php?auth=YOUR_KEY&msisdn=YOUR_10_DIGIT_NUMBER&logid=LOGID&otp=OTP_FROM_SMS
```
✅ `{"status":"success","code":200,"desc":"OTP verified successfully",...}`

If Step 3 fails, see the error table at the bottom and fix it with SEO Age Digital before continuing.

## Step 4 — Vercel Environment Variables
Vercel → project → **Settings → Environment Variables** (Production):

| Name | Value | Required |
|---|---|---|
| `SMS_API_KEY` | your auth key | ✅ |
| `SMS_SENDER_ID` | your 6-letter Sender ID | ✅ |
| `OTP_SECRET` | any long random text (32+ characters) | ✅ |
| `SMS_ENTITY_ID` | your DLT Entity ID (skip only if it's saved in the panel) | recommended |
| `SMS_TEMPLATE_ID` | DLT template ID, if SEO Age Digital gives you one | optional |
| `LEAD_WEBHOOK_URL` | Google Apps Script Web app URL (see `apps-script.gs`) | optional |

Then go to **Deployments → ⋯ → Redeploy**.

## Step 5 — Protect your SMS credits
Vercel → **Firewall → Add Rule** (per IP):
- `/api/send-otp` → rate limit **5 requests / 10 minutes**
- `/api/verify-otp` → rate limit **10 requests / 10 minutes**

## Step 6 — Test the live site
Fill the form with your own number, enter the OTP, and you should see the thank-you screen (and the lead in your Sheet).
If it fails, open Vercel → **Logs** and look for `send-otp: provider error {...}` or `verify-otp: provider error {...}`.

> On `localhost` the page runs in **demo mode** (the OTP is shown on screen and no SMS is sent).

---

### SEO Age Digital error codes
| Code | Meaning | Fix |
|---|---|---|
| 402 / 412 | Invalid Auth / inactive user | Wrong `SMS_API_KEY`, or API not active on your account |
| 407 | Access Denied | Turn off IP whitelisting in the panel |
| 408 / 413 | Invalid / not approved Sender ID | Check `SMS_SENDER_ID` with SEO Age Digital |
| 420 | Entity ID not found | Add `SMS_ENTITY_ID` or save it in the panel |
| 429 / 436 | Low / insufficient balance | Recharge credits |
| 419 | Invalid OTP | Visitor typed the wrong code (shown on the form) |
| 421 / 422 | OTP expired / already used | Visitor taps **Resend OTP** (shown on the form) |

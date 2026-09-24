# OTP verification with SEO Age Digital — setup

```
Visitor fills form ──► /api/send-otp ───► sms.seoagedigital.com/API/sms-api.php
                                           (server makes a 6-digit OTP and sends it with the DLT-approved template)
Visitor types OTP  ──► /api/verify-otp     (server checks it; valid 5 minutes)
Verified           ──► /api/submit-lead ─► Google Sheet (only verified numbers are saved)
```

**Tested on 24-09-2026:** sender `TABEDU` + template `1707163145165961393` was delivered successfully.
(`generate_otp.php` and the NIMSED header were **not** delivered, because they're not DLT-registered.)

## Vercel Environment Variables
Vercel → project → **Settings → Environment Variables** (Production):

| Name | Value |
|---|---|
| `SMS_API_KEY` | your SEO Age Digital auth key (panel → HTTP API). **Regenerate it first** if it was ever shared. |
| `OTP_SECRET` | any long random text (32+ characters) |
| `LEAD_WEBHOOK_URL` | optional: Google Apps Script Web app URL (see `apps-script.gs`) |

Then go to **Deployments → ⋯ → Redeploy**.

The sender, entity, template ID and template text are built in (the approved TABEDU OTP template).

## Switching to a new template later (e.g. without "TAB INDIA")
1. Get the new template **approved on DLT** (ask SEO Age Digital support). You'll receive a Template ID starting `1707…`.
2. Add it in the panel: **DLT Setting → Manage Templates** (header **TABEDU**, type **Service-Implicit**).
3. In Vercel add:
   - `SMS_TEMPLATE_ID` = the new ID
   - `SMS_TEMPLATE` = the exact approved text with **`{otp}`** in place of `{#var#}`, e.g.
     `{otp} is your OTP to verify your mobile number for MBBS admission enquiry. It is valid for 5 minutes. Do not share it with anyone.`
4. Redeploy. The text must match DLT **word for word**, or the SMS is blocked.

## Protect your SMS credits
Vercel → **Firewall → Add Rule** (per IP):
- `/api/send-otp` → rate limit **5 requests / 10 minutes**
- `/api/verify-otp` → rate limit **10 requests / 10 minutes**

## Troubleshooting
- The form says "Couldn't send/verify OTP": open Vercel → **Logs** and look for `send-otp: provider error {...}`.
- The API says success but no SMS arrives: check the panel's **Reports** for the failure reason (usually a template text/header mismatch).
- Don't turn on **IP whitelisting** in the panel. Vercel's IPs change, and you'd get `407 Access Denied`.
- On `localhost` the page runs in **demo mode** (the OTP is shown on screen and no SMS is sent).

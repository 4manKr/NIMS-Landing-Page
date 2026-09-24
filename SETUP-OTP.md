# OTP verification with SEO Age Digital — step by step

Your SEO Age Digital SMS panel (<http://sms.seoagedigital.com>) runs on the **DataGenIt** platform.
Its API only *sends* SMS, so the website generates and checks the OTP itself:

```
Visitor fills form ──► /api/send-otp ──► DataGenIt sms-api.php   (server makes a 6-digit OTP and SMSes it)
Visitor types OTP  ──► /api/verify-otp                            (server checks it, no SMS API call)
Verified           ──► /api/submit-lead ► Google Sheet            (only if the OTP was verified)
```
The API key stays on the server (Vercel). The OTP is never sent to the browser.

---

## Step 1 — SEO Age Digital panel
1. Log in at <http://sms.seoagedigital.com>.
2. Recharge **transactional / OTP SMS credits**.

## Step 2 — DLT: Sender ID + OTP template (mandatory in India)
Ask SEO Age Digital to set this up, or do it yourself on a DLT portal (Jio / Airtel / Vilpower):
1. **Sender ID (header):** 6 letters, e.g. `MBBSAD`.
2. **OTP template** (Service Implicit category), for example:
   ```
   {#var#} is your OTP to verify your mobile number for MBBS admission enquiry. Valid for 10 minutes. - MBBSAD
   ```
3. Once approved, make sure the **Sender ID and template are added in your SEO Age Digital panel**.
   Note the **DLT Template ID** and your **PE / Entity ID**.

## Step 3 — Get your API key
In the panel, open the **API** section (or ask SEO Age Digital support) and copy your **auth key**.

## Step 4 — Test sending one SMS (from your browser)
Replace the values. The message must match your approved template, with a number in place of `{#var#}`:
```
https://global.datagenit.com/API/sms-api.php?auth=YOUR_KEY&msisdn=91YOURNUMBER&senderid=MBBSAD&message=123456 is your OTP to verify your mobile number for MBBS admission enquiry. Valid for 10 minutes. - MBBSAD
```
- ✅ `{"status":"success",...}` and the SMS arrives → go to Step 5.
- ❌ `Invalid Auth or inactive user` → try the same link with `http://sms.seoagedigital.com/API/sms-api.php` instead,
  and if that works set `SMS_API_URL` to it in Step 5. Otherwise ask SEO Age Digital to activate API access.
- ❌ Success but no SMS → the message doesn't match the DLT template exactly, or the Sender ID isn't mapped.
  Ask SEO Age Digital whether they need `template_id` / `entity_id` in the API call.

## Step 5 — Vercel Environment Variables
Vercel → project → **Settings → Environment Variables** (Production):

| Name | Value | Required |
|---|---|---|
| `SMS_API_KEY` | your auth key (Step 3) | ✅ |
| `SMS_SENDER_ID` | your Sender ID, e.g. `MBBSAD` | ✅ |
| `SMS_TEMPLATE` | your DLT template with **`{otp}`** where `{#var#}` is, e.g.<br>`{otp} is your OTP to verify your mobile number for MBBS admission enquiry. Valid for 10 minutes. - MBBSAD` | ✅ |
| `OTP_SECRET` | any long random text (32+ characters) | ✅ |
| `LEAD_WEBHOOK_URL` | Google Apps Script Web app URL (see `apps-script.gs`) | optional |
| `SMS_API_URL` | only if Step 4 needed `http://sms.seoagedigital.com/API/sms-api.php` | optional |
| `SMS_TEMPLATE_ID` / `SMS_ENTITY_ID` | only if SEO Age Digital says the API needs them | optional |
| `OTP_LENGTH` | default `6`. If you change it, also change `otpLength` in `index.html` | optional |

Then go to **Deployments → ⋯ → Redeploy**.

## Step 6 — Protect your SMS credits
Vercel → **Firewall → Add Rule**, per IP:
- `/api/send-otp` → rate limit **5 requests / 10 minutes**
- `/api/verify-otp` → rate limit **10 requests / 10 minutes**

## Step 7 — Test the live site
Fill the form with your own number, enter the SMS code, and check that the thank-you screen appears
(and the lead appears in your Google Sheet). If it fails, open Vercel → **Logs** and look for
`send-otp: provider error {...}`. That line shows the SMS panel's exact error.

> On `localhost` the page runs in **demo mode** (the OTP is shown on screen and no SMS is sent).

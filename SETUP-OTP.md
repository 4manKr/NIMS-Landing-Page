# OTP verification with SEO Age Digital — step by step

SEO Age Digital's SMS panel (`cpaas.seoagemarketing.com`) runs on the **Authkey.io** platform, so the API
endpoints and parameters are Authkey's. The page sends and verifies OTPs through three small Vercel
functions in `/api`. Your API key stays on the server and never reaches the browser.

```
Visitor fills form ──► /api/send-otp ──► api.authkey.io/request            (SMS with OTP, returns LogID)
Visitor types OTP  ──► /api/verify-otp ─► console.authkey.io/api/2fa_verify.php  (status: true/false)
Verified           ──► /api/submit-lead ► Google Sheet (Apps Script)       (only if the OTP was verified)
```

---

## Step 1 — Get your SEO Age Digital SMS account ready
1. Log in to the panel: <https://cpaas.seoagemarketing.com> (ask SEO Age Digital for an account if you don't have one).
2. Recharge **SMS credits** (transactional/OTP route).

## Step 2 — DLT registration (mandatory for SMS in India)
Every SMS in India must use a DLT-registered **Sender ID** and **template**. You can do this on any DLT
portal (Jio TrueConnect, Airtel, Vilpower, etc.), or ask SEO Age Digital to do it for you.
1. Register as a **Principal Entity** and note your **PE ID**.
2. Register a 6-letter **Sender ID (header)**, e.g. `MBBSAD`, under the *Transactional/Service* category.
3. Register a **Service Implicit (OTP)** content template, for example:

   ```
   {#var#} is your OTP to verify your mobile number for MBBS admission enquiry. Valid for 10 minutes. Do not share it with anyone. - MBBSAD
   ```
   Note the **DLT Template ID** once it's approved (usually 24–72 hours).

## Step 3 — Add the OTP template in the SEO Age Digital panel
1. In the panel, add your **PE ID**, your **Sender ID**, and the template with its **DLT Template ID**.
2. In the template text, replace `{#var#}` with **`{#2fa#}`**. This tells the platform to generate the OTP itself:
   ```
   {#2fa#} is your OTP to verify your mobile number for MBBS admission enquiry. Valid for 10 minutes. Do not share it with anyone. - MBBSAD
   ```
3. Save it and note the template's **SID** (a number like `1001`) that the panel shows.
4. Check the **OTP length** the panel generates (4 or 6 digits). If it isn't 4, change `otpLength` in the
   `CONFIG` block of `index.html` to match.

## Step 4 — Copy your API key
In the panel, open the **API** / **Developer** section and copy your **Authkey (API key)**.

**Quick test** (sends a real SMS to your phone — paste in a browser, replacing the values):
```
https://api.authkey.io/request?authkey=YOUR_KEY&mobile=YOUR_10_DIGIT_NUMBER&country_code=91&sid=YOUR_SID
```
A good response looks like `{"LogID":"28bf73...","Message":"Submitted Successfully"}` and you get the SMS.
If you get an error instead, fix it in the panel (credits, template, sender ID) before going on.

## Step 5 — (Optional) Save leads to Google Sheets
Follow the steps at the top of `apps-script.gs` and copy the **Web app URL**.

## Step 6 — Add Environment Variables in Vercel
Vercel → your project → **Settings → Environment Variables**. Add these for **Production** (and Preview if you use it):

| Name | Value |
|---|---|
| `AUTHKEY_API_KEY` | the API key from Step 4 |
| `AUTHKEY_SID` | the template SID from Step 3 |
| `OTP_SECRET` | any long random string (32+ characters). Generate one with the command below. |
| `LEAD_WEBHOOK_URL` | the Apps Script Web app URL from Step 5 (optional) |

Generate `OTP_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then go to **Deployments → ⋯ → Redeploy**. Environment variables only apply to new deployments.

## Step 7 — Protect your SMS credits (recommended)
The send endpoint only accepts requests from your own site, but bots can still spam the form.
In Vercel → **Firewall → Add Rule**:
- If **Request Path** equals `/api/send-otp` → **Rate Limit**: e.g. **5 requests per 10 minutes per IP** → Deny.

## Step 8 — Test the live site
1. Open your Vercel URL, fill the form with your own number and tap **Verify Mobile & Continue**.
2. You should get the SMS. Enter the OTP and you'll see the thank-you screen.
3. Check the lead appears in your Google Sheet.
4. If something fails: Vercel → **Logs**. The functions log the provider's reply (`send-otp: provider error ...`).

> **Local preview:** on `localhost` the page runs in **demo mode** (the OTP is shown on screen and no SMS is sent),
> because the `/api` functions only run on Vercel. To test them locally, run `vercel dev` with the env vars in `.env.local`.

---

### Troubleshooting
| Symptom | Likely cause |
|---|---|
| "Couldn't send/verify OTP right now" right after tapping Verify | Env vars missing or you didn't redeploy; wrong API key or SID; no credits |
| SMS never arrives but the API returns a LogID | DLT template/sender mismatch. The SMS text must match the approved DLT template exactly |
| "Incorrect OTP" with the right code | `otpLength` doesn't match the panel's OTP length, or the OTP expired |
| Lead not in the Sheet | `LEAD_WEBHOOK_URL` not set, or the Apps Script wasn't deployed with access "Anyone" |

/**
 * Lead collector for the NIMS MBBS landing page → Google Sheet
 *
 * Setup (5 minutes):
 * 1. Create a Google Sheet → Extensions → Apps Script → paste this file → Save.
 * 2. Deploy → New deployment → type "Web app"
 *      Execute as: Me    |    Who has access: Anyone
 * 3. Copy the Web app URL and add it in Vercel as the env variable LEAD_WEBHOOK_URL, then redeploy.
 *    (Leads reach the sheet only after OTP verification, via /api/submit-lead.)
 */
const HEADERS = ["submitted_at", "name", "phone", "location", "phone_verified", "college", "course",
                 "utm_source", "utm_medium", "utm_campaign", "gclid", "fbclid", "source_url"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leads")
               || SpreadsheetApp.getActiveSpreadsheet().insertSheet("Leads");
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    const p = e.parameter || {};
    // Prefix with ' so Sheets keeps +91 numbers as text
    sheet.appendRow(HEADERS.map(h => (h === "phone" ? "'" : "") + String(p[h] || "").slice(0, 300)));
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

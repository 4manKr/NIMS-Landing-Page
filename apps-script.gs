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

// Optional: get an email for every new lead (leave "" to turn off). Several: "a@x.com,b@y.com"
const NOTIFY_EMAIL = "";

const HEADERS = ["submitted_at", "name", "phone", "location", "phone_verified", "college", "course",
                 "utm_source", "utm_medium", "utm_campaign", "gclid", "fbclid", "source_url"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  const p = (e && e.parameter) || {};
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Leads")
               || SpreadsheetApp.getActiveSpreadsheet().insertSheet("Leads");
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    // Prefix with ' so Sheets keeps +91 numbers as text
    sheet.appendRow(HEADERS.map(h => (h === "phone" ? "'" : "") + String(p[h] || "").slice(0, 300)));
  } finally {
    lock.releaseLock();
  }
  if (NOTIFY_EMAIL) {
    MailApp.sendEmail(NOTIFY_EMAIL, "New MBBS lead: " + (p.name || "") + " (" + (p.phone || "") + ")",
      "Name: " + (p.name || "") + "\nPhone: " + (p.phone || "") + " (OTP verified)\nLocation: " + (p.location || "") +
      "\nSource: " + (p.utm_source || "direct") + " / " + (p.utm_campaign || "-") + "\nTime: " + (p.submitted_at || ""));
  }
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}

// Run this once from the editor (select "testLead" → Run) to check the sheet works.
function testLead() {
  doPost({ parameter: { submitted_at: new Date().toISOString(), name: "Test Lead", phone: "+919999999999",
                        location: "Jaipur", phone_verified: "yes", college: "NIMS Medical College and Hospital, Jaipur",
                        course: "MBBS" } });
}

/**
 * ─────────────────────────────────────────────────────────────
 * CalEventViewGen — Google Apps Script
 * ─────────────────────────────────────────────────────────────
 * What it does:
 *   Scans your Google Calendar for events tagged with any symbol
 *   of your choice and writes them into any Google Doc where
 *   this Apps Script is deployed, as a formatted list.
 *
 *   This script works for any events you want to pull from your
 *   calendar; everything tagged with your designated symbol added
 *   to the event title will show up. It was originally built to
 *   auto-generate a view of all upcoming travel: trips were tagged
 *   with "⇄" in the title, e.g., "⇄ Mexico City for Pablo's Bday".
 *
 * How to trigger it:
 *   - Desktop: open the doc, use menu Update Document > Refresh Now
 *   - Mobile:  tap the "↻ Refresh now" link inside the doc
 *
 * Setup — fill in CONFIG below before running for the first time:
 *   1. CALENDAR_ID            — leave as "primary" for your main
 *                               calendar, or replace with a
 *                               specific calendar ID
 *   2. TITLE_TAG              — the symbol you add to your event
 *                               titles to make them show in the doc
 *   3. DOC_TITLE              — the heading displayed at the top
 *                               of the generated doc
 *   4. DOC_ID                 — the ID of the Google Doc this script
 *                               writes to (found in the doc URL
 *                               between "/d/" and "/edit")
 *   5. WEB_APP_DEPLOYMENT_ID  — the deployment ID generated when you
 *                               deploy this script as a web app via
 *                               Deploy > New deployment (enables the
 *                               mobile refresh link in the doc)
 *
 * Tagging events:
 *   Add your chosen TITLE_TAG anywhere in a Google Calendar event
 *   title to include it. The tag is stripped automatically in the
 *   generated doc.
 *
 * Generated doc structure:
 *   Title        — doc title (from DOC_TITLE)
 *   Normal text  — date range
 *   Subtitle     — helper note + last run timestamp
 *   Heading 1    — event title (tag stripped)
 *   Heading 2    — event date/time
 *   Heading 3    — event location
 * ─────────────────────────────────────────────────────────────
 */


// ── CONFIGURATION ────────────────────────────────────────────
// Fill in DOC_ID and WEB_APP_DEPLOYMENT_ID before first use.
// All other values can be left as-is or customized.

const CONFIG = {
  CALENDAR_ID: "primary",              // Your calendar ID. "primary" = main calendar.
  TITLE_TAG: "⇄",                      // The symbol you add to your event titles to make them show in the doc. Use any symbol you like — e.g., "⇄", "★", "#travel".
  LOOKAHEAD_DAYS: 365,                 // How many days ahead to scan.
  DOC_TITLE: "Upcoming Travel",   // ← Add your document title here. This appears as the heading at the top of the doc.
  TRIM_LOCATION: true,                 // Location display: true = "City, ST" only | "full" = cleaned full address | false = raw as entered
  DOC_ID: "16GOvkvQfNLuI3Cn72DLk2Q_v_AOfAYUb-QYYXAWg240",   // ← REQUIRED: Google Doc ID (found in the doc URL between "/d/" and "/edit").
  WEB_APP_DEPLOYMENT_ID: "AKfycbzGFWvAuvhlfKQafyoX-Yyc6yf7FxCqZTBSI-K6-eis9elbWFBlfVLxlwGPGiBbD0U-Pw", // ← REQUIRED for mobile refresh. Generated when you deploy this script as a web app via Deploy > New deployment.

  // ── Date formatting ────────────────────────────────────────
  DATE_PRESET: "full",                 // "short"      = Mon, Apr 14
                                       // "shortday"   = Mon, April 14
                                       // "shortmonth" = Monday, Apr 14
                                       // "full"       = Monday, April 14
                                       // "custom"     = uses DATE_FORMAT below
  SHOW_YEAR: false,                    // Append year to any preset. true = Monday, April 14, 2026 | false = Monday, April 14
  DATE_FORMAT: "EEE, MMM d",          // Only used when DATE_PRESET is "custom". Standard date pattern.
                                       // Day name:   EEE = Mon  |  EEEE = Monday
                                       // Month name: MMM = Apr  |  MMMM = April
                                       // Month num:  M = 4      |  MM = 04
                                       // Day num:    d = 4      |  dd = 04
                                       // Year:       yy = 26    |  yyyy = 2026

  // ── Time formatting ────────────────────────────────────────
  SHOW_TIME: false,                    // Show start and end time below the date. For all-day events, time is always hidden.
  AMPM_LCASE: true,                    // true = "7:00 pm"  |  false = "7:00 PM"
  TRIM_HOUR: true,                     // true = "7 pm" instead of "7:00 pm". Half-hours unaffected: "7:30 pm" stays as-is.
  SHOW_ALLDAY: false,                  // For all-day events: true = show "All day" below the date | false = show nothing

  // ── Multi-day events ───────────────────────────────────────
  MULTIDAY_TIMES: false                // true  = show start and end times on multi-day events: "Monday, April 14, 7 pm – Wednesday, April 16, 11 am"
                                       // false = date range only: "Monday, April 14 – Wednesday, April 16"
};


// ── WEB APP ENTRY POINT ───────────────────────────────────────
// This function runs when the mobile refresh link is tapped.
// Do not rename it — "doGet" is required by Google Apps Script.

function doGet() {
  try {
    REFRESH();
    return ContentService
      .createTextOutput("Updated successfully.")
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService
      .createTextOutput("Error: " + err.message)
      .setMimeType(ContentService.MimeType.TEXT);
  }
}


// ── MENU ─────────────────────────────────────────────────────
// Adds "Update Document > Refresh Now" to the menu bar in your Google
// Doc where this script is installed.
// Runs automatically when the doc is opened on desktop.

function onOpen() {
  DocumentApp.getUi()
    .createMenu("Update Document")
    .addItem("Refresh Now", "REFRESH")
    .addToUi();
}


// ── MAIN FUNCTION ─────────────────────────────────────────────
// Clears the doc and rewrites it with current calendar data.
// Called by both the desktop menu and the mobile web app trigger.

function REFRESH() {
  const doc = DocumentApp.getActiveDocument()
    || DocumentApp.openById(CONFIG.DOC_ID);
  const body = doc.getBody();

  body.clear();

  const cal = CalendarApp.getCalendarById(CONFIG.CALENDAR_ID);
  if (!cal) throw new Error("Calendar not found. Check CALENDAR_ID in CONFIG.");

  const runTime = new Date();

  const rangeStart = startOfToday_();
  const rangeEnd = new Date(rangeStart.getTime());
  rangeEnd.setDate(rangeEnd.getDate() + CONFIG.LOOKAHEAD_DAYS);

  const events = cal.getEvents(rangeStart, rangeEnd)
    .filter(e => (e.getTitle() || "").includes(CONFIG.TITLE_TAG))
    .sort((a, b) => a.getStartTime() - b.getStartTime());

  // ── Header ──

  const titlePara = body.getParagraphs()[0];
  titlePara.setText(CONFIG.DOC_TITLE);
  titlePara.setHeading(DocumentApp.ParagraphHeading.TITLE);

  const rangeLine = body.appendParagraph(
    `${formatDateOnly_(rangeStart)} – ${formatDateOnly_(rangeEnd)}`
  );
  rangeLine.setHeading(DocumentApp.ParagraphHeading.NORMAL);

  // The two appendText lines below control what appears in the helper note at the top of the generated doc. Edit the strings to change the message shown to anyone viewing the doc.
  const helper = body.appendParagraph("This is an auto-generated calendar view.");
  helper.appendText("\nTo refresh: Update Document > Refresh Now (desktop) or tap the link below (mobile):");
  helper.setItalic(true);
  helper.setHeading(DocumentApp.ParagraphHeading.SUBTITLE);

  // Mobile refresh link — only rendered after web app is deployed
  if (CONFIG.WEB_APP_DEPLOYMENT_ID !== "PASTE_YOUR_DEPLOYMENT_ID_HERE") {
    const refreshUrl = `https://script.google.com/macros/s/${CONFIG.WEB_APP_DEPLOYMENT_ID}/exec`;
    const linkPara = body.appendParagraph("");
    linkPara.setHeading(DocumentApp.ParagraphHeading.NORMAL);
    linkPara.appendText("↻ Refresh now").setLinkUrl(refreshUrl);
  }

  const runLine = body.appendParagraph(`Last run: ${formatDateTime_(runTime)}`);
  runLine.setHeading(DocumentApp.ParagraphHeading.SUBTITLE);

  body.appendParagraph("");

  if (events.length === 0) {
    body.appendParagraph("No matching upcoming events found.")
      .setHeading(DocumentApp.ParagraphHeading.NORMAL);
    return;
  }

  // ── Events ──

  events.forEach(e => {
    const title = stripTagFromTitle_(e.getTitle(), CONFIG.TITLE_TAG);
    const start = e.getStartTime();
    const end   = e.getEndTime();

    let loc = (e.getLocation() || "").trim();
    if (CONFIG.TRIM_LOCATION === true) loc = trimLocationHeuristic_(loc);
    else if (CONFIG.TRIM_LOCATION === "full") loc = trimLocationFull_(loc);

    body.appendParagraph(title)
      .setHeading(DocumentApp.ParagraphHeading.HEADING1);

    const datePara = body.appendParagraph(formatEventDateTime_(e, start, end));
    datePara.setHeading(DocumentApp.ParagraphHeading.HEADING2);

    body.appendParagraph(loc)
      .setHeading(DocumentApp.ParagraphHeading.HEADING3);
    body.appendParagraph("");
  });
}


// ── HELPERS ───────────────────────────────────────────────────

function startOfToday_() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function stripTagFromTitle_(title, tag) {
  return String(title || "")
    .split(tag)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDateOnly_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "MMM d, yyyy");
}

function formatDateTime_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "MMM d, yyyy h:mm a");
}

// Returns the date pattern string for Utilities.formatDate based on DATE_PRESET and SHOW_YEAR.
function getDatePattern_() {
  if (CONFIG.DATE_PRESET === "custom") return CONFIG.DATE_FORMAT;

  const presets = {
    "short":      "EEE, MMM d",
    "shortday":   "EEE, MMMM d",
    "shortmonth": "EEEE, MMM d",
    "full":       "EEEE, MMMM d"
  };

  let pattern = presets[CONFIG.DATE_PRESET] || presets["full"];
  if (CONFIG.SHOW_YEAR && CONFIG.DATE_PRESET !== "custom") pattern += ", yyyy";
  return pattern;
}

// Formats a single date using the configured date pattern.
function formatConfigDate_(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), getDatePattern_());
}

// Formats a time value according to SHOW_TIME, AMPM_LCASE, and TRIM_HOUR settings.
function formatConfigTime_(d) {
  const tz = Session.getScriptTimeZone();
  const raw = Utilities.formatDate(d, tz, "h:mm a");

  // Split into time and am/pm parts
  const [timePart, ampm] = raw.split(" ");
  const [hours, minutes] = timePart.split(":");

  // Strip :00 when TRIM_HOUR is enabled and minutes are exactly zero
  const displayTime = (CONFIG.TRIM_HOUR && minutes === "00") ? hours : `${hours}:${minutes}`;
  const displayAmpm = CONFIG.AMPM_LCASE ? ampm.toLowerCase() : ampm.toUpperCase();

  return `${displayTime} ${displayAmpm}`;
}

// Builds the full date/time string for a calendar event.
// Handles same-day, multi-day, and all-day events.
function formatEventDateTime_(event, start, end) {
  const tz = Session.getScriptTimeZone();

  // ── All-day events ──
  if (event.isAllDayEvent()) {
    const startStr = formatConfigDate_(start);

    // All-day multi-day: end date in Apps Script is exclusive (the day after), so subtract one day
    const endAdj = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const isMultiDay = endAdj > start;

    if (isMultiDay) {
      return `${startStr} – ${formatConfigDate_(endAdj)}`;
    }

    // Single all-day event
    if (CONFIG.SHOW_ALLDAY) return `${startStr}\nAll day`;
    return startStr;
  }

  // ── Timed events ──
  const startDate = Utilities.formatDate(start, tz, "yyyyMMdd");
  const endDate   = Utilities.formatDate(end,   tz, "yyyyMMdd");
  const isMultiDay = startDate !== endDate;

  if (isMultiDay) {
    if (CONFIG.MULTIDAY_TIMES) {
      return `${formatConfigDate_(start)}, ${formatConfigTime_(start)} – ${formatConfigDate_(end)}, ${formatConfigTime_(end)}`;
    }
    return `${formatConfigDate_(start)} – ${formatConfigDate_(end)}`;
  }

  // Same-day timed event
  const dateStr = formatConfigDate_(start);
  if (!CONFIG.SHOW_TIME) return dateStr;
  return `${dateStr}\n${formatConfigTime_(start)} – ${formatConfigTime_(end)}`;
}

/**
 * Reduces US event locations to "City, ST" format.
 *
 * Examples:
 *   "123 Main Street, Springfield, IL 62701, USA"  →  "Springfield, IL"
 *   "456 Elm Ave\nSomerville MA 02143\nUS"          →  "Somerville, MA"
 *   "New York, NY, USA"                             →  "New York, NY"
 *   "Mayagüez, 00682, Puerto Rico"                  →  "Mayagüez, Puerto Rico"
 *   Zoom/Meet/Teams URLs                            →  returned as-is
 */
function trimLocationHeuristic_(loc) {
  if (!loc) return "";

  // Return virtual meeting links unchanged — stripping logic would mangle URLs
  if (/https?:\/\/|zoom|google meet|teams|webex/i.test(loc)) return loc.trim();

  let s = String(loc)
    .replace(/\r?\n+/g, ", ") // normalize line breaks to commas before further processing
    .replace(/\s+/g, " ")
    .trim();

  // Strip country names
  s = s.replace(/\b(USA|United States|United States of America|US|U\.S\.A\.|U\.S\.)\b\.?/gi, "");

  // Strip ZIP codes (12345 or 12345-6789)
  s = s.replace(/\b\d{5}(?:-\d{4})?\b/g, "");

  // Normalize commas
  s = s
    .replace(/\s*,\s*/g, ", ")
    .replace(/,\s*,/g, ",")          // collapse double commas from stripping
    .replace(/^\s*,|\s*,\s*$/g, "")  // trim leading/trailing commas
    .trim();

  // Match "City, ST" (standard US format)
  let m = s.match(/\b([A-Za-z][A-Za-z .'-]*?),\s*([A-Z]{2})\b/);
  if (m) return `${m[1].trim()}, ${m[2]}`;

  // Match "City ST" (no comma, e.g. "Somerville MA")
  m = s.match(/\b([A-Za-z][A-Za-z .'-]*?)\s+([A-Z]{2})\b/);
  if (m) return `${m[1].trim()}, ${m[2]}`;

  // Match US territories without two-letter state codes (e.g. "Puerto Rico")
  const territory = s.match(/([\w\u00C0-\u024F\s.'-]+?),?\s*(Puerto Rico|U\.S\. Virgin Islands|Guam|American Samoa|Northern Mariana Islands)\b/i);
  if (territory) return `${territory[1].trim()}, ${territory[2].trim()}`;

  return s.trim();
}

/**
 * Cleans up event locations without reducing to City, ST.
 * Strips ZIP codes, country names, and normalizes formatting.
 * Used when TRIM_LOCATION is set to "full".
 *
 * Examples:
 *   "9:30 Club\n815 V St NW\nWashington, DC 20001\nUSA"       →  "9:30 Club, 815 V St NW, Washington, DC"
 *   "The Fillmore\n1805 Geary Blvd\nSan Francisco CA 94115"   →  "The Fillmore, 1805 Geary Blvd, San Francisco CA"
 *   Zoom/Meet/Teams URLs                                       →  returned as-is
 */
function trimLocationFull_(loc) {
  if (!loc) return "";

  // Return virtual meeting links unchanged — stripping logic would mangle URLs
  if (/https?:\/\/|zoom|google meet|teams|webex/i.test(loc)) return loc.trim();

  let s = String(loc)
    .replace(/\r?\n+/g, ", ") // normalize line breaks to commas before further processing
    .replace(/\s+/g, " ")
    .trim();

  // Strip country names
  s = s.replace(/\b(USA|United States|United States of America|US|U\.S\.A\.|U\.S\.)\b\.?/gi, "");

  // Strip ZIP codes (12345 or 12345-6789)
  s = s.replace(/\b\d{5}(?:-\d{4})?\b/g, "");

  // Normalize commas
  s = s
    .replace(/\s*,\s*/g, ", ")
    .replace(/,\s*,/g, ",")          // collapse double commas from stripping
    .replace(/^\s*,|\s*,\s*$/g, "")  // trim leading/trailing commas
    .trim();

  return s;
}




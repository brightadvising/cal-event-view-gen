# CalEventViewGen

This is a Google Apps Script that scans your Google Calendar for tagged events and writes them into a Google Doc as a clean, formatted list. You can instantly refresh the list with a click on desktop or mobile.

Tag any event in your calendar with a symbol of your choice (like `⇄` or `🎵`), and the script collects all tagged events into a single doc. Open the doc, click the **Update Document > Refresh Now** menu item, and it rewrites itself with everything upcoming in a specified timeframe.

I wrote this script (with help from Claude) because I consistently needed an easy solution to see all of my upcoming events in one place. I got frustrated with minimal search output, and the need to scroll week-by-week, month-by-month to see what was happening. This creates one clean page with an organized set of specific events. Great for coordinating with friends and family and/or controlling for neurodivergence.

CalEventViewGen is a Google Apps Script that generates a clean, refreshable Google Doc view of tagged Google Calendar events. Includes configurable date/time formatting, location trimming, multi-day event support, desktop and mobile refresh, a ready-to-use template, and two real-world example configurations (gigs + travel).

## Contents
- [What it looks like](#what-it-looks-like)
- [Two examples in this repo](#two-examples-in-this-repo)
- [Setup](#setup)
- [Refreshing the doc](#refreshing-the-doc)
- [CONFIG Setup Reference](#config-setup-reference)
- [Using multiple instances](#using-multiple-instances)
- [License](#license)

---

## What it looks like

Each event appears cleanly in the doc as:

```
Road Trip to Memphis            ← event title (tag stripped)
Monday, June 30                 ← date (or date + time)
Memphis, TN                     ← location (cleaned up automatically)
```

You can configure how these results appear in CONFIG (see [CONFIG Setup Reference](#config-setup-reference) below).

---

## Two examples in this repo

This repo includes two live instances of the script, each configured differently:

| Folder | Tag | Doc | Location display |
|--------|-----|-----|-----------------|
| `gigs/` | 🎵 | Upcoming Gigs | Full address |
| `travel/` | ⇄ | Upcoming Travel | City, ST only |

Both use the same script logic; only the `CONFIG` section at the top differs. (Gigs is set up for local events where you want all address information. Travel is set up more generally where just a location name suffices.) These two scripts are real-world examples of my own implementation. I use both docs regularly to see my music shows and upcoming trips at a glance, without having to scroll through my calendar. This keeps planning streamlined and helps my ADDled brain feel more organized. It's also useful for sharing with my partner, parents, and other folks joining these events. You can use this setup for any list of events in any category, so get creative! Tailored schedules for classes, conference agendas, sporting events... and anything else you need to show up for.

---

## Setup

The setup looks longer than it actually is. It may seem complex if you've never done it before, but each step is simple and the whole process only takes a few minutes. Once it's up and running, it's fully automated with a click.

### 1. Create a Google Doc

Create a new Google Doc. This is where your event list will be generated. Copy its ID from the URL — it's the string between `/d/` and `/edit`:

```
https://docs.google.com/document/d/YOUR_DOC_ID_HERE/edit
```

### 2. Open Apps Script

In your Google Doc, go to **Extensions > Apps Script**. By default, the editor opens to a file called **Code.gs**. This is where you will work. Delete any placeholder code in the file — it typically looks like `function myFunction() { }`.

### 3. Paste the script

Click the link to open the template file: [`template/CalEventViewGen.js`](template/CalEventViewGen.js). Select all the code (Ctrl+A / Cmd+A), copy it, and paste it into the Apps Script editor. Save (Ctrl+S / Cmd+S).

### 4. Fill in CONFIG

Find the `DOC_ID` field in the CONFIG section near the top of the script, and paste in your Doc ID:

```js
DOC_ID: "paste your doc ID here",
```

`WEB_APP_DEPLOYMENT_ID` will be generated in Step 6 — leave it as-is for now:

```js
WEB_APP_DEPLOYMENT_ID: "PASTE_YOUR_DEPLOYMENT_ID_HERE",
```

Adjust any other CONFIG values to your liking (date format, time display, location trimming, etc.). Every option is explained in the comments. See the [CONFIG Setup Reference](#config-setup-reference) section below for a full walkthrough.

### 5. Run it once to grant permissions

In the editor toolbar, click the function dropdown — it may say `myFunction` or `Select function` — and choose `REFRESH`. Then click **Run**. Google will ask you to authorize the script to access your calendar and doc. Approve it.

Your doc should now be populated with all events tagged with your chosen symbol, within your specified upcoming timeframe counted in days (default is `365`, i.e. one year ahead).

### 6. OPTIONAL: Deploy as a web app for mobile refresh

This step allows you to refresh directly from your phone by adding a **↻ Refresh now** link inside your Google Doc, in addition to the menu item (which only shows on desktop).

1. In Apps Script, click **Deploy > New deployment**
2. Click the gear icon next to **Type** and select **Web app**
3. Name the deployment whatever you like (e.g., "Upcoming Gigs v1.0")
4. Set **Execute as** → Me, **Who has access** → Only myself
5. Click **Deploy** and copy the Deployment ID
6. Paste it into `WEB_APP_DEPLOYMENT_ID` in CONFIG, then save and run `REFRESH` once more

As you update or make additional changes to the script, you will need to apply them by updating your deployment: go to **Deploy > Manage deployments**, click the pencil icon on your deployment, set Version to **New version**, then click **Deploy**. (You can include version numbers in the deployment name if helpful.)

### 7. Tag your events

Add your chosen `TITLE_TAG` symbol anywhere in a Google Calendar event title:

```
⇄ Mexico City for Pablo's birthday
Road trip ⇄ Asheville
Anderson wedding in London ⇄
```

This tag must be in the Google Calendar event title to be recognized. It is stripped automatically from the output when the Google Doc is generated.

---

## Refreshing the doc

| Where | How |
|-------|-----|
| Desktop | Open the doc → **Update Document > Refresh Now** (this menu item sometimes takes a second to appear) |
| Mobile | Tap the **↻ Refresh now** link in the header section of the doc |

---

## CONFIG Setup Reference

| Key | Default | Description |
|-----|---------|-------------|
| `CALENDAR_ID` | `"primary"` | Your calendar ID. `"primary"` = main Google calendar. |
| `TITLE_TAG` | `"⇄"` | Symbol you add to event titles to include them. |
| `LOOKAHEAD_DAYS` | `365` | Upcoming timeframe counted in days. Default is `365`, i.e. one year ahead. |
| `DOC_TITLE` | `"Upcoming Events"` | Heading shown at the top of the doc. |
| `TRIM_LOCATION` | `true` | `true` = City, ST · `"full"` = cleaned full address · `false` = raw output, however it appears in the calendar event |
| `DOC_ID` | — | **Required.** Google Doc ID from the URL. |
| `WEB_APP_DEPLOYMENT_ID` | — | **Required for mobile refresh.** Generated when you deploy as a web app. |
| `DATE_PRESET` | `"full"` | `"short"` = Mon, Apr 14 · `"full"` = Monday, April 14 · `"custom"` = uses `DATE_FORMAT` |
| `SHOW_YEAR` | `false` | Append year to the date. |
| `DATE_FORMAT` | `"EEEE, MMM d"` | Custom date pattern. Only used when `DATE_PRESET` is `"custom"`. See options in table below. |
| `SHOW_TIME` | `false` | Show start and end time below the date. Hidden automatically for all-day events. |
| `AMPM_LCASE` | `true` | Force lowercase for event times. `true` = `7 pm` · `false` = `7 PM` |
| `TRIM_HOUR` | `true` | Remove extra zeros from all times on the hour. `true` = `7 pm` · `false` = `7:00 pm`. Half-hours unaffected. |
| `SHOW_ALLDAY` | `false` | Show "All day" label on all-day events. |
| `MULTIDAY_TIMES` | `false` | Show start/end times on multi-day events, not just the date range. |

### DATE_FORMAT options

Used only when `DATE_PRESET` is set to `"custom"`. Mix and match components to build any date format:

| Component | Options | Output |
|-----------|---------|--------|
| Day name | `EEE` · `EEEE` | Mon · Monday |
| Month name | `MMM` · `MMMM` | Apr · April |
| Month number | `M` · `MM` | 4 · 04 |
| Day number | `d` · `dd` | 4 · 04 |
| Year | `yy` · `yyyy` | 26 · 2026 |

Example: `"EEE, MMM d"` → Mon, Apr 4 · `"MMMM dd, yyyy"` → April 04, 2026

---

## Using multiple instances

To run this for more than one set of events (e.g., gigs, travel, etc.), create new, separate Google Docs and set up the script in each one independently. Each will need its own `DOC_ID`, `WEB_APP_DEPLOYMENT_ID`, and `TITLE_TAG`.

---

## License

This project is licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/) — free to use, share, and modify for non-commercial purposes, with attribution to the original author. That means you can adapt it, build on it, and share it freely — just don't sell it or fold it into a commercial product, and give credit where it's due.

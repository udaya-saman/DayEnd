# DAY END v4.4.1

A lightweight, mobile-first, offline-capable Pizza Hut outlet reporting web app for GitHub Pages.

## What changed

- Two-screen workflow: choose the **Daily** and **MTD** Excel files separately; validated results open automatically.
- Saved outlet selection, with a settings dialog for changes. Selection uses `localStorage` and survives **New reports** and app restarts. `Matara 2` and `Matara 02` are treated as the same outlet when matching Excel report rows.
- Report-dependent outlets found in uploaded workbooks are also offered, alongside the default outlet names.
- A compact, modern two-screen design with only the necessary upload and results controls, and a clear developer credit.
- One report category at a time, with five channels (Dine, T/Away, Delivery, Aggregator, DAY SALE).
- Better error messages, silent accepted-tolerance handling, original filenames in the summary, and no background file uploads.
- Safer worksheet parsing across worksheets, rejection of conflicting reporting dates or duplicate outlet rows, strict column identification, cross-report reconciliation, MTD same-month checks, and explicit file roles to handle the first day of a month.
- Automated unit tests and updated service worker cache.

## Using the app

1. Open the app online at least once and let it finish loading before using it offline.
2. Choose your outlet using the **top-right outlet settings button**. The choice is saved in this browser.
3. Upload one Excel workbook to **Daily report** and one to **MTD report**.
4. When the files and chosen outlet validate, the results screen opens.
5. Choose a report category in the dropdown, or use **Previous** and **Next** to navigate all seven metrics. The dropdown and table remain synchronized; navigation wraps around.
6. Choose **Edit Reports** to change a workbook, or **New Reports** to start again. Neither clears the saved outlet.

## Formulas (unchanged)

| Metric | Formula |
| --- | --- |
| No. Doc | Daily document count |
| Net Sales | Daily net sales |
| Cumulative Sales | MTD net sales |
| Avg. Channel | MTD net sales ÷ inclusive MTD calendar days |
| Cum. Doc | MTD document count |
| Avg. Doc | MTD document count ÷ inclusive MTD calendar days |
| Doc Avg. | MTD net sales ÷ MTD document count (blank when denominator is zero) |

The source is not rounded during calculation; displayed values are rounded to whole numbers as before.

Validation requires exact document-count reconciliation and accepts sales total differences of **no more than Rs. 5.00** per Daily or MTD report. Differences above Rs. 5.00 block the result. Differences up to that amount are accepted silently (the underlying validation still tracks them internally). The Daily report must cover one date. MTD must begin on the first day of the same month as its end date. Both report end dates must match.

## Excel file requirements

- Supported: **.xlsx** and **.xlsm**, up to 25 MB compressed per file.
- Excel-style XML worksheets with outlet names, the five required channel groups, and recognized **Qty** and **Net Sales** subcolumns.
- Each worksheet must contain **From Date** and **To Date** fields.
- The date text is interpreted as **day/month/year**, consistent with the existing Sri Lankan export format. ISO `yyyy-mm-dd` is also accepted. Re-export a workbook if its date format is different.
- Formula cells must have saved values. Open and save the report in Excel if exported workbooks omit calculated values.
- Password-protected/legacy **.xls** files are not supported.
- Workbook processing happens in the browser. The report content is not sent to a service or saved in localStorage.

## Technical notes

- Pure calculation/reader module: `dayend-core.js`.
- Interface logic: `dayend-app.js`.
- Offline assets: `sw.js`; cache is versioned and precaches the same script URLs referenced by the HTML, with cache-first navigation for consistent releases.
- No build step; bundled JSZip works offline.
- `node --test tests/*.test.js` runs the regression tests locally in Node 20+.
- Pages deploys from `main`. Development happens on a separate branch and must be reviewed and merged to go live.

## Known limits / release checklist

- Verify parsing and the outlet mapping using your **actual Daily and MTD exports** before deploying.
- Manual device checks are still needed for installed iPhone Safari and Android Chrome, offline reload, and update from the old cache.
- Changing browser/site data, or using a different browser/device, can erase the saved outlet. `localStorage` persistence applies to the same browser and origin.
- Only formatted source exports with the expected report layout are supported. The reader intentionally rejects layouts it cannot confidently identify.

## Version 4.1 interface

- Upload screen: no introductory hero, progress stepper, or duplicate outlet selector.
- Results screen: no banner, summary cards, cumulative highlight or extra data-source display; category dropdown, navigation buttons, channel table and report actions remain.
- Footer: **Designed and developed by Udaya Saman | 071 969 8799**.
- The top-right outlet settings dialog keeps keyboard focus inside while open, and disables outlet choices missing from either uploaded workbook.
- New report sets reset the selected report category to **No. Doc**.

## PNG app icon set (v4.1.1)

Branded red/white square PNG assets replace the previous launch icons:

- `icons/icon-192.png`: Android/PWA 192×192.
- `icons/icon-512.png`: large PWA 512×512.
- `icons/maskable-512.png`: launch icon with safe central artwork, 512×512.
- `icons/apple-touch-icon.png`: iOS Home Screen icon, 180×180.

The application header and site icon use the same branded design. The offline cache was bumped to ensure returning users receive the new artwork.

## v4.2.0 reference-matched redesign and faster imports

- Red gradient app header, white inset panel, attractive red curved footer, polished upload cards, and branded red results controls styled to match the supplied visual reference.
- The Excel ZIP is unpacked in a local Web Worker (excel-unpack-worker.js), reducing main-thread pauses while reading files.
- Dates are searched in the first 150 worksheet rows first, falling back to the rest when necessary, without changing report formulas.
- A fallback inline unpacking path is retained for environments that block workers. Original workbook limits and validation logic remain in place.
- The offline service worker precaches the new worker and versioned scripts for offline processing.
- Large Excel files can still take time while parsing their XML. This improves responsiveness, not an instantaneous import.

## v4.3 full-height visual polish

- Header uses the white DAY END hat-and-wordmark transparent PNG adapted from the supplied reference image (`icons/hero-dayend-logo.png`), preserving the established brand appearance.
- Both screens are constrained to the visible viewport height (modern `dvh` with a `vh` fallback), avoiding page-level vertical scrolling. In exceptional cases such as large validation messages or very small accessibility zoom, the report panel can scroll internally rather than hiding essential content.
- The footer now uses two smooth Bézier curves, inspired by the flowing Pizza Hut hat shape, in place of polygon edges.
- Previous/Next are equal-width buttons with clearly visible styled arrow icons and larger readable labels; the 7-category navigation remains unchanged.
- The top-right gear icon and outlet pill both open the existing persisted outlet settings.
- No business formulas, Excel upload rules, offline architecture, or Rs. 5 tolerance were modified.

## v4.4 auto-detected outlet and spacing

- No outlet chooser or settings menu appears in the hero. The name is sourced from the Excel reports and displayed prominently at 150% of the previous font size.
- If only one matching outlet is identifiable across the uploaded files, it is selected automatically; contradictory or ambiguous multi-outlet reports are never silently assigned an outlet.
- When report data contains multiple possible matching outlets, the app asks for outlet-specific exports rather than guessing and risking incorrect sales figures.
- Both upload and results panels have refined internal padding, additional breathing room underneath, and improved vertical positioning while retaining fixed-height mobile page behavior.
- All formulas and Rs. 5 tolerance remain unchanged. A previously explicitly saved outlet is used as a hint only when its row exists in both new reports; no outlet can be manually changed within this interface.

**Unidentified outlet display:** Until an outlet can be identified confidently from the uploaded Excel report(s), the hero's outlet label is completely blank, including no empty badge or placeholder text. Results remain blocked when the outlet cannot be established.

## v4.4.1

- Removed the accepted sales difference notification from both the upload and results screens. Differences of Rs. 5.00 or less still pass without a banner; discrepancies over Rs. 5.00 still block the report with an error. No calculations or other UI behavior changed.

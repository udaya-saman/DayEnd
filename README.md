# DAY END v4.0.1

A lightweight, mobile-first, offline-capable Pizza Hut outlet reporting web app for GitHub Pages.

## What changed

- Two-screen workflow: choose the **Daily** and **MTD** Excel files separately; validated results open automatically.
- Saved outlet selection, with a settings dialog for changes. Selection uses `localStorage` and survives **New reports** and app restarts. `Matara 2` and `Matara 02` are treated as the same outlet when matching Excel report rows.
- Report-dependent outlets found in uploaded workbooks are also offered, alongside the default outlet names.
- One report category at a time, with five channels (Dine, T/Away, Delivery, Aggregator, DAY SALE).
- Better error messages, visible accepted-tolerance warnings, original filenames in the summary, and no background file uploads.
- Safer worksheet parsing, strict column identification, cross-report reconciliation, MTD same-month checks, and explicit file roles to handle the first day of a month.
- Automated unit tests and updated service worker cache.

## Using the app

1. Open the app online at least once and let it finish loading before using it offline.
2. Choose your outlet using the **Outlet** selection or the settings button. The choice is saved in the browser.
3. Upload one Excel workbook to **Daily report** and one to **MTD report**.
4. When the files and chosen outlet validate, the results screen opens.
5. Select a reporting category from the dropdown, or tap **Previous** and **Next** to browse all seven metrics. The dropdown and displayed values stay synchronized. Navigation wraps from the last category to the first and vice versa.
6. Choose **Edit reports** to change a workbook, or **New reports** to start again. Neither clears the saved outlet.

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

Validation requires exact document-count reconciliation and accepts sales total differences of **no more than Rs. 5.00** per Daily or MTD report. Differences above Rs. 5.00 block the result. Differences up to that amount are disclosed as warnings. The Daily report must cover one date. MTD must begin on the first day of the same month as its end date. Both report end dates must match.

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
- Offline assets: `sw.js`.
- No build step; bundled JSZip works offline.
- `node --test tests/core.test.js` runs the regression tests locally in Node 20+.
- Pages deploys from `main`. Development happens on a separate branch and must be reviewed and merged to go live.

## Known limits / release checklist

- Verify parsing and the outlet mapping using your **actual Daily and MTD exports** before deploying.
- Manual device checks are still needed for installed iPhone Safari and Android Chrome, offline reload, and update from the old cache.
- Changing browser/site data, or using a different browser/device, can erase the saved outlet. `localStorage` persistence applies to the same browser and origin.
- Only formatted source exports with the expected report layout are supported. The reader intentionally rejects layouts it cannot confidently identify.

# DAY END v3.0.0

One screen. Choose the Daily and MTD Excel reports (both at once, or one after the other, in any order). If all checks pass, seven cards appear (No. Doc, Net Sales, Cumulative Sales, Avg. Channel, Cum. Doc, Avg. Doc, Doc Avg.), each listing Dine, T/Away, Delivery, Aggregator and DAY SALE, rounded to whole numbers.

- No. Doc / Net Sales: Daily report. Cumulative Sales / Cum. Doc: MTD report.
- Avg. Channel = MTD net sales / days; Avg. Doc = MTD docs / days; Doc Avg. = MTD net sales / MTD docs. Days = calendar days in the MTD range. Calculations use exact values; only the display is rounded.
- Checks (silent when passed): one unique Matara 2 row, dates match, document counts equal the Total exactly, channel sales within Rs. 5.00 of the Total, MTD not below Daily. A failed check hides the figures and shows what is wrong.
- Works offline after the first online visit (JSZip is bundled). Upload all files to the GitHub Pages root.

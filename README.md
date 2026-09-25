# NED Attendance Tracker

Check how many more classes and labs you can miss this semester at NED University without dropping below the attendance requirements.

Upload the **Course-Wise Attendance Analysis** PDF from the portal. If a course looks off, you can edit its numbers or override its combined %. Everything runs in your browser. The PDF is never uploaded, and there is no backend. Your data is saved only in this browser's localStorage, and a button clears it.

## What it calculates

- Current Theory %, Practical %, and an **estimated** combined % for each course
- Remaining classes and labs, projected from each course's own pace so far (held ÷ teaching weeks elapsed). The semester has 16 weeks: week 8 is mid-terms and week 16 is finals, which leaves 14 teaching weeks.
- For each subject, how many remaining classes and labs you can skip while that subject stays at 65% or above
- Overall, how many you can skip in total while the credit-hour weighted aggregate stays at 75% or above and every subject stays at 65% or above, and which subjects to take them from
- Status: a subject is Safe at 65% or above. Overall is Safe when the aggregate is 75% or above and every subject is at 65% or above, Risky / condonation possible at 70–75%, and Danger zone below 70%

- A **skip planner table**: per subject, the most you can skip (to stay at 65%) and your share of the overall plan (to keep 75%), plus an Overall row

### Theory + practical merge (estimated)

NED hasn't published how theory and practical attendance combine for a course. The app uses a credit-hour weighted combination:

`combined % = (Th% × Th credits + Pr% × Pr credits) ÷ total credits`

Rounded up the way NED prints it, this reproduces every course % and the aggregate on real reports, with and without labs. A pooled count (all present ÷ all held) did not match any of the lab courses. It's still labeled an estimate because it isn't official. If a course's % on the portal differs, you can override it for that course. The override is then treated as both the theory % and the lab % so far, and future classes are weighted on top of it.

The aggregate is the credit-hour weighted mean of the course percentages. Zero-credit courses are weighted by their estimated weekly contact hours. NED prints this number rounded up. The app judges your status against the exact, unrounded value, so it errs on the cautious side.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # parser + calculation tests
npm run build   # static export to ./out
```

The parser tests run against fixtures of positioned text items in `src/lib/__fixtures__`. They copy the layout of both report versions (the older one with 2-decimal percentages, and the newer one with rounded-up `%` values and labs), but all names and numbers are made up. If real reports are placed at `sample/4600050_attendance.pdf` and `sample/lab_attendance.pdf` (git-ignored), extra tests run pdf.js on them and check that the calculation reproduces NED's printed numbers.

pdf.js returns this report's text column by column, not row by row. `src/lib/pdfParse.ts` therefore rebuilds rows from x/y coordinates and assigns values to columns using the header positions. If the headers can't be found, it falls back to reading values left to right.

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which tests, builds the static export with `basePath=/<repo-name>`, and publishes it to GitHub Pages. In the repo settings, set Pages → Source to **GitHub Actions**.

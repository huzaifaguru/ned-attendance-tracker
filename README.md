# NED Attendance Tracker

Check how many more classes and labs you can miss this semester at NED University without dropping below the attendance requirements.

Upload the **Course-Wise Attendance Analysis** PDF from the portal, or enter courses by hand. Everything runs in your browser. The PDF is never uploaded, and there is no backend. Your data is saved only in this browser's localStorage, and a button clears it.

## What it calculates

- Current Theory %, Practical %, and an **estimated** combined % for each course
- Remaining classes and labs, projected from each course's own pace so far (held ÷ teaching weeks elapsed). The semester has 16 weeks: week 8 is mid-terms and week 16 is finals, which leaves 14 teaching weeks.
- How many of those remaining classes and labs you can skip and still stay at or above 65% (the floor) and 75% (safe), for each course and for the credit-hour weighted aggregate
- Status per the 2024 Exam Regulations: Safe (≥75%), Risky / condonation possible (70–75%), Danger zone (<70%, or below the 65% floor)

- A **skip planner table**: for each course, the classes (and labs) you can still skip, plus an Overall row

### Theory + practical merge (estimated)

NED hasn't published how theory and practical attendance combine for a course. The app offers two options:

- **B · Credit weighted (default):** `(Th% × Th credits + Pr% × Pr credits) ÷ total credits`
- **A · Pooled:** `(Th present + Pr present) ÷ (Th held + Pr held)`

Option B, rounded up the way NED prints it, reproduced every course % and the aggregate on a real report with labs. Option A did not match any of the lab courses. It's still labeled an estimate because it isn't official. If a course's % on the portal doesn't match, you can override it for that course. Projections for an overridden course treat the override as the share of everything held so far that you attended, then pool future classes on top of it.

The aggregate is the credit-hour weighted mean of the course percentages. Zero-credit courses are weighted by their estimated weekly contact hours. NED prints this number rounded up. The app judges your status against the exact, unrounded value, so it errs on the cautious side.

## Development

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # parser + calculation tests
npm run build   # static export to ./out
```

The parser tests run against fixtures of positioned text items in `src/lib/__fixtures__`. They copy the layout of both report versions (the older one with 2-decimal percentages, and the newer one with rounded-up `%` values and labs), but all names and numbers are made up. If real reports are placed at `sample/4600050_attendance.pdf` and `sample/lab_attendance.pdf` (git-ignored), extra tests run pdf.js on them and check that Option B reproduces NED's printed numbers.

pdf.js returns this report's text column by column, not row by row. `src/lib/pdfParse.ts` therefore rebuilds rows from x/y coordinates and assigns values to columns using the header positions. If the headers can't be found, it falls back to reading values left to right.

## Deployment

Every push to `main` runs `.github/workflows/deploy.yml`, which tests, builds the static export with `basePath=/<repo-name>`, and publishes it to GitHub Pages. In the repo settings, set Pages → Source to **GitHub Actions**.

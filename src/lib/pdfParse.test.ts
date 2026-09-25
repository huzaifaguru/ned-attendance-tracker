import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyse, reportedMatches } from "./calc";
import fixture from "./__fixtures__/sample-theory-only.items.json";
import labFixture from "./__fixtures__/sample-with-labs.items.json";
import { extractItems } from "./pdfExtract";
import { parseReport, type TextItem } from "./pdfParse";

const items = fixture as TextItem[];

const EXPECTED = [
  { label: "CT-351", code: "CT-351", thPresent: 12, thHeld: 15, reportedPct: 80 },
  { label: "CT-466", code: "CT-466", thPresent: 16, thHeld: 18, reportedPct: 88.89 },
  { label: "CT-468 ( Opt )", code: "CT-468", thPresent: 7, thHeld: 10, reportedPct: 70 },
  { label: "CT-485", code: "CT-485", thPresent: 14, thHeld: 16, reportedPct: 87.5 },
  { label: "ES-223 ( Opt )", code: "ES-223", thPresent: 10, thHeld: 14, reportedPct: 71.43 },
  { label: "MG-482", code: "MG-482", thPresent: 8, thHeld: 12, reportedPct: 66.67 },
];

function expectSample(report: ReturnType<typeof parseReport>) {
  expect(report.warnings).toEqual([]);
  expect(report.nedAggregate).toBe(78);
  expect(report.courses).toHaveLength(6);
  report.courses.forEach((c, i) => {
    expect(c).toMatchObject({ ...EXPECTED[i], thCredit: 3, prCredit: 0, prPresent: 0, prHeld: 0 });
  });
}

describe("parseReport (sample layout, made-up numbers)", () => {
  it("reads header fields", () => {
    const { meta } = parseReport(items);
    expect(meta).toEqual({
      studentName: "TEST STUDENT",
      rollNo: "XX-000",
      session: "2026-2027",
      academicYear: "Fourth Year",
      discipline: "Specialization in Artificial Intelligence",
      section: "Section-A",
      fromDate: "2026-08-17",
      toDate: "2026-09-25",
      generatedOn: "2026-09-25",
    });
  });

  it("rebuilds rows from pdf.js's column-by-column text order", () => {
    expectSample(parseReport(items));
  });

  it("is independent of text-item order", () => {
    const shuffled = [...items].sort((a, b) => (a.str + a.x).localeCompare(b.str + b.x));
    expectSample(parseReport(shuffled));
  });

  it("printed values are reproduced by Option B (theory-only: same as A)", () => {
    expectOptionBMatches(parseReport(items));
  });

  it("falls back to left-to-right order when column headers are missing", () => {
    const noHeaders = items.filter((i) => !/^(Present|Held|Percentage)$/.test(i.str.trim()));
    const report = parseReport(noHeaders);
    expect(report.courses.map((c) => [c.thPresent, c.thHeld, c.reportedPct])).toEqual(
      EXPECTED.map((e) => [e.thPresent, e.thHeld, e.reportedPct]),
    );
  });

  it("reads practical columns for a course with labs", () => {
    const y = 470;
    const lab: TextItem[] = [
      { str: "7", x: 56, y, w: 5, page: 1 },
      { str: "CS-301", x: 118, y, w: 30, page: 1 },
      { str: "3 Th + 1 Pr", x: 205, y, w: 40, page: 1 },
      { str: "20", x: 283, y, w: 10, page: 1 },
      { str: "24", x: 328, y, w: 10, page: 1 },
      { str: "5", x: 375, y, w: 5, page: 1 },
      { str: "6", x: 417, y, w: 5, page: 1 },
      { str: "83.33", x: 496, y, w: 22, page: 1 },
    ];
    const withoutFooter = items.filter((i) => i.y > 480 || i.y < 400);
    const report = parseReport([...withoutFooter, ...lab]);
    expect(report.courses.at(-1)).toMatchObject({
      code: "CS-301", thCredit: 3, prCredit: 1, thPresent: 20, thHeld: 24, prPresent: 5, prHeld: 6, reportedPct: 83.33,
    });
  });
});

describe("parseReport (newer layout with labs, made-up numbers)", () => {
  // Newer reports print "83%" (rounded up) and label the footer "Aggregate Attendance".
  const report = parseReport(labFixture as TextItem[]);

  it("reads theory and practical columns", () => {
    expect(report.warnings).toEqual([]);
    expect(report.nedAggregate).toBe(79);
    expect(report.meta).toMatchObject({ fromDate: "2026-01-05", toDate: "2026-05-22", generatedOn: "2026-03-31" });
    expect(report.courses.map((c) => [c.label, c.thCredit, c.prCredit, c.thPresent, c.thHeld, c.prPresent, c.prHeld, c.reportedPct]))
      .toEqual([
        ["CS-428", 3, 1, 18, 22, 12, 12, 87],
        ["CT-354", 3, 1, 15, 21, 11, 11, 79],
        ["CT-363", 3, 0, 17, 22, 0, 0, 78],
        ["CT-376", 3, 1, 13, 20, 9, 12, 68],
        ["CT-377 ( Opt )", 3, 0, 20, 22, 0, 0, 91],
        ["ES-222 ( Opt )", 3, 0, 16, 22, 0, 0, 73],
      ]);
  });

  it("identifies credit-weighted (Option B) as the formula behind the printed %", () => {
    const labs = report.courses.filter((c) => c.prHeld > 0);
    for (const c of labs) expect(reportedMatches(c)).toEqual(["weighted"]);
  });
});

/** Every printed course % and the aggregate must be reproduced by Option B, rounded up. */
function expectOptionBMatches(report: ReturnType<typeof parseReport>) {
  for (const c of report.courses) expect(reportedMatches(c)).toContain("weighted");
  const { aggregate } = analyse({
    source: "pdf", meta: report.meta, courses: report.courses, formula: "weighted",
    startDate: report.meta.fromDate!, asOfDate: report.meta.generatedOn!, nedAggregate: report.nedAggregate,
  });
  expect(aggregate.pctCeil).toBe(report.nedAggregate);
}

// Run only on a machine that has the real (git-ignored) PDFs. Structure/formula checks only.
const SAMPLE = "sample/4600050_attendance.pdf";
const LAB_SAMPLE = "sample/lab_attendance.pdf";
const loadReal = async (path: string) => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  return parseReport(await extractItems(pdfjs as never, new Uint8Array(readFileSync(path))));
};

describe.skipIf(!existsSync(LAB_SAMPLE))("real lab PDF via pdf.js", () => {
  it("parses, and Option B reproduces NED's numbers", async () => {
    const report = await loadReal(LAB_SAMPLE);
    expect(report.warnings).toEqual([]);
    expect(report.courses.filter((c) => c.prHeld > 0).length).toBeGreaterThan(0);
    expectOptionBMatches(report);
  });
});

describe.skipIf(!existsSync(SAMPLE))("real sample PDF via pdf.js", () => {
  it("extracts and parses end to end", async () => {
    const report = await loadReal(SAMPLE);
    expectOptionBMatches(report);
    // Structure only — the real numbers stay out of the repo.
    expect(report.warnings).toEqual([]);
    expect(report.courses.map((c) => c.label)).toEqual(EXPECTED.map((e) => e.label));
    expect(report.nedAggregate).toBeGreaterThan(0);
    expect(report.meta.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

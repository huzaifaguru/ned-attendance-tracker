import { matchesReported } from "./calc";
import { parseNedDate } from "./dates";
import type { Course, ParsedReport, ReportMeta } from "./types";

/** A positioned text fragment, independent of the PDF library. */
export interface TextItem {
  str: string;
  x: number;
  y: number;
  w: number;
  page: number;
}

interface Row {
  page: number;
  y: number;
  items: TextItem[];
  text: string;
}

const ROW_TOLERANCE = 3;
const CREDIT_RE = /(\d+)\s*Th\s*\+\s*(\d+)\s*Pr/i;
const CODE_RE = /\b([A-Z]{2,4})\s*-\s*(\d{3,4}[A-Z]?)\b(\s*\(\s*Opt\s*\))?/i;
const NUM_RE = /^(\d+(?:\.\d+)?%?|-)$/;

const META_LABELS: [RegExp, keyof ReportMeta][] = [
  [/Student\s*Name/i, "studentName"],
  [/Roll\s*No\.?/i, "rollNo"],
  [/Session/i, "session"],
  [/Academic\s*Yr\.?/i, "academicYear"],
  [/Discipline/i, "discipline"],
  [/Section/i, "section"],
  [/From\s*Date/i, "fromDate"],
  [/To\s*Date/i, "toDate"],
  [/Report\s*Generated\s*on/i, "generatedOn"],
];
const DATE_FIELDS = new Set<keyof ReportMeta>(["fromDate", "toDate", "generatedOn"]);

/**
 * pdf.js emits this report column-by-column, so rows are rebuilt from
 * coordinates: items sharing (roughly) the same baseline form a row.
 */
export function groupRows(items: TextItem[]): Row[] {
  const sorted = items
    .filter((i) => i.str.trim())
    .sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  const rows: Row[] = [];
  for (const it of sorted) {
    const row = rows.find((r) => r.page === it.page && Math.abs(r.y - it.y) <= ROW_TOLERANCE);
    if (row) row.items.push(it);
    else rows.push({ page: it.page, y: it.y, items: [it], text: "" });
  }
  for (const r of rows) {
    r.items.sort((a, b) => a.x - b.x);
    r.text = r.items.map((i) => i.str.trim()).join("  ");
  }
  return rows;
}

function parseMeta(rows: Row[]): ReportMeta {
  const meta: ReportMeta = {};
  const labelAlt = META_LABELS.map(([re]) => re.source).join("|");
  // Labels always end in a colon, which keeps "Section-A" from reading as a label.
  const splitter = new RegExp(`(${labelAlt})\\s*:`, "gi");
  for (const row of rows) {
    const matches = [...row.text.matchAll(splitter)];
    matches.forEach((m, i) => {
      const start = m.index! + m[0].length;
      const end = i + 1 < matches.length ? matches[i + 1].index! : row.text.length;
      const value = row.text.slice(start, end).trim();
      const key = META_LABELS.find(([re]) => new RegExp(`^${re.source}$`, "i").test(m[1].trim()))?.[1];
      if (!key || !value || meta[key]) return;
      meta[key] = DATE_FIELDS.has(key) ? parseNedDate(value) ?? value : value;
    });
  }
  return meta;
}

type Col = "thPresent" | "thHeld" | "prPresent" | "prHeld" | "pct";
const COL_ORDER: Col[] = ["thPresent", "thHeld", "prPresent", "prHeld", "pct"];

/** Locate column centres from the "Present / Held / Present / Held / Percentage" headers. */
function findColumns(rows: Row[]): Record<Col, number> | undefined {
  const center = (i: TextItem) => i.x + i.w / 2;
  for (const row of rows) {
    const present = row.items.filter((i) => /^Present$/i.test(i.str.trim()));
    const held = row.items.filter((i) => /^Held$/i.test(i.str.trim()));
    if (present.length < 2 || held.length < 2) continue;
    const pctHeader = rows
      .filter((r) => r.page === row.page && Math.abs(r.y - row.y) < 30)
      .flatMap((r) => r.items)
      .find((i) => /^Percentage$/i.test(i.str.trim()));
    if (!pctHeader) continue;
    return {
      thPresent: center(present[0]),
      thHeld: center(held[0]),
      prPresent: center(present[1]),
      prHeld: center(held[1]),
      pct: center(pctHeader),
    };
  }
  return undefined;
}

interface Token { value: string; cx: number }

function numericTokens(items: TextItem[]): Token[] {
  const out: Token[] = [];
  for (const it of items) {
    const parts = it.str.trim().split(/\s+/);
    parts.forEach((p, i) => {
      if (NUM_RE.test(p)) out.push({ value: p, cx: it.x + (it.w * (i + 0.5)) / parts.length });
    });
  }
  return out;
}

const num = (v: string | undefined) => (v === undefined || v === "-" ? 0 : Number(v.replace("%", "")));

export function parseReport(items: TextItem[]): ParsedReport {
  const warnings: string[] = [];
  const rows = groupRows(items);
  const meta = parseMeta(rows);
  const columns = findColumns(rows);
  if (!columns) warnings.push("Couldn't locate table column headers; read values in left-to-right order instead.");

  const courses: Course[] = [];
  for (const row of rows) {
    const credit = row.text.match(CREDIT_RE);
    const code = row.text.match(CODE_RE);
    if (!credit || !code) continue;

    const codeItem = row.items.find((i) => CODE_RE.test(i.str) || /^[A-Z]{2,4}\s*-?$/i.test(i.str.trim()));
    const creditItem = row.items.find((i) => /Pr/i.test(i.str)) ?? row.items.find((i) => /Th/i.test(i.str));
    const leftEdge = Math.max(
      codeItem ? codeItem.x + codeItem.w : -Infinity,
      creditItem ? creditItem.x + creditItem.w : -Infinity,
    );
    const tokens = numericTokens(row.items.filter((i) => i.x >= leftEdge - 1));

    const values: Partial<Record<Col, string>> = {};
    if (columns) {
      for (const t of tokens) {
        let best: Col | undefined;
        let bestDist = Infinity;
        for (const c of COL_ORDER) {
          const d = Math.abs(columns[c] - t.cx);
          if (d < bestDist) { bestDist = d; best = c; }
        }
        if (best && bestDist < 40 && values[best] === undefined) values[best] = t.value;
      }
    }
    if (!columns || values.thHeld === undefined || values.pct === undefined) {
      const seq = tokens.map((t) => t.value);
      if (seq.length >= 5) {
        const last = seq.slice(-5);
        COL_ORDER.forEach((c, i) => (values[c] = last[i]));
      } else if (seq.length === 3) {
        [values.thPresent, values.thHeld, values.pct] = seq;
      } else {
        warnings.push(`Couldn't read the numbers for ${code[0]}: ${row.text}`);
        continue;
      }
    }

    const label = code[0].replace(/\s+/g, " ").replace(/\(\s*Opt\s*\)/i, "( Opt )").trim();
    const course: Course = {
      id: `${code[1].toUpperCase()}-${code[2].toUpperCase()}`,
      label,
      code: `${code[1].toUpperCase()}-${code[2].toUpperCase()}`,
      thCredit: Number(credit[1]),
      prCredit: Number(credit[2]),
      thPresent: num(values.thPresent),
      thHeld: num(values.thHeld),
      prPresent: num(values.prPresent),
      prHeld: num(values.prHeld),
      reportedPct: values.pct && values.pct !== "-" ? num(values.pct) : undefined,
    };
    if (courses.some((c) => c.id === course.id)) course.id += `-${courses.length}`;

    if (course.thPresent > course.thHeld || course.prPresent > course.prHeld) {
      warnings.push(`${label}: present exceeds held — check the extracted numbers.`);
    }
    if (!matchesReported(course)) {
      warnings.push(
        `${label}: PDF shows ${course.reportedPct}%, which our calculation doesn't reproduce — ` +
          "check the extracted numbers, or use a manual override for this course.",
      );
    }
    courses.push(course);
  }

  let nedAggregate: number | undefined;
  const aggRow = rows.find((r) => /Aggregate\s*Attendance/i.test(r.text));
  if (aggRow) {
    const n = aggRow.text.match(/(\d+(?:\.\d+)?)\s*%?\s*$/);
    if (n) nedAggregate = Number(n[1]);
  }

  if (!courses.length) warnings.push("No course rows were found in this PDF.");
  return { meta, courses, nedAggregate, warnings };
}

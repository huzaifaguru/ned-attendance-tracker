import { daysBetween } from "./dates";
import type { AppState, Course, Formula } from "./types";

export const SAFE = 75;
export const CONDONE = 70;
export const FLOOR = 65;

export const SEMESTER_WEEKS = 16;
export const MIDTERM_WEEK = 8;
export const TEACHING_WEEKS = 14; // 16 minus mid-term week (8) and finals week (16)

// ---------------------------------------------------------------- timing

export interface Timing {
  calendarWeeks: number;
  teachingWeeksElapsed: number;
  teachingWeeksRemaining: number;
}

/** Calendar weeks → teaching weeks, skipping mid-term week 8 and finals week 16. */
export function teachingWeeks(calendarWeeks: number): number {
  const w = Math.max(0, calendarWeeks);
  if (w <= MIDTERM_WEEK - 1) return w;
  if (w <= MIDTERM_WEEK) return MIDTERM_WEEK - 1;
  return Math.min(w - 1, TEACHING_WEEKS);
}

export function computeTiming(startDate: string, asOfDate: string): Timing {
  // +1 so the as-of day itself counts (the report covers classes held that day).
  const calendarWeeks = Math.max(0, (daysBetween(startDate, asOfDate) + 1) / 7);
  const elapsed = teachingWeeks(calendarWeeks);
  return {
    calendarWeeks,
    teachingWeeksElapsed: elapsed,
    teachingWeeksRemaining: Math.max(0, TEACHING_WEEKS - elapsed),
  };
}

// ---------------------------------------------------------------- percentages

export interface Counts {
  thPresent: number;
  thHeld: number;
  prPresent: number;
  prHeld: number;
}

const pct = (present: number, held: number) => (held > 0 ? (present / held) * 100 : null);

/** Combined % for one course by formula (ignores overrides). null if nothing held yet. */
export function formulaPct(course: Course, c: Counts, formula: Formula): number | null {
  const th = pct(c.thPresent, c.thHeld);
  const pr = pct(c.prPresent, c.prHeld);
  if (th === null && pr === null) return null;
  if (formula === "weighted") {
    const wTh = th === null ? 0 : course.thCredit;
    const wPr = pr === null ? 0 : course.prCredit;
    if (wTh + wPr > 0) return ((th ?? 0) * wTh + (pr ?? 0) * wPr) / (wTh + wPr);
  }
  return pct(c.thPresent + c.prPresent, c.thHeld + c.prHeld);
}

/** NED prints course and aggregate percentages rounded up (newer reports) or to 2 dp (older ones). */
export const nedRound = (p: number) => Math.ceil(p - 1e-9);

/** Which formulas reproduce the percentage printed on the PDF for this course. */
export function reportedMatches(course: Course): Formula[] {
  const reported = course.reportedPct;
  if (reported === undefined) return [];
  return (["weighted", "pooled"] as Formula[]).filter((f) => {
    const p = formulaPct(course, countsOf(course), f);
    return p !== null && (Math.abs(p - reported) < 0.006 || nedRound(p) === reported);
  });
}

const countsOf = (c: Course): Counts => ({
  thPresent: c.thPresent,
  thHeld: c.thHeld,
  prPresent: c.prPresent,
  prHeld: c.prHeld,
});

/**
 * Combined % after `extra` future classes. With a manual override, the override is
 * treated as "this % of everything held so far was attended" and future classes are
 * pooled on top of it, since we can't know how the portal arrived at its number.
 */
export function projectedPct(course: Course, extra: Counts, formula: Formula): number | null {
  if (course.overridePct !== undefined) {
    const held = course.thHeld + course.prHeld;
    const anchored = (course.overridePct / 100) * held;
    const total = held + extra.thHeld + extra.prHeld;
    return total > 0 ? ((anchored + extra.thPresent + extra.prPresent) / total) * 100 : course.overridePct;
  }
  const base = countsOf(course);
  return formulaPct(course, {
    thPresent: base.thPresent + extra.thPresent,
    thHeld: base.thHeld + extra.thHeld,
    prPresent: base.prPresent + extra.prPresent,
    prHeld: base.prHeld + extra.prHeld,
  }, formula);
}

// ---------------------------------------------------------------- status

export type Tone = "safe" | "risky" | "danger";

export interface Status {
  tone: Tone;
  label: string;
  detail?: string;
}

export function courseStatus(p: number | null): Status {
  if (p === null) return { tone: "risky", label: "No classes yet" };
  if (p >= SAFE) return { tone: "safe", label: "Safe", detail: "≥75% — cleared for this final" };
  if (p >= FLOOR) return { tone: "risky", label: "Risky", detail: "65–75% — relies on aggregate / condonation" };
  return { tone: "danger", label: "Danger", detail: "Below 65% — blocks aggregate clearance" };
}

export function aggregateStatus(agg: number | null, minCourse: number | null): Status {
  if (agg === null) return { tone: "risky", label: "No data" };
  if (agg >= SAFE) {
    if (minCourse !== null && minCourse < FLOOR) {
      return { tone: "risky", label: "Risky", detail: "Aggregate ≥75%, but a course is below 65%" };
    }
    return { tone: "safe", label: "Safe", detail: "Aggregate ≥75% and no course below 65% — cleared" };
  }
  if (agg >= CONDONE) return { tone: "risky", label: "Risky / Condonation possible", detail: "70–75% — Dean may condone case-by-case" };
  if (agg >= FLOOR) return { tone: "danger", label: "Danger zone", detail: "65–70% — needs Chairperson/Dean/VC review" };
  return { tone: "danger", label: "Danger zone", detail: "Below the 65% floor" };
}

// ---------------------------------------------------------------- per course

export type Kind = "th" | "pr";

export interface MissAllowance {
  /** null = target unreachable even attending everything remaining */
  floor: number | null;
  safe: number | null;
}

export interface CourseResult {
  course: Course;
  hasLab: boolean;
  thPct: number | null;
  prPct: number | null;
  formulaPct: number | null;
  combinedPct: number | null;
  overridden: boolean;
  thPace: number;
  prPace: number;
  remainingTh: number;
  remainingPr: number;
  /** combined % if every remaining class and lab is attended */
  bestCasePct: number | null;
  missTh: MissAllowance;
  missPr: MissAllowance | null;
  status: Status;
  /** credit hrs, or estimated weekly contact hrs for non-credit courses */
  weight: number;
  weightIsContact: boolean;
}

/** Future counts when attending everything except `miss` of the given kind. */
function futureCounts(r: { remainingTh: number; remainingPr: number }, kind: Kind, miss: number): Counts {
  return {
    thPresent: r.remainingTh - (kind === "th" ? miss : 0),
    thHeld: r.remainingTh,
    prPresent: r.remainingPr - (kind === "pr" ? miss : 0),
    prHeld: r.remainingPr,
  };
}

function maxMisses(remaining: number, finalPct: (miss: number) => number | null, target: number): number | null {
  const ok = (m: number) => (finalPct(m) ?? 0) >= target - 1e-9;
  if (!ok(0)) return null;
  let m = 0;
  while (m < remaining && ok(m + 1)) m++;
  return m;
}

export function analyseCourse(course: Course, timing: Timing, formula: Formula): CourseResult {
  const elapsed = timing.teachingWeeksElapsed;
  const thPace = elapsed > 0 ? course.thHeld / elapsed : 0;
  const prPace = elapsed > 0 ? course.prHeld / elapsed : 0;
  const remainingTh = Math.round(thPace * timing.teachingWeeksRemaining);
  const remainingPr = Math.round(prPace * timing.teachingWeeksRemaining);
  const hasLab = course.prCredit > 0 || course.prHeld > 0;

  const fPct = formulaPct(course, countsOf(course), formula);
  const combinedPct = course.overridePct ?? fPct;
  const rem = { remainingTh, remainingPr };
  const final = (kind: Kind) => (m: number) => projectedPct(course, futureCounts(rem, kind, m), formula);
  const allowance = (kind: Kind, remaining: number): MissAllowance => ({
    floor: maxMisses(remaining, final(kind), FLOOR),
    safe: maxMisses(remaining, final(kind), SAFE),
  });

  const credits = course.thCredit + course.prCredit;
  const contact = thPace + prPace;

  return {
    course,
    hasLab,
    thPct: pct(course.thPresent, course.thHeld),
    prPct: pct(course.prPresent, course.prHeld),
    formulaPct: fPct,
    combinedPct,
    overridden: course.overridePct !== undefined,
    thPace,
    prPace,
    remainingTh,
    remainingPr,
    bestCasePct: final("th")(0),
    missTh: allowance("th", remainingTh),
    missPr: hasLab ? allowance("pr", remainingPr) : null,
    status: courseStatus(combinedPct),
    weight: credits > 0 ? credits : contact > 0 ? contact : 1,
    weightIsContact: credits === 0,
  };
}

// ---------------------------------------------------------------- aggregate

export interface AggregateMiss {
  total: number | null;
  /** how the greedy plan spreads the misses, course id → count */
  plan: Record<string, number>;
}

export interface AggregateResult {
  pct: number | null;
  /** NED reports the ceiling of the average */
  pctCeil: number | null;
  bestCasePct: number | null;
  minCourse: number | null;
  status: Status;
  remainingTh: number;
  remainingPr: number;
  missTh: { floor: AggregateMiss; safe: AggregateMiss };
  missPr: { floor: AggregateMiss; safe: AggregateMiss } | null;
  nedAggregate?: number;
  /** true when NED's number and ours differ by more than rounding */
  nedMismatch: boolean;
}

function weightedAverage(results: CourseResult[], pcts: (number | null)[]): number | null {
  let sum = 0;
  let w = 0;
  results.forEach((r, i) => {
    const p = pcts[i];
    if (p === null) return;
    sum += p * r.weight;
    w += r.weight;
  });
  return w > 0 ? sum / w : null;
}

/**
 * Greedy: repeatedly skip the class that lowers the final aggregate the least,
 * while the aggregate stays ≥ target (and, for the safe target, every course ≥ 65%).
 */
function aggregateMisses(
  results: CourseResult[],
  kind: Kind,
  formula: Formula,
  target: number,
  perCourseFloor: boolean,
): AggregateMiss {
  const misses = results.map(() => 0);
  const remaining = results.map((r) => (kind === "th" ? r.remainingTh : r.remainingPr));
  const finalOf = (i: number, m: number) =>
    projectedPct(results[i].course, futureCounts(results[i], kind, m), formula);
  const finals = results.map((_, i) => finalOf(i, 0));
  const passes = (fs: (number | null)[]) =>
    (weightedAverage(results, fs) ?? 0) >= target - 1e-9 &&
    (!perCourseFloor || fs.every((p) => p === null || p >= FLOOR - 1e-9));

  if (!passes(finals)) return { total: null, plan: {} };

  for (;;) {
    let bestI = -1;
    let bestAgg = -Infinity;
    let bestPct: number | null = null;
    for (let i = 0; i < results.length; i++) {
      if (misses[i] >= remaining[i]) continue;
      const trial = finalOf(i, misses[i] + 1);
      const fs = finals.slice();
      fs[i] = trial;
      if (!passes(fs)) continue;
      const agg = weightedAverage(results, fs) ?? 0;
      if (agg > bestAgg) { bestAgg = agg; bestI = i; bestPct = trial; }
    }
    if (bestI < 0) break;
    misses[bestI]++;
    finals[bestI] = bestPct;
  }

  const plan: Record<string, number> = {};
  misses.forEach((m, i) => { if (m) plan[results[i].course.id] = m; });
  return { total: misses.reduce((a, b) => a + b, 0), plan };
}

export function analyseAggregate(
  results: CourseResult[],
  formula: Formula,
  nedAggregate?: number,
): AggregateResult {
  const current = results.map((r) => r.combinedPct);
  const agg = weightedAverage(results, current);
  const known = current.filter((p): p is number => p !== null);
  const minCourse = known.length ? Math.min(...known) : null;
  const anyLab = results.some((r) => r.hasLab);
  const both = (kind: Kind) => ({
    floor: aggregateMisses(results, kind, formula, FLOOR, false),
    safe: aggregateMisses(results, kind, formula, SAFE, true),
  });
  const pctCeil = agg === null ? null : nedRound(agg);

  return {
    pct: agg,
    pctCeil,
    bestCasePct: weightedAverage(results, results.map((r) => r.bestCasePct)),
    minCourse,
    status: aggregateStatus(agg, minCourse),
    remainingTh: results.reduce((a, r) => a + r.remainingTh, 0),
    remainingPr: results.reduce((a, r) => a + r.remainingPr, 0),
    missTh: both("th"),
    missPr: anyLab ? both("pr") : null,
    nedAggregate,
    nedMismatch:
      nedAggregate !== undefined && agg !== null && Math.abs(nedAggregate - agg) >= 1 && pctCeil !== nedAggregate,
  };
}

export function analyse(state: AppState) {
  const timing = computeTiming(state.startDate, state.asOfDate);
  const courses = state.courses.map((c) => analyseCourse(c, timing, state.formula));
  const aggregate = analyseAggregate(courses, state.formula, state.nedAggregate);
  return { timing, courses, aggregate };
}

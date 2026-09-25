import { daysBetween } from "./dates";
import type { AppState, Course } from "./types";

/** Each subject must stay at or above this. */
export const COURSE_MIN = 65;
/** The overall (credit-weighted) aggregate must stay at or above this. */
export const AGGREGATE_MIN = 75;
/** Aggregate 70–75%: Dean may condone case by case. */
export const CONDONE = 70;

/**
 * Weeks of classes in a semester. A subject meets its credit hours per week, and
 * missed/cancelled classes are made up, so a 3 CH subject always totals 3 × 15 = 45.
 */
export const SEMESTER_WEEKS = 15;

// ---------------------------------------------------------------- timing

export interface Timing {
  /** week number the report falls in (1-based, capped at SEMESTER_WEEKS) */
  currentWeek: number;
  /** whole weeks of classes still to come after the report's week */
  weeksRemaining: number;
}

/** The report's own week counts as done, since its classes are already in the counts. */
export function computeTiming(startDate: string, asOfDate: string): Timing {
  const day = daysBetween(startDate, asOfDate) + 1;
  const currentWeek = Math.min(SEMESTER_WEEKS, Math.max(0, Math.ceil(day / 7)));
  return { currentWeek, weeksRemaining: SEMESTER_WEEKS - currentWeek };
}

// ---------------------------------------------------------------- percentages

export interface Counts {
  thPresent: number;
  thHeld: number;
  prPresent: number;
  prHeld: number;
}

const pct = (present: number, held: number) => (held > 0 ? (present / held) * 100 : null);

/**
 * Combined % for one course (ignores overrides); null if nothing held yet.
 * NED weights theory% and practical% by their credit hours, which reproduces every
 * course % and the aggregate printed on real reports. Non-credit courses fall back
 * to pooled counts (a proxy for contact hours).
 */
export function combinedPct(course: Course, c: Counts): number | null {
  const th = pct(c.thPresent, c.thHeld);
  const pr = pct(c.prPresent, c.prHeld);
  if (th === null && pr === null) return null;
  const wTh = th === null ? 0 : course.thCredit;
  const wPr = pr === null ? 0 : course.prCredit;
  if (wTh + wPr > 0) return ((th ?? 0) * wTh + (pr ?? 0) * wPr) / (wTh + wPr);
  return pct(c.thPresent + c.prPresent, c.thHeld + c.prHeld);
}

/** NED prints course and aggregate percentages rounded up (newer reports) or to 2 dp (older ones). */
export const nedRound = (p: number) => Math.ceil(p - 1e-9);

const countsOf = (c: Course): Counts => ({
  thPresent: c.thPresent,
  thHeld: c.thHeld,
  prPresent: c.prPresent,
  prHeld: c.prHeld,
});

/** Whether our calculation reproduces the percentage printed on the PDF for this course. */
export function matchesReported(course: Course): boolean {
  const reported = course.reportedPct;
  if (reported === undefined) return true;
  const p = combinedPct(course, countsOf(course));
  return p !== null && (Math.abs(p - reported) < 0.006 || nedRound(p) === reported);
}

/**
 * Combined % after `extra` future classes. With a manual override we can't know how the
 * portal split it between theory and practical, so both are assumed to be at the override %.
 */
export function projectedPct(course: Course, extra: Counts): number | null {
  const base = countsOf(course);
  if (course.overridePct !== undefined) {
    const o = course.overridePct / 100;
    base.thPresent = o * course.thHeld;
    base.prPresent = o * course.prHeld;
  }
  const p = combinedPct(course, {
    thPresent: base.thPresent + extra.thPresent,
    thHeld: base.thHeld + extra.thHeld,
    prPresent: base.prPresent + extra.prPresent,
    prHeld: base.prHeld + extra.prHeld,
  });
  return p ?? course.overridePct ?? null;
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
  if (p >= COURSE_MIN) return { tone: "safe", label: "Safe", detail: "At or above the 65% subject limit" };
  return { tone: "danger", label: "Below 65%", detail: "Below the 65% subject limit" };
}

export function aggregateStatus(agg: number | null, minCourse: number | null): Status {
  if (agg === null) return { tone: "risky", label: "No data" };
  const courseBelow = minCourse !== null && minCourse < COURSE_MIN;
  if (agg >= AGGREGATE_MIN) {
    if (courseBelow) return { tone: "danger", label: "Subject below 65%", detail: "Aggregate is ≥75%, but a subject is below its 65% limit" };
    return { tone: "safe", label: "Safe", detail: "Aggregate ≥75% and every subject ≥65% — cleared" };
  }
  if (agg >= CONDONE) return { tone: "risky", label: "Risky / Condonation possible", detail: "Aggregate 70–75% — Dean may condone case-by-case" };
  return { tone: "danger", label: "Danger zone", detail: "Aggregate below 70% — needs Chairperson/Dean/VC review" };
}

// ---------------------------------------------------------------- per course

export type Kind = "th" | "pr";

export interface CourseResult {
  course: Course;
  hasLab: boolean;
  thPct: number | null;
  prPct: number | null;
  /** calculated combined %, shown next to an override for comparison */
  calculatedPct: number | null;
  combinedPct: number | null;
  overridden: boolean;
  /** classes per week = theory credit hours */
  thPerWeek: number;
  /** labs per week = practical credit hours */
  prPerWeek: number;
  /** semester total (credit hours × 15), never less than already held */
  totalTh: number;
  totalPr: number;
  remainingTh: number;
  remainingPr: number;
  /** combined % if every remaining class and lab is attended */
  bestCasePct: number | null;
  /** classes that can be skipped in this subject alone while it stays ≥ 65%; null = can't reach 65% */
  missTh: number | null;
  /** same for labs (null also when the course has no lab) */
  missPr: number | null;
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

export function analyseCourse(course: Course, timing: Timing): CourseResult {
  // Credit hours = sessions per week over the whole semester (make-ups included), so
  // classes left = semester total − held. Non-credit courses fall back to their observed pace.
  const observed = (held: number) => (timing.currentWeek > 0 ? held / timing.currentWeek : 0);
  const credits = course.thCredit + course.prCredit;
  const thPerWeek = credits > 0 ? course.thCredit : observed(course.thHeld);
  const prPerWeek = credits > 0 ? course.prCredit : observed(course.prHeld);
  const totalTh = Math.max(course.thHeld, Math.round(thPerWeek * SEMESTER_WEEKS));
  const totalPr = Math.max(course.prHeld, Math.round(prPerWeek * SEMESTER_WEEKS));
  const remainingTh = totalTh - course.thHeld;
  const remainingPr = totalPr - course.prHeld;
  const hasLab = course.prCredit > 0 || course.prHeld > 0;

  const calculatedPct = combinedPct(course, countsOf(course));
  const current = course.overridePct ?? calculatedPct;
  const rem = { remainingTh, remainingPr };
  const final = (kind: Kind) => (m: number) => projectedPct(course, futureCounts(rem, kind, m));

  const contact = thPerWeek + prPerWeek;

  return {
    course,
    hasLab,
    thPct: pct(course.thPresent, course.thHeld),
    prPct: pct(course.prPresent, course.prHeld),
    calculatedPct,
    combinedPct: current,
    overridden: course.overridePct !== undefined,
    thPerWeek,
    prPerWeek,
    totalTh,
    totalPr,
    remainingTh,
    remainingPr,
    bestCasePct: final("th")(0),
    missTh: maxMisses(remainingTh, final("th"), COURSE_MIN),
    missPr: hasLab ? maxMisses(remainingPr, final("pr"), COURSE_MIN) : null,
    status: courseStatus(current),
    weight: credits > 0 ? credits : contact > 0 ? contact : 1,
    weightIsContact: credits === 0,
  };
}

// ---------------------------------------------------------------- aggregate

export interface AggregateMiss {
  /** null = the 75% aggregate (with every subject ≥ 65%) can't be reached */
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
  missTh: AggregateMiss;
  missPr: AggregateMiss | null;
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
 * while the aggregate stays ≥ 75% and every subject stays ≥ 65%.
 */
function aggregateMisses(results: CourseResult[], kind: Kind): AggregateMiss {
  const misses = results.map(() => 0);
  const remaining = results.map((r) => (kind === "th" ? r.remainingTh : r.remainingPr));
  const finalOf = (i: number, m: number) =>
    projectedPct(results[i].course, futureCounts(results[i], kind, m));
  const finals = results.map((_, i) => finalOf(i, 0));
  const passes = (fs: (number | null)[]) =>
    (weightedAverage(results, fs) ?? 0) >= AGGREGATE_MIN - 1e-9 &&
    fs.every((p) => p === null || p >= COURSE_MIN - 1e-9);

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
  nedAggregate?: number,
): AggregateResult {
  const current = results.map((r) => r.combinedPct);
  const agg = weightedAverage(results, current);
  const known = current.filter((p): p is number => p !== null);
  const minCourse = known.length ? Math.min(...known) : null;
  const anyLab = results.some((r) => r.hasLab);
  const pctCeil = agg === null ? null : nedRound(agg);

  return {
    pct: agg,
    pctCeil,
    bestCasePct: weightedAverage(results, results.map((r) => r.bestCasePct)),
    minCourse,
    status: aggregateStatus(agg, minCourse),
    remainingTh: results.reduce((a, r) => a + r.remainingTh, 0),
    remainingPr: results.reduce((a, r) => a + r.remainingPr, 0),
    missTh: aggregateMisses(results, "th"),
    missPr: anyLab ? aggregateMisses(results, "pr") : null,
    nedAggregate,
    nedMismatch:
      nedAggregate !== undefined && agg !== null && Math.abs(nedAggregate - agg) >= 1 && pctCeil !== nedAggregate,
  };
}

export function analyse(state: AppState) {
  const timing = computeTiming(state.startDate, state.asOfDate);
  const courses = state.courses.map((c) => analyseCourse(c, timing));
  const aggregate = analyseAggregate(courses, state.nedAggregate);
  return { timing, courses, aggregate };
}

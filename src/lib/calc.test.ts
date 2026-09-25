import { describe, expect, it } from "vitest";
import {
  aggregateStatus, analyse, analyseCourse, computeTiming, formulaPct, teachingWeeks,
} from "./calc";
import type { AppState, Course } from "./types";

const course = (o: Partial<Course>): Course => ({
  id: o.code ?? "X-100", label: o.code ?? "X-100", code: "X-100",
  thCredit: 3, prCredit: 0, thPresent: 0, thHeld: 0, prPresent: 0, prHeld: 0, ...o,
});

describe("timing", () => {
  it("skips mid-term week 8 and caps at 14 teaching weeks", () => {
    expect(teachingWeeks(5)).toBe(5);
    expect(teachingWeeks(6.5)).toBe(6.5);
    expect(teachingWeeks(7.5)).toBe(7);
    expect(teachingWeeks(8)).toBe(7);
    expect(teachingWeeks(10)).toBe(9);
    expect(teachingWeeks(16)).toBe(14);
  });

  it("counts from From Date through the report day", () => {
    const t = computeTiming("2026-08-17", "2026-09-25");
    expect(t.calendarWeeks).toBeCloseTo(40 / 7);
    expect(t.teachingWeeksRemaining).toBeCloseTo(14 - 40 / 7);
  });
});

describe("combined formulas", () => {
  const lab = course({ thCredit: 3, prCredit: 1, thPresent: 18, thHeld: 24, prPresent: 6, prHeld: 6 });
  const counts = { thPresent: 18, thHeld: 24, prPresent: 6, prHeld: 6 };

  it("A: pooled counts", () => {
    expect(formulaPct(lab, counts, "pooled")).toBeCloseTo((24 / 30) * 100);
  });

  it("B: credit-hour weighted", () => {
    expect(formulaPct(lab, counts, "weighted")).toBeCloseTo((75 * 3 + 100 * 1) / 4);
  });

  it("B ignores a component with nothing held yet", () => {
    const c = { ...counts, prPresent: 0, prHeld: 0 };
    expect(formulaPct(lab, c, "weighted")).toBeCloseTo(75);
  });
});

describe("course allowances", () => {
  const timing = { calendarWeeks: 7, teachingWeeksElapsed: 7, teachingWeeksRemaining: 7 };

  it("projects remaining classes from the course's own pace", () => {
    const r = analyseCourse(course({ thPresent: 14, thHeld: 14 }), timing, "pooled");
    expect(r.thPace).toBe(2);
    expect(r.remainingTh).toBe(14);
    // final = (28 - m) / 28 ≥ 0.75 → m ≤ 7 ; ≥ 0.65 → m ≤ 9.8
    expect(r.missTh).toEqual({ safe: 7, floor: 9 });
    expect(r.missPr).toBeNull();
  });

  it("reports unreachable targets as null", () => {
    const r = analyseCourse(course({ thPresent: 0, thHeld: 14 }), timing, "pooled");
    expect(r.missTh.safe).toBeNull();
    expect(r.missTh.floor).toBeNull();
  });

  it("uses the manual override as the current combined %", () => {
    const r = analyseCourse(course({ thPresent: 14, thHeld: 14, overridePct: 50 }), timing, "pooled");
    expect(r.combinedPct).toBe(50);
    expect(r.overridden).toBe(true);
    // anchored: (7 + 14 - m) / 28 ≥ 0.65 → m ≤ 2.8 ; ≥ 0.75 → m ≤ 0
    expect(r.missTh.floor).toBe(2);
    expect(r.missTh.safe).toBe(0);
  });

  it("gives separate lab allowances", () => {
    const r = analyseCourse(
      course({ thCredit: 3, prCredit: 1, thPresent: 14, thHeld: 14, prPresent: 7, prHeld: 7 }), timing, "pooled",
    );
    expect(r.remainingPr).toBe(7);
    // pooled final with all theory: (42 - m) / 42 ≥ 0.75 → m ≤ 10.5, capped at 7 remaining labs
    expect(r.missPr).toEqual({ safe: 7, floor: 7 });
  });
});

describe("aggregate", () => {
  it("statuses follow the exam regulations", () => {
    expect(aggregateStatus(80, 70).label).toBe("Safe");
    expect(aggregateStatus(80, 60).tone).toBe("risky");
    expect(aggregateStatus(72, 70).label).toMatch(/Condonation/);
    expect(aggregateStatus(67, 70).label).toBe("Danger zone");
    expect(aggregateStatus(60, 70).tone).toBe("danger");
  });

  const sample: AppState = {
    source: "pdf",
    meta: {},
    startDate: "2026-08-17",
    asOfDate: "2026-09-25",
    formula: "pooled",
    nedAggregate: 78,
    courses: [
      [12, 15], [16, 18], [7, 10], [14, 16], [10, 14], [8, 12],
    ].map(([p, h], i) => course({ id: `c${i}`, code: `c${i}`, thPresent: p, thHeld: h })),
  };

  it("matches NED's own aggregate on the sample (ceil of credit-weighted mean)", () => {
    const { aggregate } = analyse(sample);
    expect(aggregate.pct).toBeCloseTo(77.41, 2);
    expect(aggregate.pctCeil).toBe(78);
    expect(aggregate.nedMismatch).toBe(false);
  });

  it("flags a mismatch with NED beyond rounding", () => {
    expect(analyse({ ...sample, nedAggregate: 72 }).aggregate.nedMismatch).toBe(true);
  });

  it("safe plan keeps every course ≥ 65%", () => {
    const { courses, aggregate } = analyse(sample);
    const plan = aggregate.missTh.safe.plan;
    expect(aggregate.missTh.safe.total).toBeGreaterThan(0);
    for (const r of courses) {
      const m = plan[r.course.id] ?? 0;
      const final = ((r.course.thPresent + r.remainingTh - m) / (r.course.thHeld + r.remainingTh)) * 100;
      expect(final).toBeGreaterThanOrEqual(65);
    }
    expect(aggregate.missTh.floor.total!).toBeGreaterThanOrEqual(aggregate.missTh.safe.total!);
  });
});

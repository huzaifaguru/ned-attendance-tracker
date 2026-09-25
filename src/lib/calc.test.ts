import { describe, expect, it } from "vitest";
import {
  aggregateStatus, analyse, analyseCourse, combinedPct, computeTiming, courseStatus, teachingWeeks,
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

describe("combined % (credit-hour weighted)", () => {
  const lab = course({ thCredit: 3, prCredit: 1, thPresent: 18, thHeld: 24, prPresent: 6, prHeld: 6 });
  const counts = { thPresent: 18, thHeld: 24, prPresent: 6, prHeld: 6 };

  it("weights theory% and practical% by credit hours", () => {
    expect(combinedPct(lab, counts)).toBeCloseTo((75 * 3 + 100 * 1) / 4);
  });

  it("ignores a component with nothing held yet", () => {
    expect(combinedPct(lab, { ...counts, prPresent: 0, prHeld: 0 })).toBeCloseTo(75);
  });

  it("pools counts for non-credit courses", () => {
    const nonCredit = course({ thCredit: 0, prCredit: 0 });
    expect(combinedPct(nonCredit, counts)).toBeCloseTo((24 / 30) * 100);
  });
});

describe("course allowances", () => {
  const timing = { calendarWeeks: 7, teachingWeeksElapsed: 7, teachingWeeksRemaining: 7 };

  it("projects remaining classes from the course's own pace", () => {
    const r = analyseCourse(course({ thPresent: 14, thHeld: 14 }), timing);
    expect(r.thPace).toBe(2);
    expect(r.remainingTh).toBe(14);
    // subject limit: (28 - m) / 28 ≥ 0.65 → m ≤ 9.8
    expect(r.missTh).toBe(9);
    expect(r.missPr).toBeNull();
  });

  it("reports an unreachable 65% as null", () => {
    const r = analyseCourse(course({ thPresent: 0, thHeld: 14 }), timing);
    expect(r.missTh).toBeNull();
  });

  it("subject status is judged against 65%", () => {
    expect(courseStatus(65).tone).toBe("safe");
    expect(courseStatus(70).tone).toBe("safe");
    expect(courseStatus(64.9).tone).toBe("danger");
  });

  it("uses the manual override as the current combined %", () => {
    const r = analyseCourse(course({ thPresent: 14, thHeld: 14, overridePct: 50 }), timing);
    expect(r.combinedPct).toBe(50);
    expect(r.overridden).toBe(true);
    // anchored: (7 + 14 - m) / 28 ≥ 0.65 → m ≤ 2.8
    expect(r.missTh).toBe(2);
  });

  it("gives separate lab allowances", () => {
    const r = analyseCourse(
      course({ thCredit: 3, prCredit: 1, thPresent: 14, thHeld: 14, prPresent: 7, prHeld: 7 }), timing,
    );
    expect(r.remainingPr).toBe(7);
    // all theory attended: (100×3 + lab%×1) / 4 ≥ 65 for any lab%, so every remaining lab can go
    expect(r.missPr).toBe(7);
  });
});

describe("aggregate", () => {
  it("statuses follow the exam regulations", () => {
    expect(aggregateStatus(80, 70).label).toBe("Safe");
    expect(aggregateStatus(80, 60).tone).toBe("danger");
    expect(aggregateStatus(72, 70).label).toMatch(/Condonation/);
    expect(aggregateStatus(67, 70).label).toBe("Danger zone");
    expect(aggregateStatus(60, 70).tone).toBe("danger");
  });

  const sample: AppState = {
    meta: {},
    startDate: "2026-08-17",
    asOfDate: "2026-09-25",
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

  it("overall plan keeps the aggregate ≥ 75% and every subject ≥ 65%", () => {
    const { courses, aggregate } = analyse(sample);
    const { plan, total } = aggregate.missTh;
    expect(total).toBeGreaterThan(0);
    expect(Object.values(plan).reduce((x, y) => x + y, 0)).toBe(total);
    let sum = 0;
    for (const r of courses) {
      const m = plan[r.course.id] ?? 0;
      expect(m).toBeLessThanOrEqual(r.missTh!);
      const final = ((r.course.thPresent + r.remainingTh - m) / (r.course.thHeld + r.remainingTh)) * 100;
      expect(final).toBeGreaterThanOrEqual(65);
      sum += final;
    }
    expect(sum / courses.length).toBeGreaterThanOrEqual(75);
  });

  it("overall skips are null when 75% can't be reached", () => {
    const low = { ...sample, courses: sample.courses.map((c) => ({ ...c, thPresent: Math.floor(c.thHeld * 0.3) })) };
    expect(analyse(low).aggregate.missTh.total).toBeNull();
  });
});

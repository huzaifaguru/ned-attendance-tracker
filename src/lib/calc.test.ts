import { describe, expect, it } from "vitest";
import {
  aggregateStatus, analyse, analyseCourse, combinedPct, computeTiming, courseStatus,
} from "./calc";
import type { AppState, Course } from "./types";

const course = (o: Partial<Course>): Course => ({
  id: o.code ?? "X-100", label: o.code ?? "X-100", code: "X-100",
  thCredit: 3, prCredit: 0, thPresent: 0, thHeld: 0, prPresent: 0, prHeld: 0, ...o,
});

describe("timing (15 weeks of classes)", () => {
  it("counts the report's week as done", () => {
    // 17 Aug (Mon) → 25 Sep (Fri) is day 40, i.e. week 6
    expect(computeTiming("2026-08-17", "2026-09-25")).toEqual({ currentWeek: 6, weeksRemaining: 9 });
    expect(computeTiming("2026-08-17", "2026-08-17")).toEqual({ currentWeek: 1, weeksRemaining: 14 });
  });

  it("caps at 15 weeks", () => {
    expect(computeTiming("2026-08-17", "2027-01-01")).toEqual({ currentWeek: 15, weeksRemaining: 0 });
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
  const timing = { currentWeek: 7, weeksRemaining: 7 };

  it("classes per week = credit hours", () => {
    const r = analyseCourse(course({ thPresent: 14, thHeld: 14 }), timing);
    expect(r.thPerWeek).toBe(3);
    expect(r.remainingTh).toBe(21);
    // subject limit: (35 - m) / 35 ≥ 0.65 → m ≤ 12.25
    expect(r.missTh).toBe(12);
    expect(r.missPr).toBeNull();
  });

  it("non-credit courses use their observed pace", () => {
    const r = analyseCourse(course({ thCredit: 0, thPresent: 14, thHeld: 14 }), timing);
    expect(r.thPerWeek).toBe(2);
    expect(r.remainingTh).toBe(14);
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
    // anchored: (7 + 21 - m) / 35 ≥ 0.65 → m ≤ 5.25
    expect(r.missTh).toBe(5);
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
    const low = { ...sample, courses: sample.courses.map((c) => ({ ...c, thPresent: 0 })) };
    expect(analyse(low).aggregate.missTh.total).toBeNull();
  });
});

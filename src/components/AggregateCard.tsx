import type { AggregateMiss, AggregateResult, CourseResult } from "@/lib/calc";
import { EstimatedTag, KindPanel, SkipPair, StatusBadge, fmtPct } from "./ui";

function Plan({ miss, courses, noun }: { miss: AggregateMiss; courses: CourseResult[]; noun: string }) {
  const entries = courses.filter((r) => miss.plan[r.course.id]);
  if (!entries.length) return null;
  return (
    <details className="mt-2 text-xs text-slate-700 dark:text-slate-300">
      <summary className="cursor-pointer font-medium">Where to skip for the 75% number</summary>
      <p className="mt-1 text-slate-500">
        One way to use those {noun} with the least damage while keeping every course ≥ 65%:
      </p>
      <ul className="mt-1 space-y-0.5">
        {entries.map((r) => (
          <li key={r.course.id} className="flex justify-between tabular-nums">
            <span>{r.course.label}</span>
            <span>{miss.plan[r.course.id]}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function AggregateCard({ a, courses }: { a: AggregateResult; courses: CourseResult[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-400">Estimated Aggregate</h2>
            <EstimatedTag />
          </div>
          <div className="text-4xl font-extrabold tabular-nums">{fmtPct(a.pct)}</div>
          <div className="text-xs text-slate-500">
            Credit-hour weighted · NED-style (rounded up): {a.pctCeil ?? "—"}%
          </div>
        </div>
        <StatusBadge status={a.status} />
      </div>

      {a.status.detail && <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">{a.status.detail}.</p>}

      {a.nedAggregate !== undefined && (
        <div
          className={`mb-3 rounded-lg px-3 py-2 text-sm ${
            a.nedMismatch
              ? "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
              : "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
          }`}
        >
          NED&apos;s own figure on the PDF: <b>{a.nedAggregate}%</b>
          {a.nedMismatch
            ? ` — this doesn't match our ${fmtPct(a.pct)} beyond rounding. Check your overrides and any edits.`
            : " — matches ours after rounding up."}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <KindPanel kind="th">
          <div className="mb-2 text-xs text-slate-600 dark:text-slate-400">~{a.remainingTh} classes left across all courses</div>
          <SkipPair noun="Classes" floor={a.missTh.floor.total} safe={a.missTh.safe.total} />
          <Plan miss={a.missTh.safe} courses={courses} noun="skips" />
        </KindPanel>
        {a.missPr && (
          <KindPanel kind="pr">
            <div className="mb-2 text-xs text-slate-600 dark:text-slate-400">~{a.remainingPr} labs left across all courses</div>
            <SkipPair noun="Labs" floor={a.missPr.floor.total} safe={a.missPr.safe.total} />
            <Plan miss={a.missPr.safe} courses={courses} noun="skips" />
          </KindPanel>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        <dt>Lowest course now</dt>
        <dd className="text-right tabular-nums">{fmtPct(a.minCourse)}</dd>
        <dt>If you attend everything</dt>
        <dd className="text-right tabular-nums">{fmtPct(a.bestCasePct)}</dd>
      </dl>
      <p className="mt-2 text-[11px] text-slate-500">
        75% here means aggregate ≥ 75% <i>and</i> every course ≥ 65% (full clearance). 65% means the aggregate floor only.
      </p>
    </section>
  );
}

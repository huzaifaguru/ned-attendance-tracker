import type { AggregateResult } from "@/lib/calc";
import { EstimatedTag, KindPanel, SkipCount, StatusBadge, fmtPct } from "./ui";

const OVERALL_RULE = "overall ≥ 75% & every subject ≥ 65%";

export function AggregateCard({ a }: { a: AggregateResult }) {
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
          <div className="mb-2 text-xs text-slate-600 dark:text-slate-400">~{a.remainingTh} classes left across all subjects</div>
          <SkipCount noun="Classes" n={a.missTh.total} rule={OVERALL_RULE} />
        </KindPanel>
        {a.missPr && (
          <KindPanel kind="pr">
            <div className="mb-2 text-xs text-slate-600 dark:text-slate-400">~{a.remainingPr} labs left across all subjects</div>
            <SkipCount noun="Labs" n={a.missPr.total} rule={OVERALL_RULE} />
          </KindPanel>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        <dt>Lowest subject now</dt>
        <dd className="text-right tabular-nums">{fmtPct(a.minCourse)}</dd>
        <dt>If you attend everything</dt>
        <dd className="text-right tabular-nums">{fmtPct(a.bestCasePct)}</dd>
      </dl>
      <p className="mt-2 text-[11px] text-slate-500">
        Rules: every subject ≥ 65%, and the overall aggregate ≥ 75%. The skip planner below shows which subjects to
        take these skips from.
      </p>
    </section>
  );
}

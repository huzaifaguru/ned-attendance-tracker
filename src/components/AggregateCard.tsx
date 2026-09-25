import { SEMESTER_WEEKS, type AggregateResult, type Timing } from "@/lib/calc";
import { EstimatedTag, KindLabel, Stat, StatusBadge, TONE_TEXT, fmtPct } from "./ui";

const skipValue = (n: number | null) => (n === null ? "✕" : n);
const skipHint = (n: number | null, noun: string, left: number) =>
  n === null
    ? "Can't reach 75% overall with every subject ≥ 65%, even attending everything"
    : `of ~${left} ${noun} left · overall stays ≥ 75%, every subject ≥ 65%`;

export function AggregateCard({ a, timing }: { a: AggregateResult; timing: Timing }) {
  return (
    <section aria-labelledby="overall" className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="overall" className="eyebrow">Overall aggregate</h2>
            <EstimatedTag />
          </div>
          <span className={`text-display font-extrabold tabular-nums ${TONE_TEXT[a.status.tone]}`}>{fmtPct(a.pct)}</span>
          <span className="text-small text-muted">
            NED-style (rounded up) {a.pctCeil ?? "—"}% · Week {timing.currentWeek} of {SEMESTER_WEEKS}
          </span>
        </div>
        <StatusBadge status={a.status} />
      </div>

      {a.status.detail && <p className="text-small">{a.status.detail}.</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat
          label={<KindLabel kind="th">Classes you can skip</KindLabel>}
          value={skipValue(a.missTh.total)}
          tone={a.missTh.total === null ? "danger" : undefined}
          hint={skipHint(a.missTh.total, "classes", a.remainingTh)}
        />
        {a.missPr && (
          <Stat
            label={<KindLabel kind="pr">Labs you can skip</KindLabel>}
            value={skipValue(a.missPr.total)}
            tone={a.missPr.total === null ? "danger" : undefined}
            hint={skipHint(a.missPr.total, "labs", a.remainingPr)}
          />
        )}
      </div>

      {a.nedAggregate !== undefined && (
        <p className={`text-small ${a.nedMismatch ? "text-danger" : "text-muted"}`}>
          The PDF says {a.nedAggregate}%
          {a.nedMismatch
            ? ` — that doesn't match ${fmtPct(a.pct)} beyond rounding. Check your overrides and edits.`
            : " — matches after rounding up."}{" "}
          Lowest subject now: {fmtPct(a.minCourse)}. Attend everything and you finish at {fmtPct(a.bestCasePct)}.
        </p>
      )}
    </section>
  );
}

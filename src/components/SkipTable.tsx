import type { AggregateMiss, AggregateResult, CourseResult } from "@/lib/calc";
import { courseStatus } from "@/lib/calc";
import { EstimatedTag, KindLabel, TONE_TEXT, fmtPct } from "./ui";

const unreachable = (
  <span className="text-danger" title="Can't reach this even attending everything">
    ✕<span className="sr-only"> not reachable</span>
  </span>
);

interface Row {
  key: string;
  label: string;
  now: number | null;
  held: number;
  total: number;
  left: number;
  /** max skips in this subject alone, staying ≥ 65% */
  max: number | null;
}

const th = "px-2 py-2 text-right font-semibold whitespace-nowrap";
const td = "px-2 py-2 text-right tabular-nums whitespace-nowrap";
const sticky = "sticky left-0 bg-raised";

function Table({
  kind, rows, overallNow, overall,
}: { kind: "th" | "pr"; rows: Row[]; overallNow: number | null; overall: AggregateMiss }) {
  const noun = kind === "th" ? "Classes" : "Labs";
  const planFor = (key: string) => (overall.total === null ? "—" : (overall.plan[key] ?? 0));
  const captionId = `skip-${kind}`;
  return (
    <div className="flex flex-col gap-2">
      <KindLabel kind={kind}>
        <span id={captionId}>{kind === "th" ? "Theory classes" : "Practical / lab sessions"}</span>
      </KindLabel>
      {/* Focusable so keyboard users can scroll it sideways on narrow screens. */}
      <div
        tabIndex={0}
        role="region"
        aria-labelledby={captionId}
        className="overflow-x-auto rounded-xs border border-line"
      >
        <table className="w-full border-collapse text-small">
          <thead className="bg-page text-caption text-muted">
            <tr className="border-b border-line">
              <th scope="col" className={`${th} ${sticky} bg-page text-left`}>Subject</th>
              <th scope="col" className={th}>Now</th>
              <th scope="col" className={th}>Held / total</th>
              <th scope="col" className={th}>{noun} left</th>
              <th scope="col" className={th}>
                Max skip<span className="block font-normal">subject ≥ 65%</span>
              </th>
              <th scope="col" className={`${th} text-ink`}>
                Skip plan<span className="block font-normal text-muted">overall ≥ 75%</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-line transition-colors duration-200 last:border-0 hover:bg-page">
                <th scope="row" className={`${sticky} max-w-40 truncate px-2 py-2 text-left font-semibold`}>{r.label}</th>
                <td className={`${td} font-semibold ${TONE_TEXT[courseStatus(r.now).tone]}`}>{fmtPct(r.now, 0)}</td>
                <td className={`${td} text-muted`}>{r.held} / {r.total}</td>
                <td className={td}>{r.left}</td>
                <td className={td}>{r.max === null ? unreachable : r.max}</td>
                <td className={`${td} text-body font-extrabold`}>{planFor(r.key)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink bg-page">
              <th scope="row" className={`${sticky} bg-page px-2 py-2 text-left font-extrabold`}>Overall</th>
              <td className={`${td} font-semibold`}>{fmtPct(overallNow, 0)}</td>
              <td className={`${td} text-muted`}>
                {rows.reduce((a, r) => a + r.held, 0)} / {rows.reduce((a, r) => a + r.total, 0)}
              </td>
              <td className={td}>{rows.reduce((a, r) => a + r.left, 0)}</td>
              <td className={td} />
              <td className={`${td} text-title font-extrabold`}>{overall.total === null ? unreachable : overall.total}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export function SkipTable({ courses, a }: { courses: CourseResult[]; a: AggregateResult }) {
  const thRows: Row[] = courses.map((r) => ({
    key: r.course.id, label: r.course.label, now: r.combinedPct,
    held: r.course.thHeld, total: r.totalTh, left: r.remainingTh, max: r.missTh,
  }));
  const prRows: Row[] = courses
    .filter((r) => r.hasLab)
    .map((r) => ({
      key: r.course.id, label: r.course.label, now: r.combinedPct,
      held: r.course.prHeld, total: r.totalPr, left: r.remainingPr, max: r.missPr,
    }));

  return (
    <section aria-labelledby="planner" className="card flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="planner" className="text-title font-bold">Skip planner</h2>
        <EstimatedTag />
      </div>
      <Table kind="th" rows={thRows} overallNow={a.pct} overall={a.missTh} />
      {a.missPr && prRows.length > 0 && <Table kind="pr" rows={prRows} overallNow={a.pct} overall={a.missPr} />}
      <dl className="grid gap-2 text-small text-muted sm:grid-cols-2">
        <div>
          <dt className="inline font-semibold text-ink">Max skip: </dt>
          <dd className="inline">the most you can miss in that subject alone and still finish at 65% or above.</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-ink">Skip plan: </dt>
          <dd className="inline">
            how to spread skips so the overall stays at 75% or above and every subject at 65% or above. Its total is
            the Overall row.
          </dd>
        </div>
      </dl>
    </section>
  );
}

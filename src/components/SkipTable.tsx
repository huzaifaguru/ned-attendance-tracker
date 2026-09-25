import type { AggregateMiss, AggregateResult, CourseResult, Tone } from "@/lib/calc";
import { courseStatus } from "@/lib/calc";
import { EstimatedTag, fmtPct } from "./ui";

const TONE_TEXT: Record<Tone, string> = {
  safe: "text-emerald-700 dark:text-emerald-400",
  risky: "text-amber-700 dark:text-amber-400",
  danger: "text-rose-700 dark:text-rose-400",
};

const unreachable = (
  <span className="text-rose-600 dark:text-rose-400" title="Can't reach this even attending everything">✕</span>
);

interface Row {
  key: string;
  label: string;
  now: number | null;
  left: number;
  /** max skips in this subject alone, staying ≥ 65% */
  max: number | null;
}

function Table({
  kind, rows, overallNow, overall,
}: { kind: "th" | "pr"; rows: Row[]; overallNow: number | null; overall: AggregateMiss }) {
  const isTh = kind === "th";
  const head = isTh
    ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200"
    : "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200";
  const td = "px-2 py-2 text-right tabular-nums";
  const planFor = (key: string) => (overall.total === null ? "—" : (overall.plan[key] ?? 0));
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-sm">
        <caption className={`px-3 py-2 text-left text-xs font-bold tracking-wide uppercase ${head}`}>
          {isTh ? "Theory — classes you can still skip" : "Practical / Lab — labs you can still skip"}
        </caption>
        <thead className="text-[11px] leading-tight text-slate-600 dark:text-slate-400">
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="px-2 py-1.5 text-left font-medium">Subject</th>
            <th className="px-2 py-1.5 text-right font-medium">Now</th>
            <th className="px-2 py-1.5 text-right font-medium">Left</th>
            <th className="px-2 py-1.5 text-right font-medium">
              Max skip<br />
              <span className="font-normal">subject ≥ 65%</span>
            </th>
            <th className="px-2 py-1.5 text-right font-medium text-emerald-700 dark:text-emerald-400">
              Skip plan<br />
              <span className="font-normal">overall ≥ 75%</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
              <td className="max-w-[9rem] truncate px-2 py-2 font-medium">{r.label}</td>
              <td className={`${td} ${TONE_TEXT[courseStatus(r.now).tone]}`}>{fmtPct(r.now, 0)}</td>
              <td className={td}>~{r.left}</td>
              <td className={td}>{r.max === null ? unreachable : r.max}</td>
              <td className={`${td} font-bold`}>{planFor(r.key)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
            <td className="px-2 py-2 font-bold">Overall</td>
            <td className={`${td} font-semibold`}>{fmtPct(overallNow, 0)}</td>
            <td className={td}>~{rows.reduce((a, r) => a + r.left, 0)}</td>
            <td className={td}></td>
            <td className={`${td} text-base font-extrabold`}>{overall.total === null ? unreachable : overall.total}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function SkipTable({ courses, a }: { courses: CourseResult[]; a: AggregateResult }) {
  const thRows: Row[] = courses.map((r) => ({
    key: r.course.id, label: r.course.label, now: r.combinedPct, left: r.remainingTh, max: r.missTh,
  }));
  const prRows: Row[] = courses
    .filter((r) => r.hasLab && r.course.prHeld > 0)
    .map((r) => ({ key: r.course.id, label: r.course.label, now: r.combinedPct, left: r.remainingPr, max: r.missPr }));

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <h2 className="font-bold">Skip planner</h2>
        <EstimatedTag />
      </div>
      <Table kind="th" rows={thRows} overallNow={a.pct} overall={a.missTh} />
      {a.missPr && prRows.length > 0 && <Table kind="pr" rows={prRows} overallNow={a.pct} overall={a.missPr} />}
      <p className="text-[11px] leading-relaxed text-slate-500">
        <b>Max skip</b>: the most you can miss in that subject alone and still stay at 65% or above.{" "}
        <b>Skip plan</b>: how to spread your skips so the overall aggregate stays at 75% or above and every
        subject stays at 65% or above. Its total is the Overall row. Both assume you attend every other class
        {prRows.length > 0 && " and lab"}. ✕ = not reachable even if you attend everything.
      </p>
    </section>
  );
}

import type { AggregateResult, CourseResult, MissAllowance, Tone } from "@/lib/calc";
import { courseStatus } from "@/lib/calc";
import { EstimatedTag, fmtPct } from "./ui";

const TONE_TEXT: Record<Tone, string> = {
  safe: "text-emerald-700 dark:text-emerald-400",
  risky: "text-amber-700 dark:text-amber-400",
  danger: "text-rose-700 dark:text-rose-400",
};

const skipCell = (n: number | null) =>
  n === null ? <span className="text-rose-600 dark:text-rose-400" title="Can't reach this even attending everything">✕</span> : n;

interface Row {
  key: string;
  label: string;
  now: number | null;
  left: number;
  miss: MissAllowance;
}

function Table({
  kind, rows, overall,
}: { kind: "th" | "pr"; rows: Row[]; overall: Row }) {
  const isTh = kind === "th";
  const head = isTh
    ? "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200"
    : "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200";
  const td = "px-2 py-2 text-right tabular-nums";
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full text-sm">
        <caption className={`px-3 py-2 text-left text-xs font-bold tracking-wide uppercase ${head}`}>
          {isTh ? "Theory — classes you can still skip" : "Practical / Lab — labs you can still skip"}
        </caption>
        <thead className="text-[11px] text-slate-600 dark:text-slate-400">
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="px-2 py-1.5 text-left font-medium">Course</th>
            <th className="px-2 py-1.5 text-right font-medium">Now*</th>
            <th className="px-2 py-1.5 text-right font-medium">{isTh ? "Classes" : "Labs"} left</th>
            <th className="px-2 py-1.5 text-right font-medium text-emerald-700 dark:text-emerald-400">Skip → 75%</th>
            <th className="px-2 py-1.5 text-right font-medium text-amber-700 dark:text-amber-400">Skip → 65%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
              <td className="max-w-[9rem] truncate px-2 py-2 font-medium">{r.label}</td>
              <td className={`${td} ${TONE_TEXT[courseStatus(r.now).tone]}`}>{fmtPct(r.now, 0)}</td>
              <td className={td}>~{r.left}</td>
              <td className={`${td} font-bold`}>{skipCell(r.miss.safe)}</td>
              <td className={`${td} font-bold`}>{skipCell(r.miss.floor)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60">
            <td className="px-2 py-2 font-bold">Overall</td>
            <td className={`${td} font-semibold`}>{fmtPct(overall.now, 0)}</td>
            <td className={td}>~{overall.left}</td>
            <td className={`${td} text-base font-extrabold`}>{skipCell(overall.miss.safe)}</td>
            <td className={`${td} text-base font-extrabold`}>{skipCell(overall.miss.floor)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function SkipTable({ courses, a }: { courses: CourseResult[]; a: AggregateResult }) {
  const thRows: Row[] = courses.map((r) => ({
    key: r.course.id, label: r.course.label, now: r.combinedPct, left: r.remainingTh, miss: r.missTh,
  }));
  const labCourses = courses.filter((r) => r.hasLab && r.missPr && r.course.prHeld > 0);
  const prRows: Row[] = labCourses.map((r) => ({
    key: r.course.id, label: r.course.label, now: r.combinedPct, left: r.remainingPr, miss: r.missPr!,
  }));

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <h2 className="font-bold">Skip planner</h2>
        <EstimatedTag />
      </div>
      <Table
        kind="th"
        rows={thRows}
        overall={{
          key: "overall", label: "Overall", now: a.pct, left: a.remainingTh,
          miss: { safe: a.missTh.safe.total, floor: a.missTh.floor.total },
        }}
      />
      {a.missPr && prRows.length > 0 && (
        <Table
          kind="pr"
          rows={prRows}
          overall={{
            key: "overall", label: "Overall", now: a.pct, left: a.remainingPr,
            miss: { safe: a.missPr.safe.total, floor: a.missPr.floor.total },
          }}
        />
      )}
      <p className="text-[11px] leading-relaxed text-slate-500">
        *Now = estimated combined % (Overall = aggregate). Course rows count skips in that course alone, keeping
        that course at 75% or 65%. The Overall row is the total you can skip across all courses while the
        aggregate stays at 75% (with every course ≥ 65%) or 65%. You can&apos;t take every course&apos;s maximum at
        once, and the Overall figure is usually lower than their sum. ✕ = not reachable even if you attend everything.
      </p>
    </section>
  );
}

import type { ReactNode } from "react";
import type { Status, Tone } from "@/lib/calc";

export const fmtPct = (p: number | null | undefined, digits = 1) =>
  p === null || p === undefined ? "—" : `${p.toFixed(digits)}%`;

const TONE: Record<Tone, string> = {
  safe: "bg-emerald-100 text-emerald-800 ring-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800",
  risky: "bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800",
  danger: "bg-rose-100 text-rose-800 ring-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-800",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${TONE[status.tone]}`}>
      {status.label}
    </span>
  );
}

export function EstimatedTag() {
  return (
    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-slate-700 uppercase dark:bg-slate-700 dark:text-slate-200">
      Estimated
    </span>
  );
}

/** Theory / Lab panels share a shape but keep distinct colours everywhere. */
export function KindPanel({ kind, children }: { kind: "th" | "pr"; children: ReactNode }) {
  const cls =
    kind === "th"
      ? "border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/40"
      : "border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/40";
  const title = kind === "th" ? "Theory" : "Practical / Lab";
  const titleCls = kind === "th" ? "text-sky-800 dark:text-sky-300" : "text-violet-800 dark:text-violet-300";
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <div className={`mb-1 text-xs font-bold tracking-wide uppercase ${titleCls}`}>{title}</div>
      {children}
    </div>
  );
}

/** "Can still skip" count against a single target. */
export function SkipCount({
  noun, n, rule,
}: { noun: string; n: number | null; rule: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-white/70 px-3 py-2 dark:bg-black/20">
      <div
        className={`min-w-[2.5ch] text-center text-3xl leading-none font-extrabold tabular-nums ${
          n === null ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
        }`}
      >
        {n === null ? "✕" : n}
      </div>
      <div className="text-xs leading-snug text-slate-700 dark:text-slate-300">
        {n === null ? (
          <>Can&apos;t reach {rule} even attending everything</>
        ) : (
          <><b>{noun}</b> you can still skip<br /><span className="text-slate-500">while {rule}</span></>
        )}
      </div>
    </div>
  );
}

export function Field({
  label, children, hint,
}: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
      {label}
      {children}
      {hint && <span className="font-normal text-slate-500">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-base text-slate-900 focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:outline-none dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-sky-900";

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

/** "Can still skip" pair: floor (65%) and safe (75%). */
export function SkipPair({
  noun, floor, safe,
}: { noun: string; floor: number | null; safe: number | null }) {
  const cell = (n: number | null, target: string, tone: string) => (
    <div className="flex-1 rounded-lg bg-white/70 px-2 py-1.5 text-center dark:bg-black/20">
      <div className={`text-2xl leading-tight font-bold tabular-nums ${n === null ? "text-rose-600 dark:text-rose-400" : tone}`}>
        {n === null ? "✕" : n}
      </div>
      <div className="text-[11px] text-slate-600 dark:text-slate-400">
        {n === null ? `can't reach ${target}` : `to stay ≥ ${target}`}
      </div>
    </div>
  );
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-slate-700 dark:text-slate-300">{noun} you can still skip</div>
      <div className="flex gap-2">
        {cell(safe, "75%", "text-emerald-700 dark:text-emerald-400")}
        {cell(floor, "65%", "text-amber-700 dark:text-amber-400")}
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

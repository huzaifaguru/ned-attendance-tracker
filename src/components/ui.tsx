import type { ReactNode } from "react";
import type { Status, Tone } from "@/lib/calc";

export const fmtPct = (p: number | null | undefined, digits = 1) =>
  p === null || p === undefined ? "—" : `${p.toFixed(digits)}%`;

export const TONE_TEXT: Record<Tone, string> = {
  safe: "text-safe",
  risky: "text-risky",
  danger: "text-danger",
};

const TONE_BADGE: Record<Tone, string> = {
  safe: "bg-safe-soft text-safe",
  risky: "bg-risky-soft text-risky",
  danger: "bg-danger-soft text-danger",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex min-h-6 items-center rounded-xs px-2 text-caption font-semibold ${TONE_BADGE[status.tone]}`}>
      {status.label}
    </span>
  );
}

export function EstimatedTag() {
  return (
    <span className="inline-flex min-h-6 items-center rounded-xs border border-line px-2 text-caption font-semibold text-muted">
      Estimated
    </span>
  );
}

/** Theory vs lab marker, used everywhere the two are shown side by side. */
export function KindLabel({ kind, children }: { kind: "th" | "pr"; children?: ReactNode }) {
  const color = kind === "th" ? "bg-theory" : "bg-lab";
  const text = kind === "th" ? "text-theory" : "text-lab";
  return (
    <span className={`inline-flex items-center gap-2 text-caption font-bold tracking-wide uppercase ${text}`}>
      <span aria-hidden className={`size-2 rounded-full ${color}`} />
      {children ?? (kind === "th" ? "Theory" : "Practical / Lab")}
    </span>
  );
}

export function Stat({
  label, value, hint, tone,
}: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: Tone }) {
  return (
    <div className="flex flex-col gap-2 rounded-xs border border-line bg-raised p-4">
      <span className="eyebrow">{label}</span>
      <span className={`text-display font-extrabold tabular-nums ${tone ? TONE_TEXT[tone] : ""}`}>{value}</span>
      {hint && <span className="text-small text-muted">{hint}</span>}
    </div>
  );
}

type NoticeKind = "info" | "warning" | "error";
const NOTICE: Record<NoticeKind, string> = {
  info: "border-line border-l-line-strong",
  warning: "border-line border-l-risky",
  error: "border-line border-l-danger",
};

export function Notice({ kind = "info", children }: { kind?: NoticeKind; children: ReactNode }) {
  return (
    <div
      role={kind === "error" ? "alert" : undefined}
      className={`rounded-xs border border-l-4 bg-raised p-4 text-small text-ink ${NOTICE[kind]}`}
    >
      {children}
    </div>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
    />
  );
}

export function Field({
  label, children, hint,
}: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-2 text-small font-medium text-ink">
      {label}
      {children}
      {hint && <span className="text-caption font-normal text-muted">{hint}</span>}
    </label>
  );
}

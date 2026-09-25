"use client";

import { useState } from "react";
import { nedRound, type CourseResult } from "@/lib/calc";
import type { Course } from "@/lib/types";
import { CourseEditor } from "./CourseEditor";
import { EstimatedTag, KindPanel, SkipCount, StatusBadge, fmtPct } from "./ui";

function KindStats({
  pct, present, held, pace, remaining, noun,
}: { pct: number | null; present: number; held: number; pace: number; remaining: number; noun: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <div>
        <span className="text-xl font-bold tabular-nums">{fmtPct(pct)}</span>{" "}
        <span className="text-sm text-slate-600 tabular-nums dark:text-slate-400">({present}/{held})</span>
      </div>
      <div className="text-right text-[11px] leading-tight text-slate-600 dark:text-slate-400">
        {Number.isInteger(pace) ? pace : pace.toFixed(1)}/wk
        <br />~{remaining} {noun} left
      </div>
    </div>
  );
}

export function CourseCard({
  r, onChange, onDelete,
}: { r: CourseResult; onChange: (c: Course) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const c = r.course;

  if (editing) {
    return (
      <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <CourseEditor
          initial={c}
          submitLabel="Save"
          onCancel={() => setEditing(false)}
          onSave={(next) => { onChange(next); setEditing(false); }}
        />
        <button
          type="button"
          onClick={onDelete}
          className="mt-3 w-full rounded-lg py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950"
        >
          Remove course
        </button>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-bold">{c.label}</h3>
          <div className="text-xs text-slate-500">
            {c.thCredit} Th + {c.prCredit} Pr
            {r.weightIsContact && ` · weighted by ~${r.weight.toFixed(1)} contact hrs/wk`}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge status={r.status} />
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-medium text-sky-700 underline dark:text-sky-400">
            Edit / override
          </button>
        </div>
      </header>

      <div className="mb-3 rounded-xl border-2 border-dashed border-slate-300 px-3 py-2 dark:border-slate-700">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {r.overridden ? "Combined (your override)" : "Estimated Combined"}
          </span>
          {r.overridden ? (
            <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 uppercase">Manual</span>
          ) : (
            <EstimatedTag />
          )}
        </div>
        <div className="text-3xl font-extrabold tabular-nums">{fmtPct(r.combinedPct)}</div>
        <div className="text-xs text-slate-500">
          {r.overridden && <>Calculated {fmtPct(r.calculatedPct)} · </>}
          {!r.overridden && r.combinedPct !== null && <>NED-style {nedRound(r.combinedPct)}% · </>}
          {c.reportedPct !== undefined && <>PDF shows {c.reportedPct}% · </>}
          Attend everything → {fmtPct(r.bestCasePct)}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <KindPanel kind="th">
          <KindStats pct={r.thPct} present={c.thPresent} held={c.thHeld} pace={r.thPerWeek} remaining={r.remainingTh} noun="classes" />
          <SkipCount noun="Classes" n={r.missTh} rule="this subject ≥ 65%" />
        </KindPanel>
        {r.hasLab && (
          <KindPanel kind="pr">
            <KindStats pct={r.prPct} present={c.prPresent} held={c.prHeld} pace={r.prPerWeek} remaining={r.remainingPr} noun="labs" />
            <SkipCount noun="Labs" n={r.missPr} rule="this subject ≥ 65%" />
          </KindPanel>
        )}
      </div>
      {r.hasLab && (
        <p className="mt-2 text-[11px] text-slate-500">
          Class skips assume you attend every remaining lab, and lab skips assume you attend every remaining class.
        </p>
      )}
    </article>
  );
}

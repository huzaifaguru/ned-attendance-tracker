"use client";

import { useState } from "react";
import { nedRound, type CourseResult } from "@/lib/calc";
import type { Course } from "@/lib/types";
import { CourseEditor } from "./CourseEditor";
import { EstimatedTag, KindLabel, StatusBadge, TONE_TEXT, fmtPct } from "./ui";

function KindBlock({
  kind, pct, present, held, total, left, skip,
}: {
  kind: "th" | "pr";
  pct: number | null;
  present: number;
  held: number;
  total: number;
  left: number;
  skip: number | null;
}) {
  const noun = kind === "th" ? "classes" : "labs";
  const border = kind === "th" ? "border-l-theory" : "border-l-lab";
  return (
    <div className={`flex flex-col gap-2 border-l-4 ${border} pl-4`}>
      <KindLabel kind={kind} />
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-title font-bold tabular-nums">{fmtPct(pct)}</span>
        <span className="text-small text-muted tabular-nums">
          {present}/{held} · {left} of {total} left
        </span>
      </div>
      <p className="text-small">
        {skip === null ? (
          <span className="font-semibold text-danger">Can&apos;t reach 65% even attending every remaining {noun.slice(0, -1)}</span>
        ) : (
          <>
            <b className="text-body font-extrabold tabular-nums">{skip}</b> {noun} you can skip{" "}
            <span className="text-muted">(stays ≥ 65%)</span>
          </>
        )}
      </p>
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
      <article aria-label={`Edit ${c.label}`} className="card flex flex-col gap-4">
        <h3 className="text-body font-bold">Edit {c.label}</h3>
        <CourseEditor
          initial={c}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSave={(next) => { onChange(next); setEditing(false); }}
        />
        <button type="button" onClick={onDelete} className="btn btn-danger">
          Remove {c.label}
        </button>
      </article>
    );
  }

  return (
    <article aria-labelledby={`c-${c.id}`} className="card flex flex-col gap-4">
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <h3 id={`c-${c.id}`} className="truncate text-body font-bold">{c.label}</h3>
          <span className="text-caption text-muted">
            {c.thCredit} Th + {c.prCredit} Pr
            {r.weightIsContact && ` · weighted by ~${r.weight.toFixed(1)} contact hrs/wk`}
          </span>
        </div>
        <StatusBadge status={r.status} />
      </header>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">{r.overridden ? "Combined — your override" : "Estimated combined"}</span>
          {!r.overridden && <EstimatedTag />}
        </div>
        <span className={`text-display font-extrabold tabular-nums ${TONE_TEXT[r.status.tone]}`}>{fmtPct(r.combinedPct)}</span>
        <span className="text-caption text-muted">
          {r.overridden ? <>Calculated {fmtPct(r.calculatedPct)}</> : r.combinedPct !== null && <>NED-style {nedRound(r.combinedPct)}%</>}
          {c.reportedPct !== undefined && <> · PDF shows {c.reportedPct}%</>}
          {" · "}Attend everything → {fmtPct(r.bestCasePct)}
        </span>
      </div>

      <KindBlock
        kind="th" pct={r.thPct} present={c.thPresent} held={c.thHeld}
        total={r.totalTh} left={r.remainingTh} skip={r.missTh}
      />
      {r.hasLab && (
        <KindBlock
          kind="pr" pct={r.prPct} present={c.prPresent} held={c.prHeld}
          total={r.totalPr} left={r.remainingPr} skip={r.missPr}
        />
      )}
      {r.hasLab && (
        <p className="text-caption text-muted">
          Class skips assume you attend every remaining lab, and lab skips assume you attend every remaining class.
        </p>
      )}

      <button type="button" onClick={() => setEditing(true)} className="btn btn-secondary">
        Edit {c.label} or override its %
      </button>
    </article>
  );
}

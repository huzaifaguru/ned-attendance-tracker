"use client";

import { useState } from "react";
import type { Course } from "@/lib/types";
import { Field, KindLabel } from "./ui";

const toNum = (s: string) => (s.trim() === "" ? 0 : Math.max(0, Number(s) || 0));

export function CourseEditor({
  initial, onSave, onCancel, submitLabel,
}: {
  initial: Course;
  onSave: (c: Course) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [c, setC] = useState(initial);
  const set = (patch: Partial<Course>) => setC((prev) => ({ ...prev, ...patch }));

  const thError = c.thPresent > c.thHeld ? "Attended can't exceed held." : undefined;
  const prError = c.prPresent > c.prHeld ? "Attended can't exceed held." : undefined;
  const labelError = c.label.trim() ? undefined : "Enter a subject name.";
  const invalid = Boolean(thError || prError || labelError);

  const num = (key: keyof Course, error?: string) => ({
    type: "number",
    inputMode: "numeric" as const,
    min: 0,
    className: "input",
    "aria-invalid": error ? true : undefined,
    value: String(c[key] ?? 0),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set({ [key]: toNum(e.target.value) }),
  });

  const group = (kind: "th" | "pr", error?: string) => (
    <fieldset className={`flex flex-col gap-2 border-l-4 pl-4 ${kind === "th" ? "border-l-theory" : "border-l-lab"}`}>
      <legend className="mb-2"><KindLabel kind={kind} /></legend>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Credit hrs"><input {...num(kind === "th" ? "thCredit" : "prCredit")} /></Field>
        <Field label="Held"><input {...num(kind === "th" ? "thHeld" : "prHeld", error)} /></Field>
        <Field label="Attended"><input {...num(kind === "th" ? "thPresent" : "prPresent", error)} /></Field>
      </div>
      {error && <p role="alert" className="text-small text-danger">{error}</p>}
    </fieldset>
  );

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (invalid) return;
        const label = c.label.trim();
        onSave({ ...c, label, code: label.replace(/\(\s*Opt\s*\)/i, "").trim() });
      }}
    >
      <Field label="Subject">
        <input className="input" value={c.label} aria-invalid={labelError ? true : undefined} onChange={(e) => set({ label: e.target.value })} />
      </Field>
      {labelError && <p role="alert" className="text-small text-danger">{labelError}</p>}

      {group("th", thError)}
      {group("pr", prError)}

      <Field
        label="Combined % override (optional)"
        hint="Use this if the portal shows a different combined % for this subject. Leave blank to calculate."
      >
        <input
          className="input"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          max={100}
          placeholder="Calculated"
          value={c.overridePct ?? ""}
          onChange={(e) =>
            set({ overridePct: e.target.value === "" ? undefined : Math.min(100, Math.max(0, Number(e.target.value))) })
          }
        />
      </Field>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="submit" disabled={invalid} className="btn btn-primary flex-1">{submitLabel}</button>
        <button type="button" onClick={onCancel} className="btn btn-quiet">Cancel</button>
      </div>
    </form>
  );
}

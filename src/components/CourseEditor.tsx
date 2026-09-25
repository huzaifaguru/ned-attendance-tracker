"use client";

import { useState } from "react";
import type { Course } from "@/lib/types";
import { Field, inputCls } from "./ui";

const toNum = (s: string) => (s.trim() === "" ? 0 : Math.max(0, Number(s) || 0));

export function blankCourse(): Course {
  return {
    id: `m-${Date.now().toString(36)}`,
    label: "",
    code: "",
    thCredit: 3,
    prCredit: 0,
    thPresent: 0,
    thHeld: 0,
    prPresent: 0,
    prHeld: 0,
  };
}

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
  const num = (key: keyof Course) => ({
    type: "number",
    inputMode: "numeric" as const,
    min: 0,
    className: inputCls,
    value: String(c[key] ?? 0),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set({ [key]: toNum(e.target.value) }),
  });

  const errors: string[] = [];
  if (!c.label.trim()) errors.push("Give the course a name.");
  if (c.thPresent > c.thHeld) errors.push("Theory attended can't exceed held.");
  if (c.prPresent > c.prHeld) errors.push("Lab attended can't exceed held.");

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (errors.length) return;
        const label = c.label.trim();
        onSave({ ...c, label, code: label.replace(/\(\s*Opt\s*\)/i, "").trim() });
      }}
    >
      <Field label="Course name / code">
        <input className={inputCls} value={c.label} placeholder="e.g. CT-351" onChange={(e) => set({ label: e.target.value })} />
      </Field>

      <fieldset className="rounded-xl border border-sky-200 p-3 dark:border-sky-900">
        <legend className="px-1 text-xs font-bold text-sky-800 uppercase dark:text-sky-300">Theory</legend>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Credit hrs"><input {...num("thCredit")} /></Field>
          <Field label="Held"><input {...num("thHeld")} /></Field>
          <Field label="Attended"><input {...num("thPresent")} /></Field>
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-violet-200 p-3 dark:border-violet-900">
        <legend className="px-1 text-xs font-bold text-violet-800 uppercase dark:text-violet-300">Practical / Lab</legend>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Credit hrs"><input {...num("prCredit")} /></Field>
          <Field label="Held"><input {...num("prHeld")} /></Field>
          <Field label="Attended"><input {...num("prPresent")} /></Field>
        </div>
      </fieldset>

      <Field
        label="Manual combined % override (optional)"
        hint="If your portal shows a different combined % than the calculated one, enter it here. Leave blank to calculate."
      >
        <input
          className={inputCls}
          type="number"
          inputMode="decimal"
          step="0.01"
          min={0}
          max={100}
          placeholder="calculated"
          value={c.overridePct ?? ""}
          onChange={(e) =>
            set({ overridePct: e.target.value === "" ? undefined : Math.min(100, Math.max(0, Number(e.target.value))) })
          }
        />
      </Field>

      {errors.length > 0 && (
        <ul className="text-sm text-rose-600 dark:text-rose-400">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={errors.length > 0}
          className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white disabled:opacity-40 dark:bg-slate-100 dark:text-slate-900"
        >
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2.5 font-medium text-slate-600 dark:text-slate-300">
          Cancel
        </button>
      </div>
    </form>
  );
}

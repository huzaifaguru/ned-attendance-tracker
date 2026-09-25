"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { analyse, SEMESTER_WEEKS } from "@/lib/calc";
import { formatIso, todayIso } from "@/lib/dates";
import { extractItemsInBrowser } from "@/lib/pdfExtract";
import { parseReport } from "@/lib/pdfParse";
import type { AppState, Course } from "@/lib/types";
import { AggregateCard } from "./AggregateCard";
import { CourseCard } from "./CourseCard";
import { CourseEditor, blankCourse } from "./CourseEditor";
import { SkipTable } from "./SkipTable";
import { Field, inputCls } from "./ui";

const STORAGE_KEY = "ned-attendance-tracker:v1";

function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppState) : null;
  } catch {
    return null;
  }
}

function saveState(s: AppState | null) {
  try {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable (private mode etc.) — the app still works for this visit
  }
}

function EstimateNote() {
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
      <b>These are estimates.</b> NED now merges practical attendance into the aggregate requirement but
      hasn&apos;t published the formula. The combined % here weights theory and practical by their credit hours
      (e.g. 3 Th + 1 Pr → theory counts 3×, lab 1×), rounded up like NED. That reproduces the course %s and the
      aggregate on real reports, but it isn&apos;t official. Projections of remaining classes are estimates too.
      If your portal shows something different for a course, use its <i>Edit / override</i>.
    </div>
  );
}

function Start({ onPdf, onManual, busy }: { onPdf: (f: File) => void; onManual: () => void; busy: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50 px-4 py-8 text-center hover:bg-sky-100 disabled:opacity-60 dark:border-sky-800 dark:bg-sky-950/40 dark:hover:bg-sky-950"
      >
        <div className="text-lg font-bold text-sky-900 dark:text-sky-200">{busy ? "Reading PDF…" : "Upload attendance PDF"}</div>
        <div className="mt-1 text-sm text-sky-800/80 dark:text-sky-300/80">
          The &ldquo;Course-Wise Attendance Analysis&rdquo; report from the NED portal
        </div>
      </button>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPdf(f);
          e.target.value = "";
        }}
      />
      <button type="button" onClick={onManual} className="rounded-xl py-3 text-sm font-medium text-slate-600 underline dark:text-slate-300">
        No PDF? Enter courses manually
      </button>
      <p className="text-center text-xs text-slate-500">
        Everything runs in your browser. The PDF is never uploaded anywhere.
      </p>
    </div>
  );
}

export function Tracker() {
  const [state, setState] = useState<AppState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from localStorage after mount
    setState(loadState());
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) saveState(state);
  }, [state, loaded]);

  const result = useMemo(() => (state?.startDate && state.asOfDate ? analyse(state) : null), [state]);
  const update = (patch: Partial<AppState>) => setState((s) => (s ? { ...s, ...patch } : s));
  const setCourses = (fn: (cs: Course[]) => Course[]) => setState((s) => (s ? { ...s, courses: fn(s.courses) } : s));

  async function handlePdf(file: File) {
    setBusy(true);
    setError(null);
    try {
      const report = parseReport(await extractItemsInBrowser(file));
      if (!report.courses.length) {
        setError("Couldn't find any courses in that PDF. Is it the Course-Wise Attendance report? You can enter courses manually instead.");
        setWarnings(report.warnings);
        return;
      }
      const today = todayIso();
      setWarnings(report.warnings);
      setState({
        source: "pdf",
        meta: report.meta,
        startDate: report.meta.fromDate ?? today,
        asOfDate: report.meta.generatedOn ?? report.meta.toDate ?? today,
        courses: report.courses,
        nedAggregate: report.nedAggregate,
      });
    } catch (e) {
      setError(`Couldn't read that PDF (${e instanceof Error ? e.message : String(e)}).`);
    } finally {
      setBusy(false);
    }
  }

  function startManual() {
    const today = todayIso();
    setWarnings([]);
    setError(null);
    setState({ source: "manual", meta: {}, startDate: today, asOfDate: today, courses: [] });
    setAdding(true);
  }

  if (!loaded) return null;

  if (!state) {
    return (
      <>
        <Start onPdf={handlePdf} onManual={startManual} busy={busy} />
        {error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-300">{error}</p>}
      </>
    );
  }

  const { meta } = state;
  const stale = state.source === "pdf" && state.asOfDate < todayIso();
  const currentWeek = result ? Math.min(SEMESTER_WEEKS, Math.ceil(result.timing.calendarWeeks)) : null;

  return (
    <div className="flex flex-col gap-4">
      {state.source === "pdf" && (
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {meta.studentName && <b className="text-slate-900 dark:text-slate-100">{meta.studentName}</b>}
          {meta.rollNo && <> · {meta.rollNo}</>}
          {meta.section && <> · {meta.section}</>}
          {meta.academicYear && <> · {meta.academicYear}</>}
          <div className="text-xs">{meta.discipline}{meta.session && ` · ${meta.session}`}</div>
        </div>
      )}

      {warnings.length > 0 && (
        <ul className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
          {warnings.map((w) => <li key={w}>⚠ {w}</li>)}
        </ul>
      )}

      {stale && (
        <p className="rounded-xl bg-sky-50 p-3 text-xs text-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
          These counts are from the report generated {formatIso(state.asOfDate)}. Upload a fresh PDF for up-to-date numbers.
        </p>
      )}

      {result && state.courses.length > 0 && (
        <>
          <AggregateCard a={result.aggregate} courses={result.courses} />
          <SkipTable courses={result.courses} a={result.aggregate} />
        </>
      )}

      <EstimateNote />

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Semester start">
            <input type="date" className={inputCls} value={state.startDate} onChange={(e) => update({ startDate: e.target.value })} />
          </Field>
          <Field label="Counts as of">
            <input type="date" className={inputCls} value={state.asOfDate} onChange={(e) => update({ asOfDate: e.target.value })} />
          </Field>
        </div>
        {result && (
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Week {currentWeek} of {SEMESTER_WEEKS} · {result.timing.teachingWeeksElapsed.toFixed(1)} teaching weeks done,{" "}
            ~{result.timing.teachingWeeksRemaining.toFixed(1)} left (week 8 mid-terms and week 16 finals have no lectures).
            Each course&apos;s remaining classes are projected from its own pace so far.
          </p>
        )}
      </section>

      <h2 className="mt-2 text-sm font-bold tracking-wide text-slate-500 uppercase">Courses</h2>
      {result?.courses.map((r) => (
        <CourseCard
          key={r.course.id}
          r={r}
          onChange={(c) => setCourses((cs) => cs.map((x) => (x.id === c.id ? c : x)))}
          onDelete={() => setCourses((cs) => cs.filter((x) => x.id !== r.course.id))}
        />
      ))}

      {adding ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 font-bold">Add course</h3>
          <CourseEditor
            initial={blankCourse()}
            submitLabel="Add course"
            onCancel={() => setAdding(false)}
            onSave={(c) => { setCourses((cs) => [...cs, c]); setAdding(false); }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
        >
          + Add a course manually
        </button>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
        <label className="cursor-pointer rounded-xl bg-slate-100 py-3 text-center text-sm font-medium dark:bg-slate-800">
          {busy ? "Reading PDF…" : "Upload a newer PDF"}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handlePdf(f);
              e.target.value = "";
            }}
          />
        </label>
        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950 dark:text-rose-300">{error}</p>}
        <button
          type="button"
          onClick={() => { setState(null); setWarnings([]); setAdding(false); }}
          className="py-2 text-xs text-slate-500 underline"
        >
          Clear all data from this browser
        </button>
      </div>
    </div>
  );
}

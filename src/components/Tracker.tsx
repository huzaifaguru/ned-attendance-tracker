"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { analyse, SEMESTER_WEEKS } from "@/lib/calc";
import { formatIso, todayIso } from "@/lib/dates";
import { extractItemsInBrowser } from "@/lib/pdfExtract";
import { parseReport } from "@/lib/pdfParse";
import type { AppState, Course } from "@/lib/types";
import { AggregateCard } from "./AggregateCard";
import { CourseCard } from "./CourseCard";
import { SkipTable } from "./SkipTable";
import { Field, Notice, Spinner } from "./ui";

const STORAGE_KEY = "ned-attendance-tracker:v1";

function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as AppState & { source?: string };
    // Manual entry was removed; states created that way have no report behind them.
    return s.source === "manual" ? null : s;
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

/** A real button that opens a hidden file picker, so it works with keyboard, pointer and touch. */
function UploadButton({
  onFile, busy, variant, label,
}: { onFile: (f: File) => void; busy: boolean; variant: "primary" | "secondary"; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        disabled={busy}
        aria-busy={busy}
        onClick={() => input.current?.click()}
        className={`btn ${variant === "primary" ? "btn-primary" : "btn-secondary"} w-full sm:w-auto`}
      >
        {busy && <Spinner />}
        {busy ? "Reading PDF…" : label}
      </button>
      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

function EmptyState({ onFile, busy, error }: { onFile: (f: File) => void; busy: boolean; error: string | null }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-display font-extrabold tracking-tight">How many classes can you still skip?</h1>
        <p className="text-body text-muted">
          Upload your Course-Wise Attendance report from the NED portal. You&apos;ll get, for every subject, how many
          classes and labs you can miss while staying at 65%, and how many overall while keeping 75%.
        </p>
      </div>
      <div className="flex flex-col items-center gap-4 rounded-xs border border-dashed border-line-strong bg-raised px-4 py-8 text-center">
        <UploadButton onFile={onFile} busy={busy} variant="primary" label="Upload attendance PDF" />
        <p className="text-small text-muted">PDF only. Read in your browser, never uploaded anywhere.</p>
      </div>
      {error && <Notice kind="error">{error}</Notice>}
    </div>
  );
}

export function Tracker() {
  const [state, setState] = useState<AppState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

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
        setError("Couldn't find any subjects in that PDF. Is it the Course-Wise Attendance report from the NED portal?");
        setWarnings(report.warnings);
        return;
      }
      const today = todayIso();
      setWarnings(report.warnings);
      setState({
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

  if (!loaded) return <div aria-busy className="min-h-64" />;
  if (!state) return <EmptyState onFile={handlePdf} busy={busy} error={error} />;

  const { meta } = state;
  const stale = state.asOfDate < todayIso();

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <span className="eyebrow">Report generated {formatIso(state.asOfDate)}</span>
        <h1 className="text-title font-extrabold tracking-tight">{meta.studentName ?? "Your attendance"}</h1>
        <p className="text-small text-muted">
          {[meta.rollNo, meta.section, meta.academicYear, meta.discipline, meta.session].filter(Boolean).join(" · ")}
        </p>
      </section>

      {warnings.length > 0 && (
        <Notice kind="warning">
          <ul className="flex flex-col gap-2">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </Notice>
      )}
      {stale && (
        <Notice>
          These counts are from the report generated {formatIso(state.asOfDate)}. Upload a fresh PDF for up-to-date
          numbers.
        </Notice>
      )}

      {result && state.courses.length > 0 && (
        <>
          <AggregateCard a={result.aggregate} timing={result.timing} />
          <SkipTable courses={result.courses} a={result.aggregate} />

          <section aria-labelledby="subjects" className="flex flex-col gap-4">
            <h2 id="subjects" className="text-title font-bold">Subjects</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {result.courses.map((r) => (
                <CourseCard
                  key={r.course.id}
                  r={r}
                  onChange={(c) => setCourses((cs) => cs.map((x) => (x.id === c.id ? c : x)))}
                  onDelete={() => setCourses((cs) => cs.filter((x) => x.id !== r.course.id))}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <section aria-labelledby="how" className="card flex flex-col gap-4">
        <h2 id="how" className="text-title font-bold">How this is calculated</h2>
        <ul className="flex list-disc flex-col gap-2 pl-4 text-small text-muted">
          <li>
            <b className="text-ink">Rules:</b> every subject must stay at 65% or above, and the overall aggregate must be
            75% or above.
          </li>
          <li>
            <b className="text-ink">Semester total:</b> credit hours × {SEMESTER_WEEKS} weeks, with missed classes made
            up. A 3 Th subject has 45 classes; a 1 Pr lab has 15. Classes left = total − held so far.
          </li>
          <li>
            <b className="text-ink">Subject %:</b> theory % and lab % weighted by credit hours (3 Th + 1 Pr → theory
            counts 3×, lab 1×), rounded up like NED. This reproduces NED&apos;s printed numbers but isn&apos;t
            official, so it&apos;s labelled Estimated.
          </li>
          <li>
            <b className="text-ink">Overall:</b> the credit-hour weighted average of all subjects.
          </li>
        </ul>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Semester start">
            <input type="date" className="input" value={state.startDate} onChange={(e) => update({ startDate: e.target.value })} />
          </Field>
          <Field label="Counts as of">
            <input type="date" className="input" value={state.asOfDate} onChange={(e) => update({ asOfDate: e.target.value })} />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <UploadButton onFile={handlePdf} busy={busy} variant="secondary" label="Upload a newer PDF" />
        <button type="button" onClick={() => { setState(null); setWarnings([]); setError(null); }} className="btn btn-quiet">
          Clear data from this browser
        </button>
      </section>
      {error && <Notice kind="error">{error}</Notice>}
    </div>
  );
}

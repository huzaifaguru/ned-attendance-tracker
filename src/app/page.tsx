import { Tracker } from "@/components/Tracker";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6">
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">NED Attendance Tracker</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          How many more classes and labs can you miss this semester?
        </p>
      </header>
      <Tracker />
      <footer className="mt-10 text-center text-[11px] leading-relaxed text-slate-500">
        Unofficial tool, not affiliated with NED University. Rules used: every subject must stay at 65% or above, and
        the overall aggregate must be 75% or above. An aggregate of 70–75% may be condoned by the Dean; below 70%
        needs Chairperson/Dean/VC review. Always confirm with your department.
      </footer>
    </main>
  );
}

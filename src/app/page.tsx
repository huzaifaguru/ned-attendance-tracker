import { Tracker } from "@/components/Tracker";

const REPO_URL = "https://github.com/huzaifaguru/ned-attendance-tracker";

export default function Home() {
  return (
    <>
      <header className="border-b border-line bg-raised">
        <nav aria-label="Main" className="mx-auto flex min-h-14 w-full max-w-3xl items-center justify-between gap-4 px-4">
          <span className="text-body font-extrabold tracking-tight">NED Attendance</span>
          <a
            href={REPO_URL}
            className="rounded-xs text-small font-medium text-muted underline-offset-4 transition-colors duration-200 hover:text-ink hover:underline"
          >
            View source on GitHub
          </a>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Tracker />
      </main>

      <footer className="mx-auto w-full max-w-3xl border-t border-line px-4 py-8 text-caption text-muted">
        Unofficial tool, not affiliated with NED University. Rules used: every subject must stay at 65% or above,
        and the overall aggregate must be 75% or above. An aggregate of 70–75% may be condoned by the Dean; below
        70% needs Chairperson/Dean/VC review. Always confirm with your department.
      </footer>
    </>
  );
}

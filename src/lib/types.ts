export interface Course {
  id: string;
  /** Display label, e.g. "CT-468 ( Opt )" */
  label: string;
  /** Code with "( Opt )" stripped, used for calculations/matching */
  code: string;
  thCredit: number;
  prCredit: number;
  thPresent: number;
  thHeld: number;
  prPresent: number;
  prHeld: number;
  /** Percentage as printed on the PDF, if imported */
  reportedPct?: number;
  /** Manual combined % override (user-entered) */
  overridePct?: number;
}

export interface ReportMeta {
  studentName?: string;
  rollNo?: string;
  session?: string;
  academicYear?: string;
  discipline?: string;
  section?: string;
  /** ISO yyyy-mm-dd */
  fromDate?: string;
  toDate?: string;
  generatedOn?: string;
}

export interface ParsedReport {
  meta: ReportMeta;
  courses: Course[];
  /** NED's own "Average Aggregate Attendance" */
  nedAggregate?: number;
  warnings: string[];
}

export interface AppState {
  meta: ReportMeta;
  /** ISO date the semester started (week 1 day 1) */
  startDate: string;
  /** ISO date the attendance counts are current as of */
  asOfDate: string;
  courses: Course[];
  nedAggregate?: number;
}

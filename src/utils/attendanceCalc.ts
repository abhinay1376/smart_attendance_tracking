/**
 * attendanceCalc.ts  –  Pure attendance calculation helpers
 * ─────────────────────────────────────────────────────────────────────────
 * All functions are stateless and side-effect free — easy to unit-test.
 */

export const ATTENDANCE_THRESHOLD = 75  // % required by the institution

// ─── Percentage ───────────────────────────────────────────────────────────────

/** Percentage of attended/total, clamped to [0, 100]. */
export function calcPercentage(attended: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.round((attended / total) * 100))
}

// ─── Is attendance short? ─────────────────────────────────────────────────────

export function isLowAttendance(pct: number, threshold = ATTENDANCE_THRESHOLD): boolean {
  return pct < threshold
}

// ─── Classes needed to reach threshold ───────────────────────────────────────

/**
 * How many consecutive classes must the student attend (without missing any)
 * to reach `threshold`%?
 *
 * Math:  (attended + N) / (total + N) >= threshold / 100
 *        N >= (threshold * total / 100 - attended) / (1 - threshold / 100)
 *
 * Returns 0 if the student already meets the threshold.
 */
export function classesNeededToReach(
  attended:  number,
  total:     number,
  threshold  = ATTENDANCE_THRESHOLD,
): number {
  const t = threshold / 100
  if (total > 0 && attended / total >= t) return 0
  if (t >= 1) return Infinity  // impossible edge case
  const needed = (t * total - attended) / (1 - t)
  return Math.ceil(Math.max(0, needed))
}

// ─── Classes safe to skip ─────────────────────────────────────────────────────

/**
 * How many upcoming classes can the student afford to miss (skip)
 * while staying at or above `threshold`%?
 *
 * Math:  attended / (total + S) >= threshold / 100
 *        S <= attended / (threshold / 100) - total
 *
 * Returns 0 if already below or exactly at the threshold.
 */
export function classesCanSkip(
  attended:  number,
  total:     number,
  threshold  = ATTENDANCE_THRESHOLD,
): number {
  const t = threshold / 100
  if (t <= 0) return Infinity
  const canSkip = attended / t - total
  return Math.max(0, Math.floor(canSkip))
}

// ─── Overall (aggregate across multiple subjects) ─────────────────────────────

export interface SubjectStat {
  subjectId: string
  label:     string
  attended:  number
  total:     number
}

export interface ComputedSubjectStat extends SubjectStat {
  percentage:   number
  isLow:        boolean
  needed:       number   // classes to reach 75%
  canSkip:      number   // classes safe to skip
}

/** Enrich raw stats with all derived values. */
export function computeSubjectStats(
  subjects: SubjectStat[],
  threshold = ATTENDANCE_THRESHOLD,
): ComputedSubjectStat[] {
  return subjects.map((s) => {
    const pct = calcPercentage(s.attended, s.total)
    return {
      ...s,
      percentage: pct,
      isLow:      isLowAttendance(pct, threshold),
      needed:     classesNeededToReach(s.attended, s.total, threshold),
      canSkip:    classesCanSkip(s.attended, s.total, threshold),
    }
  })
}

/** Overall aggregate attendance across all subjects. */
export function computeOverall(subjects: SubjectStat[]): {
  attended:   number
  total:      number
  percentage: number
  isLow:      boolean
} {
  const attended   = subjects.reduce((sum, s) => sum + s.attended, 0)
  const total      = subjects.reduce((sum, s) => sum + s.total,    0)
  const percentage = calcPercentage(attended, total)
  return { attended, total, percentage, isLow: isLowAttendance(percentage) }
}

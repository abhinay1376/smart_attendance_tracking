/**
 * seedDemoData.ts  (v3)
 * ─────────────────────────────────────────────────────────────────────────
 * Populates IndexedDB with one month of realistic attendance records using
 * REAL student & subject IDs fetched from the API.
 *
 * Strategy:
 *  1. Fetch real students + subjects from API (falls back to appData localStorage).
 *  2. Clear any previously seeded records (id prefix "seed-").
 *  3. Generate Mon–Fri sessions for the past 4 weeks (~20 sessions).
 *  4. Each student is assigned to subjects based on their classId matching
 *     the subject code; if no match, assigned to all subjects.
 *  5. Per-student attendance rate is deterministic from the student id hash.
 *  6. Completion stored in localStorage key "sa_demo_v3" so it persists
 *     across page reloads but can be cleared to force a re-seed.
 */

import { clearDemoRecords, saveBatchRecords, type AttendanceRecord } from '@/services/db'
import { apiGetStudents, apiGetSubjects } from '@/services/api'
import { getStudents, getSubjects }        from '@/services/appData'

const SEED_FLAG = 'sa_demo_v3'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic pseudo-random 0-1 from an arbitrary string key */
function seededRandom(seed: string): number {
  let h = 0xdeadbeef
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 0x9e3779b9)
  }
  h ^= h >>> 16
  return (h >>> 0) / 0xffffffff
}

/**
 * Return ISO date strings for Mon–Fri in the past N weeks.
 * Covers exactly one month (~20 business days for 4 weeks).
 */
function businessDates(weeksBack: number): string[] {
  const today = new Date('2026-02-28')
  const dates: string[] = []

  for (let w = weeksBack; w >= 0; w--) {
    for (let dow = 1; dow <= 5; dow++) {           // Mon=1 … Fri=5
      const d = new Date(today)
      // Start of this week (Monday)
      const diffToMonday = (today.getDay() + 6) % 7
      d.setDate(today.getDate() - diffToMonday - w * 7 + (dow - 1))
      if (d <= today && d > new Date('2025-01-01')) {
        dates.push(d.toISOString().slice(0, 10))
      }
    }
  }
  return [...new Set(dates)].sort()
}

const SESSION_DATES = businessDates(4)   // ~20 sessions over the past month

// ─── Per-student rate ─────────────────────────────────────────────────────────

function studentRate(studentId: string): { rate: number; activeRate: number } {
  const r = seededRandom(studentId + '-rate')
  let rate: number
  if (r < 0.15)      rate = 0.50 + r * 1.0
  else if (r < 0.35) rate = 0.65 + (r - 0.15) * 1.5
  else if (r < 0.80) rate = 0.75 + (r - 0.35) * 0.8
  else               rate = 0.86 + (r - 0.80) * 0.7
  const activeRate = 0.25 + seededRandom(studentId + '-active') * 0.50
  return { rate, activeRate }
}

// ─── Main export ──────────────────────────────────────────────────────────────

let _running = false

export async function seedDemoDataIfEmpty(): Promise<void> {
  if (_running) return
  if (localStorage.getItem(SEED_FLAG)) return
  _running = true

  try {
    // ── 1. Fetch real students ─────────────────────────────────────────────
    // studentId → set of enrolled subject codes (from classId field)
    let students: Array<{ id: string; enrolledCodes: string[] }> = []
    try {
      const apiStudents = await apiGetStudents()
      students = apiStudents.map((s) => ({
        id:            s._id,
        enrolledCodes: Array.isArray(s.classId) ? s.classId : [],
      }))
    } catch {
      students = getStudents().map((s) => ({
        id:            s.id,
        enrolledCodes: s.classId ? [s.classId] : [],
      }))
    }

    // ── 2. Fetch real subjects ─────────────────────────────────────────────
    let subjects: Array<{ id: string; code: string; courseId: string }> = []
    try {
      const apiSubjects = await apiGetSubjects()
      subjects = apiSubjects.map((s) => ({ id: s._id, code: s.code, courseId: s.code }))
    } catch {
      subjects = getSubjects().map((s) => ({ id: s.id, code: s.code, courseId: s.code }))
    }

    if (students.length === 0 || subjects.length === 0) {
      console.warn('[seed] No students or subjects – skipping demo seed.')
      return
    }

    // ── 3. Clear old fake-id seed records ─────────────────────────────────
    await clearDemoRecords()

    // ── 4. Resolve which subjects each student attends ────────────────────
    // If student has enrolled subject codes, only those subjects apply.
    // Otherwise (open enrollment), student attends all subjects.
    function getStudentSubjects(enrolledCodes: string[]) {
      if (enrolledCodes.length === 0) return subjects
      const matched = subjects.filter((s) => enrolledCodes.includes(s.code))
      return matched.length > 0 ? matched : subjects
    }

    // ── 5. Generate records ────────────────────────────────────────────────
    const records: AttendanceRecord[] = []

    for (const student of students) {
      const { rate, activeRate } = studentRate(student.id)
      const mySubjects           = getStudentSubjects(student.enrolledCodes)

      for (const subject of mySubjects) {
        for (const date of SESSION_DATES) {
          const key       = `${student.id}-${subject.id}-${date}`
          const isPresent = seededRandom(key) < rate
          const isActive  = isPresent && seededRandom(key + '-act') < activeRate

          records.push({
            id:        `seed-${key}`,
            studentId: student.id,
            courseId:  subject.courseId,
            subjectId: subject.id,
            date,
            status:    isPresent ? 'present' : 'absent',
            active:    isActive,
            createdAt: Date.now(),
            synced:    true,
          })
        }
      }
    }

    // ── 6. Persist and mark as done ───────────────────────────────────────
    await saveBatchRecords(records)
    localStorage.setItem(SEED_FLAG, '1')
    console.info(
      `[seed] ✓ ${records.length} demo records inserted`,
      `(${students.length} students × ${subjects.length} subjects × ${SESSION_DATES.length} sessions)`,
    )
  } catch (err) {
    console.warn('[seed] Failed to seed demo data:', err)
  } finally {
    _running = false
  }
}

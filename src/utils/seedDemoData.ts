/**
 * seedDemoData.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Populates IndexedDB with realistic mock attendance records so every
 * feature (Reports, Student Dashboard, HoD Attendance, etc.) displays
 * meaningful data in demo / offline mode.
 *
 * Strategy:
 *  • Only seeds when IndexedDB has 0 records (idempotent).
 *  • Generates sessions for the last 10 weeks on Mon / Wed / Fri.
 *  • Each subject-student pair has a seeded attendance rate so we get
 *    a mix of healthy (>75%), borderline, and low-attendance students.
 */

import { getAllRecords, saveBatchRecords, type AttendanceRecord } from '@/services/db'

// ─── Subject / student fixtures (mirrors mockData.ts) ────────────────────────

const SUBJECTS = [
  { id: 'sub-1', label: 'Data Structures',      courseId: 'cls-1' },
  { id: 'sub-2', label: 'Operating Systems',    courseId: 'cls-1' },
  { id: 'sub-3', label: 'Computer Networks',    courseId: 'cls-1' },
  { id: 'sub-4', label: 'Data Structures',      courseId: 'cls-2' },
  { id: 'sub-5', label: 'Software Engineering', courseId: 'cls-2' },
  { id: 'sub-6', label: 'Digital Electronics',  courseId: 'cls-3' },
  { id: 'sub-7', label: 'Database Systems',     courseId: 'cls-3' },
] as const

// stdId, courseId, attendance-rate (0-1), active-rate (fraction of present)
const STUDENTS: Array<{
  id: string; courseId: string; rate: number; activeRate: number
}> = [
  { id: 'std-101', courseId: 'cls-1', rate: 0.88, activeRate: 0.55 },
  { id: 'std-102', courseId: 'cls-1', rate: 0.78, activeRate: 0.40 },
  { id: 'u2',      courseId: 'cls-1', rate: 0.74, activeRate: 0.35 }, // Riya Patel – student@gmail.com
  { id: 'std-103', courseId: 'cls-1', rate: 0.74, activeRate: 0.35 }, // same person via alt id
  { id: 'std-104', courseId: 'cls-1', rate: 0.63, activeRate: 0.30 },
  { id: 'std-105', courseId: 'cls-1', rate: 0.94, activeRate: 0.70 },
  { id: 'std-106', courseId: 'cls-1', rate: 0.55, activeRate: 0.20 },
  { id: 'std-201', courseId: 'cls-2', rate: 0.82, activeRate: 0.50 },
  { id: 'std-202', courseId: 'cls-2', rate: 0.69, activeRate: 0.35 },
  { id: 'std-203', courseId: 'cls-2', rate: 0.91, activeRate: 0.65 },
  { id: 'std-204', courseId: 'cls-2', rate: 0.61, activeRate: 0.25 },
  { id: 'std-301', courseId: 'cls-3', rate: 0.85, activeRate: 0.45 },
  { id: 'std-302', courseId: 'cls-3', rate: 0.76, activeRate: 0.50 },
  { id: 'std-303', courseId: 'cls-3', rate: 0.58, activeRate: 0.20 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic pseudo-random 0-1 based on string seed (no external deps) */
function seededRandom(seed: string): number {
  let h = 0xdeadbeef
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 0x9e3779b9)
  }
  h ^= h >>> 16
  return (h >>> 0) / 0xffffffff
}

/** Return ISO date strings for Mon/Wed/Fri sessions in the last N weeks */
function sessionDates(weeksBack: number): string[] {
  const dates: string[] = []
  const today = new Date('2026-02-28')

  for (let w = weeksBack; w >= 0; w--) {
    for (const dayOffset of [0, 2, 4]) {          // Mon=0, Wed=2, Fri=4
      const d = new Date(today)
      d.setDate(today.getDate() - w * 7 - (today.getDay() === 0 ? 6 : today.getDay() - 1) + dayOffset)
      if (d <= today) {
        dates.push(d.toISOString().slice(0, 10))
      }
    }
  }
  return [...new Set(dates)].sort()                // deduplicate + sort
}

const SESSION_DATES = sessionDates(10)             // ~30 sessions

// ─── Main export ──────────────────────────────────────────────────────────────

let _seeded = false   // in-memory flag – avoids repeated DB checks in one session

export async function seedDemoDataIfEmpty(): Promise<void> {
  if (_seeded) return
  try {
    const existing = await getAllRecords()
    if (existing.length > 0) { _seeded = true; return }

    const records: AttendanceRecord[] = []

    for (const subject of SUBJECTS) {
      const studentsInCourse = STUDENTS.filter((s) => s.courseId === subject.courseId)

      for (const session of SESSION_DATES) {
        for (const stu of studentsInCourse) {
          const key     = `${stu.id}-${subject.id}-${session}`
          const r       = seededRandom(key)
          const isPresent = r < stu.rate
          const isActive  = isPresent && seededRandom(key + '-active') < stu.activeRate

          records.push({
            id:        `seed-${key}`,
            studentId: stu.id,
            courseId:  stu.courseId,
            subjectId: subject.id,
            date:      session,
            status:    isPresent ? 'present' : 'absent',
            active:    isActive,
            createdAt: Date.now(),
            synced:    true,   // demo records – no need to push to server
          })
        }
      }
    }

    await saveBatchRecords(records)
    _seeded = true
    console.info(`[seed] Inserted ${records.length} demo attendance records into IndexedDB`)
  } catch (err) {
    console.warn('[seed] Failed to seed demo data:', err)
  }
}

/**
 * useStudentAttendance
 * ─────────────────────────────────────────────────────────────────────────
 * Loads and derives all attendance data the Student Dashboard needs.
 *
 * Data strategy (in priority order):
 *  1. IndexedDB records for the logged-in student (real data after syncing)
 *  2. Fallback to MOCK_STUDENT_ATTENDANCE (demo / empty-DB scenarios)
 *
 * The hook returns both the raw and fully-computed subject stats plus an
 * aggregated overall figure — ready for the dashboard to render without
 * any additional maths.
 */

import { useEffect, useState } from 'react'
import { useAuth }             from '@/context/AuthContext'
import {
  MOCK_STUDENT_ATTENDANCE,
  MOCK_SUBJECTS,
  type SubjectAttendanceStat,
}                              from '@/data/mockData'
import {
  computeSubjectStats,
  computeOverall,
  type ComputedSubjectStat,
}                              from '@/utils/attendanceCalc'
import { getAllRecords }        from '@/services/db'
import { seedDemoDataIfEmpty }  from '@/utils/seedDemoData'

// ─── Return shape ──────────────────────────────────────────────────────────────

export interface StudentAttendanceData {
  /** Derived per-subject rows */
  subjects:  ComputedSubjectStat[]
  /** Overall aggregate */
  overall: {
    attended:   number
    total:      number
    percentage: number
    isLow:      boolean
  }
  /** Count of sessions where student was marked Active by faculty */
  activeSessions: number
  /** True while the async load is in-flight */
  isLoading: boolean
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStudentAttendance(): StudentAttendanceData {
  const { user } = useAuth()

  const [subjects,       setSubjects]       = useState<ComputedSubjectStat[]>([])
  const [overall,        setOverall]        = useState({ attended: 0, total: 0, percentage: 0, isLow: false })
  const [activeSessions, setActiveSessions] = useState(0)
  const [isLoading,      setIsLoading]      = useState(true)

  useEffect(() => {
    if (!user) return

    // Capture here so the async closure always has the non-null value
    const userId = user.id

    let cancelled = false

    async function load() {
      setIsLoading(true)

      let rawStats: SubjectAttendanceStat[] = []
      let activeCount = 0

      try {
        await seedDemoDataIfEmpty()
        // ── Try to build stats from real IndexedDB records ──────────────────
        const allRecords = await getAllRecords()
        const myRecords  = allRecords.filter((r) => r.studentId === userId)

        if (myRecords.length > 0) {
          activeCount = myRecords.filter((r) => r.active === true).length

                  // Group by subjectId and count attended / total
          const subjectLabelMap: Record<string, string> = {}
          MOCK_SUBJECTS.forEach((s) => { subjectLabelMap[s.id] = s.label })

          const map = new Map<string, { attended: number; total: number; label: string }>()

          for (const rec of myRecords) {
            const label = subjectLabelMap[rec.subjectId] ?? rec.subjectId
            const entry = map.get(rec.subjectId) ?? { attended: 0, total: 0, label }
            entry.total++
            if (rec.status === 'present') entry.attended++
            map.set(rec.subjectId, entry)
          }

          rawStats = Array.from(map.entries()).map(([subjectId, e]) => ({
            subjectId,
            label:    e.label,
            attended: e.attended,
            total:    e.total,
          }))
        }
      } catch {
        // IndexedDB unavailable — fall through to mock data
      }

      // ── Fall back to mock data when IndexedDB had nothing ─────────────────
      if (rawStats.length === 0) {
        rawStats = MOCK_STUDENT_ATTENDANCE[userId] ?? []
      }

      if (!cancelled) {
        const computed = computeSubjectStats(rawStats)
        setSubjects(computed)
        setOverall(computeOverall(rawStats))
        setActiveSessions(activeCount)
        setIsLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [user])

  return { subjects, overall, activeSessions, isLoading }
}

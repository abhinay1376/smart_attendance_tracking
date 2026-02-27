/**
 * useFacultyDashboard
 * ─────────────────────────────────────────────────────────────────────────
 * Aggregates everything the Faculty Dashboard needs in one place:
 *  • Summary counts (courses, today's sessions, students recorded, pending sync)
 *  • Today's schedule with completion status
 *  • Live sync state (via useSync)
 *
 * Data strategy
 *  – Real counts are derived from IndexedDB when records exist.
 *  – Falls back to deterministic mock values for the demo account.
 */

import { useEffect, useState } from 'react'
import { useAuth }             from '@/context/AuthContext'
import { useSync }             from '@/hooks/useSync'
import { getAllRecords }        from '@/services/db'
import { MOCK_CLASSES, MOCK_SUBJECTS, subjectsForClass } from '@/data/mockData'
import { todayISO }            from '@/utils/helpers'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScheduleItem {
  id:        string
  subject:   string
  classLabel: string
  time:      string     // e.g. "09:00 AM"
  students:  number
  done:      boolean    // attendance already marked today?
}

export interface FacultyDashboardData {
  /** Summary card values */
  stats: {
    courses:   number
    sessions:  number  // classes scheduled today
    recorded:  number  // distinct (subjectId+date) combos saved today
    pending:   number  // unsynced IndexedDB records
  }
  /** Today's class schedule */
  schedule:     ScheduleItem[]
  /** Forwarded from useSync */
  sync: ReturnType<typeof useSync>
  isLoading:    boolean
}

// ─── Static mock schedule for the demo faculty account ────────────────────────

const DEMO_SCHEDULE: Omit<ScheduleItem, 'done'>[] = [
  { id: 'sched-1', subject: 'Data Structures',   classLabel: 'B.Tech CSE – Div A', time: '09:00 AM', students: 30 },
  { id: 'sched-2', subject: 'Operating Systems',  classLabel: 'B.Tech CSE – Div A', time: '11:00 AM', students: 28 },
  { id: 'sched-3', subject: 'Computer Networks',  classLabel: 'B.Tech CSE – Div A', time: '02:00 PM', students: 32 },
]

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFacultyDashboard(): FacultyDashboardData {
  const { user }  = useAuth()
  const sync      = useSync()

  const [stats,     setStats]     = useState({ courses: 0, sessions: 0, recorded: 0, pending: 0 })
  const [schedule,  setSchedule]  = useState<ScheduleItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    async function load() {
      setIsLoading(true)

      try {
        const today      = todayISO()
        const allRecords = await getAllRecords()

        // Records saved today
        const todayRecords = allRecords.filter((r) => r.date === today)

        // Distinct subject sessions marked today (unique subjectId)
        const markedSubjectIds = new Set(todayRecords.map((r) => r.subjectId))

        // Build schedule — enrich with `done` flag
        const enriched: ScheduleItem[] = DEMO_SCHEDULE.map((item) => ({
          ...item,
          // A session is "done" if any record for that subject exists for today
          done: markedSubjectIds.has(
            MOCK_SUBJECTS.find((s) => s.label === item.subject)?.id ?? '__none__',
          ),
        }))

        // Courses: distinct classes taught (from mock)
        const courses = MOCK_CLASSES.length
        // Total subjects across all classes for this faculty
        const totalSubjects = MOCK_CLASSES.reduce(
          (sum, cls) => sum + subjectsForClass(cls.id).length, 0,
        )
        if (!cancelled) {
          setStats({
            courses,
            sessions:  DEMO_SCHEDULE.length,
            recorded:  markedSubjectIds.size,
            pending:   sync.unsyncedCount,
          })
          setSchedule(enriched)
          setIsLoading(false)
        }

        // Suppress "totalSubjects unused" warning — it's intentionally available
        void totalSubjects
      } catch {
        if (!cancelled) setIsLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  // Re-run when pending count updates (after a sync)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sync.unsyncedCount])

  return { stats, schedule, sync, isLoading }
}

import { useCallback, useEffect, useState } from 'react'
import { saveBatchRecords, getAllRecords, type AttendanceRecord } from '@/services/db'
import { studentsForClass, type Student } from '@/data/mockData'
import { generateId, todayISO } from '@/utils/helpers'
import { useAuth } from '@/context/AuthContext'
import { notifyFacultyConsecutiveAbsent } from '@/services/notifications'

// ─── Per-student row state ─────────────────────────────────────────────────

export interface AttendanceRow {
  student:    Student
  status:     'present' | 'absent'
  engagement: number   // 1–5
}

// ─── Return type ───────────────────────────────────────────────────────────

export interface UseMarkAttendanceReturn {
  // selections
  classId:       string
  subjectId:     string
  setClassId:    (id: string) => void
  setSubjectId:  (id: string) => void

  // table data
  rows:           AttendanceRow[]
  toggleStatus:   (studentId: string) => void
  setEngagement:  (studentId: string, score: number) => void

  // save
  saving:      boolean
  savedCount:  number | null    // null = not yet saved
  error:       string | null
  handleSave:  () => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useMarkAttendance(): UseMarkAttendanceReturn {
  const { user }                                        = useAuth()
  const [classId,    setClassIdRaw]   = useState('')
  const [subjectId,  setSubjectId]    = useState('')
  const [rows,       setRows]         = useState<AttendanceRow[]>([])
  const [saving,     setSaving]       = useState(false)
  const [savedCount, setSavedCount]   = useState<number | null>(null)
  const [error,      setError]        = useState<string | null>(null)

  /** When class changes, rebuild the student rows and reset subject */
  useEffect(() => {
    if (!classId) { setRows([]); setSubjectId(''); return }

    const students = studentsForClass(classId)
    setRows(
      students.map((s) => ({ student: s, status: 'present', engagement: 3 })),
    )
    setSubjectId('')
    setSavedCount(null)
    setError(null)
  }, [classId])

  const setClassId = useCallback((id: string) => {
    setClassIdRaw(id)
    setSavedCount(null)
    setError(null)
  }, [])

  /** Toggle a single student's present / absent */
  const toggleStatus = useCallback((studentId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.student.id === studentId
          ? { ...r, status: r.status === 'present' ? 'absent' : 'present' }
          : r,
      ),
    )
  }, [])

  /** Update engagement score for a student */
  const setEngagement = useCallback((studentId: string, score: number) => {
    const clamped = Math.min(5, Math.max(1, score))
    setRows((prev) =>
      prev.map((r) =>
        r.student.id === studentId ? { ...r, engagement: clamped } : r,
      ),
    )
  }, [])

  /** Persist all rows to IndexedDB */
  const handleSave = useCallback(async () => {
    if (!classId || !subjectId) {
      setError('Please select a class and subject before saving.')
      return
    }
    if (rows.length === 0) {
      setError('No students found for the selected class.')
      return
    }

    setSaving(true)
    setError(null)

    const today = todayISO()
    const records: AttendanceRecord[] = rows.map((r) => ({
      id:         generateId(),
      studentId:  r.student.id,
      courseId:   classId,
      subjectId,
      date:       today,
      status:     r.status,
      engagement: r.engagement,
      synced:     false,            // ← always false on local save
      createdAt:  Date.now(),
    }))

    try {
      await saveBatchRecords(records)
      setSavedCount(records.length)

      // ── Consecutive-absent notifications (non-critical) ────────────────
      const absentRows = rows.filter((r) => r.status === 'absent')
      if (absentRows.length > 0 && user) {
        try {
          const allRecs = await getAllRecords()
          for (const row of absentRows) {
            const studentRecs = allRecs
              .filter((rec) => rec.studentId === row.student.id && rec.subjectId === subjectId)
              .sort((a, b) => a.date.localeCompare(b.date))
            let run = 0
            for (let i = studentRecs.length - 1; i >= 0; i--) {
              if (studentRecs[i].status === 'absent') run++
              else break
            }
            if (run >= 5) {
              notifyFacultyConsecutiveAbsent(
                user.email,
                row.student.name,
                row.student.id,
                subjectId,   // best label we have in this hook
                run,
              )
            }
          }
        } catch { /* non-critical */ }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save attendance.')
    } finally {
      setSaving(false)
    }
  }, [classId, subjectId, rows])

  return {
    classId,  subjectId,  setClassId, setSubjectId,
    rows, toggleStatus, setEngagement,
    saving, savedCount, error, handleSave,
  }
}

import { useCallback, useEffect, useState } from 'react'
import { saveBatchRecords, getAllRecords, type AttendanceRecord } from '@/services/db'
import { apiFacultyGetStudents, apiFacultyGetSubjects, type Subject } from '@/services/api'
import { generateId } from '@/utils/helpers'
import { useAuth } from '@/context/AuthContext'
import { notifyFacultyConsecutiveAbsent } from '@/services/notifications'

// ─── Local student shape (preserves compatibility with MarkAttendance UI) ──────

interface Student {
  id:      string   // maps to API _id
  name:    string
  rollNo:  string   // maps to API regNo
  classId: string
}

// ─── Per-student row state ─────────────────────────────────────────────────────

export interface AttendanceRow {
  student:    Student
  status:     'present' | 'absent'
  active:     boolean   // actively participating this session
}

// ─── Return type ───────────────────────────────────────────────────────────────

export interface UseMarkAttendanceReturn {
  // subject list + selection (replaces the old class+subject mock system)
  subjects:        Subject[]
  subjectId:       string
  setSubjectId:    (id: string) => void
  loadingStudents: boolean

  // table data
  rows:          AttendanceRow[]
  toggleStatus:  (studentId: string) => void
  toggleActive:  (studentId: string) => void

  // save
  saving:      boolean
  savedCount:  number | null    // null = not yet saved
  error:       string | null
  handleSave:  () => Promise<void>
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Pass the ISO date for which attendance is being marked (default: today) */
export function useMarkAttendance(date?: string): UseMarkAttendanceReturn {
  const { user }                                          = useAuth()
  const sessionDate = date ?? new Date().toISOString().slice(0, 10)
  const [subjects,        setSubjects]        = useState<Subject[]>([])
  const [subjectId,       setSubjectIdRaw]    = useState('')
  const [rows,            setRows]            = useState<AttendanceRow[]>([])
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [savedCount,      setSavedCount]      = useState<number | null>(null)
  const [error,           setError]           = useState<string | null>(null)

  /** Load faculty's assigned subjects once on mount */
  useEffect(() => {
    apiFacultyGetSubjects()
      .then(setSubjects)
      .catch(() => { /* silently ignore – dropdown stays empty */ })
  }, [])

  /** When subject selection changes, load students for that subject */
  useEffect(() => {
    if (!subjectId) { setRows([]); return }
    const sub = subjects.find((s) => s._id === subjectId)
    if (!sub) { setRows([]); return }

    setLoadingStudents(true)
    setRows([])
    setSavedCount(null)
    setError(null)

    apiFacultyGetStudents(sub.code)
      .then((apiStudents) => {
        setRows(
          apiStudents.map((s) => ({
            student: {
              id:      s._id,
              name:    s.name,
              rollNo:  s.rollNo || s.email.split('@')[0],   // plain reg no; fallback to email prefix
              classId: Array.isArray(s.classId) ? s.classId.join(',') : (s.classId ?? ''),
            },
            status: 'present',
            active: false,
          })),
        )
      })
      .catch(() => setError('Failed to load students. Please try again.'))
      .finally(() => setLoadingStudents(false))
  }, [subjectId, subjects])

  const setSubjectId = useCallback((id: string) => {
    setSubjectIdRaw(id)
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

  /** Toggle a student's active participation status */
  const toggleActive = useCallback((studentId: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.student.id === studentId ? { ...r, active: !r.active } : r,
      ),
    )
  }, [])

  /** Persist all rows to IndexedDB */
  const handleSave = useCallback(async () => {
    const sub = subjects.find((s) => s._id === subjectId)
    if (!sub) {
      setError('Please select a subject before saving.')
      return
    }
    if (rows.length === 0) {
      setError('No students found for the selected subject.')
      return
    }

    setSaving(true)
    setError(null)

    const records: AttendanceRecord[] = rows.map((r) => ({
      id:         generateId(),
      studentId:  r.student.id,
      courseId:   sub.code,
      subjectId,
      date:       sessionDate,
      status:     r.status,
      active:     r.active,
      synced:     false,
      createdAt:  Date.now(),
    }))

    try {
      await saveBatchRecords(records)
      setSavedCount(records.length)

      // ── Consecutive-absent notifications (non-critical) ─────────────────
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
                sub.name,
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
  }, [subjectId, subjects, rows, user])

  return {
    subjects, subjectId, setSubjectId, loadingStudents,
    rows, toggleStatus, toggleActive,
    saving, savedCount, error, handleSave,
  }
}

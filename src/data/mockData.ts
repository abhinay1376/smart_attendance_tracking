// ─── Domain types ─────────────────────────────────────────────────────────────

export interface ClassRecord {
  id:    string
  label: string   // e.g. "B.Tech CSE – Sem 5 (Div A)"
}

export interface Subject {
  id:      string
  label:   string
  classId: string   // belongs-to relation
}

export interface Student {
  id:      string
  name:    string
  rollNo:  string
  classId: string
}

// ─── Mock data (replace with API / IndexedDB reads) ──────────────────────────

export const MOCK_CLASSES: ClassRecord[] = [
  { id: 'cls-1', label: 'B.Tech CSE – Sem 5 (Div A)' },
  { id: 'cls-2', label: 'B.Tech CSE – Sem 5 (Div B)' },
  { id: 'cls-3', label: 'B.Tech IT – Sem 3 (Div A)'  },
]

export const MOCK_SUBJECTS: Subject[] = [
  { id: 'sub-1', label: 'Data Structures',      classId: 'cls-1' },
  { id: 'sub-2', label: 'Operating Systems',    classId: 'cls-1' },
  { id: 'sub-3', label: 'Computer Networks',    classId: 'cls-1' },
  { id: 'sub-4', label: 'Data Structures',      classId: 'cls-2' },
  { id: 'sub-5', label: 'Software Engineering', classId: 'cls-2' },
  { id: 'sub-6', label: 'Digital Electronics',  classId: 'cls-3' },
  { id: 'sub-7', label: 'Database Systems',     classId: 'cls-3' },
]

export const MOCK_STUDENTS: Student[] = [
  // Div A – CSE Sem 5
  { id: 'std-101', name: 'Aarav Shah',     rollNo: 'CS501', classId: 'cls-1' },
  { id: 'std-102', name: 'Priya Mehta',    rollNo: 'CS502', classId: 'cls-1' },
  { id: 'std-103', name: 'Riya Patel',     rollNo: 'CS503', classId: 'cls-1' },
  { id: 'std-104', name: 'Karan Joshi',    rollNo: 'CS504', classId: 'cls-1' },
  { id: 'std-105', name: 'Sneha Desai',    rollNo: 'CS505', classId: 'cls-1' },
  { id: 'std-106', name: 'Om Trivedi',     rollNo: 'CS506', classId: 'cls-1' },

  // Div B – CSE Sem 5
  { id: 'std-201', name: 'Ananya Singh',   rollNo: 'CS551', classId: 'cls-2' },
  { id: 'std-202', name: 'Dev Kumar',      rollNo: 'CS552', classId: 'cls-2' },
  { id: 'std-203', name: 'Ishaan Verma',   rollNo: 'CS553', classId: 'cls-2' },
  { id: 'std-204', name: 'Pooja Gupta',    rollNo: 'CS554', classId: 'cls-2' },

  // Div A – IT Sem 3
  { id: 'std-301', name: 'Harsh Patel',    rollNo: 'IT301', classId: 'cls-3' },
  { id: 'std-302', name: 'Nisha Rao',      rollNo: 'IT302', classId: 'cls-3' },
  { id: 'std-303', name: 'Vikas Sharma',   rollNo: 'IT303', classId: 'cls-3' },
]

/** Return subjects available for a given class id */
export function subjectsForClass(classId: string): Subject[] {
  return MOCK_SUBJECTS.filter((s) => s.classId === classId)
}

/** Return students enrolled in a given class id */
export function studentsForClass(classId: string): Student[] {
  return MOCK_STUDENTS.filter((s) => s.classId === classId)
}

// ─── Student-view: subject attendance records ─────────────────────────────────

/**
 * Subject-level attendance summary as seen by a student.
 * `attended` / `total` are the class counts for the current semester.
 * In production these would be derived from the AttendanceRecord collection;
 * here we use realistic mock values for the demo account (Riya Patel, cls-1).
 */
export interface SubjectAttendanceStat {
  subjectId: string
  label:     string
  attended:  number
  total:     number
}

/** Keyed by student id  → array of per-subject stats */
export const MOCK_STUDENT_ATTENDANCE: Record<string, SubjectAttendanceStat[]> = {
  /** Riya Patel – u2 – std-103 – cls-1 */
  u2: [
    { subjectId: 'sub-1', label: 'Data Structures',   attended: 22, total: 30 },
    { subjectId: 'sub-2', label: 'Operating Systems', attended: 17, total: 28 },
    { subjectId: 'sub-3', label: 'Computer Networks', attended: 25, total: 32 },
  ],
}

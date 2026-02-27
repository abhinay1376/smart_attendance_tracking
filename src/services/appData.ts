/**
 * appData.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Centralised localStorage-backed data store for:
 *   • Faculty signup requests (pending / approved / rejected)
 *   • Registered students (added by admin via CSV/Excel or bulk import)
 *   • Subjects (created by admin, with assigned faculty)
 *   • Helpdesk tickets (student → faculty)
 */

// ─── Keys ─────────────────────────────────────────────────────────────────────

import {
  notifyFacultyNewTicket,
  notifyStudentHelpdeskReply,
  notifyFacultySubjectAssigned,
  notifyHodEscalation,
} from '@/services/notifications'

const KEYS = {
  FACULTY_REQUESTS: 'sa_faculty_requests',
  STUDENTS:         'sa_students',
  SUBJECTS:         'sa_subjects',
  HELPDESK:         'sa_helpdesk',
} as const

// ─── Types ────────────────────────────────────────────────────────────────────

export type RequestStatus = 'pending' | 'approved' | 'rejected'

export interface FacultyRequest {
  id:        string
  name:      string
  email:     string
  phone:     string
  dob:       string
  facultyId: string
  password:  string
  status:    RequestStatus
  createdAt: string
  note?:     string
}

export interface RegisteredStudent {
  id:        string
  name:      string
  regNo:     string        // login password
  email:     string        // login username
  phone:     string
  addedBy:   string        // 'admin' or faculty email
  classId?:  string
  createdAt: string
}

export interface Subject {
  id:              string
  name:            string
  code:            string
  assignedFaculty: string[]   // faculty emails
  createdAt:       string
}

export type TicketStatus = 'open' | 'resolved'

/** A single message in the back-and-forth conversation on a ticket */
export interface ChatMessage {
  sender:  'student' | 'faculty'
  text:    string
  sentAt:  string
}

export interface HelpdeskTicket {
  id:                string
  studentEmail:      string
  studentName:       string
  facultyEmail:      string
  subject:           string
  message:           string
  status:            TicketStatus
  createdAt:         string
  resolvedAt?:       string
  reply?:            string
  /** Faculty has replied but is waiting for the student to respond — ticket stays open */
  awaitingResponse?: boolean
  /** Full back-and-forth thread after the initial message */
  messages?:         ChatMessage[]
  /** When true the ticket thread is visible to the HoD for oversight */
  notifyHod?:        boolean
}

// ─── Generic helpers ──────────────────────────────────────────────────────────

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function save<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data))
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ─── Faculty Requests ─────────────────────────────────────────────────────────

export function getFacultyRequests(): FacultyRequest[] {
  return load<FacultyRequest>(KEYS.FACULTY_REQUESTS)
}

export function createFacultyRequest(
  data: Omit<FacultyRequest, 'id' | 'status' | 'createdAt'>,
): FacultyRequest {
  const requests = getFacultyRequests()

  // Prevent duplicate email
  if (requests.some((r) => r.email.toLowerCase() === data.email.toLowerCase())) {
    throw new Error('A signup request for this email already exists.')
  }

  const req: FacultyRequest = {
    ...data,
    id:        uid(),
    status:    'pending',
    createdAt: new Date().toISOString(),
  }
  save(KEYS.FACULTY_REQUESTS, [...requests, req])
  return req
}

export function updateFacultyRequestStatus(
  id: string,
  status: 'approved' | 'rejected',
  note?: string,
): void {
  const requests = getFacultyRequests().map((r) =>
    r.id === id ? { ...r, status, note } : r,
  )
  save(KEYS.FACULTY_REQUESTS, requests)
}

/** Returns all approved faculty as lightweight auth-compatible objects */
export function getApprovedFaculty(): FacultyRequest[] {
  return getFacultyRequests().filter((r) => r.status === 'approved')
}

// ─── Registered Students ──────────────────────────────────────────────────────

export function getStudents(): RegisteredStudent[] {
  return load<RegisteredStudent>(KEYS.STUDENTS)
}

export function getStudentsByFaculty(facultyEmail: string): RegisteredStudent[] {
  return getStudents().filter((s) => s.addedBy === facultyEmail)
}

export function addStudent(
  data: Omit<RegisteredStudent, 'id' | 'createdAt'>,
): RegisteredStudent {
  const students = getStudents()

  if (students.some((s) => s.email.toLowerCase() === data.email.toLowerCase())) {
    throw new Error('A student with this email already exists.')
  }

  const student: RegisteredStudent = {
    ...data,
    id:        uid(),
    createdAt: new Date().toISOString(),
  }
  save(KEYS.STUDENTS, [...students, student])
  return student
}

/**
 * bulkAddStudents
 * Import multiple students at once (admin CSV/Excel upload).
 * Skips rows whose email already exists.
 * Returns { added, skipped } counts.
 */
export function bulkAddStudents(
  rows: Omit<RegisteredStudent, 'id' | 'createdAt'>[],
): { added: number; skipped: number } {
  let existing = getStudents()
  let added = 0
  let skipped = 0

  const newStudents: RegisteredStudent[] = []
  const seenEmails = new Set(existing.map((s) => s.email.toLowerCase()))

  for (const row of rows) {
    const key = row.email.toLowerCase()
    if (seenEmails.has(key)) { skipped++; continue }
    seenEmails.add(key)
    newStudents.push({ ...row, id: uid(), createdAt: new Date().toISOString() })
    added++
  }

  save(KEYS.STUDENTS, [...existing, ...newStudents])
  return { added, skipped }
}

export function deleteStudent(id: string): void {
  save(KEYS.STUDENTS, getStudents().filter((s) => s.id !== id))
}

/** Lookup a student by email for login purposes */
export function findStudentByEmail(email: string): RegisteredStudent | undefined {
  return getStudents().find((s) => s.email.toLowerCase() === email.toLowerCase())
}

// ─── Subjects ─────────────────────────────────────────────────────────────────

export function getSubjects(): Subject[] {
  return load<Subject>(KEYS.SUBJECTS)
}

export function createSubject(data: Omit<Subject, 'id' | 'createdAt'>): Subject {
  const subjects = getSubjects()
  if (subjects.some((s) => s.code.toUpperCase() === data.code.toUpperCase())) {
    throw new Error('A subject with this code already exists.')
  }
  const subject: Subject = { ...data, id: uid(), createdAt: new Date().toISOString() }
  save(KEYS.SUBJECTS, [...subjects, subject])
  return subject
}

export function updateSubject(id: string, data: Partial<Omit<Subject, 'id' | 'createdAt'>>): void {
  save(KEYS.SUBJECTS, getSubjects().map((s) => s.id === id ? { ...s, ...data } : s))
}

export function deleteSubject(id: string): void {
  save(KEYS.SUBJECTS, getSubjects().filter((s) => s.id !== id))
}

export function assignFacultyToSubject(subjectId: string, facultyEmail: string): void {
  const subjects = getSubjects()
  const subject  = subjects.find((s) => s.id === subjectId)
  save(KEYS.SUBJECTS, subjects.map((s) => {
    if (s.id !== subjectId) return s
    const already = s.assignedFaculty.includes(facultyEmail)
    return { ...s, assignedFaculty: already ? s.assignedFaculty : [...s.assignedFaculty, facultyEmail] }
  }))
  // Notify the faculty they have been assigned a new subject
  if (subject && !subject.assignedFaculty.includes(facultyEmail)) {
    notifyFacultySubjectAssigned(facultyEmail, subject.name, subjectId)
  }
}

export function removeFacultyFromSubject(subjectId: string, facultyEmail: string): void {
  save(KEYS.SUBJECTS, getSubjects().map((s) =>
    s.id === subjectId
      ? { ...s, assignedFaculty: s.assignedFaculty.filter((e) => e !== facultyEmail) }
      : s,
  ))
}

// ─── Helpdesk Tickets ─────────────────────────────────────────────────────────

export function getHelpdeskTickets(): HelpdeskTicket[] {
  return load<HelpdeskTicket>(KEYS.HELPDESK)
}

export function getTicketsForFaculty(facultyEmail: string): HelpdeskTicket[] {
  return getHelpdeskTickets().filter(
    (t) => t.facultyEmail.toLowerCase() === facultyEmail.toLowerCase(),
  )
}

export function getTicketsForStudent(studentEmail: string): HelpdeskTicket[] {
  return getHelpdeskTickets().filter(
    (t) => t.studentEmail.toLowerCase() === studentEmail.toLowerCase(),
  )
}

export function createTicket(
  data: Omit<HelpdeskTicket, 'id' | 'status' | 'createdAt'>,
): HelpdeskTicket {
  const ticket: HelpdeskTicket = {
    ...data,
    id:        uid(),
    status:    'open',
    createdAt: new Date().toISOString(),
  }
  save(KEYS.HELPDESK, [...getHelpdeskTickets(), ticket])
  // Notify the faculty member that a new ticket awaits them
  notifyFacultyNewTicket(data.facultyEmail, ticket.id, data.studentName, data.subject)
  return ticket
}

export function resolveTicket(id: string, reply: string): void {
  const all = getHelpdeskTickets()
  const original = all.find((t) => t.id === id)
  const tickets = all.map((t) => {
    if (t.id !== id) return t
    const msgs: ChatMessage[] = reply.trim()
      ? [...(t.messages ?? []), { sender: 'faculty' as const, text: reply, sentAt: new Date().toISOString() }]
      : (t.messages ?? [])
    return { ...t, status: 'resolved' as TicketStatus, reply, resolvedAt: new Date().toISOString(), awaitingResponse: false, messages: msgs }
  })
  save(KEYS.HELPDESK, tickets)
  // Notify the student their ticket was resolved
  if (original) {
    notifyStudentHelpdeskReply(original.studentEmail, id, original.subject, true)
  }
}

/**
 * Save a reply to an open ticket without closing it.
 * Appends to the messages thread and sets awaitingResponse = true
 * so the student knows they can reply.
 */
export function replyToTicket(id: string, replyText: string): void {
  const all = getHelpdeskTickets()
  const original = all.find((t) => t.id === id)
  const msg: ChatMessage = { sender: 'faculty', text: replyText, sentAt: new Date().toISOString() }
  const tickets = all.map((t) =>
    t.id === id
      ? { ...t, reply: replyText, awaitingResponse: true, messages: [...(t.messages ?? []), msg] }
      : t,
  )
  save(KEYS.HELPDESK, tickets)
  // Notify the student they have a new reply
  if (original) {
    notifyStudentHelpdeskReply(original.studentEmail, id, original.subject, false)
  }
}

/**
 * Student sends a follow-up message on an open ticket.
 * Appends to the thread and clears awaitingResponse so faculty
 * knows there is a new message waiting.
 */
export function studentFollowUp(id: string, text: string): void {
  const msg: ChatMessage = { sender: 'student', text, sentAt: new Date().toISOString() }
  const tickets = getHelpdeskTickets().map((t) =>
    t.id === id
      ? { ...t, awaitingResponse: false, messages: [...(t.messages ?? []), msg] }
      : t,
  )
  save(KEYS.HELPDESK, tickets)
}

/**
 * Toggle the awaitingResponse flag without changing status or reply.
 */
export function setAwaitingResponse(id: string, value: boolean): void {
  const tickets = getHelpdeskTickets().map((t) =>
    t.id === id ? { ...t, awaitingResponse: value } : t,
  )
  save(KEYS.HELPDESK, tickets)
}

/**
 * Toggle the notifyHod flag on a ticket.
 * When turned ON, fires a notification to the HoD.
 */
export function setNotifyHod(id: string, value: boolean, raisedBy: string): void {
  const all    = getHelpdeskTickets()
  const ticket = all.find((t) => t.id === id)
  save(KEYS.HELPDESK, all.map((t) => t.id === id ? { ...t, notifyHod: value } : t))
  if (value && ticket) {
    notifyHodEscalation(ticket.id, ticket.subject, raisedBy)
  }
}

// ─── Dashboard aggregates ─────────────────────────────────────────────────────

export interface DeptStats {
  totalFaculty:    number
  totalStudents:   number
  totalSubjects:   number
  pendingRequests: number
  openTickets:     number
}

export function getDeptStats(): DeptStats {
  const approved  = getApprovedFaculty().length
  const students  = getStudents().length
  const subjects  = getSubjects().length
  const pending   = getFacultyRequests().filter((r) => r.status === 'pending').length
  const tickets   = getHelpdeskTickets().filter((t) => t.status === 'open').length

  return {
    totalFaculty:    1 + approved,
    totalStudents:   1 + students,
    totalSubjects:   subjects,
    pendingRequests: pending,
    openTickets:     tickets,
  }
}

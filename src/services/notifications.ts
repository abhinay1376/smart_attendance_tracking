/**
 * notifications.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Client-side notification store backed by localStorage.
 * No server required — works completely offline.
 *
 * Every notification has a `to` field that determines who sees it:
 *   'hod'               → the HoD / admin
 *   'faculty:email'     → a specific faculty member
 *   'student:email'     → a specific student
 *
 * Notification types and their triggers:
 *   new_ticket          → faculty: student submitted a new helpdesk ticket
 *   helpdesk_reply      → student: faculty replied / resolved their ticket
 *   subject_assigned    → faculty: HoD assigned a new subject to them
 *   attendance_reminder → faculty: they haven't marked attendance for a session today
 *   absent_marked       → student: they were marked absent in a session
 *   consecutive_absent  → faculty: a student has been absent 5+ classes in a row
 *   hod_escalation      → hod: a ticket was escalated via "Notify HoD" toggle
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const STORE_KEY = 'sa_notifications'
/** Maximum total notifications to keep in localStorage (FIFO trim) */
const MAX_SIZE  = 200

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotifType =
  | 'new_ticket'
  | 'helpdesk_reply'
  | 'subject_assigned'
  | 'attendance_reminder'
  | 'absent_marked'
  | 'consecutive_absent'
  | 'hod_escalation'

export interface AppNotification {
  id:        string
  type:      NotifType
  /** Routing target — 'hod' | 'faculty:email' | 'student:email' */
  to:        string
  title:     string
  body:      string
  /** App-internal href to navigate to on click */
  href:      string
  read:      boolean
  createdAt: string
  /** Optional linked entity id (ticket id, student id, etc.) */
  metaId?:   string
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

function loadAll(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? (JSON.parse(raw) as AppNotification[]) : []
  } catch {
    return []
  }
}

function saveAll(items: AppNotification[]): void {
  // Trim oldest first if we exceed MAX_SIZE
  const trimmed = items.length > MAX_SIZE ? items.slice(items.length - MAX_SIZE) : items
  localStorage.setItem(STORE_KEY, JSON.stringify(trimmed))
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ─── Public CRUD ──────────────────────────────────────────────────────────────

/**
 * Push a single notification into the store.
 * Deduplication: if a notification with the same type + to + metaId exists
 * and was created in the last 60 seconds, the new one is silently dropped
 * (prevents duplicate firings from rapid re-renders).
 */
export function pushNotification(
  notif: Omit<AppNotification, 'id' | 'read' | 'createdAt'>,
): void {
  const all = loadAll()
  const now = Date.now()

  // Deduplicate
  if (notif.metaId) {
    const recent = all.some(
      (n) =>
        n.type    === notif.type &&
        n.to      === notif.to   &&
        n.metaId  === notif.metaId &&
        now - new Date(n.createdAt).getTime() < 60_000,
    )
    if (recent) return
  }

  const item: AppNotification = {
    ...notif,
    id:        uid(),
    read:      false,
    createdAt: new Date().toISOString(),
  }
  saveAll([...all, item])
}

/** Return all notifications intended for a specific `to` key, newest first */
export function getNotifications(to: string): AppNotification[] {
  return loadAll()
    .filter((n) => n.to === to)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

/** Mark a single notification as read */
export function markNotificationRead(id: string): void {
  saveAll(loadAll().map((n) => (n.id === id ? { ...n, read: true } : n)))
}

/** Mark all notifications for a `to` key as read */
export function markAllRead(to: string): void {
  saveAll(loadAll().map((n) => (n.to === to ? { ...n, read: true } : n)))
}

/** Delete a single notification */
export function deleteNotification(id: string): void {
  saveAll(loadAll().filter((n) => n.id !== id))
}

/** Delete all notifications for a `to` key */
export function clearNotifications(to: string): void {
  saveAll(loadAll().filter((n) => n.to !== to))
}

// ─── Notification factory helpers ─────────────────────────────────────────────
// Each helper pushes the right notification for one specific event.

/** Faculty receives a new helpdesk ticket from a student */
export function notifyFacultyNewTicket(
  facultyEmail: string,
  ticketId:     string,
  studentName:  string,
  subject:      string,
): void {
  pushNotification({
    type:    'new_ticket',
    to:      `faculty:${facultyEmail}`,
    title:   'New Helpdesk Ticket',
    body:    `${studentName} submitted a ticket: "${subject}"`,
    href:    '/faculty/helpdesk',
    metaId:  ticketId,
  })
}

/** Student receives a reply / resolution from faculty */
export function notifyStudentHelpdeskReply(
  studentEmail: string,
  ticketId:     string,
  subject:      string,
  isResolved:   boolean,
): void {
  pushNotification({
    type:    'helpdesk_reply',
    to:      `student:${studentEmail}`,
    title:   isResolved ? 'Ticket Resolved' : 'Faculty Replied',
    body:    isResolved
      ? `Your ticket "${subject}" has been resolved.`
      : `Faculty replied to your ticket: "${subject}"`,
    href:    '/student/helpdesk',
    metaId:  ticketId,
  })
}

/** Faculty is notified that a new subject was assigned to them */
export function notifyFacultySubjectAssigned(
  facultyEmail: string,
  subjectName:  string,
  subjectId:    string,
): void {
  pushNotification({
    type:    'subject_assigned',
    to:      `faculty:${facultyEmail}`,
    title:   'New Subject Assigned',
    body:    `You have been assigned to teach "${subjectName}".`,
    href:    '/faculty/courses',
    metaId:  subjectId,
  })
}

/** Faculty is reminded to mark attendance for a specific session */
export function notifyFacultyAttendanceReminder(
  facultyEmail: string,
  subjectLabel: string,
  dedupeKey:    string,   // e.g. "sub-1|2026-02-27"
): void {
  pushNotification({
    type:    'attendance_reminder',
    to:      `faculty:${facultyEmail}`,
    title:   'Attendance Not Marked',
    body:    `You haven't submitted attendance for "${subjectLabel}" today.`,
    href:    '/faculty/attendance',
    metaId:  dedupeKey,
  })
}

/** Student receives an absent notification */
export function notifyStudentAbsent(
  studentEmail: string,
  studentId:    string,
  subjectLabel: string,
  date:         string,
): void {
  pushNotification({
    type:    'absent_marked',
    to:      `student:${studentEmail}`,
    title:   'Marked Absent',
    body:    `You were marked absent in "${subjectLabel}" on ${date}.`,
    href:    '/student/attendance',
    metaId:  `${studentId}|${subjectLabel}|${date}`,
  })
}

/** Faculty is alerted that a student has been absent 5+ consecutive classes */
export function notifyFacultyConsecutiveAbsent(
  facultyEmail:  string,
  studentName:   string,
  studentId:     string,
  subjectLabel:  string,
  count:         number,
): void {
  pushNotification({
    type:    'consecutive_absent',
    to:      `faculty:${facultyEmail}`,
    title:   'Consecutive Absence Alert',
    body:    `${studentName} has been absent for ${count} consecutive classes in "${subjectLabel}".`,
    href:    '/faculty/attendance',
    metaId:  `${studentId}|${subjectLabel}|consec`,
  })
}

/** HoD receives a ticket escalation notification */
export function notifyHodEscalation(
  ticketId:    string,
  subject:     string,
  raisedBy:   string,
): void {
  pushNotification({
    type:    'hod_escalation',
    to:      'hod',
    title:   'Ticket Escalated to You',
    body:    `"${subject}" was escalated by ${raisedBy} and needs your attention.`,
    href:    '/hod/dashboard',
    metaId:  ticketId,
  })
}

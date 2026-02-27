/**
 * Centralized API client for Smart Attendance backend.
 * All authenticated requests include the JWT from localStorage.
 *
 * Base URL is read from VITE_API_BASE_URL (set in .env).
 * Falls back to http://localhost:3000 so the app still works without .env.
 */

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000'

// ─── Token helpers ────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem('sa_token')
}

export function setToken(token: string) {
  localStorage.setItem('sa_token', token)
}

export function clearToken() {
  localStorage.removeItem('sa_token')
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers as Record<string, string> | undefined),
    },
  })
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const body = await res.json()
      if (body?.message) msg = body.message
    } catch { /* ignore */ }
    throw new Error(msg)
  }
  // 204 No Content
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ─── Shared types (mirrors backend) ──────────────────────────────────────────

export interface ApiUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'faculty' | 'student'
}

export interface LoginResponse {
  token: string
  user: ApiUser
}

export interface FacultyRequest {
  _id: string
  name: string
  email: string
  phone?: string
  dob?: string
  facultyId?: string
  status: 'pending' | 'approved' | 'rejected'
  note?: string
  createdAt?: string
}

export interface Student {
  _id: string
  name: string
  email: string
  rollNo: string   // plain-text registration number (for display)
  regNo?: string   // hashed — may be absent from API responses
  phone?: string
  classId?: string[]   // array of subject codes the student is enrolled in
  addedBy?: string
}

export interface Subject {
  _id: string
  name: string
  code: string
  assignedFaculty: { name: string; email: string }[]
}

export interface HelpdeskMessage {
  sender: 'student' | 'faculty'
  name: string
  text: string
  sentAt: string
}

export interface HelpdeskTicket {
  _id: string
  studentEmail: string
  studentName: string
  facultyEmail: string
  subject: string
  status: 'open' | 'resolved'
  awaitingResponse: boolean
  notifyHod: boolean
  messages: HelpdeskMessage[]
  createdAt: string
  updatedAt?: string
}

export interface AdminStats {
  totalFaculty: number
  totalStudents: number
  totalSubjects: number
  pendingRequests: number
  openTickets: number
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export function apiLogin(email: string, password: string) {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export function apiSignup(data: {
  name: string
  email: string
  phone: string
  dob: string
  facultyId: string
  password: string
}) {
  return apiFetch<{ message: string }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// ─── Admin / HoD ─────────────────────────────────────────────────────────────

export function apiGetStats() {
  return apiFetch<AdminStats>('/admin/stats')
}

export function apiGetFaculty(status?: 'pending' | 'approved' | 'rejected') {
  const q = status ? `?status=${status}` : ''
  return apiFetch<FacultyRequest[]>(`/admin/faculty${q}`)
}

export function apiUpdateFacultyStatus(
  id: string,
  status: 'approved' | 'rejected',
  note?: string,
) {
  return apiFetch<FacultyRequest>(`/admin/faculty/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  })
}

export function apiGetStudents() {
  return apiFetch<Student[]>('/admin/students')
}

export function apiAddStudent(data: {
  name: string
  email: string
  regNo: string
  phone?: string
  classId?: string
}) {
  return apiFetch<Student>('/admin/students', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function apiBulkAddStudents(rows: Array<{
  name: string
  email: string
  regNo: string
  phone?: string
  classId?: string
}>) {
  return apiFetch<{ added: number; skipped: number }>('/admin/students/bulk', {
    method: 'POST',
    body: JSON.stringify(rows),
  })
}

export function apiDeleteStudent(id: string) {
  return apiFetch<void>(`/admin/students/${id}`, { method: 'DELETE' })
}

export function apiGetSubjects() {
  return apiFetch<Subject[]>('/admin/subjects')
}

export function apiCreateSubject(data: { name: string; code: string }) {
  return apiFetch<Subject>('/admin/subjects', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function apiDeleteSubject(id: string) {
  return apiFetch<void>(`/admin/subjects/${id}`, { method: 'DELETE' })
}

export function apiAssignFaculty(subjectId: string, facultyEmail: string) {
  return apiFetch<Subject>(`/admin/subjects/${subjectId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify({ facultyEmail }),
  })
}

export function apiRemoveFaculty(subjectId: string, facultyEmail: string) {
  return apiFetch<Subject>(`/admin/subjects/${subjectId}/faculty/${encodeURIComponent(facultyEmail)}`, {
    method: 'DELETE',
  })
}

export function apiGetHodTickets(params?: { escalated?: boolean; status?: 'open' | 'resolved' }) {
  const q = new URLSearchParams()
  if (params?.escalated) q.set('escalated', 'true')
  if (params?.status) q.set('status', params.status)
  const qs = q.toString() ? `?${q}` : ''
  return apiFetch<HelpdeskTicket[]>(`/admin/helpdesk${qs}`)
}

// ─── Faculty ──────────────────────────────────────────────────────────────────

export function apiFacultyGetStudents(classId?: string) {
  const q = classId ? `?classId=${encodeURIComponent(classId)}` : ''
  return apiFetch<Student[]>(`/faculty/students${q}`)
}

export function apiFacultyAddStudent(data: {
  name: string
  email: string
  regNo: string
  phone?: string
  classId?: string
}) {
  return apiFetch<Student>('/faculty/students', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function apiFacultyGetSubjects() {
  return apiFetch<Subject[]>('/faculty/subjects')
}

export function apiFacultyGetTickets(status?: 'open' | 'resolved') {
  const q = status ? `?status=${status}` : ''
  return apiFetch<HelpdeskTicket[]>(`/faculty/helpdesk${q}`)
}

export function apiFacultyReply(ticketId: string, text: string) {
  return apiFetch<HelpdeskTicket>(`/faculty/helpdesk/${ticketId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

export function apiFacultyResolve(ticketId: string, reply?: string) {
  return apiFetch<HelpdeskTicket>(`/faculty/helpdesk/${ticketId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ reply }),
  })
}

export function apiFacultyToggleAwaiting(ticketId: string, value: boolean) {
  return apiFetch<HelpdeskTicket>(`/faculty/helpdesk/${ticketId}/awaiting`, {
    method: 'PATCH',
    body: JSON.stringify({ value }),
  })
}

export function apiFacultyToggleNotifyHod(ticketId: string, value: boolean) {
  return apiFetch<HelpdeskTicket>(`/faculty/helpdesk/${ticketId}/notify-hod`, {
    method: 'PATCH',
    body: JSON.stringify({ value }),
  })
}

// ─── Student ──────────────────────────────────────────────────────────────────

export function apiStudentGetTickets() {
  return apiFetch<HelpdeskTicket[]>('/student/helpdesk')
}

export function apiStudentCreateTicket(data: {
  facultyEmail: string
  subject: string
  message: string
}) {
  return apiFetch<HelpdeskTicket>('/student/helpdesk', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function apiStudentFollowUp(ticketId: string, text: string) {
  return apiFetch<HelpdeskTicket>(`/student/helpdesk/${ticketId}/followup`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

export function apiStudentToggleNotifyHod(ticketId: string, value: boolean) {
  return apiFetch<HelpdeskTicket>(`/student/helpdesk/${ticketId}/notify-hod`, {
    method: 'PATCH',
    body: JSON.stringify({ value }),
  })
}

export function apiStudentGetAttendance(params?: {
  subjectId?: string
  from?: string
  to?: string
}) {
  const q = new URLSearchParams()
  if (params?.subjectId) q.set('subjectId', params.subjectId)
  if (params?.from) q.set('from', params.from)
  if (params?.to) q.set('to', params.to)
  const qs = q.toString() ? `?${q}` : ''
  return apiFetch<unknown[]>(`/student/attendance${qs}`)
}

// ─── Attendance sync ──────────────────────────────────────────────────────────

export function apiSyncAttendance(records: unknown[]) {
  return apiFetch<{ synced: number }>('/attendance/sync', {
    method: 'POST',
    body: JSON.stringify(records),
  })
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export type Role = 'faculty' | 'student' | 'hod'

export interface AuthUser {
  id:    string
  name:  string
  email: string
  role:  Role
}

// Map each role to its home route after login
export const ROLE_HOME: Record<Role, string> = {
  faculty: '/faculty/dashboard',
  student: '/student/dashboard',
  hod:     '/hod/dashboard',
}

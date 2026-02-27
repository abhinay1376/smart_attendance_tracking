import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

// Auth
import Login           from '@/pages/Login'
import FacultySignup  from '@/pages/FacultySignup'
import ProtectedRoute  from '@/components/auth/ProtectedRoute'
import AppShell        from '@/components/layout/AppShell'
import NotFound        from '@/pages/NotFound'

// Role dashboards
import FacultyDashboard   from '@/pages/faculty/Dashboard'
import FacultyCourses     from '@/pages/faculty/Courses'
import FacultyHelpdesk   from '@/pages/faculty/Helpdesk'
import MarkAttendance     from '@/pages/faculty/MarkAttendance'
import AttendanceData     from '@/pages/faculty/AttendanceData'
import StudentDashboard  from '@/pages/student/Dashboard'
import StudentClasses    from '@/pages/student/Classes'
import StudentHelpdesk   from '@/pages/student/Helpdesk'
import HodDashboard      from '@/pages/hod/Dashboard'
import HodFaculty        from '@/pages/hod/Faculty'
import HodStudents       from '@/pages/hod/Students'
import HodRequests       from '@/pages/hod/Requests'
import HodSubjects       from '@/pages/hod/Subjects'
import HodUploadStudents from '@/pages/hod/UploadStudents'
import HodAttendance     from '@/pages/hod/HodAttendance'

// Shared pages
import Attendance from '@/pages/Attendance'
import Reports    from '@/pages/Reports'
import Settings   from '@/pages/Settings'
import { ROLE_HOME } from '@/types/auth'

/**
 * RootRedirect
 * When an authenticated user hits "/" redirect them to their role home;
 * unauthenticated users go to /login.
 */
function RootRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Navigate to={ROLE_HOME[user!.role]} replace />
}

/**
 * App – role-based route tree
 * ─────────────────────────────────────────────────────────────────────────
 *
 * /                 → redirect (role-aware)
 * /login            → public login page
 *
 * /faculty/*        → ProtectedRoute (role: faculty)
 *   /faculty/dashboard
 *   /faculty/attendance
 *   /faculty/reports
 *   /faculty/settings
 *
 * /student/*        → ProtectedRoute (role: student)
 *   /student/dashboard
 *   /student/attendance
 *   /student/settings
 *
 * /hod/*            → ProtectedRoute (role: hod)
 *   /hod/dashboard
 *   /hod/attendance
 *   /hod/reports
 *   /hod/settings
 */
export default function App() {
  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/"              element={<RootRedirect />} />
      <Route path="/login"         element={<Login />} />
      <Route path="/signup/faculty" element={<FacultySignup />} />

      {/* ──────────────────────────────────────────── */}
      {/* Faculty routes                                          */}
      {/* ──────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
        <Route element={<AppShell />}>
          <Route path="/faculty/dashboard"  element={<FacultyDashboard />} />
          <Route path="/faculty/attendance"      element={<MarkAttendance />} />
          <Route path="/faculty/attendance-data" element={<AttendanceData />} />
          <Route path="/faculty/courses"          element={<FacultyCourses />} />
          <Route path="/faculty/helpdesk"   element={<FacultyHelpdesk />} />
          <Route path="/faculty/reports"    element={<Reports />} />
          <Route path="/faculty/settings"   element={<Settings />} />
        </Route>
      </Route>

      {/* ──────────────────────────────────────────── */}
      {/* Student routes                                          */}
      {/* ──────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route element={<AppShell />}>
          <Route path="/student/dashboard"  element={<StudentDashboard />} />
          <Route path="/student/classes"    element={<StudentClasses />} />
          <Route path="/student/attendance" element={<Attendance />} />
          <Route path="/student/helpdesk"   element={<StudentHelpdesk />} />
          <Route path="/student/settings"   element={<Settings />} />
        </Route>
      </Route>

      {/* ──────────────────────────────────────────── */}
      {/* HoD routes                                              */}
      {/* ──────────────────────────────────────────── */}
      <Route element={<ProtectedRoute allowedRoles={['hod']} />}>
        <Route element={<AppShell />}>
          <Route path="/hod/dashboard"       element={<HodDashboard />} />
          <Route path="/hod/faculty"         element={<HodFaculty />} />
          <Route path="/hod/students"        element={<HodStudents />} />
          <Route path="/hod/upload-students" element={<HodUploadStudents />} />
          <Route path="/hod/subjects"        element={<HodSubjects />} />
          <Route path="/hod/requests"        element={<HodRequests />} />
          <Route path="/hod/attendance"      element={<HodAttendance />} />
          <Route path="/hod/reports"         element={<Reports />} />
          <Route path="/hod/settings"        element={<Settings />} />
        </Route>
      </Route>

      {/* ── 404 ── */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

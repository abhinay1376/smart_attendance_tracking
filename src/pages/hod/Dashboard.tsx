import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, GraduationCap, ClipboardCheck, BarChart3, AlertCircle, ChevronRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { apiGetStats, type AdminStats } from '@/services/api'

export default function HodDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<AdminStats>({
    totalFaculty: 0, totalStudents: 0, totalSubjects: 0, pendingRequests: 0, openTickets: 0,
  })

  useEffect(() => {
    apiGetStats()
      .then(setStats)
      .catch((err) => console.error('Failed to load stats:', err))
  }, [])

  const STATS = [
    { label: 'Total Faculty',     value: stats.totalFaculty,   icon: Users,          color: 'text-indigo-500',  bg: 'bg-indigo-50'  },
    { label: 'Total Students',    value: stats.totalStudents,  icon: GraduationCap,  color: 'text-violet-500',  bg: 'bg-violet-50'  },
    { label: 'Total Subjects',    value: stats.totalSubjects,  icon: ClipboardCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Open Help Tickets', value: stats.openTickets,    icon: BarChart3,      color: 'text-amber-500',   bg: 'bg-amber-50'   },
  ] as const

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Department Overview – {user?.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor department-wide attendance, faculty performance, and compliance.
        </p>
      </div>

      {/* Pending faculty requests banner */}
      {stats.pendingRequests > 0 && (
        <Link
          to="/hod/requests"
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 transition-colors hover:bg-amber-100"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800">
                {stats.pendingRequests} Faculty Registration Request{stats.pendingRequests > 1 ? 's' : ''} Pending
              </p>
              <p className="text-amber-700 text-xs">Review and approve or reject pending faculty signups.</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-amber-600" />
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                <Icon size={15} className={color} />
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">{value}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Upload Students',  to: '/hod/upload-students', color: 'bg-indigo-600 text-white hover:bg-indigo-700'        },
          { label: 'Manage Subjects',  to: '/hod/subjects',        color: 'bg-violet-600 text-white hover:bg-violet-700'        },
          { label: 'Faculty Roster',   to: '/hod/faculty',         color: 'bg-white text-slate-800 border border-border hover:bg-slate-50' },
          { label: 'View Requests',    to: '/hod/requests',        color: 'bg-amber-500 text-white hover:bg-amber-600'          },
        ].map(({ label, to, color }) => (
          <Link
            key={to}
            to={to}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold shadow-sm transition-all active:scale-95 ${color}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Placeholder table */}
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        Faculty attendance compliance table and alerts will render here.
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { BookOpen, ChevronRight, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiFacultyGetSubjects, type Subject } from '@/services/api'

export default function FacultyCourses() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    apiFacultyGetSubjects()
      .then(setSubjects)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load subjects.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All subjects assigned to you this semester.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading courses…
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {!loading && !error && subjects.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          <BookOpen size={32} className="mx-auto mb-3 opacity-30" />
          No subjects assigned yet. Ask the HoD to assign subjects to you.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((sub) => (
          <div
            key={sub._id}
            className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100">
                <BookOpen size={16} className="text-indigo-600" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{sub.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-mono">{sub.code}</p>
              </div>
            </div>

            <Link
              to="/faculty/attendance"
              className="mt-4 flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Mark attendance <ChevronRight size={12} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

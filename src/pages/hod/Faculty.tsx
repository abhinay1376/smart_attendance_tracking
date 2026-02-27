import { useEffect, useState } from 'react'
import { Users, Mail, BookOpen, Loader2 } from 'lucide-react'
import { apiGetFaculty, type FacultyRequest } from '@/services/api'

export default function HodFaculty() {
  const [faculty,  setFaculty]  = useState<FacultyRequest[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    apiGetFaculty('approved')
      .then(setFaculty)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load faculty.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Faculty</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All approved faculty members in your department.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading faculty…
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* Summary */}
          <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-3.5">
            <Users size={18} className="text-indigo-500 shrink-0" />
            <p className="text-sm font-medium text-indigo-700">
              {faculty.length} approved faculty member{faculty.length !== 1 ? 's' : ''} in the department
            </p>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {faculty.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <Users size={32} className="mx-auto mb-3 opacity-30" />
                No approved faculty yet. Approve requests from the Requests page.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {faculty.map((f) => (
                  <div key={f._id} className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                        {f.name.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{f.name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail size={10} /> {f.email}
                        </p>
                      </div>
                    </div>
                    {f.facultyId && (
                      <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 self-start sm:self-auto">
                        <BookOpen size={10} /> ID: {f.facultyId}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}


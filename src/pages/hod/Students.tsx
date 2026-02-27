import { useEffect, useState } from 'react'
import { GraduationCap, Loader2 } from 'lucide-react'
import { apiGetStudents, apiDeleteStudent, type Student } from '@/services/api'

export default function HodStudents() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiGetStudents()
      setStudents(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void refresh() }, [])

  async function handleDelete(id: string) {
    try {
      await apiDeleteStudent(id)
      setStudents((prev) => prev.filter((s) => s._id !== id))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Students</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Department-wide student roster.
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-2.5">
          <GraduationCap size={15} className="text-indigo-500" />
          <span className="text-sm font-medium text-indigo-700">{students.length} students</span>
        </div>
      </div>

      {/* Loading / error */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading students…
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {students.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <GraduationCap size={32} className="mx-auto mb-3 opacity-30" />
              No students registered yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th className="px-4 sm:px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Student</th>
                    <th className="px-4 sm:px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Reg No.</th>
                    <th className="px-4 sm:px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Email</th>
                    <th className="px-4 sm:px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:table-cell">Phone</th>
                    <th className="px-4 sm:px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map((std) => (
                    <tr key={std._id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 sm:px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                            {std.name.charAt(0)}
                          </span>
                          <div className="min-w-0">
                            <span className="block font-medium text-foreground">{std.name}</span>
                            <span className="block text-xs text-muted-foreground sm:hidden">{std.regNo}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3.5 text-muted-foreground hidden sm:table-cell">{std.regNo}</td>
                      <td className="px-4 sm:px-5 py-3.5 text-muted-foreground hidden sm:table-cell">{std.email}</td>
                      <td className="px-4 sm:px-5 py-3.5 text-muted-foreground hidden sm:table-cell">{std.phone || '—'}</td>
                      <td className="px-4 sm:px-5 py-3.5 text-right">
                        <button
                          onClick={() => void handleDelete(std._id)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-rose-500 hover:bg-rose-50 transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}


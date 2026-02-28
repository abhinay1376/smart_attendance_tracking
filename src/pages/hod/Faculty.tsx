import { useEffect, useMemo, useState } from 'react'
import { Users, Mail, BookOpen, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { apiGetFaculty, type FacultyRequest } from '@/services/api'
import { Input } from '@/components/ui/input'

type SortField = 'name' | 'email' | 'facultyId'
type SortDir   = 'asc' | 'desc'

function SortBtn({
  field, active, dir, onClick,
}: { field: SortField; active: boolean; dir: SortDir; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
    >
      {field === 'facultyId' ? 'Faculty ID' : field.charAt(0).toUpperCase() + field.slice(1)}
      {active
        ? dir === 'asc'
          ? <ArrowUp size={11} className="text-indigo-500" />
          : <ArrowDown size={11} className="text-indigo-500" />
        : <ArrowUpDown size={11} className="opacity-40" />}
    </button>
  )
}

export default function HodFaculty() {
  const [faculty,   setFaculty]   = useState<FacultyRequest[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [search,    setSearch]    = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir,   setSortDir]   = useState<SortDir>('asc')

  useEffect(() => {
    apiGetFaculty('approved')
      .then(setFaculty)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load faculty.'))
      .finally(() => setLoading(false))
  }, [])

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return faculty
      .filter((f) =>
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.email.toLowerCase().includes(q) ||
        (f.facultyId ?? '').toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const av = ((a[sortField] ?? '') as string).toLowerCase()
        const bv = ((b[sortField] ?? '') as string).toLowerCase()
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
  }, [faculty, search, sortField, sortDir])

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
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50 px-5 py-3">
              <Users size={16} className="text-indigo-500 shrink-0" />
              <p className="text-sm font-medium text-indigo-700">
                {faculty.length} approved faculty member{faculty.length !== 1 ? 's' : ''}
                {search && filtered.length !== faculty.length && (
                  <span className="ml-1 text-indigo-500">({filtered.length} shown)</span>
                )}
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search name, email, ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            {faculty.length === 0 ? (
              <div className="p-12 text-center text-sm text-muted-foreground">
                <Users size={32} className="mx-auto mb-3 opacity-30" />
                No approved faculty yet. Approve requests from the Requests page.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40">
                    <tr>
                      <th className="px-5 py-3 text-left">
                        <SortBtn field="name" active={sortField === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
                      </th>
                      <th className="px-5 py-3 text-left hidden sm:table-cell">
                        <SortBtn field="email" active={sortField === 'email'} dir={sortDir} onClick={() => toggleSort('email')} />
                      </th>
                      <th className="px-5 py-3 text-left hidden md:table-cell">
                        <SortBtn field="facultyId" active={sortField === 'facultyId'} dir={sortDir} onClick={() => toggleSort('facultyId')} />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-10 text-center text-sm text-muted-foreground">
                          No faculty match &ldquo;{search}&rdquo;.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((f) => (
                        <tr key={f._id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                                {f.name.charAt(0).toUpperCase()}
                              </span>
                              <span className="font-medium text-foreground">{f.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 hidden sm:table-cell">
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Mail size={11} className="shrink-0" /> {f.email}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            {f.facultyId ? (
                              <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 w-fit">
                                <BookOpen size={10} /> {f.facultyId}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

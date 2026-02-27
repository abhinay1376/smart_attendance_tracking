/**
 * HodAttendance
 * ─────────────────────────────────────────────────────────────────────────
 * Admin/HoD view of attendance records for every student.
 *
 * Data flow:
 *  - IndexedDB  → all locally-saved AttendanceRecords
 *  - API        → full student list (name, regNo, classId)
 *
 * Displays a filterable table: one row per student with total, present,
 * absent, active-session count and overall percentage.
 */

import { useEffect, useMemo, useState } from 'react'
import { Users, Search, Zap, CheckCircle2, AlertCircle } from 'lucide-react'

import { getAllRecords }              from '@/services/db'
import { apiGetStudents, type Student } from '@/services/api'
import { cn }                         from '@/utils/helpers'
import { Input }                      from '@/components/ui/input'
import { Badge }                      from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentStat {
  student:    Student
  total:      number
  present:    number
  absent:     number
  active:     number
  percentage: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pctColor(pct: number): string {
  if (pct >= 85)  return '#10b981'
  if (pct >= 75)  return '#6366f1'
  if (pct >= 60)  return '#f59e0b'
  return '#ef4444'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HodAttendance() {
  const [stats,     setStats]     = useState<StudentStat[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [search,    setSearch]    = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [students, allRecords] = await Promise.all([
          apiGetStudents(),
          getAllRecords(),
        ])

        if (cancelled) return

        // Build per-student map of attendance stats
        const built: StudentStat[] = students.map((s) => {
          const recs    = allRecords.filter((r) => r.studentId === s._id)
          const present = recs.filter((r) => r.status === 'present').length
          const absent  = recs.length - present
          const active  = recs.filter((r) => r.active === true).length
          const pct     = recs.length > 0 ? Math.round((present / recs.length) * 100) : 0
          return {
            student:    s,
            total:      recs.length,
            present,
            absent,
            active,
            percentage: pct,
          }
        })

        // Sort: students with sessions first, then alphabetically
        built.sort((a, b) => {
          if (b.total !== a.total) return b.total - a.total
          return a.student.name.localeCompare(b.student.name)
        })

        setStats(built)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load data.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  // ── Filter by search ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return stats
    return stats.filter(
      (s) =>
        s.student.name.toLowerCase().includes(q) ||
        (s.student.regNo ?? '').toLowerCase().includes(q) ||
        (Array.isArray(s.student.classId)
          ? s.student.classId.join(',')
          : s.student.classId ?? ''
        ).toLowerCase().includes(q),
    )
  }, [stats, search])

  // ── Summary counts ──────────────────────────────────────────────────────────
  const totalSessions = stats.reduce((acc, s) => acc + s.total, 0)
  const totalActive   = stats.reduce((acc, s) => acc + s.active, 0)
  const lowCount      = stats.filter((s) => s.total > 0 && s.percentage < 75).length

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Student Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of attendance records for all enrolled students.
        </p>
      </div>

      {/* ── Summary strip ──────────────────────────────────────────────────── */}
      {!loading && !error && (
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs font-medium">
            <Users size={12} />
            {stats.length} Students
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs font-medium">
            <CheckCircle2 size={12} className="text-emerald-500" />
            {totalSessions} Sessions recorded
          </Badge>
          <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-xs font-medium">
            <Zap size={12} className="text-violet-500" />
            {totalActive} Active marks
          </Badge>
          {lowCount > 0 && (
            <Badge variant="destructive" className="gap-1.5 px-3 py-1.5 text-xs font-medium">
              <AlertCircle size={12} />
              {lowCount} Below 75%
            </Badge>
          )}
        </div>
      )}

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, reg no, or subject…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Table card ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users size={16} className="text-primary" />
            Attendance Records
          </CardTitle>
          <CardDescription>
            Data sourced from locally saved records. Sync to include offline sessions.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading && (
            <div className="space-y-2 p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-6 text-sm text-destructive">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="rounded-xl border-dashed p-12 text-center">
              <Users size={32} className="mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {search ? 'No students match your search.' : 'No students found.'}
              </p>
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground w-10">#</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reg No</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Present</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Absent</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                      <span className="flex items-center justify-center gap-1">
                        <Zap size={12} className="text-violet-500" />
                        Active
                      </span>
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s, idx) => (
                    <tr
                      key={s.student._id}
                      className={cn(
                        'transition-colors hover:bg-muted/30',
                        s.total > 0 && s.percentage < 75 && 'bg-rose-50/50',
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{s.student.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {s.student.regNo ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums">
                        {s.total > 0 ? s.total : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-emerald-600 font-medium">
                        {s.total > 0 ? s.present : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-rose-500 font-medium">
                        {s.total > 0 ? s.absent : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-violet-600 font-medium">
                        {s.total > 0 ? s.active : <span className="text-muted-foreground/40">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.total > 0 ? (
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-bold"
                            style={{
                              color:           pctColor(s.percentage),
                              backgroundColor: pctColor(s.percentage) + '1a',
                            }}
                          >
                            {s.percentage}%
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs">No data</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

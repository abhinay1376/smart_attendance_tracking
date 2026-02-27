/**
 * HodAttendance
 * ─────────────────────────────────────────────────────────────────────────
 * Admin view: per-student attendance summary pulled from IndexedDB.
 * Shows total sessions, present, absent, active count, and overall %.
 * Also filterable by subject code.
 */

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Search, Users, Zap, CheckCircle2, AlertCircle } from 'lucide-react'
import { getAllRecords, type AttendanceRecord } from '@/services/db'
import { apiGetStudents, type Student } from '@/services/api'
import { cn }            from '@/utils/helpers'
import { Input }         from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface StudentSummary {
  studentId:  string
  name:       string
  regNo:      string
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

function PctBadge({ pct }: { pct: number }) {
  const color = pctColor(pct)
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
      style={{ background: `${color}18`, color }}
    >
      {pct}%
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HodAttendance() {
  const [allRecords,  setAllRecords]  = useState<AttendanceRecord[]>([])
  const [studentMap,  setStudentMap]  = useState<Map<string, Student>>(new Map())
  const [subjects,    setSubjects]    = useState<string[]>([])
  const [filterSubj,  setFilterSubj]  = useState<string>('all')
  const [search,      setSearch]      = useState('')
  const [isLoading,   setIsLoading]   = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [records, apiStudents] = await Promise.all([
          getAllRecords(),
          apiGetStudents().catch(() => [] as Student[]),
        ])

        const sMap = new Map<string, Student>(
          apiStudents.map((s) => [s._id, s]),
        )
        setAllRecords(records)
        setStudentMap(sMap)

        const subjectSet = new Set<string>()
        for (const rec of records) subjectSet.add(rec.subjectId)
        setSubjects(Array.from(subjectSet).sort())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load attendance data.')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [])

  // ── Derive summaries reactively (re-runs when subject filter changes) ────────
  const summaries = useMemo<StudentSummary[]>(() => {
    const relevant = filterSubj === 'all'
      ? allRecords
      : allRecords.filter((r) => r.subjectId === filterSubj)

    const map = new Map<string, { total: number; present: number; absent: number; active: number }>()
    for (const rec of relevant) {
      const entry = map.get(rec.studentId) ?? { total: 0, present: 0, absent: 0, active: 0 }
      entry.total++
      if (rec.status === 'present') entry.present++
      if (rec.status === 'absent')  entry.absent++
      if (rec.active)               entry.active++
      map.set(rec.studentId, entry)
    }

    return Array.from(map.entries())
      .map(([id, e]) => {
        const student = studentMap.get(id)
        return {
          studentId:  id,
          name:       student?.name  ?? 'Unknown Student',
            regNo:      student?.rollNo ?? id.slice(-6).toUpperCase(),
          total:      e.total,
          present:    e.present,
          absent:     e.absent,
          active:     e.active,
          percentage: e.total > 0 ? Math.round((e.present / e.total) * 100) : 0,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allRecords, studentMap, filterSubj])

  // ── Filtered+searched view ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return summaries.filter((s) => {
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.regNo.toLowerCase().includes(q)
      return matchSearch
    })
  }, [summaries, search])

  // ── Aggregates ──────────────────────────────────────────────────────────────
  const totalStudents  = filtered.length
  const totalPresent   = filtered.reduce((a, s) => a + s.present, 0)
  const totalSessions  = filtered.reduce((a, s) => a + s.total,   0)
  const totalActive    = filtered.reduce((a, s) => a + s.active,  0)
  const overallPct     = totalSessions > 0
    ? Math.round((totalPresent / totalSessions) * 100)
    : 0

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Student Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of all students' attendance records (from local session data).
        </p>
      </div>

      {/* ── Summary cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Students',       value: String(totalStudents), icon: Users,         color: '#6366f1' },
          { label: 'Overall',        value: `${overallPct}%`,      icon: CheckCircle2,  color: pctColor(overallPct) },
          { label: 'Total Present',  value: String(totalPresent),  icon: CheckCircle2,  color: '#10b981' },
          { label: 'Active Marks',   value: String(totalActive),   icon: Zap,           color: '#8b5cf6' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon size={15} style={{ color }} />
            </div>
            <p className="mt-2 text-2xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or reg. no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={filterSubj} onValueChange={setFilterSubj}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="All subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users size={16} className="text-primary" />
                Student Records
              </CardTitle>
              <CardDescription className="mt-1">
                {totalStudents} student{totalStudents !== 1 ? 's' : ''} · data from offline session records
              </CardDescription>
            </div>
            {totalStudents > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Badge variant="success"  className="gap-1 text-xs">{totalPresent} Present</Badge>
                <Badge variant="secondary" className="gap-1 text-xs">{totalActive} Active</Badge>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 size={28} className="animate-spin text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">Loading records…</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex items-center gap-2 px-6 py-8 text-sm text-destructive">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {!isLoading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Users size={32} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {summaries.length === 0
                  ? 'No attendance records found. Faculty must mark attendance first.'
                  : 'No students match your search.'}
              </p>
            </div>
          )}

          {!isLoading && !error && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reg. No</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground text-emerald-600">Present</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground text-rose-500">Absent</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground text-indigo-500">Active</th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s, i) => (
                    <tr
                      key={s.studentId}
                      className={cn(
                        'transition-colors hover:bg-muted/30',
                        s.percentage < 75 && 'bg-rose-50/50',
                      )}
                    >
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                        {String(i + 1).padStart(2, '0')}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{s.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.regNo}</td>
                      <td className="px-4 py-3 text-center tabular-nums">{s.total}</td>
                      <td className="px-4 py-3 text-center tabular-nums font-semibold text-emerald-600">{s.present}</td>
                      <td className="px-4 py-3 text-center tabular-nums font-semibold text-rose-500">{s.absent}</td>
                      <td className="px-4 py-3 text-center">
                        {s.active > 0 ? (
                          <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold">
                            <Zap size={11} />{s.active}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <PctBadge pct={s.percentage} />
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

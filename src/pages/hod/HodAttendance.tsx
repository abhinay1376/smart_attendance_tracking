import { useEffect, useMemo, useState } from 'react'
import {
  Users,
  TrendingUp,
  CheckCircle2,
  Zap,
  Search,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getAllRecords, type AttendanceRecord } from '@/services/db'
import { apiGetStudents, apiGetSubjects, type Student, type Subject } from '@/services/api'
import { seedDemoDataIfEmpty } from '@/utils/seedDemoData'

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Component ────────────────────────────────────────────────────────────────

export default function HodAttendance() {
  const [allRecords,  setAllRecords]  = useState<AttendanceRecord[]>([])
  const [studentMap,  setStudentMap]  = useState<Map<string, Student>>(new Map())
  const [subjectMap,  setSubjectMap]  = useState<Map<string, Subject>>(new Map())
  const [subjects,    setSubjects]    = useState<string[]>([])
  const [filterSubj,  setFilterSubj]  = useState<string>('all')
  const [search,      setSearch]      = useState('')
  const [isLoading,   setIsLoading]   = useState(true)
  const [error,       setError]       = useState<string | null>(null)

  // ── Load data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await seedDemoDataIfEmpty()
        const [records, students, subjectsData] = await Promise.all([
          getAllRecords(),
          apiGetStudents().catch(() => [] as Student[]),
          apiGetSubjects().catch(() => [] as Subject[]),
        ])
        if (cancelled) return

        const map = new Map<string, Student>()
        students.forEach((s) => map.set(s._id, s))

        const sMap = new Map<string, Subject>()
        subjectsData.forEach((s) => sMap.set(s._id, s))

        const uniqueSubjects = Array.from(
          new Set(records.map((r) => r.subjectId).filter(Boolean)),
        ).sort()

        setAllRecords(records)
        setStudentMap(map)
        setSubjectMap(sMap)
        setSubjects(uniqueSubjects)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load attendance data')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ── Derived summaries (filtered by subject) ───────────────────────────────

  const summaries = useMemo<StudentSummary[]>(() => {
    const filtered = filterSubj === 'all'
      ? allRecords
      : allRecords.filter((r) => r.subjectId === filterSubj)

    const byStudent = new Map<string, AttendanceRecord[]>()
    filtered.forEach((r) => {
      const arr = byStudent.get(r.studentId) ?? []
      arr.push(r)
      byStudent.set(r.studentId, arr)
    })

    const rows: StudentSummary[] = []
    byStudent.forEach((records, studentId) => {
      const student = studentMap.get(studentId)
      const total   = records.length
      const present = records.filter((r) => r.status === 'present').length
      const active  = records.filter((r) => r.active === true).length
      const absent  = total - present
      rows.push({
        studentId,
        name:       student?.name   ?? studentId,
        regNo:      student?.regNo  ?? '—',
        total,
        present,
        absent,
        active,
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      })
    })

    return rows.sort((a, b) => a.name.localeCompare(b.name))
  }, [allRecords, studentMap, filterSubj])

  // ── Search filter ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search.trim()) return summaries
    const q = search.toLowerCase()
    return summaries.filter(
      (s) => s.name.toLowerCase().includes(q) || s.regNo.toLowerCase().includes(q),
    )
  }, [summaries, search])

  // ── Aggregate stats ────────────────────────────────────────────────────────

  const totalStudents  = summaries.length
  const totalPresent   = summaries.reduce((a, s) => a + s.present, 0)
  const totalSessions  = summaries.reduce((a, s) => a + s.total, 0)
  const overallPct     = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0
  const totalActive    = summaries.reduce((a, s) => a + s.active, 0)

  // ── Stat cards ─────────────────────────────────────────────────────────────

  const statCards = [
    { label: 'Total Students',   value: String(totalStudents), Icon: Users,        color: '#3b82f6' },
    { label: 'Overall %',        value: `${overallPct}%`,      Icon: TrendingUp,   color: overallPct >= 75 ? '#10b981' : '#f59e0b' },
    { label: 'Total Present',    value: String(totalPresent),  Icon: CheckCircle2, color: '#10b981' },
    { label: 'Active Marks',     value: String(totalActive),   Icon: Zap,          color: '#8b5cf6' },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-96 rounded-xl bg-muted" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Student Attendance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of all student attendance records
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map(({ label, value, Icon, color }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon size={16} style={{ color }} />
            </div>
            <p className="mt-3 text-2xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or reg. no."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterSubj} onValueChange={setFilterSubj}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s} value={s}>
              {subjectMap.get(s)?.name ?? subjectMap.get(s)?.code ?? s}
            </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {totalStudents} Student{totalStudents !== 1 ? 's' : ''}
            {filterSubj !== 'all' && ` — ${subjectMap.get(filterSubj)?.name ?? filterSubj}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No records found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Reg. No</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Present</th>
                    <th className="px-4 py-3 text-right">Absent</th>
                    <th className="px-4 py-3 text-right">
                      <span className="flex items-center justify-end gap-1">
                        <Zap size={12} className="text-violet-500" /> Active
                      </span>
                    </th>
                    <th className="px-4 py-3 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => {
                    const isLow = row.percentage < 75
                    return (
                      <tr
                        key={row.studentId}
                        className={`border-b border-border transition-colors hover:bg-muted/30 ${isLow ? 'bg-rose-50/60 dark:bg-rose-950/20' : ''}`}
                      >
                        <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium">{row.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.regNo}</td>
                        <td className="px-4 py-3 text-right">{row.total}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">{row.present}</td>
                        <td className="px-4 py-3 text-right text-rose-500">{row.absent}</td>
                        <td className="px-4 py-3 text-right text-violet-600">{row.active}</td>
                        <td className="px-4 py-3 text-right">
                          <Badge
                            className={`font-semibold ${
                              isLow
                                ? 'bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/40 dark:text-rose-400'
                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300'
                            }`}
                          >
                            {row.percentage}%
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

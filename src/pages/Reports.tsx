import { useEffect, useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { TrendingUp, Users, CheckCircle2, Zap } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { getAllRecords, type AttendanceRecord } from '@/services/db'
import { seedDemoDataIfEmpty } from '@/utils/seedDemoData'
import { MOCK_SUBJECTS } from '@/data/mockData'
import { apiFacultyGetSubjects, type Subject } from '@/services/api'
import { useAuth } from '@/context/AuthContext'

// ─── Subject label lookup ─────────────────────────────────────────────────────
const SUBJECT_LABELS: Record<string, string> = {}
MOCK_SUBJECTS.forEach((s) => { SUBJECT_LABELS[s.id] = s.label })

// ─── Chart colours ────────────────────────────────────────────────────────────
const C_PRESENT  = '#6366f1'
const C_ABSENT   = '#f43f5e'
const C_ACTIVE   = '#8b5cf6'
const PIE_COLORS = [C_PRESENT, C_ABSENT, C_ACTIVE]

function shortDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubjectStat {
  subjectId: string; label: string
  total: number; present: number; absent: number; active: number; pct: number
}

interface DailyPoint {
  date: string; label: string; total: number; present: number; pct: number
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Reports() {
  const { user } = useAuth()
  const [allRecords,  setAllRecords]  = useState<AttendanceRecord[]>([])
  const [apiSubjects, setApiSubjects] = useState<Subject[]>([])
  const [filterSubj,  setFilterSubj]  = useState<string>('all')
  const [isLoading,   setIsLoading]   = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await seedDemoDataIfEmpty()
        const recs = await getAllRecords()
        if (cancelled) return
        setAllRecords(recs)
        if (user?.role === 'faculty') {
          apiFacultyGetSubjects().then((s) => { if (!cancelled) setApiSubjects(s) }).catch(() => {})
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user?.role])

  const baseRecords = useMemo(() => {
    if (user?.role === 'faculty' && apiSubjects.length > 0) {
      const ids = new Set(apiSubjects.map((s) => s._id))
      return allRecords.filter((r) => ids.has(r.subjectId))
    }
    return allRecords
  }, [allRecords, apiSubjects, user?.role])

  const relevantRecords = useMemo(() =>
    filterSubj === 'all' ? baseRecords : baseRecords.filter((r) => r.subjectId === filterSubj),
    [baseRecords, filterSubj],
  )

  const subjectStats = useMemo<SubjectStat[]>(() => {
    const map = new Map<string, SubjectStat>()
    for (const r of baseRecords) {
      if (!map.has(r.subjectId)) {
        const label = SUBJECT_LABELS[r.subjectId] ?? r.subjectId
        map.set(r.subjectId, { subjectId: r.subjectId, label, total: 0, present: 0, absent: 0, active: 0, pct: 0 })
      }
      const s = map.get(r.subjectId)!
      s.total++
      if (r.status === 'present') { s.present++; if (r.active) s.active++ } else s.absent++
    }
    return Array.from(map.values())
      .map((s) => ({ ...s, pct: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0 }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [baseRecords])

  const chartStats = useMemo(() =>
    filterSubj === 'all' ? subjectStats : subjectStats.filter((s) => s.subjectId === filterSubj),
    [subjectStats, filterSubj],
  )

  const dailyTrend = useMemo<DailyPoint[]>(() => {
    const map = new Map<string, { total: number; present: number }>()
    for (const r of relevantRecords) {
      if (!map.has(r.date)) map.set(r.date, { total: 0, present: 0 })
      const d = map.get(r.date)!
      d.total++
      if (r.status === 'present') d.present++
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-20)
      .map(([date, d]) => ({
        date, label: shortDate(date), total: d.total, present: d.present,
        pct: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
      }))
  }, [relevantRecords])

  const totalPresent  = relevantRecords.filter((r) => r.status === 'present').length
  const totalSessions = relevantRecords.length
  const totalActive   = relevantRecords.filter((r) => r.active).length
  const overallPct    = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0
  const pieData       = [
    { name: 'Present', value: totalPresent },
    { name: 'Absent',  value: totalSessions - totalPresent },
    { name: 'Active',  value: totalActive },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted" />)}
        </div>
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3 h-72 rounded-xl bg-muted" />
          <div className="lg:col-span-2 h-72 rounded-xl bg-muted" />
        </div>
        <div className="h-64 rounded-xl bg-muted" />
        <div className="h-64 rounded-xl bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header + filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">Subject-wise attendance analytics</p>
        </div>
        <Select value={filterSubj} onValueChange={setFilterSubj}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subjects</SelectItem>
            {subjectStats.map((s) => (
              <SelectItem key={s.subjectId} value={s.subjectId}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Subjects',       value: String(subjectStats.length), Icon: TrendingUp,   color: '#6366f1' },
          { label: 'Total Sessions', value: String(totalSessions),       Icon: Users,        color: '#0ea5e9' },
          { label: 'Overall %',      value: `${overallPct}%`,            Icon: CheckCircle2, color: overallPct >= 75 ? '#10b981' : '#f59e0b' },
          { label: 'Active Marks',   value: String(totalActive),         Icon: Zap,          color: '#8b5cf6' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <Icon size={16} style={{ color }} />
            </div>
            <p className="mt-3 text-2xl font-bold" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Bar + Pie */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Attendance by Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartStats} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="present" name="Present" fill={C_PRESENT} radius={[4, 4, 0, 0]} />
                <Bar dataKey="absent"  name="Absent"  fill={C_ABSENT}  radius={[4, 4, 0, 0]} />
                <Bar dataKey="active"  name="Active"  fill={C_ACTIVE}  radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Overall Split</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => percent && percent > 0.03 ? `${name} ${Math.round(percent * 100)}%` : ''}
                  labelLine={false}
                >
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 text-xs">
              {pieData.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  {d.name}: <strong>{d.value}</strong>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Area chart – daily trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Daily Attendance Trend (%)</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyTrend.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No daily data for selected filter.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyTrend}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C_PRESENT} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={C_PRESENT} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip formatter={(v) => [`${v}%`, 'Attendance']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Area type="monotone" dataKey="pct" name="Attendance %" stroke={C_PRESENT} strokeWidth={2} fill="url(#areaGrad)" dot={{ r: 3, fill: C_PRESENT }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Summary table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Subject Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {chartStats.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No data found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3 text-left">Subject</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Present</th>
                    <th className="px-4 py-3 text-right">Absent</th>
                    <th className="px-4 py-3 text-right">Active</th>
                    <th className="px-4 py-3 text-left">Progress</th>
                    <th className="px-4 py-3 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {chartStats.map((s) => (
                    <tr key={s.subjectId} className="border-b border-border transition-colors hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{s.label}</td>
                      <td className="px-4 py-3 text-right">{s.total}</td>
                      <td className="px-4 py-3 text-right text-indigo-600">{s.present}</td>
                      <td className="px-4 py-3 text-right text-rose-500">{s.absent}</td>
                      <td className="px-4 py-3 text-right text-violet-600">{s.active}</td>
                      <td className="px-4 py-3 w-36">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${s.pct}%`, background: s.pct >= 75 ? C_PRESENT : '#f59e0b' }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge className={s.pct >= 75
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400'
                        }>
                          {s.pct}%
                        </Badge>
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

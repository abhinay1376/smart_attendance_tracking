/**
 * Reports – subject-wise attendance analytics
 * ─────────────────────────────────────────────────────────────────────────
 * Works for both faculty (filters to assigned subjects) and HoD (all data).
 *
 * Charts rendered (recharts, wrapped in shadcn/ui Cards):
 *  1. Grouped bar   – present / absent / active per subject
 *  2. Area chart    – daily attendance % trend
 *  3. Pie chart     – overall present vs absent
 *  4. Summary table – per-subject stat rows with progress bar
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Area, AreaChart,
  Bar, BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie, PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis,
} from 'recharts'
import {
  BookOpen,
  BarChart3,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Zap,
  AlertCircle,
} from 'lucide-react'

import { useAuth }                                         from '@/context/AuthContext'
import { getAllRecords, type AttendanceRecord }             from '@/services/db'
import { apiFacultyGetSubjects, type Subject }             from '@/services/api'
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
}                                                          from '@/components/ui/card'
import { Progress }                                        from '@/components/ui/progress'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
}                                                          from '@/components/ui/select'

// ─── Palette ──────────────────────────────────────────────────────────────────

const COLOR_PRESENT = '#10b981'
const COLOR_ABSENT  = '#f43f5e'
const COLOR_ACTIVE  = '#6366f1'
const PIE_COLORS    = [COLOR_PRESENT, COLOR_ABSENT]

const SUBJECT_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444',
  '#0ea5e9', '#ec4899', '#8b5cf6', '#14b8a6',
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubjectStat {
  subjectId:  string
  label:      string
  present:    number
  absent:     number
  active:     number
  total:      number
  percentage: number
}

interface DailyPoint {
  date:       string
  fullDate:   string
  percentage: number
  present:    number
  total:      number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pctColor(pct: number): string {
  if (pct >= 85) return COLOR_PRESENT
  if (pct >= 75) return '#6366f1'
  if (pct >= 60) return '#f59e0b'
  return COLOR_ABSENT
}

function shortLabel(s: string): string {
  return s.length > 10 ? s.slice(0, 9) + '…' : s
}

// ─── Custom Tooltips ──────────────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { name: string; value: number; fill: string }[]
  label?:  string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.fill }} />
          {p.name}: <span className="font-medium text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

function AreaTooltip({ active, payload, label }: {
  active?:  boolean
  payload?: { payload: DailyPoint }[]
  label?:   string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs space-y-0.5">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">
        Sessions: <span className="font-medium text-foreground">{d.present}/{d.total}</span>
      </p>
      <p className="font-bold" style={{ color: pctColor(d.percentage) }}>
        {d.percentage}% attendance
      </p>
    </div>
  )
}

function PieTooltipContent({ active, payload }: {
  active?:  boolean
  payload?: { name: string; value: number; payload: { percent: number } }[]
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold" style={{ color: p.name === 'Present' ? COLOR_PRESENT : COLOR_ABSENT }}>
        {p.name}: {p.value} ({Math.round((p.payload?.percent ?? 0) * 100)}%)
      </p>
    </div>
  )
}

// ─── Data hook ────────────────────────────────────────────────────────────────

function useReportsData() {
  const { user } = useAuth()
  const isFaculty = user?.role === 'faculty'

  const [records,   setRecords]   = useState<AttendanceRecord[]>([])
  const [subjects,  setSubjects]  = useState<Subject[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setError(null)
      try {
        const [allRecs, subs] = await Promise.all([
          getAllRecords(),
          isFaculty
            ? apiFacultyGetSubjects().catch(() => [] as Subject[])
            : Promise.resolve([] as Subject[]),
        ])

        if (isFaculty && subs.length > 0) {
          const myIds = new Set(subs.map((s) => s._id))
          setRecords(allRecs.filter((r) => myIds.has(r.subjectId)))
          setSubjects(subs)
        } else {
          setRecords(allRecs)
          // Derive subjects from records (HoD view)
          const seen   = new Set<string>()
          const derived: Subject[] = []
          for (const r of allRecs) {
            if (!seen.has(r.subjectId)) {
              seen.add(r.subjectId)
              derived.push({ _id: r.subjectId, name: r.subjectId, code: r.subjectId, assignedFaculty: [] })
            }
          }
          setSubjects(derived)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data.')
      } finally {
        setIsLoading(false)
      }
    }
    void load()
  }, [isFaculty])

  return { records, subjects, isLoading, error }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Reports() {
  const { user }                                = useAuth()
  const { records, subjects, isLoading, error } = useReportsData()
  const [filterSubj, setFilterSubj]             = useState('all')

  // ── Filtered records ──────────────────────────────────────────────────────
  const filteredRecords = useMemo(() =>
    filterSubj === 'all'
      ? records
      : records.filter((r) => r.subjectId === filterSubj),
    [records, filterSubj],
  )

  // ── Subject-wise stats ────────────────────────────────────────────────────
  const subjectStats = useMemo<SubjectStat[]>(() => {
    const map = new Map<string, SubjectStat>()
    for (const rec of filteredRecords) {
      const sub   = subjects.find((s) => s._id === rec.subjectId)
      const label = sub?.name ?? rec.subjectId
      const entry = map.get(rec.subjectId) ?? {
        subjectId: rec.subjectId, label, present: 0, absent: 0, active: 0, total: 0, percentage: 0,
      }
      entry.total++
      if (rec.status === 'present') entry.present++
      if (rec.status === 'absent')  entry.absent++
      if (rec.active)               entry.active++
      entry.percentage = entry.total > 0 ? Math.round((entry.present / entry.total) * 100) : 0
      map.set(rec.subjectId, entry)
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [filteredRecords, subjects])

  // ── Daily attendance trend ────────────────────────────────────────────────
  const dailyTrend = useMemo<DailyPoint[]>(() => {
    const dayMap = new Map<string, { present: number; total: number }>()
    for (const rec of filteredRecords) {
      const entry = dayMap.get(rec.date) ?? { present: 0, total: 0 }
      entry.total++
      if (rec.status === 'present') entry.present++
      dayMap.set(rec.date, entry)
    }
    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-60)
      .map(([fullDate, e]) => {
        const [, m, d] = fullDate.split('-')
        return {
          fullDate,
          date:       `${d}/${m}`,
          present:    e.present,
          total:      e.total,
          percentage: e.total > 0 ? Math.round((e.present / e.total) * 100) : 0,
        }
      })
  }, [filteredRecords])

  // ── Aggregates ────────────────────────────────────────────────────────────
  const totalPresent = filteredRecords.filter((r) => r.status === 'present').length
  const totalAbsent  = filteredRecords.length - totalPresent
  const totalActive  = filteredRecords.filter((r) => r.active).length
  const overallPct   = filteredRecords.length > 0
    ? Math.round((totalPresent / filteredRecords.length) * 100)
    : 0
  const pieData = [
    { name: 'Present', value: totalPresent },
    { name: 'Absent',  value: totalAbsent  },
  ]
  const barData = subjectStats.map((s) => ({
    subject:  shortLabel(s.label),
    fullName: s.label,
    Present:  s.present,
    Absent:   s.absent,
    Active:   s.active,
  }))

  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <Loader2 size={32} className="animate-spin text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">Loading report data…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 text-sm text-destructive">
        <AlertCircle size={16} />
        {error}
      </div>
    )
  }

  const noData = filteredRecords.length === 0

  return (
    <div className="space-y-6">

      {/* ── Header + filter ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {user?.role === 'faculty'
              ? 'Subject-wise attendance analytics for your assigned subjects.'
              : 'Department-wide attendance overview across all subjects.'}
          </p>
        </div>
        {subjects.length > 1 && (
          <Select value={filterSubj} onValueChange={setFilterSubj}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All Subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Subjects',       value: String(subjectStats.length),    icon: BookOpen,     color: '#0ea5e9' },
          { label: 'Total Sessions', value: String(filteredRecords.length),  icon: BarChart3,    color: '#6366f1' },
          { label: 'Overall %',      value: `${overallPct}%`,               icon: TrendingUp,   color: pctColor(overallPct) },
          { label: 'Active Marks',   value: String(totalActive),            icon: Zap,          color: '#8b5cf6' },
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

      {noData ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-20 text-center">
          <BarChart3 size={36} className="text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">
            No attendance records found. Mark attendance to see charts here.
          </p>
        </div>
      ) : (
        <>
          {/* ── Row 1: Bar chart + Pie chart ──────────────────────────────── */}
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Grouped bar – present / absent / active per subject */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 size={16} className="text-primary" />
                  Subject-wise Breakdown
                </CardTitle>
                <CardDescription>Present vs Absent vs Active per subject</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={barData}
                    margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
                    barCategoryGap="28%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="subject"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={<BarTooltip />}
                      cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 14 }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Bar dataKey="Present" fill={COLOR_PRESENT} radius={[3, 3, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="Absent"  fill={COLOR_ABSENT}  radius={[3, 3, 0, 0]} maxBarSize={28} />
                    <Bar dataKey="Active"  fill={COLOR_ACTIVE}  radius={[3, 3, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Donut pie – overall split */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle2 size={16} className="text-primary" />
                  Overall Split
                </CardTitle>
                <CardDescription>All sessions combined</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="flex items-center gap-5 text-sm">
                  {[
                    { label: 'Present', value: totalPresent, color: COLOR_PRESENT },
                    { label: 'Absent',  value: totalAbsent,  color: COLOR_ABSENT  },
                  ].map(({ label, value, color }) => (
                    <span key={label} className="flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                      <span className="text-muted-foreground">{label}</span>
                      <span className="ml-1 font-bold text-foreground">{value}</span>
                    </span>
                  ))}
                </div>

                <div
                  className="w-full rounded-xl px-4 py-2.5 text-center text-sm font-bold"
                  style={{ background: `${pctColor(overallPct)}18`, color: pctColor(overallPct) }}
                >
                  {overallPct}% Overall Attendance
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Row 2: Area chart – daily trend ───────────────────────────── */}
          {dailyTrend.length > 1 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp size={16} className="text-primary" />
                  Attendance Trend
                </CardTitle>
                <CardDescription>
                  Daily attendance % over time
                  {filterSubj !== 'all' && (
                    <> · <span className="font-medium">{subjects.find((s) => s._id === filterSubj)?.name ?? filterSubj}</span></>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={dailyTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={COLOR_PRESENT} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={COLOR_PRESENT} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v: number) => `${v}%`}
                      tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<AreaTooltip />} cursor={{ stroke: 'hsl(var(--border))' }} />
                    <Area
                      type="monotone"
                      dataKey="percentage"
                      stroke={COLOR_PRESENT}
                      strokeWidth={2}
                      fill="url(#areaGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: COLOR_PRESENT, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* ── Row 3: Subject summary table ──────────────────────────────── */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <BookOpen size={16} className="text-primary" />
                Subject Summary
              </CardTitle>
              <CardDescription>Per-subject breakdown with attendance progress</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 text-left   font-medium text-muted-foreground">Subject</th>
                      <th className="px-4 py-3 text-center font-medium text-muted-foreground">Total</th>
                      <th className="px-4 py-3 text-center font-medium text-emerald-600">Present</th>
                      <th className="px-4 py-3 text-center font-medium text-rose-500">Absent</th>
                      <th className="px-4 py-3 text-center font-medium text-indigo-500">Active</th>
                      <th className="px-4 py-3 text-left   font-medium text-muted-foreground min-w-[180px]">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {subjectStats.map((s, i) => (
                      <tr key={s.subjectId} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: SUBJECT_COLORS[i % SUBJECT_COLORS.length] }}
                            />
                            <span className="font-medium text-foreground">{s.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums text-muted-foreground">{s.total}</td>
                        <td className="px-4 py-3 text-center tabular-nums font-semibold text-emerald-600">{s.present}</td>
                        <td className="px-4 py-3 text-center tabular-nums font-semibold text-rose-500">{s.absent}</td>
                        <td className="px-4 py-3 text-center">
                          {s.active > 0 ? (
                            <span className="inline-flex items-center gap-1 tabular-nums font-semibold text-indigo-600">
                              <Zap size={11} />{s.active}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Progress value={s.percentage} className="h-1.5 flex-1" />
                            <span
                              className="w-10 shrink-0 text-right text-xs font-bold tabular-nums"
                              style={{ color: pctColor(s.percentage) }}
                            >
                              {s.percentage}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

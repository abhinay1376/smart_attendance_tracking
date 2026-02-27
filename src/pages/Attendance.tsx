/**
 * Student – Attendance page
 * Shows per-subject session history from IndexedDB with a subject selector.
 */
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, XCircle, Zap, BookOpen, Loader2 } from 'lucide-react'
import { useAuth }                from '@/context/AuthContext'
import { getAllRecords }           from '@/services/db'
import { apiStudentGetSubjects }  from '@/services/api'
import { MOCK_SUBJECTS }          from '@/data/mockData'
import { seedDemoDataIfEmpty }    from '@/utils/seedDemoData'
import { Progress }               from '@/components/ui/progress'
import { cn }                     from '@/utils/helpers'
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'

const THRESHOLD = 75

function pctColor(p: number) {
  if (p >= 85) return '#10b981'
  if (p >= THRESHOLD) return '#6366f1'
  if (p >= 60) return '#f59e0b'
  return '#ef4444'
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function Attendance() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [subjectMap, setSubjectMap] = useState<Record<string, string>>({})
  const [allRecords, setAllRecords] = useState<Awaited<ReturnType<typeof getAllRecords>>>([])
  const [selectedSubject, setSelectedSubject] = useState<string>('__all__')

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      await seedDemoDataIfEmpty()
      const [recs, apiSubs] = await Promise.all([
        getAllRecords(),
        apiStudentGetSubjects().catch(() => []),
      ])
      if (cancelled) return

      const sMap: Record<string, string> = {}
      MOCK_SUBJECTS.forEach((s) => { sMap[s.id] = s.label })
      apiSubs.forEach((s) => { sMap[s._id] = s.name })

      const myRecs = recs.filter((r) => r.studentId === user.id)
      // Build ordinal labels for any subjects not found in API
      let ord = 1
      const seenSubs = new Set<string>()
      for (const r of myRecs) {
        if (!seenSubs.has(r.subjectId)) {
          seenSubs.add(r.subjectId)
          if (!sMap[r.subjectId]) sMap[r.subjectId] = `Subject ${ord++}`
        }
      }

      setSubjectMap(sMap)
      setAllRecords(myRecs)
      setIsLoading(false)
    })()
    return () => { cancelled = true }
  }, [user])

  // All unique subject IDs that have records
  const subjectIds = useMemo(
    () => [...new Set(allRecords.map((r) => r.subjectId))],
    [allRecords],
  )

  // Records for the selected subject (or all)
  const filteredRecords = useMemo(() => {
    const base = selectedSubject === '__all__'
      ? allRecords
      : allRecords.filter((r) => r.subjectId === selectedSubject)
    return [...base].sort((a, b) => b.date.localeCompare(a.date))
  }, [allRecords, selectedSubject])

  // Stats for currently visible records
  const stats = useMemo(() => {
    const total    = filteredRecords.length
    const attended = filteredRecords.filter((r) => r.status === 'present').length
    const active   = filteredRecords.filter((r) => r.active).length
    const pct      = total > 0 ? Math.round((attended / total) * 100) : 0
    return { total, attended, absent: total - attended, active, pct }
  }, [filteredRecords])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 size={28} className="animate-spin" />
        <p className="text-sm">Loading attendance records…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">My Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Session-by-session attendance history across all subjects.
        </p>
      </div>

      {/* Subject filter */}
      <div className="flex items-center gap-3">
        <BookOpen size={15} className="shrink-0 text-muted-foreground" />
        <Select value={selectedSubject} onValueChange={setSelectedSubject}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filter by subject…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All Subjects</SelectItem>
            {subjectIds.map((id) => (
              <SelectItem key={id} value={id}>
                {subjectMap[id] ?? id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary strip */}
      {stats.total > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-sm font-semibold text-foreground">
              {selectedSubject === '__all__' ? 'Overall' : subjectMap[selectedSubject]}
            </span>
            <span className="text-sm font-bold" style={{ color: pctColor(stats.pct) }}>
              {stats.pct}%
            </span>
          </div>
          <Progress
            value={stats.pct}
            variant={stats.pct >= 85 ? 'success' : stats.pct >= THRESHOLD ? 'default' : stats.pct >= 60 ? 'warning' : 'danger'}
            className="h-3"
          />
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span><span className="font-semibold text-emerald-600">{stats.attended}</span> present</span>
            <span><span className="font-semibold text-rose-500">{stats.absent}</span> absent</span>
            <span><span className="font-semibold text-violet-600">{stats.active}</span> active sessions</span>
            <span><span className="font-semibold text-foreground">{stats.total}</span> total</span>
          </div>
        </div>
      )}

      {/* Session list */}
      {filteredRecords.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          No attendance records found.
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filteredRecords.map((rec) => {
              const isPresent = rec.status === 'present'
              return (
                <div
                  key={rec.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3',
                    !isPresent && 'bg-rose-50/50 dark:bg-rose-950/20',
                  )}
                >
                  {isPresent
                    ? <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                    : <XCircle     size={16} className="shrink-0 text-rose-400" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {subjectMap[rec.subjectId] ?? rec.subjectId}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(rec.date)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {rec.active && (
                      <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                        <Zap size={9} />
                        Active
                      </span>
                    )}
                    <span className={cn(
                      'rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                      isPresent
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
                    )}>
                      {isPresent ? 'Present' : 'Absent'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}


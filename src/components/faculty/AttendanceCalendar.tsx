/**
 * AttendanceCalendar.tsx
 * ─────────────────────────────────────────────────────────────────────────
 * Monthly calendar for faculty to:
 *  • Select a weekday to mark/edit attendance (opens the MarkAttendance form)
 *  • Flag any weekday as a holiday with a free-text reason
 *  • See colour-coded day states: saved ✓ / holiday 🏖 / weekend / today
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Umbrella, Pencil, X, Trash2 } from 'lucide-react'

import { getAllRecords } from '@/services/db'
import { getHolidays, setHoliday, removeHoliday, type HolidayEntry } from '@/services/holidays'
import { cn } from '@/utils/helpers'
import { Button }                                       from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle }    from '@/components/ui/card'
import { Input }                                        from '@/components/ui/input'
import { Label }                                        from '@/components/ui/label'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayInfo {
  date:         Date
  iso:          string          // YYYY-MM-DD
  dayOfMonth:   number
  isWeekend:    boolean
  isFuture:     boolean
  isToday:      boolean
  isHoliday:    boolean
  holidayEntry: HolidayEntry | null
  hasSaved:     boolean         // has at least one IndexedDB record for this date
}

interface ActionModal { iso: string; dayInfo: DayInfo }
interface HolidayModal { iso: string; entry: HolidayEntry | null; reason: string }

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  /** Called when the faculty chooses to mark/edit attendance for a date */
  onSelectDate: (iso: string) => void
  /** Bump this key after saving attendance to refresh the calendar badges */
  refreshKey?:  number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function isoOf(date: Date): string {
  // Use local fields to avoid UTC-shift
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function localMidnight(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttendanceCalendar({ onSelectDate, refreshKey = 0 }: Props) {
  const today    = new Date()
  const todayStr = isoOf(today)

  const [year,         setYear]         = useState(today.getFullYear())
  const [month,        setMonth]        = useState(today.getMonth())    // 0-based
  const [savedDates,   setSavedDates]   = useState<Set<string>>(new Set())
  const [holidays,     setHolidaysMap]  = useState<Record<string, HolidayEntry>>({})
  const [actionModal,  setActionModal]  = useState<ActionModal | null>(null)
  const [holidayModal, setHolidayModal] = useState<HolidayModal | null>(null)

  // ── Data loading ─────────────────────────────────────────────────

  useEffect(() => {
    getAllRecords()
      .then((recs) => setSavedDates(new Set(recs.map((r) => r.date))))
      .catch(() => {})
  }, [refreshKey])

  const reloadHolidays = useCallback(() => setHolidaysMap(getHolidays()), [])
  useEffect(() => reloadHolidays(), [reloadHolidays])

  // ── Calendar computation ─────────────────────────────────────────

  const days = useMemo<DayInfo[]>(() => {
    const total  = daysInMonth(year, month)
    const result: DayInfo[] = []
    for (let d = 1; d <= total; d++) {
      const date   = new Date(year, month, d)
      const iso    = isoOf(date)
      const dow    = date.getDay()
      const entry  = holidays[iso] ?? null
      result.push({
        date,
        iso,
        dayOfMonth: d,
        isWeekend:  dow === 0 || dow === 6,
        isFuture:   iso > todayStr,
        isToday:    iso === todayStr,
        isHoliday:  !!entry,
        holidayEntry: entry,
        hasSaved:   savedDates.has(iso),
      })
    }
    return result
  }, [year, month, holidays, savedDates, todayStr])

  const startOffset = new Date(year, month, 1).getDay()  // 0 = Sunday

  // ── Month navigation ─────────────────────────────────────────────

  const canGoNext = year < today.getFullYear() || month < today.getMonth()

  function goToPrev() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }

  function goToNext() {
    if (!canGoNext) return
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  const monthLabel = new Date(year, month).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric',
  })

  // ── Day click  ───────────────────────────────────────────────────

  function handleDayClick(info: DayInfo) {
    if (info.isWeekend || info.isFuture) return
    setActionModal({ iso: info.iso, dayInfo: info })
  }

  // ── Action modal handlers ────────────────────────────────────────

  function handleMarkAttendance() {
    if (!actionModal) return
    setActionModal(null)
    onSelectDate(actionModal.iso)
  }

  function openHolidayForm() {
    if (!actionModal) return
    const existing = holidays[actionModal.iso] ?? null
    setHolidayModal({ iso: actionModal.iso, entry: existing, reason: existing?.reason ?? '' })
    setActionModal(null)
  }

  function handleRemoveHoliday() {
    if (!actionModal) return
    removeHoliday(actionModal.iso)
    reloadHolidays()
    setActionModal(null)
  }

  // ── Holiday form ─────────────────────────────────────────────────

  function handleSaveHoliday() {
    if (!holidayModal) return
    const reason = holidayModal.reason.trim()
    if (!reason) return
    setHoliday(holidayModal.iso, reason)
    reloadHolidays()
    setHolidayModal(null)
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <Card>
        {/* ── Month navigation header ── */}
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPrev} aria-label="Previous month">
              <ChevronLeft size={18} />
            </Button>
            <CardTitle className="text-base tabular-nums select-none">{monthLabel}</CardTitle>
            <Button
              variant="ghost" size="icon"
              onClick={goToNext}
              disabled={!canGoNext}
              aria-label="Next month"
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-3 pb-4">
          {/* ── Day-of-week labels ── */}
          <div className="grid grid-cols-7 mb-1">
            {DOW.map((d) => (
              <div
                key={d}
                className={cn(
                  'text-center py-1 text-[10px] font-semibold uppercase tracking-wider',
                  d === 'Sun' || d === 'Sat' ? 'text-rose-400' : 'text-muted-foreground',
                )}
              >
                {d}
              </div>
            ))}
          </div>

          {/* ── Day Grid ── */}
          <div className="grid grid-cols-7 gap-[3px]">
            {/* Leading empty cells */}
            {Array.from({ length: startOffset }).map((_, i) => <div key={`gap-${i}`} />)}

            {/* Day cells */}
            {days.map((info) => {
              const clickable = !info.isWeekend && !info.isFuture
              return (
                <button
                  key={info.iso}
                  type="button"
                  disabled={!clickable}
                  onClick={() => handleDayClick(info)}
                  className={cn(
                    'relative flex min-h-[58px] flex-col items-center rounded-lg border pt-1.5 pb-1 px-0.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    info.isWeekend
                      ? 'border-transparent bg-muted/20 text-muted-foreground/30 cursor-not-allowed'
                      : info.isFuture
                      ? 'border-transparent bg-transparent text-muted-foreground/25 cursor-not-allowed'
                      : info.isHoliday
                      ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer'
                      : info.hasSaved
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer'
                      : 'border-border bg-card text-foreground hover:bg-muted/40 cursor-pointer',
                    info.isToday && !info.isWeekend && 'ring-2 ring-primary ring-offset-1',
                  )}
                  aria-label={`${info.iso}${info.isHoliday ? ' (Holiday)' : ''}${info.hasSaved ? ' (Saved)' : ''}`}
                >
                  {/* Date number */}
                  <span
                    className={cn(
                      'text-xs font-bold',
                      info.isToday && !info.isWeekend && 'text-primary',
                    )}
                  >
                    {info.dayOfMonth}
                  </span>

                  {/* Status labels */}
                  <div className="mt-auto flex flex-col items-center gap-0.5 w-full">
                    {info.isHoliday && (
                      <span className="truncate w-full text-center text-[8px] font-semibold text-amber-700 leading-tight">
                        🏖 Holiday
                      </span>
                    )}
                    {info.hasSaved && (
                      <span className="text-[8px] font-bold text-emerald-700 leading-tight">
                        ✓ Saved
                      </span>
                    )}
                    {info.isWeekend && (
                      <span className="text-[8px] text-muted-foreground/25 leading-tight">
                        {info.date.getDay() === 0 ? 'Sun' : 'Sat'}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Legend ── */}
          <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-emerald-100 border border-emerald-300 shrink-0" />
              Attendance saved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-amber-100 border border-amber-300 shrink-0" />
              Holiday
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm ring-2 ring-primary bg-card shrink-0" />
              Today
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-muted/30 shrink-0" />
              Weekend
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Day Action Modal ─────────────────────────────────────────────── */}
      {actionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setActionModal(null)}
        >
          <div
            className="w-80 rounded-2xl bg-background border border-border shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Selected</p>
                <p className="text-[15px] font-bold text-foreground leading-snug mt-0.5">
                  {localMidnight(actionModal.iso).toLocaleDateString('en-IN', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </p>
                {actionModal.dayInfo.isHoliday && (
                  <p className="text-xs text-amber-700 mt-1 font-medium truncate">
                    🏖 {actionModal.dayInfo.holidayEntry?.reason}
                  </p>
                )}
                {actionModal.dayInfo.hasSaved && (
                  <p className="text-xs text-emerald-700 mt-0.5 font-medium">
                    ✓ Attendance already recorded
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-2">
              {!actionModal.dayInfo.isHoliday && (
                <Button onClick={handleMarkAttendance} className="w-full gap-2 justify-start">
                  <Pencil size={15} />
                  {actionModal.dayInfo.hasSaved ? 'Edit / Re-mark Attendance' : 'Mark Attendance'}
                </Button>
              )}

              {actionModal.dayInfo.isHoliday ? (
                <>
                  <Button
                    variant="outline"
                    onClick={openHolidayForm}
                    className="w-full gap-2 justify-start text-amber-700 border-amber-300 hover:bg-amber-50"
                  >
                    <Pencil size={15} />
                    Edit Holiday Reason
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRemoveHoliday}
                    className="w-full gap-2 justify-start text-destructive border-destructive/30 hover:bg-destructive/5"
                  >
                    <Trash2 size={15} />
                    Remove Holiday
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={openHolidayForm}
                  className="w-full gap-2 justify-start text-amber-700 border-amber-300 hover:bg-amber-50"
                >
                  <Umbrella size={15} />
                  Mark as Holiday
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Holiday Reason Dialog ─────────────────────────────────────────── */}
      {holidayModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setHolidayModal(null)}
        >
          <div
            className="w-80 rounded-2xl bg-background border border-border shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground flex items-center gap-2">
                  <Umbrella size={16} className="text-amber-600" />
                  {holidayModal.entry ? 'Edit Holiday' : 'Mark as Holiday'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {localMidnight(holidayModal.iso).toLocaleDateString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setHolidayModal(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Reason
              </Label>
              <Input
                autoFocus
                value={holidayModal.reason}
                placeholder="e.g. Republic Day, College Fest, Exam…"
                onChange={(e) =>
                  setHolidayModal((m) => m ? { ...m, reason: e.target.value } : m)
                }
                onKeyDown={(e) => e.key === 'Enter' && handleSaveHoliday()}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setHolidayModal(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                disabled={!holidayModal.reason.trim()}
                onClick={handleSaveHoliday}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

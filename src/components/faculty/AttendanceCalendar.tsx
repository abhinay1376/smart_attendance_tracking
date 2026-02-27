/**
 * AttendanceCalendar.tsx – compact, polished monthly calendar for faculty
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Umbrella, Pencil, X, Trash2, ClipboardCheck } from 'lucide-react'

import { getAllRecords }                                          from '@/services/db'
import { getHolidays, setHoliday, removeHoliday, type HolidayEntry } from '@/services/holidays'
import { cn }                                                    from '@/utils/helpers'
import { Button }                                                from '@/components/ui/button'
import { Input }                                                 from '@/components/ui/input'
import { Label }                                                 from '@/components/ui/label'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DayInfo {
  date:         Date
  iso:          string
  dayOfMonth:   number
  isWeekend:    boolean
  isFuture:     boolean
  isToday:      boolean
  isHoliday:    boolean
  holidayEntry: HolidayEntry | null
  hasSaved:     boolean
}

interface ActionModal  { iso: string; dayInfo: DayInfo }
interface HolidayModal { iso: string; entry: HolidayEntry | null; reason: string }

interface Props {
  onSelectDate: (iso: string) => void
  refreshKey?:  number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

function isoOf(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function localDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtFull(iso: string): string {
  const d = localDate(iso)
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

function fmtShort(iso: string): string {
  const d = localDate(iso)
  return `${DAY_NAMES[d.getDay()].slice(0, 3)}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AttendanceCalendar({ onSelectDate, refreshKey = 0 }: Props) {
  const today    = new Date()
  const todayStr = isoOf(today)

  const [year,         setYear]         = useState(today.getFullYear())
  const [month,        setMonth]        = useState(today.getMonth())
  const [savedDates,   setSavedDates]   = useState<Set<string>>(new Set())
  const [holidays,     setHolidaysMap]  = useState<Record<string, HolidayEntry>>({})
  const [actionModal,  setActionModal]  = useState<ActionModal  | null>(null)
  const [holidayModal, setHolidayModal] = useState<HolidayModal | null>(null)

  // ── Load data ─────────────────────────────────────────────────────

  useEffect(() => {
    getAllRecords()
      .then((recs) => setSavedDates(new Set(recs.map((r) => r.date))))
      .catch(() => {})
  }, [refreshKey])

  const reloadHolidays = useCallback(() => setHolidaysMap(getHolidays()), [])
  useEffect(() => reloadHolidays(), [reloadHolidays])

  // ── Calendar grid ─────────────────────────────────────────────────

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startOffset = new Date(year, month, 1).getDay()

  const days = useMemo<DayInfo[]>(() => {
    const result: DayInfo[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const date  = new Date(year, month, d)
      const iso   = isoOf(date)
      const dow   = date.getDay()
      const entry = holidays[iso] ?? null
      result.push({
        date, iso,
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
  }, [year, month, daysInMonth, holidays, savedDates, todayStr])

  // ── Navigation ────────────────────────────────────────────────────

  const canGoNext = year < today.getFullYear() ||
    (year === today.getFullYear() && month < today.getMonth())

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1) }
    else setMonth((m) => m - 1)
  }
  function nextMonth() {
    if (!canGoNext) return
    if (month === 11) { setMonth(0); setYear((y) => y + 1) }
    else setMonth((m) => m + 1)
  }

  // ── Modal helpers ─────────────────────────────────────────────────

  function openAction(info: DayInfo) {
    if (info.isWeekend || info.isFuture) return
    setActionModal({ iso: info.iso, dayInfo: info })
  }

  function doMarkAttendance() {
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

  function doRemoveHoliday() {
    if (!actionModal) return
    removeHoliday(actionModal.iso)
    reloadHolidays()
    setActionModal(null)
  }

  function doSaveHoliday() {
    if (!holidayModal || !holidayModal.reason.trim()) return
    setHoliday(holidayModal.iso, holidayModal.reason.trim())
    reloadHolidays()
    setHolidayModal(null)
  }

  // ── Stats ─────────────────────────────────────────────────────────

  const monthSaved    = days.filter((d) => d.hasSaved).length
  const monthHolidays = days.filter((d) => d.isHoliday).length

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* ── Calendar card ── */}
      <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

        {/* Month navigation */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <button
            type="button"
            onClick={prevMonth}
            className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft size={16} className="text-muted-foreground" />
          </button>

          <div className="text-center select-none">
            <h2 className="text-[15px] font-bold text-foreground tracking-tight">
              {MONTH_NAMES[month]} {year}
            </h2>
            {(monthSaved > 0 || monthHolidays > 0) && (
              <p className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                {monthSaved > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {monthSaved} saved
                  </span>
                )}
                {monthHolidays > 0 && (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {monthHolidays} holiday{monthHolidays !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={nextMonth}
            disabled={!canGoNext}
            aria-label="Next month"
            className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-muted transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Day-of-week labels */}
        <div className="grid grid-cols-7 border-b border-border/60 bg-muted/20">
          {DOW_LABELS.map((label, i) => (
            <div
              key={i}
              className={cn(
                'py-2.5 text-center text-[11px] font-bold tracking-widest uppercase select-none',
                i === 0 || i === 6 ? 'text-rose-400' : 'text-muted-foreground/70',
              )}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7">
          {/* Blank leading cells */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div
              key={`blank-${i}`}
              className="min-h-[56px] border-b border-r border-border/40 bg-muted/10"
            />
          ))}

          {days.map((info, idx) => {
            const col     = (startOffset + idx) % 7
            const hasRight = (startOffset + idx + 1) % 7 !== 0

            return (
              <button
                key={info.iso}
                type="button"
                disabled={info.isWeekend || info.isFuture}
                onClick={() => openAction(info)}
                aria-label={info.iso}
                className={cn(
                  'relative min-h-[56px] flex flex-col items-center justify-start gap-1 pt-2 pb-1.5',
                  'border-b border-border/40 transition-all duration-100',
                  'focus-visible:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset',
                  hasRight && 'border-r border-border/40',
                  // backgrounds
                  (col === 0 || col === 6)
                    ? 'bg-rose-50/50 cursor-not-allowed'
                    : info.isFuture
                    ? 'bg-transparent cursor-not-allowed'
                    : info.isHoliday
                    ? 'bg-amber-50 hover:bg-amber-100 cursor-pointer active:scale-95'
                    : info.hasSaved
                    ? 'bg-emerald-50 hover:bg-emerald-100 cursor-pointer active:scale-95'
                    : 'bg-white hover:bg-slate-50 cursor-pointer active:scale-95',
                )}
              >
                {/* Day number circle */}
                <span
                  className={cn(
                    'h-7 w-7 flex items-center justify-center rounded-full text-[13px] font-semibold leading-none select-none transition-colors',
                    info.isWeekend
                      ? 'text-rose-300'
                      : info.isFuture
                      ? 'text-muted-foreground/25'
                      : info.isToday
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : info.isHoliday
                      ? 'text-amber-700 font-bold'
                      : info.hasSaved
                      ? 'text-emerald-700 font-bold'
                      : 'text-foreground',
                  )}
                >
                  {info.dayOfMonth}
                </span>

                {/* Status micro-label */}
                {!info.isWeekend && !info.isFuture && (
                  <span className="leading-none">
                    {info.isHoliday ? (
                      <span className="flex items-center gap-0.5 text-[9px] font-bold text-amber-600">
                        <Umbrella size={7} strokeWidth={2.5} />
                        off
                      </span>
                    ) : info.hasSaved ? (
                      <span className="text-[9px] font-bold text-emerald-600">✓</span>
                    ) : (
                      <span className="text-[9px] text-muted-foreground/0">·</span>
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-5 py-3 border-t border-border/60 bg-muted/10">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-[9px] font-bold text-primary-foreground">1</span>
            Today
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-3.5 w-3.5 rounded bg-emerald-100 border border-emerald-300" />
            Saved
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-3.5 w-3.5 rounded bg-amber-100 border border-amber-300" />
            Holiday
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="h-3.5 w-3.5 rounded bg-rose-50 border border-rose-200" />
            Weekend
          </span>
        </div>
      </div>

      {/* ── Day action modal ── */}
      {actionModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setActionModal(null)}
        >
          <div
            className="w-full sm:w-[360px] rounded-2xl bg-background border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={cn(
              'px-5 py-4 border-b border-border',
              actionModal.dayInfo.isHoliday
                ? 'bg-amber-50'
                : actionModal.dayInfo.hasSaved
                ? 'bg-emerald-50'
                : 'bg-muted/30',
            )}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                    {actionModal.dayInfo.isHoliday
                      ? '🏖  Holiday'
                      : actionModal.dayInfo.hasSaved
                      ? '✓  Attendance recorded'
                      : 'Choose action'}
                  </p>
                  <p className="text-[15px] font-bold text-foreground leading-snug">
                    {fmtFull(actionModal.iso)}
                  </p>
                  {actionModal.dayInfo.isHoliday && (
                    <p className="text-xs text-amber-700 mt-1 font-medium">
                      "{actionModal.dayInfo.holidayEntry?.reason}"
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="flex-shrink-0 h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Action list */}
            <div className="p-3 flex flex-col gap-2">
              {!actionModal.dayInfo.isHoliday && (
                <ActionRow
                  icon={<ClipboardCheck size={17} className="text-primary" />}
                  iconBg="bg-primary/10 group-hover:bg-primary/20"
                  title={actionModal.dayInfo.hasSaved ? 'Edit Attendance' : 'Mark Attendance'}
                  desc={actionModal.dayInfo.hasSaved ? 'Update records for this day' : 'Record attendance for this session'}
                  border="border-border hover:border-primary/30"
                  onClick={doMarkAttendance}
                />
              )}

              {actionModal.dayInfo.isHoliday ? (
                <>
                  <ActionRow
                    icon={<Pencil size={15} className="text-amber-700" />}
                    iconBg="bg-amber-100 group-hover:bg-amber-200"
                    title="Edit Holiday Reason"
                    desc="Update the reason for this holiday"
                    border="border-amber-200 hover:border-amber-400"
                    textColor="text-amber-800"
                    onClick={openHolidayForm}
                  />
                  <ActionRow
                    icon={<Trash2 size={15} className="text-rose-600" />}
                    iconBg="bg-rose-100 group-hover:bg-rose-200"
                    title="Remove Holiday"
                    desc="Allow attendance to be marked on this day"
                    border="border-rose-200 hover:border-rose-400"
                    textColor="text-rose-700"
                    onClick={doRemoveHoliday}
                  />
                </>
              ) : (
                <ActionRow
                  icon={<Umbrella size={15} className="text-amber-700" />}
                  iconBg="bg-amber-100 group-hover:bg-amber-200"
                  title="Mark as Holiday"
                  desc="Disable attendance tracking for this day"
                  border="border-amber-200 hover:border-amber-400"
                  textColor="text-amber-800"
                  onClick={openHolidayForm}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Holiday reason dialog ── */}
      {holidayModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setHolidayModal(null)}
        >
          <div
            className="w-full sm:w-[360px] rounded-2xl bg-background border border-border shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-amber-50">
              <div>
                <p className="text-[13px] font-bold text-amber-900 flex items-center gap-2">
                  <Umbrella size={14} className="text-amber-600" />
                  {holidayModal.entry ? 'Edit Holiday' : 'Mark as Holiday'}
                </p>
                <p className="text-[11px] text-amber-700/70 mt-0.5">{fmtShort(holidayModal.iso)}</p>
              </div>
              <button
                type="button"
                onClick={() => setHolidayModal(null)}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-amber-700/60 hover:text-amber-900 hover:bg-amber-100 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Reason *
                </Label>
                <Input
                  autoFocus
                  value={holidayModal.reason}
                  placeholder="e.g. Republic Day, College Fest, Exam…"
                  onChange={(e) => setHolidayModal((m) => m ? { ...m, reason: e.target.value } : m)}
                  onKeyDown={(e) => e.key === 'Enter' && doSaveHoliday()}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setHolidayModal(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={!holidayModal.reason.trim()}
                  onClick={doSaveHoliday}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white border-0"
                >
                  Save Holiday
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Small helper component ───────────────────────────────────────────────────

type ActionRowProps = {
  icon: React.ReactNode
  iconBg: string
  title: string
  desc: string
  border: string
  textColor?: string
  onClick: () => void
}

function ActionRow({ icon, iconBg, title, desc, border, textColor = 'text-foreground', onClick }: ActionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 w-full rounded-xl px-4 py-3 text-left border transition-all duration-100 hover:shadow-sm active:scale-[0.98]',
        border,
      )}
    >
      <span className={cn('h-9 w-9 flex items-center justify-center rounded-lg transition-colors flex-shrink-0', iconBg)}>
        {icon}
      </span>
      <div className="min-w-0">
        <p className={cn('text-[13px] font-semibold leading-snug', textColor)}>{title}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{desc}</p>
      </div>
    </button>
  )
}

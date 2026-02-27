/**
 * AttendanceRiskCard
 * ─────────────────────────────────────────────────────────────────────────
 * Reusable shadcn/ui card that shows a student's attendance health at a
 * glance: percentage, risk badge, status message, recovery path, and a
 * predictive "X more misses" alert.
 *
 * Props:
 *   present    – number of classes attended
 *   total      – total classes held
 *   subjectName – optional label (e.g. "Data Structures")
 *
 * All calculations are pure math — no AI/ML.
 */

import {
  ShieldCheck, ShieldAlert, ShieldX,
  TrendingUp, TrendingDown, Info,
} from 'lucide-react'

import { cn }     from '@/utils/helpers'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge }  from '@/components/ui/badge'
import {
  calculateAttendancePercentage,
  getAttendanceRiskLevel,
  classesNeededFor75,
  classesCanAffordToMiss,
  type RiskLevel,
} from '@/utils/attendanceUtils'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AttendanceRiskCardProps {
  present:      number
  total:        number
  subjectName?: string
  className?:   string
}

// ─── Risk config lookup ───────────────────────────────────────────────────────

const RISK_CONFIG: Record<RiskLevel, {
  label:       string
  icon:        React.ElementType
  badgeCls:    string
  ringCls:     string
  textCls:     string
  bgCls:       string
  borderCls:   string
  accentCls:   string
  message:     string
}> = {
  safe: {
    label:     'Safe',
    icon:      ShieldCheck,
    badgeCls:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    ringCls:   'stroke-emerald-500',
    textCls:   'text-emerald-600 dark:text-emerald-400',
    bgCls:     'bg-emerald-50 dark:bg-emerald-950/30',
    borderCls: 'border-emerald-100 dark:border-emerald-900',
    accentCls: 'from-emerald-500 to-teal-500',
    message:   'Your attendance is in a safe range.',
  },
  warning: {
    label:     'Warning',
    icon:      ShieldAlert,
    badgeCls:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    ringCls:   'stroke-amber-400',
    textCls:   'text-amber-600 dark:text-amber-400',
    bgCls:     'bg-amber-50 dark:bg-amber-950/30',
    borderCls: 'border-amber-100 dark:border-amber-900',
    accentCls: 'from-amber-400 to-orange-500',
    message:   'You are close to a shortage — avoid missing classes.',
  },
  critical: {
    label:     'Critical',
    icon:      ShieldX,
    badgeCls:  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    ringCls:   'stroke-rose-500',
    textCls:   'text-rose-600 dark:text-rose-400',
    bgCls:     'bg-rose-50 dark:bg-rose-950/30',
    borderCls: 'border-rose-100 dark:border-rose-900',
    accentCls: 'from-rose-500 to-rose-600',
    message:   'You are below 75% attendance.',
  },
}

// ─── Circular progress ring ───────────────────────────────────────────────────

function PercentRing({
  pct, ringCls, textCls,
}: { pct: number; ringCls: string; textCls: string }) {
  const r          = 40          // radius
  const cx         = 52          // centre x (with padding)
  const cy         = 52          // centre y
  const size       = 104         // viewBox size
  const circumference = 2 * Math.PI * r        // ≈ 251.3
  const dash       = (pct / 100) * circumference

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        className="stroke-muted/40" strokeWidth={8} />
      {/* Progress */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        className={cn('transition-all duration-700', ringCls)}
        strokeWidth={8}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
      />
      {/* Percentage text — counter-rotated back */}
      <text
        x={cx} y={cy}
        textAnchor="middle" dominantBaseline="middle"
        className={cn('rotate-90 fill-current font-bold text-lg', textCls)}
        style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px`, fontSize: 20 }}
      >
        {pct}%
      </text>
    </svg>
  )
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon: Icon, label, value, valueCls,
}: { icon: React.ElementType; label: string; value: string; valueCls?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon size={13} className="shrink-0" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className={cn('text-xs font-semibold', valueCls ?? 'text-foreground')}>
        {value}
      </span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AttendanceRiskCard({
  present,
  total,
  subjectName,
  className,
}: AttendanceRiskCardProps) {
  const pct      = calculateAttendancePercentage(present, total)
  const risk     = getAttendanceRiskLevel(pct)
  const needed   = classesNeededFor75(present, total)
  const canMiss  = classesCanAffordToMiss(present, total)
  const cfg      = RISK_CONFIG[risk]
  const RiskIcon = cfg.icon

  // ── Predictive message ──────────────────────────────────────────────────
  // "If you miss X more classes, attendance drops below 75%."
  // canMiss === 0 means they're already at/below 75%.
  const predictiveMsg: string = (() => {
    if (risk === 'critical') return 'Attend all upcoming classes to recover your attendance.'
    if (canMiss === 0)       return 'You cannot afford to miss any more classes.'
    if (canMiss === 1)       return 'If you miss 1 more class, your attendance will drop below 75%.'
    return `If you miss ${canMiss} more class${canMiss !== 1 ? 'es' : ''}, your attendance will drop below 75%.`
  })()

  return (
    <Card className={cn('w-full overflow-hidden', className)}>

      {/* Indigo accent bar with risk colour */}
      <div className={cn('h-1 w-full bg-gradient-to-r', cfg.accentCls)} />

      {/* Header */}
      <CardHeader className="px-5 pb-2 pt-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className={cn(
              'flex h-8 w-8 items-center justify-center rounded-lg text-white shadow-sm',
              risk === 'safe'     ? 'bg-emerald-600' :
              risk === 'warning'  ? 'bg-amber-500'   : 'bg-rose-600',
            )}>
              <RiskIcon size={15} />
            </span>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground leading-snug">
                {subjectName ?? 'Attendance Risk'}
              </CardTitle>
              {subjectName && (
                <p className="text-[10px] text-muted-foreground">Attendance health</p>
              )}
            </div>
          </div>
          <Badge className={cn('text-xs font-semibold', cfg.badgeCls)}>
            {cfg.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-1 space-y-4">

        {/* ── Percentage + ring ── */}
        <div className="flex items-center gap-5">
          <div className="shrink-0">
            <PercentRing pct={pct} ringCls={cfg.ringCls} textCls={cfg.textCls} />
          </div>
          {/* Status message */}
          <div className="space-y-2 flex-1">
            <p className={cn('text-sm font-semibold', cfg.textCls)}>
              {cfg.message}
            </p>
            <p className="text-xs text-muted-foreground">
              {present} of {total} classes attended
            </p>
          </div>
        </div>

        {/* ── Stats rows ── */}
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          <InfoRow
            icon={TrendingUp}
            label="Attended"
            value={`${present} / ${total} classes`}
          />
          {needed > 0 ? (
            <InfoRow
              icon={TrendingUp}
              label="Classes needed to reach 75%"
              value={`${needed} class${needed !== 1 ? 'es' : ''}`}
              valueCls={cfg.textCls}
            />
          ) : (
            <InfoRow
              icon={ShieldCheck}
              label="Classes needed to reach 75%"
              value="Already there ✓"
              valueCls="text-emerald-600"
            />
          )}
          <InfoRow
            icon={TrendingDown}
            label="Can still miss"
            value={canMiss > 0 ? `${canMiss} class${canMiss !== 1 ? 'es' : ''}` : 'None'}
            valueCls={canMiss === 0 ? 'text-rose-600' : 'text-emerald-600'}
          />
        </div>

        {/* ── Predictive alert ── */}
        <div className={cn(
          'flex items-start gap-2.5 rounded-xl border px-4 py-3',
          cfg.bgCls, cfg.borderCls,
        )}>
          <Info size={14} className={cn('shrink-0 mt-0.5', cfg.textCls)} />
          <p className={cn('text-xs leading-relaxed', cfg.textCls)}>
            {predictiveMsg}
          </p>
        </div>

      </CardContent>
    </Card>
  )
}

export default AttendanceRiskCard

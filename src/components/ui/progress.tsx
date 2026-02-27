/**
 * Progress  –  shadcn/ui-style radix-free progress bar
 * ─────────────────────────────────────────────────────────────────────────
 * Thin wrapper around a styled <div> — no Radix dependency needed for a
 * progress bar.  Supports color variants and an optional label.
 */

import { cn } from '@/utils/helpers'

export interface ProgressProps {
  /** 0 – 100 */
  value:      number
  /** Visual variant — defaults to 'default' (indigo). */
  variant?:   'default' | 'success' | 'warning' | 'danger'
  /** Extra class names for the track. */
  className?: string
  /** Aria label for screen readers. */
  label?:     string
}

const trackClass = 'relative h-2.5 w-full overflow-hidden rounded-full bg-secondary'

const fillVariant: Record<NonNullable<ProgressProps['variant']>, string> = {
  default: 'bg-primary',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger:  'bg-red-500',
}

export function Progress({ value, variant = 'default', className, label }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(trackClass, className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-all duration-500 ease-out',
          fillVariant[variant],
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}

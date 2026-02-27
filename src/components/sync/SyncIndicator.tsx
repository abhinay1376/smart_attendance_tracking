/**
 * SyncIndicator  –  Compact sync-status badge for the AppShell header
 * ─────────────────────────────────────────────────────────────────────────
 * Renders a small pill that communicates the current sync state at a glance:
 *
 *  • Offline           → grey  "Offline"                  (WifiOff icon)
 *  • Online + N pending→ amber "N pending"                 (CloudUpload icon)
 *  • Syncing           → indigo spinning "Syncing…"        (Loader2 icon)
 *  • All synced        → green  "Synced"                   (CheckCircle2 icon)
 *  • Error             → red   "Sync error (N failed)"     (AlertCircle icon)
 *
 * The badge fades back to an unobtrusive "Synced" after a successful run;
 * the user can click it at any time to trigger a manual sync.
 */

import { cn } from '@/utils/helpers'
import { useSync }          from '@/hooks/useSync'
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  Loader2,
  WifiOff,
}                           from 'lucide-react'

// ─── Component ────────────────────────────────────────────────────────────────

export default function SyncIndicator() {
  const { isOnline, status, unsyncedCount, lastResult, error, triggerSync } = useSync()

  // ── Derive display values ───────────────────────────────────────────────

  type Config = {
    label:   string
    icon:    React.ReactNode
    variant: 'offline' | 'pending' | 'syncing' | 'synced' | 'error'
  }

  const cfg: Config = (() => {
    if (!isOnline) {
      return {
        label:   'Offline',
        icon:    <WifiOff className="h-3 w-3" />,
        variant: 'offline',
      }
    }
    if (status === 'syncing') {
      return {
        label:   'Syncing…',
        icon:    <Loader2 className="h-3 w-3 animate-spin" />,
        variant: 'syncing',
      }
    }
    if (status === 'error') {
      return {
        label:   `Sync error${lastResult?.failed ? ` (${lastResult.failed} failed)` : ''}`,
        icon:    <AlertCircle className="h-3 w-3" />,
        variant: 'error',
      }
    }
    if (unsyncedCount > 0) {
      return {
        label:   `${unsyncedCount} pending`,
        icon:    <CloudUpload className="h-3 w-3" />,
        variant: 'pending',
      }
    }
    // online + no pending + not syncing = all good
    return {
      label:   'Synced',
      icon:    <CheckCircle2 className="h-3 w-3" />,
      variant: 'synced',
    }
  })()

  // ── Variant styles ──────────────────────────────────────────────────────

  const variantClass: Record<Config['variant'], string> = {
    offline: 'bg-slate-100 text-slate-500 border-slate-200',
    pending: 'bg-amber-50  text-amber-700  border-amber-200',
    syncing: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    synced:  'bg-green-50  text-green-700  border-green-200',
    error:   'bg-red-50    text-red-600    border-red-200',
  }

  // ── Tooltip ─────────────────────────────────────────────────────────────

  const tooltip: string = (() => {
    if (!isOnline)            return 'You are offline — records saved locally'
    if (status === 'syncing') return 'Pushing attendance records to server…'
    if (status === 'error')   return error ?? 'Some records failed to sync. Click to retry.'
    if (unsyncedCount > 0)    return `${unsyncedCount} record(s) waiting to sync. Click to sync now.`
    return 'All records synced'
  })()

  // ── Can the user click to trigger a retry / manual sync? ────────────────
  const clickable = isOnline && status !== 'syncing'

  return (
    <button
      type="button"
      onClick={clickable ? triggerSync : undefined}
      title={tooltip}
      aria-label={tooltip}
      disabled={!clickable}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'text-xs font-medium transition-all duration-300 select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
        variantClass[cfg.variant],
        clickable ? 'cursor-pointer hover:opacity-80 active:scale-95' : 'cursor-default',
      )}
    >
      {cfg.icon}
      <span>{cfg.label}</span>
    </button>
  )
}

/**
 * SyncStatusCard
 * ─────────────────────────────────────────────────────────────────────────
 * Reusable shadcn/ui card showing connectivity status, pending record count,
 * and the last successful sync timestamp. Styled with an indigo theme.
 *
 * Usage:
 *   const { isOnline, unsyncedCount, lastSyncTime } = useSync()
 *   <SyncStatusCard
 *     isOnline={isOnline}
 *     unsyncedCount={unsyncedCount}
 *     lastSyncTime={lastSyncTime}
 *   />
 */

import { Wifi, WifiOff, RefreshCw, Clock, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/utils/helpers'

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SyncStatusCardProps {
  /** Browser online / offline state */
  isOnline: boolean
  /** Number of attendance records not yet synced to the server */
  unsyncedCount: number
  /** ISO 8601 string of the last successful sync, or null if never synced */
  lastSyncTime: string | null
  /** Optional extra Tailwind classes on the outer Card */
  className?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSyncTime(iso: string | null): string {
  if (!iso) return 'Never'
  const date    = new Date(iso)
  const diffMs  = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1)  return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`

  return date.toLocaleString(undefined, {
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

// ─── StatRow ──────────────────────────────────────────────────────────────────

interface StatRowProps {
  icon:     React.ReactNode
  label:    string
  children: React.ReactNode
}

function StatRow({ icon, label, children }: StatRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-400">
          {icon}
        </span>
        <span className="text-sm font-medium text-foreground">{label}</span>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SyncStatusCard({
  isOnline,
  unsyncedCount,
  lastSyncTime,
  className,
}: SyncStatusCardProps) {
  return (
    <Card className={cn('w-full overflow-hidden', className)}>

      {/* Indigo accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-violet-500" />

      {/* Header */}
      <CardHeader className="px-5 pb-2 pt-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
              <ShieldCheck size={15} />
            </span>
            <CardTitle className="text-sm font-semibold text-foreground">
              Sync Status
            </CardTitle>
          </div>

          {/* Live pulse indicator */}
          <span className="relative flex h-2.5 w-2.5">
            {isOnline && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={cn(
                'relative inline-flex h-2.5 w-2.5 rounded-full',
                isOnline ? 'bg-emerald-500' : 'bg-amber-400',
              )}
            />
          </span>
        </div>
      </CardHeader>

      {/* Stat rows */}
      <CardContent className="px-5 pb-4 pt-1">
        <div className="divide-y divide-border">

          {/* Sync Status */}
          <StatRow
            icon={isOnline ? <Wifi size={15} /> : <WifiOff size={15} />}
            label="Sync Status"
          >
            <Badge
              className={cn(
                'font-semibold',
                isOnline
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
              )}
            >
              {isOnline ? '● Online' : '● Offline'}
            </Badge>
          </StatRow>

          {/* Unsynced Records */}
          <StatRow
            icon={
              <RefreshCw
                size={15}
                className={unsyncedCount > 0 ? 'text-amber-500 dark:text-amber-400' : undefined}
              />
            }
            label="Unsynced Records"
          >
            {unsyncedCount === 0 ? (
              <Badge className="font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                All synced
              </Badge>
            ) : (
              <Badge className="tabular-nums font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                {unsyncedCount} pending
              </Badge>
            )}
          </StatRow>

          {/* Last Synced */}
          <StatRow
            icon={<Clock size={15} />}
            label="Last Synced"
          >
            <span
              className="text-sm font-medium tabular-nums text-foreground"
              title={lastSyncTime ?? 'Never synced'}
            >
              {formatSyncTime(lastSyncTime)}
            </span>
          </StatRow>

        </div>
      </CardContent>
    </Card>
  )
}

export default SyncStatusCard

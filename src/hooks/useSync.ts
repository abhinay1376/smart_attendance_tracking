/**
 * useSync  –  App-wide sync hook with transparency support
 * ─────────────────────────────────────────────────────────────────────────
 * Responsibilities
 *  • Tracks online / offline state via navigator.onLine + window events.
 *  • Automatically triggers syncPendingRecords() when the browser comes
 *    back online.
 *  • Exposes triggerSync() for manual sync.
 *  • Maintains unsyncedCount using the efficient IDBIndex.count path.
 *  • Persists and exposes lastSyncTime via localStorage so the sync
 *    transparency dashboard always has a meaningful value across reloads.
 *
 * Designed to be mounted once (in AppShell or similar) so the auto-sync
 * listener is alive for the whole authenticated session.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { syncPendingRecords } from '@/services/sync'
import { getUnsyncedCount, getLastSyncTime, setLastSyncTime } from '@/services/db'
import type { SyncResult } from '@/services/sync'

// ─── Status type ──────────────────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

// ─── Hook return ──────────────────────────────────────────────────────────────

export interface UseSyncReturn {
  /** Whether the browser reports an internet connection. */
  isOnline:       boolean
  /** Current sync lifecycle status. */
  status:         SyncStatus
  /** Records still waiting to be pushed to the backend. */
  unsyncedCount:  number
  /** ISO timestamp of the last successful sync, or null if never synced. */
  lastSyncTime:   string | null
  /** Result of the most recent sync run. */
  lastResult:     SyncResult | null
  /** Error message if the last attempt threw. */
  error:          string | null
  /** Call this to trigger a manual sync at any time. */
  triggerSync:    () => Promise<void>
}

// ─── Implementation ───────────────────────────────────────────────────────────

export function useSync(): UseSyncReturn {
  const [isOnline,      setIsOnline]         = useState<boolean>(navigator.onLine)
  const [status,        setStatus]           = useState<SyncStatus>('idle')
  const [unsyncedCount, setUnsyncedCount]    = useState<number>(0)
  const [lastSyncTime,  setLastSyncTimeState] = useState<string | null>(() => getLastSyncTime())
  const [lastResult,    setLastResult]       = useState<SyncResult | null>(null)
  const [error,         setError]            = useState<string | null>(null)

  // Guard against concurrent sync runs
  const isSyncingRef = useRef(false)

  // ── Refresh the unsynced badge count (uses IDBIndex.count – no full read) ──
  const refreshUnsyncedCount = useCallback(async () => {
    try {
      const count = await getUnsyncedCount()
      setUnsyncedCount(count)
    } catch {
      // Non-critical; swallow silently
    }
  }, [])

  // ── Core sync runner ───────────────────────────────────────────────────────
  const triggerSync = useCallback(async () => {
    if (isSyncingRef.current || !navigator.onLine) return

    isSyncingRef.current = true
    setStatus('syncing')
    setError(null)

    try {
      const result = await syncPendingRecords()
      setLastResult(result)
      setStatus(result.failed > 0 ? 'error' : 'synced')

      // Persist + expose last sync time on any successful (even partial) run
      if (result.synced > 0 || result.failed === 0) {
        const now = new Date().toISOString()
        setLastSyncTime(now)           // persists to localStorage
        setLastSyncTimeState(now)      // updates React state
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed'
      setError(msg)
      setStatus('error')
    } finally {
      isSyncingRef.current = false
      await refreshUnsyncedCount()    // recalculate after every attempt
    }
  }, [refreshUnsyncedCount])

  // ── Mount: load count + sync if already online ────────────────────────────
  useEffect(() => {
    refreshUnsyncedCount()

    if (navigator.onLine) {
      triggerSync()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])   // intentionally once on mount

  // ── React to connectivity changes ─────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      triggerSync()           // auto-sync the moment we reconnect
    }

    const handleOffline = () => {
      setIsOnline(false)
      setStatus('idle')       // reset so we don't show "synced" while offline
    }

    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [triggerSync])

  return {
    isOnline,
    status,
    unsyncedCount,
    lastSyncTime,
    lastResult,
    error,
    triggerSync,
  }
}

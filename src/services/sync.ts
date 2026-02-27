/**
 * sync.ts  –  Background sync service
 * ─────────────────────────────────────────────────────────────────────────
 * Responsible for flushing locally-stored (synced: false) attendance
 * records to the backend whenever the browser is online.
 *
 * Called by:
 *  • useSync hook  – automatically on the "online" window event
 *  • Manual trigger – exposed through the hook's triggerSync()
 */

import { getUnsyncedRecords, markBatchAsSynced, getUnsyncedCount } from './db'
import type { AttendanceRecord } from './db'
import { getToken } from './api'

const API_BASE   = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000'
const SYNC_URL   = `${API_BASE}/attendance/sync`

// ─── Result type ──────────────────────────────────────────────────────────────

export interface SyncResult {
  synced:  number
  failed:  number
  pending: number   // records still unsynced after this run
}

// ─── Internal: push one record ────────────────────────────────────────────────

async function pushRecord(record: AttendanceRecord): Promise<void> {
  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(SYNC_URL, {
    method:  'POST',
    headers,
    body:    JSON.stringify(record),
  })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for record ${record.id}`)
  }
}

// ─── Public: sync all pending records ────────────────────────────────────────

/**
 * syncPendingRecords
 * ─────────────────────────────────────────────────────────────────────────
 * 1. Reads all un-synced records from IndexedDB.
 * 2. POSTs each one to `/sync-attendance` individually — a single failure
 *    does not abort the rest.
 * 3. Collects every successful id, then flips synced = true in one
 *    atomic IndexedDB transaction via markBatchAsSynced.
 * 4. Returns { synced, failed, pending } for the caller to display.
 */
export async function syncPendingRecords(): Promise<SyncResult> {
  const pending = await getUnsyncedRecords()

  if (pending.length === 0) {
    return { synced: 0, failed: 0, pending: 0 }
  }

  const syncedIds: string[] = []
  let failed = 0

  for (const record of pending) {
    try {
      await pushRecord(record)
      syncedIds.push(record.id)
    } catch {
      failed++
    }
  }

  if (syncedIds.length > 0) {
    await markBatchAsSynced(syncedIds)
  }

  return {
    synced:  syncedIds.length,
    failed,
    pending: failed,   // only truly-failed records remain pending
  }
}

// ─── Public: how many records are waiting to sync ────────────────────────────

/**
 * Uses IDBIndex.count – a single, allocation-free round-trip.
 * Prefer this over fetching full records just to measure their count.
 */
export async function getPendingCount(): Promise<number> {
  return getUnsyncedCount()
}

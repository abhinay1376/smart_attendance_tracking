/**
 * sync.ts  –  Background sync service
 * ─────────────────────────────────────────────────────────────────────────
 * Responsible for flushing locally-stored (synced: false) attendance
 * records to the backend whenever the browser is online.
 *
 * Sync flow:
 *  1. Read all records where synced === false from IndexedDB.
 *  2. Send the entire array in ONE bulk POST to /attendance/sync.
 *  3. On success, mark every record as synced in IndexedDB.
 *  4. Return { synced, failed, pending }.
 *
 * Called by:
 *  • useSync hook  – automatically on the "online" window event
 *  • Manual trigger – exposed through the hook's triggerSync()
 */

import { getUnsyncedRecords, markBatchAsSynced } from './db'
import { getToken } from './api'

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000'
const SYNC_URL = `${API_BASE}/attendance/sync`

// ─── Result type ──────────────────────────────────────────────────────────────

export interface SyncResult {
  synced:  number
  failed:  number
  pending: number   // records still unsynced after this run
}

// ─── Module-level guard ───────────────────────────────────────────────────────
// Prevents two concurrent sync runs from racing each other regardless of
// which call site (useSync hook, immediate post-save, etc.) triggered them.

let _isSyncing = false

// ─── Public: sync all pending records in one bulk request ─────────────────────

/**
 * syncPendingRecords
 * ─────────────────────────────────────────────────────────────────────────
 * 1. Reads all un-synced records from IndexedDB.
 * 2. Sends them ALL in a single POST to /attendance/sync as a JSON array.
 * 3. On a successful HTTP 2xx response, marks every record as synced
 *    in one atomic IndexedDB transaction via markBatchAsSynced.
 * 4. Returns { synced, failed, pending } for the caller to display.
 *
 * No per-record loops. No duplicate API calls. One request, one response.
 */
export async function syncPendingRecords(): Promise<SyncResult> {
  // Bail out immediately if another sync is already in flight
  if (_isSyncing || !navigator.onLine) {
    return { synced: 0, failed: 0, pending: 0 }
  }

  _isSyncing = true

  try {
    return await _doSync()
  } finally {
    _isSyncing = false
  }
}

async function _doSync(): Promise<SyncResult> {
  const pending = await getUnsyncedRecords()

  if (pending.length === 0) {
    return { synced: 0, failed: 0, pending: 0 }
  }

  const token = getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(SYNC_URL, {
      method:  'POST',
      headers,
      body:    JSON.stringify(pending),   // send the full array at once
    })
  } catch {
    // Network failure – leave all records unsynced, report as failed
    return { synced: 0, failed: pending.length, pending: pending.length }
  }

  if (!res.ok) {
    // Server rejected the batch – do not mark anything as synced
    return { synced: 0, failed: pending.length, pending: pending.length }
  }

  // Parse response to get per-record outcome counts from the backend
  let body: { inserted?: number; updated?: number; failed?: number } = {}
  try { body = await res.json() } catch { /* ignore parse errors */ }

  const serverFailed = body.failed ?? 0

  // Mark ALL pending records as synced locally.
  // The backend is idempotent (upsert), so even records the server counted
  // as "already existed" should not be re-sent next time.
  const allIds = pending.map((r) => r.id)
  await markBatchAsSynced(allIds)

  return {
    synced:  allIds.length,
    failed:  serverFailed,
    pending: serverFailed,   // only truly-rejected records remain
  }
}

/** Returns true while a sync is already in flight (useful for UI guards). */
export function isSyncing(): boolean {
  return _isSyncing
}

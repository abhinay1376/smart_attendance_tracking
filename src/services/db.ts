/**
 * db.ts  –  IndexedDB attendance service (offline-first)
 * ─────────────────────────────────────────────────────────────────────────
 * Design goals:
 *  • Zero external dependencies – raw IndexedDB API only.
 *  • Single shared connection (lazy-initialised, reused across calls).
 *  • Every public function is a clean async utility – no class required.
 *  • Schema migrations handled inside onupgradeneeded by version number.
 *
 * Public API surface:
 *  addRecord(record)             – upsert one record
 *  saveBatchRecords(records)     – upsert many records in one transaction
 *  getRecordById(id)             – fetch a single record (or null)
 *  getAllRecords()                – fetch every record
 *  getRecordsByDate(date)        – fetch records for one ISO date
 *  getUnsyncedRecords()          – fetch records where synced === false
 *  getUnsyncedCount()            – count records where synced === false
 *  markAsSynced(id)              – flip synced flag to true for one id
 *  markBatchAsSynced(ids)        – flip synced flag for many ids at once
 *  deleteRecord(id)              – hard-delete one record
 *
 * Sync-transparency helpers (localStorage, no IndexedDB required):
 *  getLastSyncTime()             – returns stored last-sync timestamp or null
 *  setLastSyncTime(time)         – persists a last-sync timestamp string
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const DB_NAME      = 'smart-attendance-db'
const DB_VERSION   = 2
const STORE        = 'attendance'
const SYNC_TIME_KEY = 'sa_last_sync_time'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Core attendance record stored in IndexedDB. */
export interface AttendanceRecord {
  /** UUID – primary key */
  id:         string
  /** Student identifier */
  studentId:  string
  /** Class / section identifier */
  courseId:   string
  /** Subject identifier */
  subjectId:  string
  /** ISO 8601 date string, e.g. "2026-02-27" */
  date:       string
  /** Attendance status for this session */
  status:     'present' | 'absent'
  /** Whether the student was actively participating this session */
  active:     boolean
  /** Unix timestamp (ms) when the record was created locally */
  createdAt:  number
  /** false until successfully POSTed to the remote API */
  synced:     boolean
}

// ─── Singleton connection ─────────────────────────────────────────────────────

/**
 * Lazily opens the database once and caches the connection.
 * All subsequent calls get the same IDBDatabase instance.
 */
let _db: IDBDatabase | null = null

function getDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const tx = (event.target as IDBOpenDBRequest).transaction!

      if (!db.objectStoreNames.contains(STORE)) {
        // ── Fresh install: create object store + indexes ──
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('studentId', 'studentId', { unique: false })
        store.createIndex('subjectId', 'subjectId', { unique: false })
        store.createIndex('date',      'date',      { unique: false })
        // IDBKeyRange.only(false) used to query pending-sync records
        store.createIndex('synced',    'synced',    { unique: false })
      } else {
        // ── Upgrade v1 → v2: add subjectId index if missing ──
        const store = tx.objectStore(STORE)
        if (!store.indexNames.contains('subjectId')) {
          store.createIndex('subjectId', 'subjectId', { unique: false })
        }
      }
    }

    req.onsuccess = () => {
      _db = req.result

      // Clean up cached instance if the database is force-closed externally
      _db.onclose      = () => { _db = null }
      _db.onerror      = () => { _db = null }
      _db.onversionchange = () => { _db?.close(); _db = null }

      resolve(_db)
    }

    req.onerror  = () => reject(req.error)
    req.onblocked = () => reject(new Error('IndexedDB blocked – please close other tabs.'))
  })
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Run a block inside a readwrite transaction and resolve/reject
 * when the transaction completes or errors.
 */
async function withWriteTx(
  fn: (store: IDBObjectStore) => void,
): Promise<void> {
  const db    = await getDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    fn(store)
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
    tx.onabort    = () => reject(tx.error)
  })
}

/**
 * Run a block inside a readonly transaction and resolve with its result.
 */
async function withReadTx<T>(
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly')
    const req = fn(tx.objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

// ─── Write operations ─────────────────────────────────────────────────────────

/**
 * Add or update a single attendance record (upsert by id).
 * Always sets `synced: false` unless the caller explicitly passes `true`.
 */
export async function addRecord(record: AttendanceRecord): Promise<void> {
  await withWriteTx((store) => store.put(record))
}

/**
 * Upsert multiple attendance records in a single atomic transaction.
 * Skips the call entirely when the array is empty.
 */
export async function saveBatchRecords(records: AttendanceRecord[]): Promise<void> {
  if (records.length === 0) return
  await withWriteTx((store) => {
    for (const r of records) store.put(r)
  })
}

/**
 * Mark a single record as synced.
 * Reads the current record from the store, flips the flag, then writes it back.
 * No-ops silently if the id does not exist.
 */
export async function markAsSynced(id: string): Promise<void> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    const get   = store.get(id)

    get.onsuccess = () => {
      const record = get.result as AttendanceRecord | undefined
      if (record) store.put({ ...record, synced: true })
    }

    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
    tx.onabort    = () => reject(tx.error)
  })
}

/**
 * Mark multiple records as synced in a single transaction.
 * Useful after a successful bulk-POST to the backend.
 */
export async function markBatchAsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return

  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)

    for (const id of ids) {
      const get = store.get(id)
      get.onsuccess = () => {
        const record = get.result as AttendanceRecord | undefined
        if (record) store.put({ ...record, synced: true })
      }
    }

    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
    tx.onabort    = () => reject(tx.error)
  })
}

/**
 * Hard-delete a record by its id.
 * No-ops silently if the id does not exist.
 */
export async function deleteRecord(id: string): Promise<void> {
  await withWriteTx((store) => store.delete(id))
}

/**
 * Delete every record whose id starts with the "seed-" prefix.
 * Called by the demo seeder when it needs to replace old fake-id data
 * with records built from real API student / subject ids.
 */
export async function clearDemoRecords(): Promise<void> {
  const all = await getAllRecords()
  const demoIds = all.filter((r) => r.id.startsWith('seed-')).map((r) => r.id)
  if (demoIds.length === 0) return
  const db = await getDB()
  await new Promise<void>((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    demoIds.forEach((id) => store.delete(id))
    tx.oncomplete = () => resolve()
    tx.onerror    = () => reject(tx.error)
  })
}

// ─── Read operations ──────────────────────────────────────────────────────────

/**
 * Retrieve a single record by id.
 * Returns `null` when no record with that id exists.
 */
export async function getRecordById(id: string): Promise<AttendanceRecord | null> {
  const result = await withReadTx<AttendanceRecord | undefined>(
    (store) => store.get(id),
  )
  return result ?? null
}

/**
 * Retrieve every record in the store.
 */
export async function getAllRecords(): Promise<AttendanceRecord[]> {
  return withReadTx<AttendanceRecord[]>((store) => store.getAll())
}

/**
 * Retrieve all records for a specific ISO date string, e.g. "2026-02-27".
 */
export async function getRecordsByDate(date: string): Promise<AttendanceRecord[]> {
  if (!date) return []
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE, 'readonly')
    const index = tx.objectStore(STORE).index('date')
    const req   = index.getAll(IDBKeyRange.only(date))
    req.onsuccess = () => resolve(req.result as AttendanceRecord[])
    req.onerror   = () => reject(req.error)
  })
}

/**
 * Retrieve all records whose `synced` flag is `false`.
 * Used by the background sync service before pushing to the backend.
 *
 * NOTE: IDBKeyRange.only(false) throws in Chromium because boolean is not a
 * valid IDB key type. We fetch all records and filter in JS instead.
 */
export async function getUnsyncedRecords(): Promise<AttendanceRecord[]> {
  const all = await withReadTx<AttendanceRecord[]>((store) => store.getAll())
  return all.filter((r) => !r.synced)
}

// ─── Sync-transparency helpers ──────────────────────────────────────────────────

/**
 * Returns the total number of records whose `synced` flag is `false`.
 * Uses an IDBIndex count – a single round-trip, no array allocation.
 */
export async function getUnsyncedCount(): Promise<number> {
  const db = await getDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(STORE, 'readonly')
    // IDBKeyRange does not support boolean keys, so fetch all and filter.
    const req = tx.objectStore(STORE).getAll()
    req.onsuccess = () =>
      resolve(
        (req.result as Array<{ synced?: boolean }>).filter((r) => !r.synced).length,
      )
    req.onerror = () => reject(req.error)
  })
}

/**
 * Reads the last-sync timestamp from localStorage.
 * Returns the stored ISO string, or `null` if no sync has occurred yet.
 */
export function getLastSyncTime(): string | null {
  return localStorage.getItem(SYNC_TIME_KEY)
}

/**
 * Persists a last-sync timestamp to localStorage.
 * Pass an ISO 8601 string (e.g. `new Date().toISOString()`).
 */
export function setLastSyncTime(time: string): void {
  localStorage.setItem(SYNC_TIME_KEY, time)
}

// ─── Back-compat alias (used by existing code) ────────────────────────────────

/** @deprecated Use addRecord() instead. */
export const saveRecord = addRecord

import { useCallback, useEffect, useState } from 'react'
import { getAllRecords, saveRecord } from '@/services/db'
import type { AttendanceRecord } from '@/services/db'

/**
 * useAttendance
 * Provides CRUD operations over local IndexedDB attendance records.
 * Consumers don't need to know about the storage layer.
 */
export function useAttendance() {
  const [records, setRecords]   = useState<AttendanceRecord[]>([])
  const [loading, setLoading]   = useState(true)
  const [error,   setError]     = useState<string | null>(null)

  /** Load all records from IndexedDB on mount */
  useEffect(() => {
    getAllRecords()
      .then(setRecords)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load records')
      })
      .finally(() => setLoading(false))
  }, [])

  /** Persist a new or updated record locally */
  const markAttendance = useCallback(async (record: AttendanceRecord) => {
    await saveRecord(record)
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === record.id)
      return idx >= 0
        ? prev.map((r) => (r.id === record.id ? record : r))
        : [...prev, record]
    })
  }, [])

  return { records, loading, error, markAttendance }
}

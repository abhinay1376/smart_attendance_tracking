/**
 * holidays.ts  –  localStorage-based holiday store
 * ──────────────────────────────────────────────────
 * Holidays are per-device (faculty local). Each entry stores the ISO date,
 * reason text and when it was marked.
 */

export interface HolidayEntry {
  date:     string   // ISO "YYYY-MM-DD"
  reason:   string
  markedAt: number   // Unix ms
}

const KEY = 'sa_holidays'

function load(): Record<string, HolidayEntry> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}')
  } catch {
    return {}
  }
}

function save(map: Record<string, HolidayEntry>): void {
  localStorage.setItem(KEY, JSON.stringify(map))
}

/** All holidays keyed by their ISO date string */
export function getHolidays(): Record<string, HolidayEntry> {
  return load()
}

/** Single holiday for a date, or null */
export function getHoliday(date: string): HolidayEntry | null {
  return load()[date] ?? null
}

/** Upsert a holiday entry */
export function setHoliday(date: string, reason: string): void {
  const map = load()
  map[date] = { date, reason, markedAt: Date.now() }
  save(map)
}

/** Remove a holiday entry */
export function removeHoliday(date: string): void {
  const map = load()
  delete map[date]
  save(map)
}

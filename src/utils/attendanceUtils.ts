/**
 * attendanceUtils.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Pure, side-effect-free helpers for attendance percentage calculation,
 * risk classification, and predictive alerts.
 *
 * All functions accept raw counts (integers ≥ 0) and return plain values —
 * no state, no side-effects, easy to unit-test.
 */

/** Minimum attendance percentage required by the institution */
export const REQUIRED_PCT = 75

export type RiskLevel = 'safe' | 'warning' | 'critical'

// ─── 1. Percentage ────────────────────────────────────────────────────────────

/**
 * calculateAttendancePercentage
 * ─────────────────────────────
 * Formula:  percentage = (present / total) × 100
 *
 * Edge-cases:
 *   • total ≤ 0  → return 0  (avoid division by zero)
 *   • result clamped to [0, 100]
 *
 * @example calculateAttendancePercentage(18, 24) → 75
 */
export function calculateAttendancePercentage(
  present: number,
  total:   number,
): number {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((present / total) * 100)))
}

// ─── 2. Risk level ────────────────────────────────────────────────────────────

/**
 * getAttendanceRiskLevel
 * ──────────────────────
 * Classifies a percentage into one of three tiers:
 *   ≥ 80 %        → "safe"     (comfortable buffer above 75%)
 *   75 – 79 %     → "warning"  (at the threshold, no room to miss)
 *   < 75 %        → "critical" (below the required minimum)
 *
 * @example getAttendanceRiskLevel(82) → 'safe'
 * @example getAttendanceRiskLevel(77) → 'warning'
 * @example getAttendanceRiskLevel(68) → 'critical'
 */
export function getAttendanceRiskLevel(percentage: number): RiskLevel {
  if (percentage >= 80)           return 'safe'
  if (percentage >= REQUIRED_PCT) return 'warning'
  return 'critical'
}

// ─── 3. Classes needed to reach 75% ──────────────────────────────────────────

/**
 * classesNeededFor75
 * ──────────────────
 * How many *consecutive* classes must the student attend (without missing any)
 * to reach exactly 75%?
 *
 * Derivation:
 *   We need:  (present + n) / (total + n) ≥ 0.75
 *             present + n ≥ 0.75 × (total + n)
 *             present + n ≥ 0.75 × total + 0.75 × n
 *             0.25 × n   ≥ 0.75 × total − present
 *             n          ≥ (0.75 × total − present) / 0.25
 *             n          ≥ 3 × total − 4 × present
 *
 * Returns 0 if the student already meets or exceeds 75%.
 *
 * @example classesNeededFor75(14, 24) → 4   (14÷24 = 58%, needs 4 more)
 * @example classesNeededFor75(18, 24) → 0   (18÷24 = 75%, already there)
 */
export function classesNeededFor75(present: number, total: number): number {
  // Already at or above the threshold
  if (total > 0 && present / total >= REQUIRED_PCT / 100) return 0

  // n = ceil( (0.75 × total − present) / 0.25 )
  //   = ceil( 3 × total − 4 × present )
  const needed = 3 * total - 4 * present
  return Math.ceil(Math.max(0, needed))
}

// ─── 4. Classes the student can still afford to miss ─────────────────────────

/**
 * classesCanAffordToMiss
 * ──────────────────────
 * How many *future* classes can the student miss while staying at or above 75%?
 * (Used for the predictive "If you miss X more…" alert.)
 *
 * Derivation:
 *   We need:  present / (total + x) ≥ 0.75
 *             present               ≥ 0.75 × (total + x)
 *             present / 0.75        ≥ total + x
 *             x                    ≤ present / 0.75 − total
 *
 * Returns 0 when the student is already at or below 75% (no misses allowed).
 *
 * @example classesCanAffordToMiss(22, 24) → 5   (22÷24 = 92%, plenty of room)
 * @example classesCanAffordToMiss(18, 24) → 0   (18÷24 = 75%, can't miss any)
 * @example classesCanAffordToMiss(14, 24) → 0   (14÷24 = 58%, already critical)
 */
export function classesCanAffordToMiss(present: number, total: number): number {
  if (total <= 0) return 0

  // x = floor( present / 0.75 − total )
  const canMiss = Math.floor(present / (REQUIRED_PCT / 100) - total)
  return Math.max(0, canMiss)
}

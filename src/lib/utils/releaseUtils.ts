/**
 * Utility functions for release version analysis and quarterly release detection
 */

export type QuarterInfo = {
  quarter: 1 | 2 | 3 | 4
  year: number
  label: string // e.g., "Q1 2025"
}

/**
 * Detects if a release version indicates a quarterly/major release
 * Based on patterns like:
 * - Manual admin flag (takes precedence)
 * - Explicit quarterly markers: "25.01.17 (Q1)", "25.04.11 (Q2)", etc.
 * - Version patterns that indicate major quarterly releases
 */
export function isQuarterlyRelease(version: string, releaseDate?: string, isQuarterlyFlag?: boolean | null): boolean {
  // Simplified: only respect the manual/database flag
  return isQuarterlyFlag === true
}

/**
 * Extracts quarter information from a release version and date
 */
export function getQuarterInfo(version: string, releaseDate?: string, isQuarterlyFlag?: boolean | null): QuarterInfo | null {
  // Only show quarter info if manually marked as quarterly
  if (isQuarterlyFlag !== true) {
    return null
  }

  // Compute quarter label based on release date when available
  if (!releaseDate) {
    return null
  }

  const date = new Date(releaseDate)
  const month = date.getMonth() + 1
  const year = date.getFullYear()

  let quarter: 1 | 2 | 3 | 4
  if (month >= 1 && month <= 3) quarter = 1
  else if (month >= 4 && month <= 6) quarter = 2
  else if (month >= 7 && month <= 9) quarter = 3
  else quarter = 4

  return {
    quarter,
    year,
    label: `Q${quarter} ${year}`
  }
}

/**
 * Gets the color scheme for a quarterly release badge
 */
export function getQuarterColorScheme(quarter: 1 | 2 | 3 | 4): string {
  const schemes = {
    1: 'bg-blue-500/20 text-blue-200 border-blue-500/40', // Q1 - Blue (Winter/New Year)
    2: 'bg-green-500/20 text-green-200 border-green-500/40', // Q2 - Green (Spring)
    3: 'bg-orange-500/20 text-orange-200 border-orange-500/40', // Q3 - Orange (Summer)
    4: 'bg-purple-500/20 text-purple-200 border-purple-500/40', // Q4 - Purple (Fall/Year-end)
  }
  return schemes[quarter]
}
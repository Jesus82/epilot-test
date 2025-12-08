/**
 * Chart-related types for BTC Price Chart
 * Single source of truth for chart configuration
 */

/**
 * Chart margin configuration
 */
export interface ChartMargin {
  top: number
  right: number
  bottom: number
  left: number
}

/**
 * Chart padding (same structure as margin)
 */
export type ChartPadding = ChartMargin

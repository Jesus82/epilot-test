/**
 * Pure helper functions for BTC Price Chart component
 * These functions have no Vue dependencies and are easily testable
 */

import type { PricePoint } from '../../shared/types/btc'

/**
 * Time range options for the chart
 */
export const TIME_RANGES = [
  { label: '5m', minutes: 5 },
  { label: '10m', minutes: 10 },
  { label: '1h', minutes: 60 },
  { label: '6h', minutes: 360 },
  { label: '24h', minutes: 1440 },
] as const

export type TimeRange = typeof TIME_RANGES[number]

/**
 * Get sample interval for downsampling price data (in milliseconds)
 * Must match API intervals for consistency across historical and live data
 */
export const getSampleInterval = (rangeMinutes: number): number => {
  if (rangeMinutes <= 5) return 1000 // 1s -> 300 points
  if (rangeMinutes <= 10) return 2000 // 2s -> 300 points
  if (rangeMinutes <= 60) return 60 * 1000 // 1m -> 60 points (matches API 1m candles)
  if (rangeMinutes <= 360) return 60 * 1000 // 1m -> 360 points
  return 5 * 60 * 1000 // 5m -> 288 points (24h)
}

/**
 * Bucket data by interval, keeping the last point in each bucket
 * Used for downsampling to consistent density across time ranges
 */
export const bucketDataByInterval = (data: PricePoint[], intervalMs: number): PricePoint[] => {
  if (data.length === 0) return []

  const buckets = new Map<number, PricePoint>()

  for (const point of data) {
    const bucketKey = Math.floor(point.timestamp / intervalMs)
    buckets.set(bucketKey, point)
  }

  return Array.from(buckets.values()).sort((a, b) => a.timestamp - b.timestamp)
}

/**
 * Filter price points to only include those within the time range
 */
export const filterByTimeRange = (data: PricePoint[], rangeMinutes: number, now: number = Date.now()): PricePoint[] => {
  const cutoff = now - rangeMinutes * 60 * 1000
  return data.filter(p => p.timestamp >= cutoff)
}

/**
 * Calculate average price from price points
 */
export const calculateAveragePrice = (data: PricePoint[]): number | null => {
  if (data.length === 0) return null
  const sum = data.reduce((acc, p) => acc + p.price, 0)
  return sum / data.length
}

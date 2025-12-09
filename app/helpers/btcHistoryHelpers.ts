/**
 * Pure helper functions for BTC history management
 * These functions have no Vue/Nuxt dependencies and are easily testable
 */

import type { BinanceKline } from '../../shared/types/binance'
import type { PricePoint } from '../../shared/types/chart'

/**
 * Get the maximum number of points to store for a given time range
 * Prevents memory leaks by limiting storage based on visualization needs
 */
export const getMaxPointsForRange = (minutes: number): number => {
  if (minutes <= 5) return 400 // 1s interval -> ~300 points + buffer
  if (minutes <= 10) return 400 // 2s interval -> ~300 points + buffer
  if (minutes <= 60) return 100 // 1m interval -> 60 points + buffer
  if (minutes <= 360) return 500 // 1m interval -> 360 points + buffer
  return 400 // 5m interval -> 288 points + buffer
}

/**
 * Get the minimum interval between stored points for a given time range (in ms)
 * This prevents storing too many points for longer time ranges
 */
export const getSampleIntervalForRange = (minutes: number): number => {
  if (minutes <= 5) return 1000 // Store every 1s for 5min view
  if (minutes <= 10) return 2000 // Store every 2s for 10min view
  if (minutes <= 60) return 60000 // Store every 1min for 1h view
  if (minutes <= 360) return 60000 // Store every 1min for 6h view
  return 300000 // Store every 5min for 24h view
}

/**
 * Check if a new point should be stored based on the last stored timestamp
 * and the current sample interval
 */
export const shouldStorePoint = (
  lastTimestamp: number | null,
  newTimestamp: number,
  sampleIntervalMs: number,
): boolean => {
  if (lastTimestamp === null) return true
  return (newTimestamp - lastTimestamp) >= sampleIntervalMs
}

/**
 * Get Binance kline API parameters based on time range
 * Returns appropriate interval and limit for the API call
 */
export const getKlineParams = (minutes: number): { interval: string, limit: number } => {
  let interval: string
  let limit: number

  if (minutes <= 15) {
    interval = '1s'
    limit = minutes * 60
  }
  else if (minutes <= 400) {
    interval = '1m'
    limit = minutes
  }
  else {
    interval = '5m'
    limit = Math.ceil(minutes / 5)
  }

  return { interval, limit: Math.min(limit, 1000) } // Binance max limit
}

/**
 * Convert Binance kline data to PricePoint format
 */
export const klinesToPricePoints = (klines: BinanceKline[]): PricePoint[] => {
  return klines.map(kline => ({
    timestamp: kline[0], // openTime
    price: parseFloat(kline[4]), // close price
  }))
}

/**
 * Trim old points based on cutoff time and max points limit
 * First filters by time, then takes most recent up to maxPoints
 */
export const trimOldPoints = (
  points: PricePoint[],
  maxPoints: number,
  cutoffTime: number,
): PricePoint[] => {
  const validPoints = points.filter(p => p.timestamp >= cutoffTime)
  return validPoints.slice(-maxPoints)
}

/**
 * Take the most recent N points from an array
 */
export const takeRecentPoints = (points: PricePoint[], maxPoints: number): PricePoint[] => {
  return points.slice(-maxPoints)
}

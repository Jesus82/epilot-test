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

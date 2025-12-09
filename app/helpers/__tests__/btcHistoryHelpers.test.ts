import { describe, expect, it } from 'vitest'
import {
  getKlineParams,
  getMaxPointsForRange,
  getSampleIntervalForRange,
  klinesToPricePoints,
  shouldStorePoint,
  takeRecentPoints,
  trimOldPoints,
} from '~/helpers/btcHistoryHelpers'
import type { BinanceKline } from '../../../shared/types/binance'
import type { PricePoint } from '../../../shared/types/chart'

describe('btcHistoryHelpers', () => {
  describe('getMaxPointsForRange', () => {
    it('returns 400 for 5 minutes or less', () => {
      expect(getMaxPointsForRange(1)).toBe(400)
      expect(getMaxPointsForRange(5)).toBe(400)
    })

    it('returns 400 for 6-10 minutes', () => {
      expect(getMaxPointsForRange(6)).toBe(400)
      expect(getMaxPointsForRange(10)).toBe(400)
    })

    it('returns 100 for 11-60 minutes', () => {
      expect(getMaxPointsForRange(11)).toBe(100)
      expect(getMaxPointsForRange(30)).toBe(100)
      expect(getMaxPointsForRange(60)).toBe(100)
    })

    it('returns 500 for 61-360 minutes', () => {
      expect(getMaxPointsForRange(61)).toBe(500)
      expect(getMaxPointsForRange(180)).toBe(500)
      expect(getMaxPointsForRange(360)).toBe(500)
    })

    it('returns 400 for more than 360 minutes (24h)', () => {
      expect(getMaxPointsForRange(361)).toBe(400)
      expect(getMaxPointsForRange(1440)).toBe(400)
    })
  })

  describe('getSampleIntervalForRange', () => {
    it('returns 1000ms for 5 minutes or less', () => {
      expect(getSampleIntervalForRange(1)).toBe(1000)
      expect(getSampleIntervalForRange(5)).toBe(1000)
    })

    it('returns 2000ms for 6-10 minutes', () => {
      expect(getSampleIntervalForRange(6)).toBe(2000)
      expect(getSampleIntervalForRange(10)).toBe(2000)
    })

    it('returns 60000ms for 11-60 minutes', () => {
      expect(getSampleIntervalForRange(11)).toBe(60000)
      expect(getSampleIntervalForRange(60)).toBe(60000)
    })

    it('returns 60000ms for 61-360 minutes', () => {
      expect(getSampleIntervalForRange(61)).toBe(60000)
      expect(getSampleIntervalForRange(360)).toBe(60000)
    })

    it('returns 300000ms for more than 360 minutes', () => {
      expect(getSampleIntervalForRange(361)).toBe(300000)
      expect(getSampleIntervalForRange(1440)).toBe(300000)
    })
  })

  describe('shouldStorePoint', () => {
    it('returns true when lastTimestamp is null', () => {
      expect(shouldStorePoint(null, 1700000001000, 1000)).toBe(true)
    })

    it('returns true when gap is exactly the sample interval', () => {
      expect(shouldStorePoint(1700000000000, 1700000001000, 1000)).toBe(true)
    })

    it('returns true when gap is larger than sample interval', () => {
      expect(shouldStorePoint(1700000000000, 1700000002000, 1000)).toBe(true)
    })

    it('returns false when gap is smaller than sample interval', () => {
      expect(shouldStorePoint(1700000000000, 1700000000500, 1000)).toBe(false)
      expect(shouldStorePoint(1700000000000, 1700000000999, 1000)).toBe(false)
    })

    it('works with larger sample intervals', () => {
      const minute = 60000
      expect(shouldStorePoint(1700000000000, 1700000030000, minute)).toBe(false) // 30s gap
      expect(shouldStorePoint(1700000000000, 1700000060000, minute)).toBe(true) // 60s gap
      expect(shouldStorePoint(1700000000000, 1700000120000, minute)).toBe(true) // 120s gap
    })
  })

  describe('getKlineParams', () => {
    it('returns 1s interval for 15 minutes or less', () => {
      expect(getKlineParams(5)).toEqual({ interval: '1s', limit: 300 })
      expect(getKlineParams(10)).toEqual({ interval: '1s', limit: 600 })
      expect(getKlineParams(15)).toEqual({ interval: '1s', limit: 900 })
    })

    it('returns 1m interval for 16-400 minutes', () => {
      expect(getKlineParams(60)).toEqual({ interval: '1m', limit: 60 })
      expect(getKlineParams(360)).toEqual({ interval: '1m', limit: 360 })
      expect(getKlineParams(400)).toEqual({ interval: '1m', limit: 400 })
    })

    it('returns 5m interval for more than 400 minutes', () => {
      expect(getKlineParams(1440)).toEqual({ interval: '5m', limit: 288 })
    })

    it('caps limit at 1000 (Binance max)', () => {
      expect(getKlineParams(2000)).toEqual({ interval: '5m', limit: 400 })
    })
  })

  describe('klinesToPricePoints', () => {
    it('converts Binance klines to PricePoints', () => {
      const klines: BinanceKline[] = [
        [1700000000000, '95000.00', '95500.00', '94500.00', '95200.00', '100', 1700000060000, '9500000', 50, '50', '4750000', '0'],
        [1700000060000, '95200.00', '95800.00', '95000.00', '95600.00', '150', 1700000120000, '14340000', 75, '75', '7170000', '0'],
      ]

      const result = klinesToPricePoints(klines)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ timestamp: 1700000000000, price: 95200 })
      expect(result[1]).toEqual({ timestamp: 1700000060000, price: 95600 })
    })

    it('returns empty array for empty input', () => {
      expect(klinesToPricePoints([])).toEqual([])
    })

    it('handles string prices correctly', () => {
      const klines: BinanceKline[] = [
        [1700000000000, '95000.12345678', '95500.00', '94500.00', '95200.99', '100', 1700000060000, '9500000', 50, '50', '4750000', '0'],
      ]

      const result = klinesToPricePoints(klines)

      expect(result[0]?.price).toBeCloseTo(95200.99)
    })
  })

  describe('trimOldPoints', () => {
    const createPoints = (timestamps: number[]): PricePoint[] =>
      timestamps.map(ts => ({ timestamp: ts, price: 95000 }))

    it('filters out points older than cutoff time', () => {
      const points = createPoints([1000, 2000, 3000, 4000, 5000])
      const result = trimOldPoints(points, 10, 3000)

      expect(result).toHaveLength(3)
      expect(result.map(p => p.timestamp)).toEqual([3000, 4000, 5000])
    })

    it('respects maxPoints limit', () => {
      const points = createPoints([1000, 2000, 3000, 4000, 5000])
      const result = trimOldPoints(points, 2, 1000)

      expect(result).toHaveLength(2)
      expect(result.map(p => p.timestamp)).toEqual([4000, 5000])
    })

    it('returns empty array when all points are too old', () => {
      const points = createPoints([1000, 2000, 3000])
      const result = trimOldPoints(points, 10, 5000)

      expect(result).toEqual([])
    })

    it('keeps all points if within cutoff and under max', () => {
      const points = createPoints([3000, 4000, 5000])
      const result = trimOldPoints(points, 10, 2000)

      expect(result).toHaveLength(3)
    })
  })

  describe('takeRecentPoints', () => {
    const createPoints = (count: number): PricePoint[] =>
      Array.from({ length: count }, (_, i) => ({
        timestamp: i * 1000,
        price: 95000 + i,
      }))

    it('returns last N points when array is larger than maxPoints', () => {
      const points = createPoints(10)
      const result = takeRecentPoints(points, 3)

      expect(result).toHaveLength(3)
      expect(result[0]?.timestamp).toBe(7000)
      expect(result[2]?.timestamp).toBe(9000)
    })

    it('returns all points when array is smaller than maxPoints', () => {
      const points = createPoints(3)
      const result = takeRecentPoints(points, 10)

      expect(result).toHaveLength(3)
    })

    it('returns exact points when array equals maxPoints', () => {
      const points = createPoints(5)
      const result = takeRecentPoints(points, 5)

      expect(result).toHaveLength(5)
    })

    it('returns empty array for empty input', () => {
      expect(takeRecentPoints([], 5)).toEqual([])
    })
  })
})

import { describe, expect, it } from 'vitest'
import {
  TIME_RANGES,
  bucketDataByInterval,
  calculateAveragePrice,
  filterByTimeRange,
  getSampleInterval,
} from '../btcPriceChartHelpers'
import type { PricePoint } from '../../../shared/types/btc'

describe('btcPriceChartHelpers', () => {
  describe('TIME_RANGES', () => {
    it('should have 5 time range options', () => {
      expect(TIME_RANGES).toHaveLength(5)
    })

    it('should have correct labels and minutes', () => {
      expect(TIME_RANGES[0]).toEqual({ label: '5m', minutes: 5 })
      expect(TIME_RANGES[1]).toEqual({ label: '10m', minutes: 10 })
      expect(TIME_RANGES[2]).toEqual({ label: '1h', minutes: 60 })
      expect(TIME_RANGES[3]).toEqual({ label: '6h', minutes: 360 })
      expect(TIME_RANGES[4]).toEqual({ label: '24h', minutes: 1440 })
    })
  })

  describe('getSampleInterval', () => {
    it('returns 1000ms (1s) for 5 minutes or less', () => {
      expect(getSampleInterval(1)).toBe(1000)
      expect(getSampleInterval(5)).toBe(1000)
    })

    it('returns 2000ms (2s) for 6-10 minutes', () => {
      expect(getSampleInterval(6)).toBe(2000)
      expect(getSampleInterval(10)).toBe(2000)
    })

    it('returns 60000ms (1m) for 11-60 minutes', () => {
      expect(getSampleInterval(11)).toBe(60000)
      expect(getSampleInterval(30)).toBe(60000)
      expect(getSampleInterval(60)).toBe(60000)
    })

    it('returns 60000ms (1m) for 61-360 minutes', () => {
      expect(getSampleInterval(61)).toBe(60000)
      expect(getSampleInterval(180)).toBe(60000)
      expect(getSampleInterval(360)).toBe(60000)
    })

    it('returns 300000ms (5m) for more than 360 minutes', () => {
      expect(getSampleInterval(361)).toBe(300000)
      expect(getSampleInterval(1440)).toBe(300000)
      expect(getSampleInterval(2880)).toBe(300000)
    })
  })

  describe('bucketDataByInterval', () => {
    it('returns empty array for empty input', () => {
      expect(bucketDataByInterval([], 1000)).toEqual([])
    })

    it('keeps last point in each bucket', () => {
      const data: PricePoint[] = [
        { timestamp: 1000, price: 100 },
        { timestamp: 1500, price: 101 }, // Same bucket as 1000 (bucket 1)
        { timestamp: 2000, price: 102 }, // Bucket 2
        { timestamp: 2800, price: 103 }, // Same bucket as 2000 (bucket 2)
      ]

      const result = bucketDataByInterval(data, 1000)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ timestamp: 1500, price: 101 }) // Last in bucket 1
      expect(result[1]).toEqual({ timestamp: 2800, price: 103 }) // Last in bucket 2
    })

    it('sorts results by timestamp', () => {
      const data: PricePoint[] = [
        { timestamp: 5000, price: 105 },
        { timestamp: 1000, price: 101 },
        { timestamp: 3000, price: 103 },
      ]

      const result = bucketDataByInterval(data, 1000)

      expect(result[0]?.timestamp).toBe(1000)
      expect(result[1]?.timestamp).toBe(3000)
      expect(result[2]?.timestamp).toBe(5000)
    })

    it('handles single point', () => {
      const data: PricePoint[] = [{ timestamp: 1000, price: 100 }]

      const result = bucketDataByInterval(data, 1000)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ timestamp: 1000, price: 100 })
    })

    it('handles larger intervals', () => {
      const data: PricePoint[] = [
        { timestamp: 0, price: 100 },
        { timestamp: 30000, price: 101 },
        { timestamp: 60000, price: 102 },
        { timestamp: 90000, price: 103 },
        { timestamp: 120000, price: 104 },
      ]

      // 1 minute interval - should create 3 buckets: 0-59999, 60000-119999, 120000+
      const result = bucketDataByInterval(data, 60000)

      expect(result).toHaveLength(3)
      expect(result[0]?.price).toBe(101) // Last in first minute
      expect(result[1]?.price).toBe(103) // Last in second minute
      expect(result[2]?.price).toBe(104) // Third minute
    })
  })

  describe('filterByTimeRange', () => {
    const now = 1700000000000 // Fixed timestamp for testing

    it('returns empty array for empty input', () => {
      expect(filterByTimeRange([], 5, now)).toEqual([])
    })

    it('filters points within 5 minute range', () => {
      const fiveMinutesMs = 5 * 60 * 1000
      const data: PricePoint[] = [
        { timestamp: now - fiveMinutesMs - 1000, price: 99 }, // Outside range
        { timestamp: now - fiveMinutesMs + 1000, price: 100 }, // Inside range
        { timestamp: now - 60000, price: 101 }, // Inside range
        { timestamp: now, price: 102 }, // Inside range
      ]

      const result = filterByTimeRange(data, 5, now)

      expect(result).toHaveLength(3)
      expect(result[0]?.price).toBe(100)
      expect(result[1]?.price).toBe(101)
      expect(result[2]?.price).toBe(102)
    })

    it('filters points within 1 hour range', () => {
      const oneHourMs = 60 * 60 * 1000
      const data: PricePoint[] = [
        { timestamp: now - oneHourMs - 1000, price: 99 }, // Outside
        { timestamp: now - oneHourMs + 1000, price: 100 }, // Inside
        { timestamp: now, price: 101 }, // Inside
      ]

      const result = filterByTimeRange(data, 60, now)

      expect(result).toHaveLength(2)
      expect(result[0]?.price).toBe(100)
      expect(result[1]?.price).toBe(101)
    })

    it('includes point exactly at cutoff boundary', () => {
      const fiveMinutesMs = 5 * 60 * 1000
      const data: PricePoint[] = [
        { timestamp: now - fiveMinutesMs, price: 100 }, // Exactly at cutoff
      ]

      const result = filterByTimeRange(data, 5, now)

      expect(result).toHaveLength(1)
    })

    it('excludes point just before cutoff', () => {
      const fiveMinutesMs = 5 * 60 * 1000
      const data: PricePoint[] = [
        { timestamp: now - fiveMinutesMs - 1, price: 100 }, // Just before cutoff
      ]

      const result = filterByTimeRange(data, 5, now)

      expect(result).toHaveLength(0)
    })

    it('uses current time when now is not provided', () => {
      const recentData: PricePoint[] = [
        { timestamp: Date.now() - 1000, price: 100 }, // 1 second ago
      ]

      const result = filterByTimeRange(recentData, 5)

      expect(result).toHaveLength(1)
    })
  })

  describe('calculateAveragePrice', () => {
    it('returns null for empty array', () => {
      expect(calculateAveragePrice([])).toBeNull()
    })

    it('returns the price for single point', () => {
      const data: PricePoint[] = [{ timestamp: 1000, price: 100 }]

      expect(calculateAveragePrice(data)).toBe(100)
    })

    it('calculates average correctly', () => {
      const data: PricePoint[] = [
        { timestamp: 1000, price: 100 },
        { timestamp: 2000, price: 200 },
        { timestamp: 3000, price: 300 },
      ]

      expect(calculateAveragePrice(data)).toBe(200)
    })

    it('handles decimal prices', () => {
      const data: PricePoint[] = [
        { timestamp: 1000, price: 95000.50 },
        { timestamp: 2000, price: 95001.50 },
      ]

      expect(calculateAveragePrice(data)).toBe(95001)
    })

    it('handles large datasets', () => {
      const data: PricePoint[] = Array.from({ length: 1000 }, (_, i) => ({
        timestamp: i * 1000,
        price: 95000 + i,
      }))

      const result = calculateAveragePrice(data)

      // Average of 95000 to 95999 = 95499.5
      expect(result).toBe(95499.5)
    })
  })
})

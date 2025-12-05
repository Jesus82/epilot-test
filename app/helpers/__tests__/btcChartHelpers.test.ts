import { describe, expect, it } from 'vitest'
import {
  calculateIsWinning,
  calculateLabelCollision,
  calculateMinMaxLabelPosition,
  calculateNiceStep,
  calculatePriceLabelPosition,
  calculateYDomain,
  findMinMaxPoints,
  getTimeIntervalMinutes,
} from '~/helpers/btcChartHelpers'
import type { PricePoint } from '~/types/btc'

describe('btcChartHelpers', () => {
  describe('calculateIsWinning', () => {
    it('returns true for "up" guess when price went up', () => {
      expect(calculateIsWinning('up', 100, 90)).toBe(true)
      expect(calculateIsWinning('up', 50000.50, 50000.00)).toBe(true)
    })

    it('returns false for "up" guess when price went down', () => {
      expect(calculateIsWinning('up', 90, 100)).toBe(false)
      expect(calculateIsWinning('up', 49999.50, 50000.00)).toBe(false)
    })

    it('returns true for "down" guess when price went down', () => {
      expect(calculateIsWinning('down', 90, 100)).toBe(true)
      expect(calculateIsWinning('down', 49999.50, 50000.00)).toBe(true)
    })

    it('returns false for "down" guess when price went up', () => {
      expect(calculateIsWinning('down', 100, 90)).toBe(false)
      expect(calculateIsWinning('down', 50000.50, 50000.00)).toBe(false)
    })

    it('returns false when price is unchanged', () => {
      expect(calculateIsWinning('up', 100, 100)).toBe(false)
      expect(calculateIsWinning('down', 100, 100)).toBe(false)
    })

    it('returns false when guess direction is null', () => {
      expect(calculateIsWinning(null, 100, 90)).toBe(false)
      expect(calculateIsWinning(null, 90, 100)).toBe(false)
    })
  })

  describe('calculateNiceStep', () => {
    it('returns 1 for very small ranges', () => {
      expect(calculateNiceStep(5, 10)).toBe(1)
      expect(calculateNiceStep(10, 10)).toBe(1)
    })

    it('returns nice step for typical BTC price ranges', () => {
      // Range of $100 with 10 ticks = $10 step
      expect(calculateNiceStep(100, 10)).toBe(10)

      // Range of $500 with 10 ticks = $50 step
      expect(calculateNiceStep(500, 10)).toBe(50)

      // Range of $1000 with 10 ticks = $100 step
      expect(calculateNiceStep(1000, 10)).toBe(100)
    })

    it('rounds to nice values (1, 2, 5, 10 multiples)', () => {
      // Should round to 2
      expect(calculateNiceStep(15, 10)).toBe(2)

      // Should round to 5
      expect(calculateNiceStep(35, 10)).toBe(5)

      // Should round to 10
      expect(calculateNiceStep(80, 10)).toBe(10)
    })

    it('handles different target tick counts', () => {
      expect(calculateNiceStep(100, 5)).toBe(20)
      expect(calculateNiceStep(100, 20)).toBe(5)
    })

    it('ensures minimum step of 1', () => {
      expect(calculateNiceStep(0.1, 10)).toBe(1)
      expect(calculateNiceStep(0.5, 10)).toBe(1)
    })
  })

  describe('calculateLabelCollision', () => {
    const chartHeight = 300

    it('returns original positions when labels are far apart', () => {
      const result = calculateLabelCollision(100, 200, chartHeight)

      expect(result.adjustedAvgY).toBe(100)
      expect(result.adjustedBidY).toBe(200)
    })

    it('spreads labels apart when they collide (avg above bid)', () => {
      const result = calculateLabelCollision(100, 110, chartHeight)

      expect(result.adjustedAvgY).toBeLessThan(result.adjustedBidY!)
      expect(result.adjustedBidY! - result.adjustedAvgY!).toBeGreaterThanOrEqual(20) // labelHeight + 2
    })

    it('spreads labels apart when they collide (bid above avg)', () => {
      const result = calculateLabelCollision(110, 100, chartHeight)

      expect(result.adjustedBidY).toBeLessThan(result.adjustedAvgY!)
      expect(result.adjustedAvgY! - result.adjustedBidY!).toBeGreaterThanOrEqual(20)
    })

    it('handles null avgY', () => {
      const result = calculateLabelCollision(null, 100, chartHeight)

      expect(result.adjustedAvgY).toBeNull()
      expect(result.adjustedBidY).toBe(100)
    })

    it('handles null bidY', () => {
      const result = calculateLabelCollision(100, null, chartHeight)

      expect(result.adjustedAvgY).toBe(100)
      expect(result.adjustedBidY).toBeNull()
    })

    it('handles both null', () => {
      const result = calculateLabelCollision(null, null, chartHeight)

      expect(result.adjustedAvgY).toBeNull()
      expect(result.adjustedBidY).toBeNull()
    })

    it('clamps positions to chart bounds', () => {
      // Labels near top
      const topResult = calculateLabelCollision(5, 15, chartHeight)
      expect(topResult.adjustedAvgY).toBeGreaterThanOrEqual(9)
      expect(topResult.adjustedBidY).toBeLessThanOrEqual(chartHeight - 9)

      // Labels near bottom
      const bottomResult = calculateLabelCollision(285, 295, chartHeight)
      expect(bottomResult.adjustedAvgY).toBeGreaterThanOrEqual(9)
      expect(bottomResult.adjustedBidY).toBeLessThanOrEqual(chartHeight - 9)
    })
  })

  describe('findMinMaxPoints', () => {
    const createPoints = (prices: number[]): PricePoint[] =>
      prices.map((price, i) => ({ timestamp: 1700000000000 + i * 1000, price }))

    it('finds correct min and max points', () => {
      const points = createPoints([95000, 94000, 96000, 95500, 93000, 95800])
      const result = findMinMaxPoints(points)

      expect(result.minPoint?.price).toBe(93000)
      expect(result.maxPoint?.price).toBe(96000)
    })

    it('returns null for empty data', () => {
      const result = findMinMaxPoints([])

      expect(result.minPoint).toBeNull()
      expect(result.maxPoint).toBeNull()
    })

    it('handles single point', () => {
      const points = createPoints([95000])
      const result = findMinMaxPoints(points)

      expect(result.minPoint?.price).toBe(95000)
      expect(result.maxPoint?.price).toBe(95000)
      expect(result.minPoint).toBe(result.maxPoint)
    })

    it('handles all same prices', () => {
      const points = createPoints([95000, 95000, 95000])
      const result = findMinMaxPoints(points)

      expect(result.minPoint?.price).toBe(95000)
      expect(result.maxPoint?.price).toBe(95000)
    })

    it('returns first occurrence for min/max', () => {
      const points = createPoints([95000, 94000, 96000, 94000, 96000])
      const result = findMinMaxPoints(points)

      // First min at index 1, first max at index 2
      expect(result.minPoint?.timestamp).toBe(1700000001000)
      expect(result.maxPoint?.timestamp).toBe(1700000002000)
    })

    it('preserves timestamp in result', () => {
      const points: PricePoint[] = [
        { timestamp: 1700000000000, price: 95000 },
        { timestamp: 1700000060000, price: 94000 },
        { timestamp: 1700000120000, price: 96000 },
      ]
      const result = findMinMaxPoints(points)

      expect(result.minPoint).toEqual({ timestamp: 1700000060000, price: 94000 })
      expect(result.maxPoint).toEqual({ timestamp: 1700000120000, price: 96000 })
    })
  })

  describe('calculatePriceLabelPosition', () => {
    const chartHeight = 300

    it('returns original position when no collisions', () => {
      const result = calculatePriceLabelPosition(150, [50, 250], chartHeight)
      expect(result).toBe(150)
    })

    it('moves label up when colliding with label below', () => {
      const result = calculatePriceLabelPosition(100, [110], chartHeight)
      expect(result).toBeLessThan(100)
    })

    it('moves label down when colliding with label above', () => {
      const result = calculatePriceLabelPosition(100, [90], chartHeight)
      expect(result).toBeGreaterThan(100)
    })

    it('clamps to minimum bound', () => {
      const result = calculatePriceLabelPosition(5, [30], chartHeight)
      expect(result).toBeGreaterThanOrEqual(10)
    })

    it('clamps to maximum bound', () => {
      const result = calculatePriceLabelPosition(295, [270], chartHeight)
      expect(result).toBeLessThanOrEqual(chartHeight - 10)
    })

    it('handles multiple label collisions', () => {
      const result = calculatePriceLabelPosition(100, [95, 105, 200], chartHeight)
      // Should move away from both nearby labels
      expect(result).not.toBe(100)
    })

    it('handles empty other labels array', () => {
      const result = calculatePriceLabelPosition(150, [], chartHeight)
      expect(result).toBe(150)
    })
  })

  describe('getTimeIntervalMinutes', () => {
    it('returns 1 minute for ranges up to 10 minutes', () => {
      expect(getTimeIntervalMinutes(5)).toBe(1)
      expect(getTimeIntervalMinutes(10)).toBe(1)
    })

    it('returns 5 minutes for ranges up to 1 hour', () => {
      expect(getTimeIntervalMinutes(11)).toBe(5)
      expect(getTimeIntervalMinutes(30)).toBe(5)
      expect(getTimeIntervalMinutes(60)).toBe(5)
    })

    it('returns 30 minutes for ranges up to 6 hours', () => {
      expect(getTimeIntervalMinutes(61)).toBe(30)
      expect(getTimeIntervalMinutes(180)).toBe(30)
      expect(getTimeIntervalMinutes(360)).toBe(30)
    })

    it('returns 120 minutes (2 hours) for longer ranges', () => {
      expect(getTimeIntervalMinutes(361)).toBe(120)
      expect(getTimeIntervalMinutes(1440)).toBe(120)
    })
  })

  describe('calculateMinMaxLabelPosition', () => {
    const chartWidth = 800
    const chartHeight = 300
    const labelWidth = 100

    describe('max label positioning', () => {
      it('positions label to the right of point by default', () => {
        const result = calculateMinMaxLabelPosition(400, 100, labelWidth, chartWidth, chartHeight, 'max')

        expect(result.labelX).toBe(404) // pointX + 4
      })

      it('flips label to left when near right edge', () => {
        const result = calculateMinMaxLabelPosition(750, 100, labelWidth, chartWidth, chartHeight, 'max')

        expect(result.labelX).toBe(750 - labelWidth - 4) // flip to left
      })

      it('positions label above the point', () => {
        const result = calculateMinMaxLabelPosition(400, 100, labelWidth, chartWidth, chartHeight, 'max')

        expect(result.labelY).toBe(88) // pointY - 12
      })

      it('moves label below when too close to top', () => {
        const result = calculateMinMaxLabelPosition(400, 5, labelWidth, chartWidth, chartHeight, 'max')

        expect(result.labelY).toBe(17) // pointY + 12
      })
    })

    describe('min label positioning', () => {
      it('positions label to the right of point by default', () => {
        const result = calculateMinMaxLabelPosition(400, 200, labelWidth, chartWidth, chartHeight, 'min')

        expect(result.labelX).toBe(404) // pointX + 4
      })

      it('flips label to left when near right edge', () => {
        const result = calculateMinMaxLabelPosition(750, 200, labelWidth, chartWidth, chartHeight, 'min')

        expect(result.labelX).toBe(750 - labelWidth - 4)
      })

      it('positions label below the point', () => {
        const result = calculateMinMaxLabelPosition(400, 200, labelWidth, chartWidth, chartHeight, 'min')

        expect(result.labelY).toBe(212) // pointY + 12
      })

      it('moves label above when too close to bottom', () => {
        const result = calculateMinMaxLabelPosition(400, 295, labelWidth, chartWidth, chartHeight, 'min')

        expect(result.labelY).toBe(283) // pointY - 12
      })
    })
  })

  describe('calculateYDomain', () => {
    it('returns default values for empty data', () => {
      const result = calculateYDomain([])
      expect(result).toEqual({ yMin: 0, yMax: 100 })
    })

    it('calculates domain with nice step values', () => {
      const data: PricePoint[] = [
        { price: 95050, timestamp: 1000 },
        { price: 95100, timestamp: 2000 },
        { price: 95150, timestamp: 3000 },
      ]
      const result = calculateYDomain(data)

      // Range is 100, step should be 10
      // yMin = floor(95050/10)*10 - 10 = 95040
      // yMax = ceil(95150/10)*10 + 10 = 95160
      expect(result.yMin).toBeLessThanOrEqual(95050)
      expect(result.yMax).toBeGreaterThanOrEqual(95150)
      expect(result.yMax - result.yMin).toBeGreaterThan(100)
    })

    it('handles single data point', () => {
      const data: PricePoint[] = [
        { price: 95000, timestamp: 1000 },
      ]
      const result = calculateYDomain(data)

      expect(result.yMin).toBeLessThan(95000)
      expect(result.yMax).toBeGreaterThan(95000)
    })

    it('provides padding around the price range', () => {
      const data: PricePoint[] = [
        { price: 92000, timestamp: 1000 },
        { price: 93000, timestamp: 2000 },
      ]
      const result = calculateYDomain(data)

      // Should have padding below min and above max
      expect(result.yMin).toBeLessThan(92000)
      expect(result.yMax).toBeGreaterThan(93000)
    })
  })
})

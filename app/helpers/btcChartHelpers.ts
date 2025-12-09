/**
 * Pure helper functions for BTC chart calculations
 * These functions have no D3/Vue dependencies and are easily testable
 */

import type { PricePoint } from '../../shared/types/chart'
import type { GuessDirection } from '../../shared/types/game'

/**
 * Determine if a bet is winning based on guess direction and price difference
 */
export const calculateIsWinning = (
  guessDirection: GuessDirection,
  currentPrice: number,
  bidPrice: number,
): boolean => {
  if (!guessDirection) return false
  const difference = currentPrice - bidPrice
  return guessDirection === 'up' ? difference > 0 : difference < 0
}

/**
 * Calculate "nice" step value for Y axis ticks
 * Rounds to values like 1, 2, 5, 10, 20, 50, 100, etc.
 */
export const calculateNiceStep = (range: number, targetTicks: number): number => {
  const rawStep = range / targetTicks
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const normalized = rawStep / magnitude

  let nice: number
  if (normalized <= 1) nice = 1
  else if (normalized <= 2) nice = 2
  else if (normalized <= 5) nice = 5
  else nice = 10

  return Math.max(1, nice * magnitude) // Minimum $1 step
}

/**
 * Calculate label positions with collision detection for avg/bid labels
 */
export const calculateLabelCollision = (
  avgYPosition: number | null,
  bidYPosition: number | null,
  height: number,
  labelHeight: number = 18,
): { adjustedAvgY: number | null, adjustedBidY: number | null } => {
  const labelCollisionThreshold = labelHeight + 2

  let adjustedAvgY = avgYPosition
  let adjustedBidY = bidYPosition

  if (avgYPosition !== null && bidYPosition !== null) {
    const distance = Math.abs(avgYPosition - bidYPosition)
    if (distance < labelCollisionThreshold) {
      const midpoint = (avgYPosition + bidYPosition) / 2
      const halfSpread = labelCollisionThreshold / 2

      if (avgYPosition < bidYPosition) {
        adjustedAvgY = midpoint - halfSpread
        adjustedBidY = midpoint + halfSpread
      }
      else {
        adjustedBidY = midpoint - halfSpread
        adjustedAvgY = midpoint + halfSpread
      }

      // Clamp to chart bounds
      adjustedAvgY = Math.max(9, Math.min(height - 9, adjustedAvgY))
      adjustedBidY = Math.max(9, Math.min(height - 9, adjustedBidY))
    }
  }

  return { adjustedAvgY, adjustedBidY }
}

export const findMinMaxPoints = (
  data: PricePoint[],
): { minPoint: PricePoint | null, maxPoint: PricePoint | null } => {
  if (data.length === 0) return { minPoint: null, maxPoint: null }

  let minPoint = data[0]!
  let maxPoint = data[0]!

  for (const point of data) {
    if (point.price < minPoint.price) minPoint = point
    if (point.price > maxPoint.price) maxPoint = point
  }

  return { minPoint, maxPoint }
}

export const calculatePriceLabelPosition = (
  yPos: number,
  otherLabelPositions: number[],
  height: number,
  labelHeight: number = 20,
): number => {
  const collisionThreshold = labelHeight + 4

  let adjustedYPos = yPos

  for (const labelY of otherLabelPositions) {
    const distance = Math.abs(adjustedYPos - labelY)
    if (distance < collisionThreshold) {
      adjustedYPos = adjustedYPos < labelY
        ? labelY - collisionThreshold
        : labelY + collisionThreshold
    }
  }

  return Math.max(10, Math.min(height - 10, adjustedYPos))
}

export const getTimeIntervalMinutes = (rangeMinutes: number): number => {
  if (rangeMinutes <= 10) return 1
  if (rangeMinutes <= 60) return 5
  if (rangeMinutes <= 360) return 30
  return 120 // 2 hours
}

export const calculateMinMaxLabelPosition = (
  pointX: number,
  pointY: number,
  totalLabelWidth: number,
  width: number,
  height: number,
  type: 'min' | 'max',
): { labelX: number, labelY: number } => {
  // Position label: prefer right side of point, but flip to left if near edge
  let labelX = pointX + 4
  if (labelX + totalLabelWidth > width) {
    labelX = pointX - totalLabelWidth - 4
  }

  let labelY: number
  if (type === 'max') {
    // Position above the point, but ensure it stays within bounds
    labelY = pointY - 12
    if (labelY < 9) {
      labelY = pointY + 12
    }
  }
  else {
    // Position below the point, but ensure it stays within bounds
    labelY = pointY + 12
    if (labelY > height - 9) {
      labelY = pointY - 12
    }
  }

  return { labelX, labelY }
}

/**
 * Calculate Y-axis domain (min/max) for chart display
 * Uses nice step values for clean axis labels
 */
export const calculateYDomain = (data: PricePoint[]): { yMin: number, yMax: number } => {
  if (data.length === 0) {
    return { yMin: 0, yMax: 100 }
  }

  const prices = data.map(d => d.price)
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)
  const range = maxPrice - minPrice

  const step = calculateNiceStep(range, 10)

  const yMin = Math.floor(minPrice / step) * step - step
  const yMax = Math.ceil(maxPrice / step) * step + step

  return { yMin, yMax }
}

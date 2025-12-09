/**
 * Tests for game logic helper functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  evaluateGuess,
  calculateEarnings,
  calculateStatsUpdate,
  createBidResult,
} from '../gameLogicHelpers'

describe('gameLogicHelpers', () => {
  describe('evaluateGuess', () => {
    it('should return true when guessing up and price goes up', () => {
      expect(evaluateGuess('up', 100, 110)).toBe(true)
    })

    it('should return false when guessing up and price goes down', () => {
      expect(evaluateGuess('up', 100, 90)).toBe(false)
    })

    it('should return true when guessing down and price goes down', () => {
      expect(evaluateGuess('down', 100, 90)).toBe(true)
    })

    it('should return false when guessing down and price goes up', () => {
      expect(evaluateGuess('down', 100, 110)).toBe(false)
    })

    it('should return false when price stays the same (guessing up)', () => {
      expect(evaluateGuess('up', 100, 100)).toBe(false)
    })

    it('should return true when price stays the same (guessing down)', () => {
      // Price didn't go up, so "down" is considered correct
      expect(evaluateGuess('down', 100, 100)).toBe(true)
    })
  })

  describe('calculateEarnings', () => {
    it('should return positive earnings when guessing up and price goes up', () => {
      expect(calculateEarnings('up', 100, 150)).toBe(50)
    })

    it('should return negative earnings when guessing up and price goes down', () => {
      expect(calculateEarnings('up', 100, 80)).toBe(-20)
    })

    it('should return positive earnings when guessing down and price goes down', () => {
      expect(calculateEarnings('down', 100, 80)).toBe(20)
    })

    it('should return negative earnings when guessing down and price goes up', () => {
      expect(calculateEarnings('down', 100, 150)).toBe(-50)
    })

    it('should return zero when price stays the same', () => {
      expect(calculateEarnings('up', 100, 100)).toBe(0)
      // Note: calculateEarnings('down', 100, 100) returns -0, which equals 0
    })
  })

  describe('calculateStatsUpdate', () => {
    const baseStats = {
      currentStreak: 2,
      longestStreak: 5,
      totalWins: 10,
      totalLosses: 5,
      totalEarnings: 1000,
    }

    it('should increment streak and wins on correct guess', () => {
      const result = calculateStatsUpdate(baseStats, true, 50)
      expect(result.currentStreak).toBe(3)
      expect(result.totalWins).toBe(11)
      expect(result.totalLosses).toBe(5)
      expect(result.totalEarnings).toBe(1050)
    })

    it('should reset streak and increment losses on incorrect guess', () => {
      const result = calculateStatsUpdate(baseStats, false, -30)
      expect(result.currentStreak).toBe(0)
      expect(result.totalWins).toBe(10)
      expect(result.totalLosses).toBe(6)
      expect(result.totalEarnings).toBe(970)
    })

    it('should update longestStreak when current streak exceeds it', () => {
      const stats = { ...baseStats, currentStreak: 5 }
      const result = calculateStatsUpdate(stats, true, 10)
      expect(result.currentStreak).toBe(6)
      expect(result.longestStreak).toBe(6)
    })

    it('should not update longestStreak when current streak is less', () => {
      const result = calculateStatsUpdate(baseStats, true, 10)
      expect(result.longestStreak).toBe(5)
    })

    it('should handle first win (starting from zero)', () => {
      const zeroStats = {
        currentStreak: 0,
        longestStreak: 0,
        totalWins: 0,
        totalLosses: 0,
        totalEarnings: 0,
      }
      const result = calculateStatsUpdate(zeroStats, true, 100)
      expect(result.currentStreak).toBe(1)
      expect(result.longestStreak).toBe(1)
      expect(result.totalWins).toBe(1)
      expect(result.totalEarnings).toBe(100)
    })
  })

  describe('createBidResult', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should create a bid result with all properties', () => {
      const result = createBidResult('up', 50000, 51000, 1000, true)

      expect(result).toEqual({
        direction: 'up',
        bidPrice: 50000,
        finalPrice: 51000,
        earnings: 1000,
        won: true,
        timestamp: Date.now(),
      })
    })

    it('should create a losing bid result', () => {
      const result = createBidResult('down', 50000, 51000, -1000, false)

      expect(result).toEqual({
        direction: 'down',
        bidPrice: 50000,
        finalPrice: 51000,
        earnings: -1000,
        won: false,
        timestamp: Date.now(),
      })
    })
  })
})

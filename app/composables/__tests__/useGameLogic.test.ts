import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { BtcPriceData } from '../../../shared/types/btc'
import { useGameLogic } from '../useGameLogic'
import { evaluateGuess, calculateEarnings } from '../../helpers/gameLogicHelpers'
import type { GuessDirection } from '../../../shared/types/game'

describe('useGameLogic', () => {
  let priceData: Ref<BtcPriceData | null>
  let setBidMock: ReturnType<typeof vi.fn>
  let clearBidMock: ReturnType<typeof vi.fn>

  const createPriceData = (price: number): BtcPriceData => ({
    price,
    priceChange24h: 100,
    priceChangePercent24h: 0.2,
    high24h: price + 500,
    low24h: price - 500,
    timestamp: Date.now(),
  })

  beforeEach(() => {
    vi.useFakeTimers()
    priceData = ref<BtcPriceData | null>(null)
    setBidMock = vi.fn()
    clearBidMock = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should have score of 0 initially', () => {
      const { score } = useGameLogic(priceData, setBidMock, clearBidMock)
      expect(score.value).toBe(0)
    })

    it('should have null guess initially', () => {
      const { guess } = useGameLogic(priceData, setBidMock, clearBidMock)
      expect(guess.value).toBeNull()
    })

    it('should not be locked initially', () => {
      const { isLocked } = useGameLogic(priceData, setBidMock, clearBidMock)
      expect(isLocked.value).toBe(false)
    })

    it('should have countdown of 0 initially', () => {
      const { countdown } = useGameLogic(priceData, setBidMock, clearBidMock)
      expect(countdown.value).toBe(0)
    })

    it('should have null guessPrice initially', () => {
      const { guessPrice } = useGameLogic(priceData, setBidMock, clearBidMock)
      expect(guessPrice.value).toBeNull()
    })
  })

  describe('evaluateGuess (helper)', () => {
    it('should return true for correct UP guess when price increases', () => {
      expect(evaluateGuess('up', 50000, 50100)).toBe(true)
    })

    it('should return false for incorrect UP guess when price decreases', () => {
      expect(evaluateGuess('up', 50000, 49900)).toBe(false)
    })

    it('should return true for correct DOWN guess when price decreases', () => {
      expect(evaluateGuess('down', 50000, 49900)).toBe(true)
    })

    it('should return false for incorrect DOWN guess when price increases', () => {
      expect(evaluateGuess('down', 50000, 50100)).toBe(false)
    })

    it('should return true for DOWN guess when price stays the same', () => {
      // When price equals guess price, priceWentUp is false, so DOWN wins
      expect(evaluateGuess('down', 50000, 50000)).toBe(true)
    })

    it('should return false for UP guess when price stays the same', () => {
      expect(evaluateGuess('up', 50000, 50000)).toBe(false)
    })
  })

  describe('makeGuess', () => {
    it('should not make guess if priceData is null', () => {
      const { makeGuess, isLocked, guess } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up')

      expect(isLocked.value).toBe(false)
      expect(guess.value).toBeNull()
    })

    it('should not make guess if already locked', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, isLocked, guess } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up')
      expect(guess.value).toBe('up')

      // Try to make another guess while locked
      makeGuess('down')
      expect(guess.value).toBe('up') // Should still be 'up'
    })

    it('should lock the game when guess is made', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, isLocked } = useGameLogic(priceData, setBidMock, clearBidMock)

      expect(isLocked.value).toBe(false)
      makeGuess('up')
      expect(isLocked.value).toBe(true)
    })

    it('should set guess direction', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, guess } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('down')
      expect(guess.value).toBe('down')
    })

    it('should record the current price as guessPrice', () => {
      priceData.value = createPriceData(42500)
      const { makeGuess, guessPrice } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up')
      expect(guessPrice.value).toBe(42500)
    })

    it('should call setBid with current price and direction', () => {
      priceData.value = createPriceData(42500)
      const { makeGuess } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up')
      expect(setBidMock).toHaveBeenCalledWith(42500, 'up')
    })

    it('should set countdown to specified seconds', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, countdown } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 30)
      expect(countdown.value).toBe(30)
    })

    it('should default countdown to 60 seconds', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, countdown } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up')
      expect(countdown.value).toBe(60)
    })

    it('should decrement countdown every second', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, countdown } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 10)
      expect(countdown.value).toBe(10)

      vi.advanceTimersByTime(1000)
      expect(countdown.value).toBe(9)

      vi.advanceTimersByTime(3000)
      expect(countdown.value).toBe(6)
    })
  })

  describe('price change requirement', () => {
    it('should not resolve guess if price has not changed after countdown', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, score, isLocked, isMinimumTimePassed, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 5)

      // Price stays the same
      vi.advanceTimersByTime(5000)

      // Countdown finished but price hasn't changed
      expect(isMinimumTimePassed.value).toBe(true)
      expect(isLocked.value).toBe(true) // Still locked, waiting for price change
      expect(score.value).toBe(0) // Score not updated yet

      cleanup()
    })

    it('should resolve guess when price changes after minimum time passed', async () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, score, isLocked, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 5)

      // Countdown finishes, price still same
      vi.advanceTimersByTime(5000)
      expect(isLocked.value).toBe(true)
      expect(score.value).toBe(0)

      // Now price changes - should trigger resolution
      priceData.value = createPriceData(50100)
      await flushPromises()

      expect(isLocked.value).toBe(false)
      expect(score.value).toBe(1)

      cleanup()
    })

    it('should resolve immediately if price already changed when countdown ends', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, score, isLocked, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 5)

      // Price changes before countdown ends
      priceData.value = createPriceData(50100)

      // Countdown finishes
      vi.advanceTimersByTime(5000)

      // Should resolve immediately since price already changed
      expect(isLocked.value).toBe(false)
      expect(score.value).toBe(1)

      cleanup()
    })

    it('should correctly calculate earnings when price changes after countdown', async () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, totalEarnings, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 5)

      // Countdown finishes with no price change
      vi.advanceTimersByTime(5000)

      // Price changes after countdown
      priceData.value = createPriceData(50300)
      await flushPromises()

      expect(totalEarnings.value).toBe(300)

      cleanup()
    })

    it('should handle hasPriceChanged correctly', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, hasPriceChanged, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      // No active bid
      expect(hasPriceChanged()).toBe(false)

      makeGuess('up', 5)

      // Price same as bid
      expect(hasPriceChanged()).toBe(false)

      // Price changes
      priceData.value = createPriceData(50100)
      expect(hasPriceChanged()).toBe(true)

      cleanup()
    })
  })

  describe('checkGuess - score updates', () => {
    it('should increment score for correct UP guess', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, score, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 5)

      // Price goes up
      priceData.value = createPriceData(50500)

      // Wait for countdown to complete
      vi.advanceTimersByTime(5000)

      expect(score.value).toBe(1)
      cleanup()
    })

    it('should decrement score for incorrect UP guess', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, score, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 5)

      // Price goes down
      priceData.value = createPriceData(49500)

      vi.advanceTimersByTime(5000)

      expect(score.value).toBe(-1)
      cleanup()
    })

    it('should increment score for correct DOWN guess', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, score, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('down', 5)

      // Price goes down
      priceData.value = createPriceData(49500)

      vi.advanceTimersByTime(5000)

      expect(score.value).toBe(1)
      cleanup()
    })

    it('should decrement score for incorrect DOWN guess', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, score, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('down', 5)

      // Price goes up
      priceData.value = createPriceData(50500)

      vi.advanceTimersByTime(5000)

      expect(score.value).toBe(-1)
      cleanup()
    })

    it('should accumulate score across multiple guesses', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, score, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      // First guess - correct
      makeGuess('up', 2)
      priceData.value = createPriceData(50500)
      vi.advanceTimersByTime(2000)
      expect(score.value).toBe(1)

      // Second guess - correct
      priceData.value = createPriceData(50500)
      makeGuess('down', 2)
      priceData.value = createPriceData(50000)
      vi.advanceTimersByTime(2000)
      expect(score.value).toBe(2)

      // Third guess - incorrect
      priceData.value = createPriceData(50000)
      makeGuess('up', 2)
      priceData.value = createPriceData(49000)
      vi.advanceTimersByTime(2000)
      expect(score.value).toBe(1)

      cleanup()
    })
  })

  describe('state reset after guess', () => {
    it('should unlock after guess is checked', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, isLocked, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 2)
      expect(isLocked.value).toBe(true)

      priceData.value = createPriceData(50500)
      vi.advanceTimersByTime(2000)

      expect(isLocked.value).toBe(false)
      cleanup()
    })

    it('should reset guess to null after checking', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, guess, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 2)
      expect(guess.value).toBe('up')

      priceData.value = createPriceData(50500)
      vi.advanceTimersByTime(2000)

      expect(guess.value).toBeNull()
      cleanup()
    })

    it('should reset guessPrice to null after checking', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, guessPrice, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 2)
      expect(guessPrice.value).toBe(50000)

      priceData.value = createPriceData(50500)
      vi.advanceTimersByTime(2000)

      expect(guessPrice.value).toBeNull()
      cleanup()
    })

    it('should call clearBid after checking', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 2)
      expect(setBidMock).toHaveBeenCalledWith(50000, 'up')

      priceData.value = createPriceData(50500)
      vi.advanceTimersByTime(2000)

      expect(clearBidMock).toHaveBeenCalled()
      cleanup()
    })

    it('should reset countdown to 0 after checking', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, countdown, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 10)

      vi.advanceTimersByTime(5000)
      expect(countdown.value).toBe(5)

      // Complete the countdown
      vi.advanceTimersByTime(5000)
      expect(countdown.value).toBe(0)
      cleanup()
    })
  })

  describe('cancelGuess', () => {
    it('should reset all game state', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, cancelGuess, isLocked, guess, guessPrice, countdown } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 60)
      vi.advanceTimersByTime(5000)

      expect(isLocked.value).toBe(true)
      expect(guess.value).toBe('up')
      expect(guessPrice.value).toBe(50000)
      expect(countdown.value).toBe(55)
      expect(setBidMock).toHaveBeenCalledWith(50000, 'up')

      cancelGuess()

      expect(isLocked.value).toBe(false)
      expect(guess.value).toBeNull()
      expect(guessPrice.value).toBeNull()
      expect(countdown.value).toBe(0)
      expect(clearBidMock).toHaveBeenCalled()
    })

    it('should stop the countdown interval', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, cancelGuess, countdown } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 60)
      vi.advanceTimersByTime(5000)
      expect(countdown.value).toBe(55)

      cancelGuess()
      expect(countdown.value).toBe(0)

      // Advance time - countdown should not change
      vi.advanceTimersByTime(5000)
      expect(countdown.value).toBe(0)
    })

    it('should not affect score', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, cancelGuess, score } = useGameLogic(priceData, setBidMock, clearBidMock)

      // First get a point
      makeGuess('up', 2)
      priceData.value = createPriceData(50500)
      vi.advanceTimersByTime(2000)
      expect(score.value).toBe(1)

      // Start another guess and cancel
      priceData.value = createPriceData(50500)
      makeGuess('down', 60)
      cancelGuess()

      // Score should remain unchanged
      expect(score.value).toBe(1)
    })
  })

  describe('cleanup', () => {
    it('should clear the countdown interval', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, cleanup, countdown } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 60)
      vi.advanceTimersByTime(5000)
      expect(countdown.value).toBe(55)

      cleanup()

      // Advance time - countdown should not change after cleanup
      vi.advanceTimersByTime(10000)
      expect(countdown.value).toBe(55) // Stays at 55, interval was cleared
    })

    it('should be safe to call multiple times', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 60)

      // Should not throw
      expect(() => {
        cleanup()
        cleanup()
        cleanup()
      }).not.toThrow()
    })

    it('should be safe to call when no guess is active', () => {
      const { cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      expect(() => cleanup()).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle checkGuess being called manually when no guess is active', () => {
      const { checkGuess, score } = useGameLogic(priceData, setBidMock, clearBidMock)

      // Should not throw and should not change score
      expect(() => checkGuess()).not.toThrow()
      expect(score.value).toBe(0)
    })

    it('should handle very small price differences', () => {
      expect(evaluateGuess('up', 50000.00, 50000.01)).toBe(true)
      expect(evaluateGuess('down', 50000.00, 49999.99)).toBe(true)
    })

    it('should handle large price swings', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, score, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 2)

      // Major price increase
      priceData.value = createPriceData(100000)
      vi.advanceTimersByTime(2000)

      expect(score.value).toBe(1)
      cleanup()
    })

    it('should handle negative scores', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, score, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      // Make 3 incorrect guesses
      for (let i = 0; i < 3; i++) {
        priceData.value = createPriceData(50000)
        makeGuess('up', 1)
        priceData.value = createPriceData(49000) // Price goes down
        vi.advanceTimersByTime(1000)
      }

      expect(score.value).toBe(-3)
      cleanup()
    })
  })

  describe('calculateEarnings (helper)', () => {
    it('should return positive earnings for correct UP guess', () => {
      // Guessed up, price went from 50000 to 50200 = +200
      expect(calculateEarnings('up', 50000, 50200)).toBe(200)
    })

    it('should return negative earnings for incorrect UP guess', () => {
      // Guessed up, price went from 50000 to 49700 = -300
      expect(calculateEarnings('up', 50000, 49700)).toBe(-300)
    })

    it('should return positive earnings for correct DOWN guess', () => {
      // Guessed down, price went from 50000 to 49700 = +300
      expect(calculateEarnings('down', 50000, 49700)).toBe(300)
    })

    it('should return negative earnings for incorrect DOWN guess', () => {
      // Guessed down, price went from 50000 to 50200 = -200
      expect(calculateEarnings('down', 50000, 50200)).toBe(-200)
    })

    it('should return 0 when price stays the same', () => {
      expect(calculateEarnings('up', 50000, 50000)).toBe(0)
      // Note: calculateEarnings('down', 50000, 50000) returns -0, which equals 0
    })
  })

  describe('stats tracking', () => {
    it('should have initial stats at 0', () => {
      const { currentStreak, longestStreak, totalWins, totalLosses, totalEarnings } = useGameLogic(priceData, setBidMock, clearBidMock)

      expect(currentStreak.value).toBe(0)
      expect(longestStreak.value).toBe(0)
      expect(totalWins.value).toBe(0)
      expect(totalLosses.value).toBe(0)
      expect(totalEarnings.value).toBe(0)
    })

    it('should update streak on consecutive wins', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, currentStreak, longestStreak, totalWins, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      // Win 1
      makeGuess('up', 1)
      priceData.value = createPriceData(50100)
      vi.advanceTimersByTime(1000)

      expect(currentStreak.value).toBe(1)
      expect(longestStreak.value).toBe(1)
      expect(totalWins.value).toBe(1)

      // Win 2
      priceData.value = createPriceData(50000)
      makeGuess('up', 1)
      priceData.value = createPriceData(50100)
      vi.advanceTimersByTime(1000)

      expect(currentStreak.value).toBe(2)
      expect(longestStreak.value).toBe(2)
      expect(totalWins.value).toBe(2)

      cleanup()
    })

    it('should reset current streak on loss but keep longest streak', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, currentStreak, longestStreak, totalLosses, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      // Win 3 times to build streak
      for (let i = 0; i < 3; i++) {
        priceData.value = createPriceData(50000)
        makeGuess('up', 1)
        priceData.value = createPriceData(50100)
        vi.advanceTimersByTime(1000)
      }

      expect(currentStreak.value).toBe(3)
      expect(longestStreak.value).toBe(3)

      // Lose once
      priceData.value = createPriceData(50000)
      makeGuess('up', 1)
      priceData.value = createPriceData(49900) // Price goes down
      vi.advanceTimersByTime(1000)

      expect(currentStreak.value).toBe(0)
      expect(longestStreak.value).toBe(3) // Longest streak preserved
      expect(totalLosses.value).toBe(1)

      cleanup()
    })

    it('should accumulate total earnings', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, totalEarnings, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      // Win +200
      makeGuess('up', 1)
      priceData.value = createPriceData(50200)
      vi.advanceTimersByTime(1000)

      expect(totalEarnings.value).toBe(200)

      // Lose -300
      priceData.value = createPriceData(50000)
      makeGuess('up', 1)
      priceData.value = createPriceData(49700)
      vi.advanceTimersByTime(1000)

      expect(totalEarnings.value).toBe(-100) // 200 - 300 = -100

      cleanup()
    })

    it('should create lastBidResult on bid completion', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, lastBidResult, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 1)
      priceData.value = createPriceData(50200)
      vi.advanceTimersByTime(1000)

      expect(lastBidResult.value).not.toBeNull()
      expect(lastBidResult.value?.direction).toBe('up')
      expect(lastBidResult.value?.bidPrice).toBe(50000)
      expect(lastBidResult.value?.finalPrice).toBe(50200)
      expect(lastBidResult.value?.earnings).toBe(200)
      expect(lastBidResult.value?.won).toBe(true)
      expect(lastBidResult.value?.timestamp).toBeGreaterThan(0)

      cleanup()
    })

    it('should call onBidComplete callback when provided', () => {
      priceData.value = createPriceData(50000)
      const onBidComplete = vi.fn()
      const { makeGuess, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock, onBidComplete)

      makeGuess('up', 1)
      priceData.value = createPriceData(50200)
      vi.advanceTimersByTime(1000)

      expect(onBidComplete).toHaveBeenCalledTimes(1)
      expect(onBidComplete).toHaveBeenCalledWith(expect.objectContaining({
        direction: 'up',
        bidPrice: 50000,
        finalPrice: 50200,
        earnings: 200,
        won: true,
      }))

      cleanup()
    })
  })

  describe('potentialEarnings', () => {
    it('should return 0 when no active bid', () => {
      priceData.value = createPriceData(50000)
      const { potentialEarnings } = useGameLogic(priceData, setBidMock, clearBidMock)

      expect(potentialEarnings.value).toBe(0)
    })

    it('should calculate potential earnings during active bid', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, potentialEarnings, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      makeGuess('up', 10)

      // Price goes up
      priceData.value = createPriceData(50150)
      expect(potentialEarnings.value).toBe(150)

      // Price goes down
      priceData.value = createPriceData(49800)
      expect(potentialEarnings.value).toBe(-200)

      cleanup()
    })
  })

  describe('loadStats and getStats', () => {
    it('should load stats from external source', () => {
      const { loadStats, currentStreak, longestStreak, totalWins, totalLosses, totalEarnings } = useGameLogic(priceData, setBidMock, clearBidMock)

      loadStats({
        currentStreak: 5,
        longestStreak: 10,
        totalWins: 25,
        totalLosses: 15,
        totalEarnings: 5000,
      })

      expect(currentStreak.value).toBe(5)
      expect(longestStreak.value).toBe(10)
      expect(totalWins.value).toBe(25)
      expect(totalLosses.value).toBe(15)
      expect(totalEarnings.value).toBe(5000)
    })

    it('should get stats as plain object', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, getStats, cleanup } = useGameLogic(priceData, setBidMock, clearBidMock)

      // Make a winning bet
      makeGuess('up', 1)
      priceData.value = createPriceData(50100)
      vi.advanceTimersByTime(1000)

      const stats = getStats()

      expect(stats).toEqual({
        currentStreak: 1,
        longestStreak: 1,
        totalWins: 1,
        totalLosses: 0,
        totalEarnings: 100,
        score: 1,
      })

      cleanup()
    })
  })
})

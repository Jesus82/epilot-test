import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import type { BtcPriceData } from '~/types/btc'
import { useGameLogic } from '../useGameLogic'

describe('useGameLogic', () => {
  let priceData: Ref<BtcPriceData | null>
  let bidPrice: Ref<number | null>

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
    bidPrice = ref<number | null>(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state', () => {
    it('should have score of 0 initially', () => {
      const { score } = useGameLogic(priceData, bidPrice)
      expect(score.value).toBe(0)
    })

    it('should have null guess initially', () => {
      const { guess } = useGameLogic(priceData, bidPrice)
      expect(guess.value).toBeNull()
    })

    it('should not be locked initially', () => {
      const { isLocked } = useGameLogic(priceData, bidPrice)
      expect(isLocked.value).toBe(false)
    })

    it('should have countdown of 0 initially', () => {
      const { countdown } = useGameLogic(priceData, bidPrice)
      expect(countdown.value).toBe(0)
    })

    it('should have null guessPrice initially', () => {
      const { guessPrice } = useGameLogic(priceData, bidPrice)
      expect(guessPrice.value).toBeNull()
    })
  })

  describe('evaluateGuess', () => {
    it('should return true for correct UP guess when price increases', () => {
      const { evaluateGuess } = useGameLogic(priceData, bidPrice)
      expect(evaluateGuess('up', 50000, 50100)).toBe(true)
    })

    it('should return false for incorrect UP guess when price decreases', () => {
      const { evaluateGuess } = useGameLogic(priceData, bidPrice)
      expect(evaluateGuess('up', 50000, 49900)).toBe(false)
    })

    it('should return true for correct DOWN guess when price decreases', () => {
      const { evaluateGuess } = useGameLogic(priceData, bidPrice)
      expect(evaluateGuess('down', 50000, 49900)).toBe(true)
    })

    it('should return false for incorrect DOWN guess when price increases', () => {
      const { evaluateGuess } = useGameLogic(priceData, bidPrice)
      expect(evaluateGuess('down', 50000, 50100)).toBe(false)
    })

    it('should return true for DOWN guess when price stays the same', () => {
      // When price equals guess price, priceWentUp is false, so DOWN wins
      const { evaluateGuess } = useGameLogic(priceData, bidPrice)
      expect(evaluateGuess('down', 50000, 50000)).toBe(true)
    })

    it('should return false for UP guess when price stays the same', () => {
      const { evaluateGuess } = useGameLogic(priceData, bidPrice)
      expect(evaluateGuess('up', 50000, 50000)).toBe(false)
    })
  })

  describe('makeGuess', () => {
    it('should not make guess if priceData is null', () => {
      const { makeGuess, isLocked, guess } = useGameLogic(priceData, bidPrice)
      
      makeGuess('up')
      
      expect(isLocked.value).toBe(false)
      expect(guess.value).toBeNull()
    })

    it('should not make guess if already locked', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, isLocked, guess } = useGameLogic(priceData, bidPrice)
      
      makeGuess('up')
      expect(guess.value).toBe('up')
      
      // Try to make another guess while locked
      makeGuess('down')
      expect(guess.value).toBe('up') // Should still be 'up'
    })

    it('should lock the game when guess is made', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, isLocked } = useGameLogic(priceData, bidPrice)
      
      expect(isLocked.value).toBe(false)
      makeGuess('up')
      expect(isLocked.value).toBe(true)
    })

    it('should set guess direction', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, guess } = useGameLogic(priceData, bidPrice)
      
      makeGuess('down')
      expect(guess.value).toBe('down')
    })

    it('should record the current price as guessPrice', () => {
      priceData.value = createPriceData(42500)
      const { makeGuess, guessPrice } = useGameLogic(priceData, bidPrice)
      
      makeGuess('up')
      expect(guessPrice.value).toBe(42500)
    })

    it('should set bidPrice to current price', () => {
      priceData.value = createPriceData(42500)
      const { makeGuess } = useGameLogic(priceData, bidPrice)
      
      makeGuess('up')
      expect(bidPrice.value).toBe(42500)
    })

    it('should set countdown to specified seconds', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, countdown } = useGameLogic(priceData, bidPrice)
      
      makeGuess('up', 30)
      expect(countdown.value).toBe(30)
    })

    it('should default countdown to 60 seconds', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, countdown } = useGameLogic(priceData, bidPrice)
      
      makeGuess('up')
      expect(countdown.value).toBe(60)
    })

    it('should decrement countdown every second', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, countdown } = useGameLogic(priceData, bidPrice)
      
      makeGuess('up', 10)
      expect(countdown.value).toBe(10)
      
      vi.advanceTimersByTime(1000)
      expect(countdown.value).toBe(9)
      
      vi.advanceTimersByTime(3000)
      expect(countdown.value).toBe(6)
    })
  })

  describe('checkGuess - score updates', () => {
    it('should increment score for correct UP guess', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, score, cleanup } = useGameLogic(priceData, bidPrice)
      
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
      const { makeGuess, score, cleanup } = useGameLogic(priceData, bidPrice)
      
      makeGuess('up', 5)
      
      // Price goes down
      priceData.value = createPriceData(49500)
      
      vi.advanceTimersByTime(5000)
      
      expect(score.value).toBe(-1)
      cleanup()
    })

    it('should increment score for correct DOWN guess', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, score, cleanup } = useGameLogic(priceData, bidPrice)
      
      makeGuess('down', 5)
      
      // Price goes down
      priceData.value = createPriceData(49500)
      
      vi.advanceTimersByTime(5000)
      
      expect(score.value).toBe(1)
      cleanup()
    })

    it('should decrement score for incorrect DOWN guess', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, score, cleanup } = useGameLogic(priceData, bidPrice)
      
      makeGuess('down', 5)
      
      // Price goes up
      priceData.value = createPriceData(50500)
      
      vi.advanceTimersByTime(5000)
      
      expect(score.value).toBe(-1)
      cleanup()
    })

    it('should accumulate score across multiple guesses', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, score, cleanup } = useGameLogic(priceData, bidPrice)
      
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
      const { makeGuess, isLocked, cleanup } = useGameLogic(priceData, bidPrice)
      
      makeGuess('up', 2)
      expect(isLocked.value).toBe(true)
      
      priceData.value = createPriceData(50500)
      vi.advanceTimersByTime(2000)
      
      expect(isLocked.value).toBe(false)
      cleanup()
    })

    it('should reset guess to null after checking', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, guess, cleanup } = useGameLogic(priceData, bidPrice)
      
      makeGuess('up', 2)
      expect(guess.value).toBe('up')
      
      priceData.value = createPriceData(50500)
      vi.advanceTimersByTime(2000)
      
      expect(guess.value).toBeNull()
      cleanup()
    })

    it('should reset guessPrice to null after checking', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, guessPrice, cleanup } = useGameLogic(priceData, bidPrice)
      
      makeGuess('up', 2)
      expect(guessPrice.value).toBe(50000)
      
      priceData.value = createPriceData(50500)
      vi.advanceTimersByTime(2000)
      
      expect(guessPrice.value).toBeNull()
      cleanup()
    })

    it('should reset bidPrice to null after checking', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, cleanup } = useGameLogic(priceData, bidPrice)
      
      makeGuess('up', 2)
      expect(bidPrice.value).toBe(50000)
      
      priceData.value = createPriceData(50500)
      vi.advanceTimersByTime(2000)
      
      expect(bidPrice.value).toBeNull()
      cleanup()
    })

    it('should reset countdown to 0 after checking', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, countdown, cleanup } = useGameLogic(priceData, bidPrice)
      
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
      const { makeGuess, cancelGuess, isLocked, guess, guessPrice, countdown } = useGameLogic(priceData, bidPrice)
      
      makeGuess('up', 60)
      vi.advanceTimersByTime(5000)
      
      expect(isLocked.value).toBe(true)
      expect(guess.value).toBe('up')
      expect(guessPrice.value).toBe(50000)
      expect(countdown.value).toBe(55)
      expect(bidPrice.value).toBe(50000)
      
      cancelGuess()
      
      expect(isLocked.value).toBe(false)
      expect(guess.value).toBeNull()
      expect(guessPrice.value).toBeNull()
      expect(countdown.value).toBe(0)
      expect(bidPrice.value).toBeNull()
    })

    it('should stop the countdown interval', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, cancelGuess, countdown } = useGameLogic(priceData, bidPrice)
      
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
      const { makeGuess, cancelGuess, score } = useGameLogic(priceData, bidPrice)
      
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
      const { makeGuess, cleanup, countdown } = useGameLogic(priceData, bidPrice)
      
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
      const { makeGuess, cleanup } = useGameLogic(priceData, bidPrice)
      
      makeGuess('up', 60)
      
      // Should not throw
      expect(() => {
        cleanup()
        cleanup()
        cleanup()
      }).not.toThrow()
    })

    it('should be safe to call when no guess is active', () => {
      const { cleanup } = useGameLogic(priceData, bidPrice)
      
      expect(() => cleanup()).not.toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle checkGuess being called manually when no guess is active', () => {
      const { checkGuess, score } = useGameLogic(priceData, bidPrice)
      
      // Should not throw and should not change score
      expect(() => checkGuess()).not.toThrow()
      expect(score.value).toBe(0)
    })

    it('should handle very small price differences', () => {
      const { evaluateGuess } = useGameLogic(priceData, bidPrice)
      
      expect(evaluateGuess('up', 50000.00, 50000.01)).toBe(true)
      expect(evaluateGuess('down', 50000.00, 49999.99)).toBe(true)
    })

    it('should handle large price swings', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, score, cleanup } = useGameLogic(priceData, bidPrice)
      
      makeGuess('up', 2)
      
      // Major price increase
      priceData.value = createPriceData(100000)
      vi.advanceTimersByTime(2000)
      
      expect(score.value).toBe(1)
      cleanup()
    })

    it('should handle negative scores', () => {
      priceData.value = createPriceData(50000)
      const { makeGuess, score, cleanup } = useGameLogic(priceData, bidPrice)
      
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
})

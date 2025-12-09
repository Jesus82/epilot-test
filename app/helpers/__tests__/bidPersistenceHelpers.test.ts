import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { PersistedBid } from '../../../shared/types/game'
import {
  saveBidToStorage,
  loadBidFromStorage,
  clearBidFromStorage,
  calculateRemainingTime,
  isBidExpired,
} from '../bidPersistenceHelpers'

describe('bidPersistenceHelpers', () => {
  // Store for mocked localStorage
  let store: Record<string, string> = {}

  // Create mock localStorage object
  const localStorageMock = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }

  beforeEach(() => {
    // Reset store and mock functions
    store = {}
    vi.clearAllMocks()
    // Replace global localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('saveBidToStorage', () => {
    it('should save bid to localStorage', () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)

      saveBidToStorage(50000, 'up', 60)

      const stored = JSON.parse(store.activeBid)
      expect(stored.guessPrice).toBe(50000)
      expect(stored.guess).toBe('up')
      expect(stored.bidDuration).toBe(60)
      expect(stored.startTime).toBe(now)
    })

    it('should save down guess correctly', () => {
      saveBidToStorage(45000, 'down', 30)

      const stored = JSON.parse(store.activeBid)
      expect(stored.guessPrice).toBe(45000)
      expect(stored.guess).toBe('down')
      expect(stored.bidDuration).toBe(30)
    })

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('localStorage not available')
      })
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      expect(() => saveBidToStorage(50000, 'up', 60)).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith('[BidPersistence] Failed to save bid to localStorage')
    })
  })

  describe('loadBidFromStorage', () => {
    it('should return null when no bid exists', () => {
      const result = loadBidFromStorage()
      expect(result).toBeNull()
    })

    it('should load valid bid from localStorage', () => {
      const bid: PersistedBid = {
        guessPrice: 50000,
        guess: 'up',
        startTime: Date.now(),
        bidDuration: 60,
      }
      store.activeBid = JSON.stringify(bid)

      const result = loadBidFromStorage()

      expect(result).toEqual(bid)
    })

    it('should return null and clear storage for invalid bid structure', () => {
      store.activeBid = JSON.stringify({ invalid: 'data' })

      const result = loadBidFromStorage()

      expect(result).toBeNull()
      expect(store.activeBid).toBeUndefined()
    })

    it('should return null and clear storage when guessPrice is not a number', () => {
      store.activeBid = JSON.stringify({
        guessPrice: 'not a number',
        guess: 'up',
        startTime: Date.now(),
        bidDuration: 60,
      })

      const result = loadBidFromStorage()

      expect(result).toBeNull()
    })

    it('should return null and clear storage when guess is invalid', () => {
      store.activeBid = JSON.stringify({
        guessPrice: 50000,
        guess: 'invalid',
        startTime: Date.now(),
        bidDuration: 60,
      })

      const result = loadBidFromStorage()

      expect(result).toBeNull()
    })

    it('should handle JSON parse errors gracefully', () => {
      localStorageMock.getItem.mockReturnValue('not valid json')
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = loadBidFromStorage()

      expect(result).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('[BidPersistence] Failed to load bid from localStorage')
    })
  })

  describe('clearBidFromStorage', () => {
    it('should remove bid from localStorage', () => {
      store.activeBid = JSON.stringify({ test: 'data' })

      clearBidFromStorage()

      expect(store.activeBid).toBeUndefined()
    })

    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('localStorage not available')
      })

      expect(() => clearBidFromStorage()).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith('[BidPersistence] Failed to clear bid from localStorage')
    })
  })

  describe('calculateRemainingTime', () => {
    it('should calculate remaining time correctly', () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now + 30000) // 30 seconds later

      const bid: PersistedBid = {
        guessPrice: 50000,
        guess: 'up',
        startTime: now,
        bidDuration: 60,
      }

      const remaining = calculateRemainingTime(bid)

      expect(remaining).toBe(30) // 60 - 30 = 30 seconds remaining
    })

    it('should return negative when bid has expired', () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now + 90000) // 90 seconds later

      const bid: PersistedBid = {
        guessPrice: 50000,
        guess: 'up',
        startTime: now,
        bidDuration: 60,
      }

      const remaining = calculateRemainingTime(bid)

      expect(remaining).toBe(-30) // 60 - 90 = -30 seconds (expired 30s ago)
    })

    it('should return zero when exactly at expiry', () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now + 60000) // 60 seconds later

      const bid: PersistedBid = {
        guessPrice: 50000,
        guess: 'up',
        startTime: now,
        bidDuration: 60,
      }

      const remaining = calculateRemainingTime(bid)

      expect(remaining).toBe(0)
    })
  })

  describe('isBidExpired', () => {
    it('should return false when bid has time remaining', () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now + 30000)

      const bid: PersistedBid = {
        guessPrice: 50000,
        guess: 'up',
        startTime: now,
        bidDuration: 60,
      }

      expect(isBidExpired(bid)).toBe(false)
    })

    it('should return true when bid has expired', () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now + 90000)

      const bid: PersistedBid = {
        guessPrice: 50000,
        guess: 'up',
        startTime: now,
        bidDuration: 60,
      }

      expect(isBidExpired(bid)).toBe(true)
    })

    it('should return true when exactly at expiry (remaining = 0)', () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now + 60000)

      const bid: PersistedBid = {
        guessPrice: 50000,
        guess: 'up',
        startTime: now,
        bidDuration: 60,
      }

      expect(isBidExpired(bid)).toBe(true)
    })
  })
})

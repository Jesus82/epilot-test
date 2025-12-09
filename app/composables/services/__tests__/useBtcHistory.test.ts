import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Import the actual composable - this will use the real helper functions
import { useBtcHistory } from '../useBtcHistory'

// Mock fetch before importing the composable
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('useBtcHistory', () => {
  let btcHistory: ReturnType<typeof useBtcHistory>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()

    // Get fresh instance
    btcHistory = useBtcHistory()

    // Reset state before each test
    btcHistory.clearHistory()
  })

  afterEach(() => {
    // Clean up state after tests
    btcHistory.clearHistory()
  })

  describe('initial state', () => {
    it('should have empty priceHistory initially', () => {
      expect(btcHistory.priceHistory.value).toEqual([])
    })

    it('should not be loading initially', () => {
      expect(btcHistory.isLoadingHistory.value).toBe(false)
    })

    it('should default to 5 minutes range', () => {
      expect(btcHistory.currentRangeMinutes.value).toBe(5)
    })
  })

  describe('loadHistoricalData', () => {
    it('should set loading state while fetching', async () => {
      mockFetch.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            json: () => Promise.resolve([]),
          }), 50),
        ),
      )

      const loadPromise = btcHistory.loadHistoricalData(5)

      // Should be loading immediately after call
      expect(btcHistory.isLoadingHistory.value).toBe(true)

      await loadPromise

      // Should stop loading after completion
      expect(btcHistory.isLoadingHistory.value).toBe(false)
    })

    it('should fetch data with correct API parameters for 5 minutes', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve([]),
      })

      await btcHistory.loadHistoricalData(5)

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const calledUrl = mockFetch.mock.calls[0]![0] as string
      expect(calledUrl).toContain('symbol=BTCUSDT')
      expect(calledUrl).toContain('interval=1s') // 5 min uses 1s interval
    })

    it('should fetch data with correct API parameters for 60 minutes', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve([]),
      })

      await btcHistory.loadHistoricalData(60)

      const calledUrl = mockFetch.mock.calls[0]![0] as string
      expect(calledUrl).toContain('interval=1m') // 60 min uses 1m interval
    })

    it('should fetch data with correct API parameters for 1440 minutes (24h)', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve([]),
      })

      await btcHistory.loadHistoricalData(1440)

      const calledUrl = mockFetch.mock.calls[0]![0] as string
      expect(calledUrl).toContain('interval=5m') // 24h uses 5m interval
    })

    it('should populate priceHistory with fetched data', async () => {
      const mockKlines = [
        [1700000000000, '95000', '95500', '94500', '95200', '100', 1700000059999, '9500000', 100, '50', '4750000', '0'],
        [1700000060000, '95200', '95600', '95100', '95400', '150', 1700000119999, '14280000', 150, '75', '7140000', '0'],
      ]

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockKlines),
      })

      await btcHistory.loadHistoricalData(5)

      expect(btcHistory.priceHistory.value).toHaveLength(2)
      expect(btcHistory.priceHistory.value[0]).toEqual({
        timestamp: 1700000000000,
        price: 95200, // Close price is at index 4
      })
      expect(btcHistory.priceHistory.value[1]).toEqual({
        timestamp: 1700000060000,
        price: 95400,
      })
    })

    it('should clear history when range changes', async () => {
      // First load with 5 minutes
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve([
          [1700000000000, '95000', '95500', '94500', '95200', '100', 1700000059999, '9500000', 100, '50', '4750000', '0'],
        ]),
      })
      await btcHistory.loadHistoricalData(5)
      expect(btcHistory.priceHistory.value).toHaveLength(1)

      // Now load with 60 minutes - should clear first
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve([
          [1700000000000, '95000', '95500', '94500', '96000', '100', 1700000059999, '9500000', 100, '50', '4750000', '0'],
        ]),
      })
      await btcHistory.loadHistoricalData(60)

      expect(btcHistory.priceHistory.value).toHaveLength(1)
      expect(btcHistory.priceHistory.value[0]?.price).toBe(96000) // New data
      expect(btcHistory.currentRangeMinutes.value).toBe(60)
    })

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await btcHistory.loadHistoricalData(5)

      // Should not throw, should have empty history
      expect(btcHistory.priceHistory.value).toEqual([])
      expect(btcHistory.isLoadingHistory.value).toBe(false)
    })

    it('should limit points based on range', async () => {
      // Create 500 mock klines
      const mockKlines = Array.from({ length: 500 }, (_, i) => [
        1700000000000 + i * 1000,
        '95000',
        '95500',
        '94500',
        String(95000 + i),
        '100',
        1700000000999 + i * 1000,
        '9500000',
        100,
        '50',
        '4750000',
        '0',
      ])

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockKlines),
      })

      await btcHistory.loadHistoricalData(5)

      // 5 minutes should limit to 400 points
      expect(btcHistory.priceHistory.value.length).toBeLessThanOrEqual(400)
    })
  })

  describe('addPricePoint', () => {
    it('should add a price point to history', () => {
      btcHistory.addPricePoint(1700000000000, 95000)

      expect(btcHistory.priceHistory.value).toHaveLength(1)
      expect(btcHistory.priceHistory.value[0]).toEqual({
        timestamp: 1700000000000,
        price: 95000,
      })
    })

    it('should add multiple price points at 1s intervals for 5min range', () => {
      // 5min range has 1s sample interval, so all points should be stored
      btcHistory.addPricePoint(1700000000000, 95000)
      btcHistory.addPricePoint(1700000001000, 95100)
      btcHistory.addPricePoint(1700000002000, 95200)

      expect(btcHistory.priceHistory.value).toHaveLength(3)
      expect(btcHistory.priceHistory.value[2]?.price).toBe(95200)
    })

    it('should throttle points based on sample interval for 60min range', async () => {
      // Load with 60 minutes to set the range (1min sample interval)
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve([]),
      })
      await btcHistory.loadHistoricalData(60)

      // Add points at 30s intervals - only every minute should be stored
      btcHistory.addPricePoint(1700000000000, 95000) // Stored (first point)
      btcHistory.addPricePoint(1700000030000, 95100) // Skipped (30s later)
      btcHistory.addPricePoint(1700000060000, 95200) // Stored (60s later)
      btcHistory.addPricePoint(1700000090000, 95300) // Skipped (30s later)
      btcHistory.addPricePoint(1700000120000, 95400) // Stored (60s later)

      expect(btcHistory.priceHistory.value).toHaveLength(3)
      expect(btcHistory.priceHistory.value.map(p => p.price)).toEqual([95000, 95200, 95400])
    })

    it('should trim old points when exceeding max', () => {
      // Add more than maxPoints for 5 min range (400)
      // Points are at 1s intervals which matches 5min sample interval
      for (let i = 0; i < 450; i++) {
        btcHistory.addPricePoint(Date.now() + i * 1000, 95000 + i)
      }

      expect(btcHistory.priceHistory.value.length).toBeLessThanOrEqual(400)
    })

    it('should skip points that are too close together', () => {
      // Add points at 500ms intervals - should only store ~half
      btcHistory.addPricePoint(1700000000000, 95000) // Stored
      btcHistory.addPricePoint(1700000000500, 95050) // Skipped (500ms later)
      btcHistory.addPricePoint(1700000001000, 95100) // Stored (1s from first)
      btcHistory.addPricePoint(1700000001500, 95150) // Skipped (500ms later)
      btcHistory.addPricePoint(1700000002000, 95200) // Stored (1s from second stored)

      expect(btcHistory.priceHistory.value).toHaveLength(3)
    })
  })

  describe('clearHistory', () => {
    it('should clear all price history', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve([
          [1700000000000, '95000', '95500', '94500', '95200', '100', 1700000059999, '9500000', 100, '50', '4750000', '0'],
        ]),
      })
      await btcHistory.loadHistoricalData(60)

      expect(btcHistory.priceHistory.value.length).toBeGreaterThan(0)
      expect(btcHistory.currentRangeMinutes.value).toBe(60)

      btcHistory.clearHistory()

      expect(btcHistory.priceHistory.value).toEqual([])
      expect(btcHistory.currentRangeMinutes.value).toBe(5) // Reset to default
    })
  })

  describe('state sharing', () => {
    it('should share state between multiple calls to useBtcHistory', () => {
      const instance1 = useBtcHistory()
      const instance2 = useBtcHistory()

      instance1.addPricePoint(1700000000000, 95000)

      // Both instances should see the same data (shared module-level state)
      expect(instance2.priceHistory.value).toHaveLength(1)
      expect(instance2.priceHistory.value[0]?.price).toBe(95000)
    })
  })
})

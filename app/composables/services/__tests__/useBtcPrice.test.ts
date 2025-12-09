import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed, isRef } from 'vue'

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1
  static CLOSED = 3

  readyState = MockWebSocket.CLOSED
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: { code: number, reason: string }) => void) | null = null

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.()
    }, 0)
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code: code ?? 1000, reason: reason ?? '' })
  }

  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }
}

describe('useBtcPrice', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let mockWebSocketInstance: MockWebSocket | null = null

  const setupGlobals = () => {
    // Re-stub Vue reactivity (needed after resetModules)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('isRef', isRef)
  }

  beforeEach(async () => {
    vi.resetModules()
    setupGlobals()

    // Mock fetch for loadHistoricalData
    mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        [1704067200000, '42000', '42500', '41500', '42200', '100'],
        [1704067260000, '42200', '42600', '42100', '42400', '150'],
      ]),
    })
    vi.stubGlobal('fetch', mockFetch)

    // Import useBtcHistory first and stub it globally
    const { useBtcHistory } = await import('../useBtcHistory')
    vi.stubGlobal('useBtcHistory', useBtcHistory)

    // Mock WebSocket
    vi.stubGlobal('WebSocket', Object.assign(
      class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          mockWebSocketInstance = this
        }
      },
      { OPEN: 1, CLOSED: 3 },
    ))

    // Import useBtcWS after useBtcHistory is stubbed
    const { useBtcWS } = await import('../useBtcWS')
    vi.stubGlobal('useBtcWS', useBtcWS)
  })

  afterEach(() => {
    mockWebSocketInstance = null
    vi.unstubAllGlobals()
  })

  describe('integration with useBtcWS', () => {
    it('should expose price from useBtcWS', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { price, connect } = useBtcPrice()

      expect(price.value).toBeNull()

      await connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      mockWebSocketInstance?.simulateMessage({
        e: '24hrTicker',
        E: Date.now(),
        s: 'BTCUSDT',
        c: '45000.00',
        o: '44000.00',
        h: '46000.00',
        l: '43000.00',
        v: '1000.00',
        q: '45000000.00',
        P: '2.27',
        p: '1000.00',
      })

      expect(price.value).toBe(45000)
    })

    it('should expose priceData from useBtcWS', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { priceData, connect } = useBtcPrice()

      expect(priceData.value).toBeNull()

      await connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      mockWebSocketInstance?.simulateMessage({
        e: '24hrTicker',
        E: Date.now(),
        s: 'BTCUSDT',
        c: '50000.00',
        o: '49000.00',
        h: '51000.00',
        l: '48000.00',
        v: '2000.00',
        q: '100000000.00',
        P: '2.04',
        p: '1000.00',
      })

      expect(priceData.value).toBeTruthy()
      expect(priceData.value?.price).toBe(50000)
      expect(priceData.value?.high24h).toBe(51000)
      expect(priceData.value?.low24h).toBe(48000)
    })

    it('should expose status and connection state', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { status, isConnected, connect, disconnect } = useBtcPrice()

      expect(status.value).toBe('disconnected')
      expect(isConnected.value).toBe(false)

      await connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(status.value).toBe('connected')
      expect(isConnected.value).toBe(true)

      disconnect()

      expect(status.value).toBe('disconnected')
      expect(isConnected.value).toBe(false)
    })

    it('should expose error state', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { error } = useBtcPrice()

      expect(error.value).toBeNull()
    })
  })

  describe('integration with useBtcHistory', () => {
    it('should expose priceHistory from useBtcHistory', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { priceHistory, loadHistoricalData } = useBtcPrice()

      expect(priceHistory.value).toEqual([])

      await loadHistoricalData(5)

      expect(priceHistory.value.length).toBe(2)
      expect(priceHistory.value[0]!.price).toBe(42200)
    })

    it('should expose isLoadingHistory from useBtcHistory', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { isLoadingHistory } = useBtcPrice()

      expect(isLoadingHistory.value).toBe(false)
    })

    it('should expose loadHistoricalData from useBtcHistory', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { loadHistoricalData, priceHistory } = useBtcPrice()

      expect(typeof loadHistoricalData).toBe('function')

      await loadHistoricalData(15)

      // Verify fetch was called (API uses different limit logic based on interval)
      expect(mockFetch).toHaveBeenCalled()
      expect(priceHistory.value.length).toBeGreaterThan(0)
    })
  })

  describe('bidPrice', () => {
    it('should have null initial bidPrice', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { bidPrice } = useBtcPrice()

      expect(bidPrice.value).toBeNull()
    })

    it('should set bidPrice via setBidPrice', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { bidPrice, setBidPrice } = useBtcPrice()

      expect(bidPrice.value).toBeNull()

      setBidPrice(42000)

      expect(bidPrice.value).toBe(42000)
    })

    it('should clear bidPrice by setting to null', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { bidPrice, setBidPrice } = useBtcPrice()

      setBidPrice(50000)
      expect(bidPrice.value).toBe(50000)

      setBidPrice(null)
      expect(bidPrice.value).toBeNull()
    })

    it('should share bidPrice state across multiple calls', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')

      const instance1 = useBtcPrice()
      const instance2 = useBtcPrice()

      instance1.setBidPrice(55000)

      expect(instance2.bidPrice.value).toBe(55000)
    })
  })

  describe('setBid and clearBid', () => {
    it('should have null initial bidTimestamp and guessDirection', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { bidTimestamp, guessDirection } = useBtcPrice()

      expect(bidTimestamp.value).toBeNull()
      expect(guessDirection.value).toBeNull()
    })

    it('should set bidPrice, bidTimestamp, and guessDirection via setBid', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { bidPrice, bidTimestamp, guessDirection, setBid } = useBtcPrice()

      const beforeTime = Date.now()
      setBid(42000, 'up')
      const afterTime = Date.now()

      expect(bidPrice.value).toBe(42000)
      expect(bidTimestamp.value).toBeGreaterThanOrEqual(beforeTime)
      expect(bidTimestamp.value).toBeLessThanOrEqual(afterTime)
      expect(guessDirection.value).toBe('up')
    })

    it('should set guessDirection to down', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { guessDirection, setBid } = useBtcPrice()

      setBid(50000, 'down')

      expect(guessDirection.value).toBe('down')
    })

    it('should set bidTimestamp to null when price is null', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { bidPrice, bidTimestamp, setBid } = useBtcPrice()

      setBid(42000, 'up')
      expect(bidTimestamp.value).not.toBeNull()

      setBid(null, null)
      expect(bidPrice.value).toBeNull()
      expect(bidTimestamp.value).toBeNull()
    })

    it('should clear all bid state via clearBid', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { bidPrice, bidTimestamp, guessDirection, setBid, clearBid } = useBtcPrice()

      setBid(55000, 'up')
      expect(bidPrice.value).toBe(55000)
      expect(bidTimestamp.value).not.toBeNull()
      expect(guessDirection.value).toBe('up')

      clearBid()

      expect(bidPrice.value).toBeNull()
      expect(bidTimestamp.value).toBeNull()
      expect(guessDirection.value).toBeNull()
    })

    it('should share bid state across multiple instances', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')

      const instance1 = useBtcPrice()
      const instance2 = useBtcPrice()

      instance1.setBid(60000, 'down')

      expect(instance2.bidPrice.value).toBe(60000)
      expect(instance2.bidTimestamp.value).not.toBeNull()
      expect(instance2.guessDirection.value).toBe('down')

      instance2.clearBid()

      expect(instance1.bidPrice.value).toBeNull()
      expect(instance1.bidTimestamp.value).toBeNull()
      expect(instance1.guessDirection.value).toBeNull()
    })

    it('should expose setBid and clearBid functions', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { setBid, clearBid } = useBtcPrice()

      expect(typeof setBid).toBe('function')
      expect(typeof clearBid).toBe('function')
    })
  })

  describe('formatPrice', () => {
    it('should return null when value is null', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { formatPrice } = useBtcPrice()

      expect(formatPrice(null)).toBeNull()
    })

    it('should format price as USD currency', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { formatPrice } = useBtcPrice()

      expect(formatPrice(42123.45)).toBe('$42,123.45')
    })

    it('should format different price values correctly', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { formatPrice } = useBtcPrice()

      expect(formatPrice(50000.00)).toBe('$50,000.00')
      expect(formatPrice(51234.56)).toBe('$51,234.56')
      expect(formatPrice(0)).toBe('$0.00')
      expect(formatPrice(-123.45)).toBe('-$123.45')
    })
  })

  describe('state reactivity', () => {
    it('should return reactive refs and computed properties', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const {
        priceData,
        price,
        status,
        error,
        isConnected,
        priceHistory,
        isLoadingHistory,
        bidPrice,
        bidTimestamp,
        guessDirection,
      } = useBtcPrice()

      // All should be refs or computed (isRef returns true for both ref and computed)
      expect(isRef(priceData)).toBe(true)
      expect(isRef(price)).toBe(true)
      expect(isRef(status)).toBe(true)
      expect(isRef(error)).toBe(true)
      expect(isRef(isConnected)).toBe(true)
      expect(isRef(priceHistory)).toBe(true)
      expect(isRef(isLoadingHistory)).toBe(true)
      expect(isRef(bidPrice)).toBe(true)
      expect(isRef(bidTimestamp)).toBe(true)
      expect(isRef(guessDirection)).toBe(true)
    })

    it('should expose formatPrice as a function', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { formatPrice } = useBtcPrice()

      expect(typeof formatPrice).toBe('function')
    })

    it('should expose connect and disconnect functions', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { connect, disconnect } = useBtcPrice()

      expect(typeof connect).toBe('function')
      expect(typeof disconnect).toBe('function')
    })

    it('should expose setBidPrice function', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { setBidPrice } = useBtcPrice()

      expect(typeof setBidPrice).toBe('function')
    })

    it('should expose loadHistoricalData function', async () => {
      const { useBtcPrice } = await import('../useBtcPrice')
      const { loadHistoricalData } = useBtcPrice()

      expect(typeof loadHistoricalData).toBe('function')
    })
  })
})

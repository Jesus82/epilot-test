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
    // Simulate async connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.()
    }, 0)
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code: code ?? 1000, reason: reason ?? '' })
  }

  // Helper to simulate receiving a message
  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }

  // Helper to simulate error
  simulateError() {
    this.onerror?.(new Event('error'))
  }
}

describe('useBtcWS', () => {
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
      json: () => Promise.resolve([]),
    })
    vi.stubGlobal('fetch', mockFetch)

    // Import useBtcHistory first and stub it globally
    const { useBtcHistory } = await import('../useBtcHistory')
    vi.stubGlobal('useBtcHistory', useBtcHistory)

    // Add WebSocket constants
    vi.stubGlobal('WebSocket', Object.assign(
      class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          mockWebSocketInstance = this
        }
      },
      { OPEN: 1, CLOSED: 3 },
    ))
  })

  afterEach(() => {
    mockWebSocketInstance = null
    vi.unstubAllGlobals()
  })

  describe('connect', () => {
    it('should set status to connecting when called', async () => {
      const { useBtcWS } = await import('../useBtcWS')
      const { connect, status } = useBtcWS()

      // Start connection (don't await to check intermediate state)
      const connectPromise = connect()
      expect(status.value).toBe('connecting')

      await connectPromise
    })

    it('should set status to connected after WebSocket opens', async () => {
      const { useBtcWS } = await import('../useBtcWS')
      const { connect, status } = useBtcWS()

      await connect()

      // Wait for WebSocket onopen to fire
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(status.value).toBe('connected')
    })

    it('should load historical data when connecting', async () => {
      const { useBtcWS } = await import('../useBtcWS')
      const { connect } = useBtcWS()

      await connect()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.binance.com/api/v3/klines'),
      )
    })

    it('should update priceData when receiving a message', async () => {
      const { useBtcWS } = await import('../useBtcWS')
      const { connect, priceData } = useBtcWS()

      await connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      // Simulate a ticker message
      mockWebSocketInstance?.simulateMessage({
        e: '24hrTicker',
        E: Date.now(),
        s: 'BTCUSDT',
        c: '50000.00',
        o: '49000.00',
        h: '51000.00',
        l: '48000.00',
        v: '1000.00',
        q: '50000000.00',
        P: '2.04',
        p: '1000.00',
      })

      expect(priceData.value).toBeTruthy()
      expect(priceData.value?.price).toBe(50000)
    })

    it('should compute price from priceData', async () => {
      const { useBtcWS } = await import('../useBtcWS')
      const { connect, price } = useBtcWS()

      await connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      mockWebSocketInstance?.simulateMessage({
        e: '24hrTicker',
        E: Date.now(),
        s: 'BTCUSDT',
        c: '42500.50',
        o: '42000.00',
        h: '43000.00',
        l: '41000.00',
        v: '500.00',
        q: '21000000.00',
        P: '1.19',
        p: '500.50',
      })

      expect(price.value).toBe(42500.5)
    })

    it('should set isConnected to true when connected', async () => {
      const { useBtcWS } = await import('../useBtcWS')
      const { connect, isConnected } = useBtcWS()

      expect(isConnected.value).toBe(false)

      await connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(isConnected.value).toBe(true)
    })

    it('should not connect again if already connected', async () => {
      const { useBtcWS } = await import('../useBtcWS')
      const { connect, status } = useBtcWS()

      await connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(status.value).toBe('connected')

      // Try connecting again
      const initialFetchCount = mockFetch.mock.calls.length
      await connect()

      // fetch should not be called again
      expect(mockFetch.mock.calls.length).toBe(initialFetchCount)
    })
  })

  describe('disconnect', () => {
    it('should set status to disconnected', async () => {
      const { useBtcWS } = await import('../useBtcWS')
      const { connect, disconnect, status } = useBtcWS()

      await connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(status.value).toBe('connected')

      disconnect()

      expect(status.value).toBe('disconnected')
    })

    it('should set isConnected to false after disconnect', async () => {
      const { useBtcWS } = await import('../useBtcWS')
      const { connect, disconnect, isConnected } = useBtcWS()

      await connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(isConnected.value).toBe(true)

      disconnect()

      expect(isConnected.value).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should set error status on WebSocket error', async () => {
      const { useBtcWS } = await import('../useBtcWS')
      const { connect, status, error } = useBtcWS()

      await connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      mockWebSocketInstance?.simulateError()

      expect(status.value).toBe('error')
      expect(error.value).toBe('WebSocket connection error')
    })

    it('should handle malformed message data gracefully', async () => {
      const { useBtcWS } = await import('../useBtcWS')
      const { connect, priceData } = useBtcWS()

      await connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      // Send invalid JSON - use the raw onmessage
      mockWebSocketInstance?.onmessage?.({ data: 'not valid json' })

      // Should not crash, priceData should remain null
      expect(priceData.value).toBeNull()
    })
  })

  describe('reconnection', () => {
    it('should schedule reconnection on unexpected close', async () => {
      const { useBtcWS } = await import('../useBtcWS')
      const { connect, status } = useBtcWS()

      await connect()
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(status.value).toBe('connected')

      // Store the current WebSocket instance
      const wsInstance = mockWebSocketInstance

      // Simulate unexpected close (code 1006)
      wsInstance?.onclose?.({ code: 1006, reason: 'Abnormal closure' })

      // Status should be disconnected immediately
      expect(status.value).toBe('disconnected')

      // We can't easily test the reconnection scheduling without mocking setTimeout
      // but we've verified the onclose handler runs and sets the status
    })

    it('should not reconnect on manual disconnect (code 1000)', async () => {
      const { useBtcWS } = await import('../useBtcWS')
      const { connect, disconnect, status } = useBtcWS()

      await connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      disconnect()

      expect(status.value).toBe('disconnected')

      // Wait to ensure no reconnection happens
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should still be disconnected
      expect(status.value).toBe('disconnected')
    })

    it('should clear pending reconnect timeout on disconnect', async () => {
      vi.useFakeTimers()

      const { useBtcWS } = await import('../useBtcWS')
      const { connect, disconnect, status } = useBtcWS()

      await connect()
      await vi.advanceTimersByTimeAsync(10)
      expect(status.value).toBe('connected')

      // Simulate unexpected close to trigger reconnection scheduling
      mockWebSocketInstance?.onclose?.({ code: 1006, reason: 'Abnormal closure' })
      expect(status.value).toBe('disconnected')

      // Disconnect should clear the pending reconnect timeout
      disconnect()

      // Advance timers past the reconnect delay (5000ms)
      await vi.advanceTimersByTimeAsync(6000)

      // Should still be disconnected, no reconnect happened
      expect(status.value).toBe('disconnected')

      vi.useRealTimers()
    })
  })

  describe('state reactivity', () => {
    it('should return reactive refs', async () => {
      const { useBtcWS } = await import('../useBtcWS')
      const { priceData, status, error, price, isConnected } = useBtcWS()

      // All should be refs or computed
      expect(isRef(priceData)).toBe(true)
      expect(isRef(status)).toBe(true)
      expect(isRef(error)).toBe(true)
      expect(isRef(price) || isComputed(price)).toBe(true)
      expect(isRef(isConnected) || isComputed(isConnected)).toBe(true)
    })

    it('should have correct initial state', async () => {
      // Fresh module import
      vi.resetModules()
      vi.stubGlobal('fetch', mockFetch)
      vi.stubGlobal('WebSocket', Object.assign(
        class extends MockWebSocket {
          constructor(url: string) {
            super(url)
            mockWebSocketInstance = this
          }
        },
        { OPEN: 1, CLOSED: 3 },
      ))

      const { useBtcWS } = await import('../useBtcWS')
      const { priceData, status, error, price, isConnected } = useBtcWS()

      expect(priceData.value).toBeNull()
      expect(status.value).toBe('disconnected')
      expect(error.value).toBeNull()
      expect(price.value).toBeNull()
      expect(isConnected.value).toBe(false)
    })
  })
})

// Helper to check if something is a computed ref
function isComputed(value: unknown): boolean {
  return isRef(value) && '_getter' in (value as object)
}

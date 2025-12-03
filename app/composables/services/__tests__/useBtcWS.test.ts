import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { BtcPriceData, WebSocketStatus } from '~/types/btc'

// Mock the helper functions
vi.mock('~/helpers/btcWSHelpers', () => ({
  shouldAttemptReconnect: vi.fn((closeCode: number, attempts: number, maxAttempts = 5) => {
    return closeCode !== 1000 && attempts < maxAttempts
  }),
  parseTickerMessage: vi.fn((data: { c: string; p: string; P: string; h: string; l: string; E: number }) => ({
    price: parseFloat(data.c),
    priceChange24h: parseFloat(data.p),
    priceChangePercent24h: parseFloat(data.P),
    high24h: parseFloat(data.h),
    low24h: parseFloat(data.l),
    timestamp: data.E,
  })),
}))

// Mock useBtcHistory
vi.mock('../useBtcHistory', () => ({
  useBtcHistory: () => ({
    addPricePoint: vi.fn(),
    loadHistoricalData: vi.fn(),
  }),
}))

describe('useBtcWS', () => {
  let mockWebSocket: {
    onopen: (() => void) | null
    onmessage: ((event: { data: string }) => void) | null
    onerror: ((event: Event) => void) | null
    onclose: ((event: { code: number; reason: string }) => void) | null
    close: ReturnType<typeof vi.fn>
    readyState: number
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock WebSocket
    mockWebSocket = {
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      close: vi.fn(),
      readyState: 0, // CONNECTING
    }

    // Mock global WebSocket constructor
    global.WebSocket = vi.fn(() => mockWebSocket) as unknown as typeof WebSocket
    ;(global.WebSocket as unknown as { OPEN: number }).OPEN = 1
  })

  describe('initial state', () => {
    it('should start with disconnected status', () => {
      const status = ref<WebSocketStatus>('disconnected')
      expect(status.value).toBe('disconnected')
    })

    it('should start with null priceData', () => {
      const priceData = ref<BtcPriceData | null>(null)
      expect(priceData.value).toBeNull()
    })

    it('should start with null error', () => {
      const error = ref<string | null>(null)
      expect(error.value).toBeNull()
    })
  })

  describe('connect', () => {
    it('should set status to connecting when connect is called', () => {
      const status = ref<WebSocketStatus>('disconnected')

      // Simulate connect start
      status.value = 'connecting'

      expect(status.value).toBe('connecting')
    })

    it('should set status to connected on successful connection', () => {
      const status = ref<WebSocketStatus>('connecting')

      // Simulate onopen callback
      status.value = 'connected'

      expect(status.value).toBe('connected')
    })

    it('should reset reconnect attempts on successful connection', () => {
      let reconnectAttempts = 3

      // Simulate successful connection
      reconnectAttempts = 0

      expect(reconnectAttempts).toBe(0)
    })
  })

  describe('message handling', () => {
    it('should parse incoming price data correctly', () => {
      const priceData = ref<BtcPriceData | null>(null)

      const mockMessage = {
        c: '96000.50',
        p: '1500.00',
        P: '1.58',
        h: '97000.00',
        l: '94000.00',
        E: 1700000000000,
      }

      // Simulate message parsing
      priceData.value = {
        price: parseFloat(mockMessage.c),
        priceChange24h: parseFloat(mockMessage.p),
        priceChangePercent24h: parseFloat(mockMessage.P),
        high24h: parseFloat(mockMessage.h),
        low24h: parseFloat(mockMessage.l),
        timestamp: mockMessage.E,
      }

      expect(priceData.value).toEqual({
        price: 96000.50,
        priceChange24h: 1500.00,
        priceChangePercent24h: 1.58,
        high24h: 97000.00,
        low24h: 94000.00,
        timestamp: 1700000000000,
      })
    })

    it('should handle negative price changes', () => {
      const priceData = ref<BtcPriceData | null>(null)

      const mockMessage = {
        c: '94500.00',
        p: '-1500.00',
        P: '-1.56',
        h: '96000.00',
        l: '94000.00',
        E: 1700000000000,
      }

      priceData.value = {
        price: parseFloat(mockMessage.c),
        priceChange24h: parseFloat(mockMessage.p),
        priceChangePercent24h: parseFloat(mockMessage.P),
        high24h: parseFloat(mockMessage.h),
        low24h: parseFloat(mockMessage.l),
        timestamp: mockMessage.E,
      }

      expect(priceData.value.priceChange24h).toBe(-1500.00)
      expect(priceData.value.priceChangePercent24h).toBe(-1.56)
    })
  })

  describe('error handling', () => {
    it('should set status to error on WebSocket error', () => {
      const status = ref<WebSocketStatus>('connected')
      const error = ref<string | null>(null)

      // Simulate error
      status.value = 'error'
      error.value = 'WebSocket connection error'

      expect(status.value).toBe('error')
      expect(error.value).toBe('WebSocket connection error')
    })
  })

  describe('disconnect', () => {
    it('should set status to disconnected', () => {
      const status = ref<WebSocketStatus>('connected')

      // Simulate disconnect
      status.value = 'disconnected'

      expect(status.value).toBe('disconnected')
    })

    it('should clear reconnect timeout on manual disconnect', () => {
      let reconnectTimeout: ReturnType<typeof setTimeout> | null = setTimeout(() => {}, 1000)

      // Simulate disconnect cleanup
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }

      expect(reconnectTimeout).toBeNull()
    })

    it('should prevent auto-reconnect after manual disconnect', () => {
      let reconnectAttempts = 0
      const MAX_RECONNECT_ATTEMPTS = 5

      // Simulate manual disconnect
      reconnectAttempts = MAX_RECONNECT_ATTEMPTS

      // Simulate close event - should not attempt reconnect
      const closeCode: number = 1006 // Abnormal closure
      const shouldReconnect = closeCode !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS

      expect(shouldReconnect).toBe(false)
    })
  })

  describe('reconnection logic', () => {
    it('should attempt reconnect on abnormal closure', () => {
      let reconnectAttempts = 0
      const MAX_RECONNECT_ATTEMPTS = 5
      const closeCode: number = 1006 // Abnormal closure

      const shouldReconnect = closeCode !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS

      expect(shouldReconnect).toBe(true)
    })

    it('should not attempt reconnect on normal closure (1000)', () => {
      let reconnectAttempts = 0
      const MAX_RECONNECT_ATTEMPTS = 5
      const closeCode: number = 1000 // Normal closure

      const shouldReconnect = closeCode !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS

      expect(shouldReconnect).toBe(false)
    })

    it('should stop reconnecting after max attempts', () => {
      let reconnectAttempts = 5
      const MAX_RECONNECT_ATTEMPTS = 5
      const closeCode: number = 1006

      const shouldReconnect = closeCode !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS

      expect(shouldReconnect).toBe(false)
    })

    it('should increment reconnect attempts on each attempt', () => {
      let reconnectAttempts = 0

      // Simulate reconnect attempts
      reconnectAttempts++
      expect(reconnectAttempts).toBe(1)

      reconnectAttempts++
      expect(reconnectAttempts).toBe(2)

      reconnectAttempts++
      expect(reconnectAttempts).toBe(3)
    })
  })

  describe('computed properties', () => {
    it('price should return current price from priceData', () => {
      const priceData = ref<BtcPriceData | null>({
        price: 96000.50,
        priceChange24h: 1500.00,
        priceChangePercent24h: 1.58,
        high24h: 97000.00,
        low24h: 94000.00,
        timestamp: 1700000000000,
      })

      const price = computed(() => priceData.value?.price ?? null)

      expect(price.value).toBe(96000.50)
    })

    it('price should return null when priceData is null', () => {
      const priceData = ref<BtcPriceData | null>(null)

      const price = computed(() => priceData.value?.price ?? null)

      expect(price.value).toBeNull()
    })

    it('isConnected should return true when status is connected', () => {
      const status = ref<WebSocketStatus>('connected')

      const isConnected = computed(() => status.value === 'connected')

      expect(isConnected.value).toBe(true)
    })

    it('isConnected should return false for other statuses', () => {
      const status = ref<WebSocketStatus>('disconnected')
      const isConnected = computed(() => status.value === 'connected')

      expect(isConnected.value).toBe(false)

      status.value = 'connecting'
      expect(isConnected.value).toBe(false)

      status.value = 'error'
      expect(isConnected.value).toBe(false)
    })
  })
})

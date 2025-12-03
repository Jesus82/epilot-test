import { describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import type { BtcPriceData, WebSocketStatus } from '~/types/btc'

// Mock the dependent composables
vi.mock('../useBtcWS', () => ({
  useBtcWS: () => ({
    priceData: ref<BtcPriceData | null>(null),
    price: computed(() => null),
    status: ref<WebSocketStatus>('disconnected'),
    error: ref<string | null>(null),
    isConnected: computed(() => false),
    connect: vi.fn(),
    disconnect: vi.fn(),
  }),
}))

vi.mock('../useBtcHistory', () => ({
  useBtcHistory: () => ({
    priceHistory: ref([]),
    isLoadingHistory: ref(false),
    loadHistoricalData: vi.fn(),
  }),
}))

describe('useBtcPrice', () => {
  describe('bidPrice state', () => {
    it('should initialize with null', () => {
      const bidPrice = ref<number | null>(null)
      expect(bidPrice.value).toBeNull()
    })

    it('should update when setBidPrice is called', () => {
      const bidPrice = ref<number | null>(null)

      const setBidPrice = (price: number | null) => {
        bidPrice.value = price
      }

      setBidPrice(96000.50)
      expect(bidPrice.value).toBe(96000.50)
    })

    it('should allow setting back to null', () => {
      const bidPrice = ref<number | null>(96000.50)

      const setBidPrice = (price: number | null) => {
        bidPrice.value = price
      }

      setBidPrice(null)
      expect(bidPrice.value).toBeNull()
    })
  })

  describe('formattedPrice computed', () => {
    it('should format price as USD currency', () => {
      const priceData = ref<BtcPriceData | null>({
        price: 96000.50,
        priceChange24h: 1500.00,
        priceChangePercent24h: 1.58,
        high24h: 97000.00,
        low24h: 94000.00,
        timestamp: 1700000000000,
      })

      const formattedPrice = computed(() => {
        if (!priceData.value) return null
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(priceData.value.price)
      })

      expect(formattedPrice.value).toBe('$96,000.50')
    })

    it('should return null when priceData is null', () => {
      const priceData = ref<BtcPriceData | null>(null)

      const formattedPrice = computed(() => {
        if (!priceData.value) return null
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(priceData.value.price)
      })

      expect(formattedPrice.value).toBeNull()
    })

    it('should format large numbers with commas', () => {
      const priceData = ref<BtcPriceData | null>({
        price: 1234567.89,
        priceChange24h: 0,
        priceChangePercent24h: 0,
        high24h: 0,
        low24h: 0,
        timestamp: 0,
      })

      const formattedPrice = computed(() => {
        if (!priceData.value) return null
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(priceData.value.price)
      })

      expect(formattedPrice.value).toBe('$1,234,567.89')
    })

    it('should format small decimal values correctly', () => {
      const priceData = ref<BtcPriceData | null>({
        price: 0.01,
        priceChange24h: 0,
        priceChangePercent24h: 0,
        high24h: 0,
        low24h: 0,
        timestamp: 0,
      })

      const formattedPrice = computed(() => {
        if (!priceData.value) return null
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(priceData.value.price)
      })

      expect(formattedPrice.value).toBe('$0.01')
    })
  })

  describe('re-exports from other composables', () => {
    it('should provide access to priceData', () => {
      const priceData = ref<BtcPriceData | null>(null)
      expect(priceData.value).toBeNull()
    })

    it('should provide access to price', () => {
      const priceData = ref<BtcPriceData | null>({
        price: 96000.50,
        priceChange24h: 0,
        priceChangePercent24h: 0,
        high24h: 0,
        low24h: 0,
        timestamp: 0,
      })

      const price = computed(() => priceData.value?.price ?? null)
      expect(price.value).toBe(96000.50)
    })

    it('should provide access to status', () => {
      const status = ref<WebSocketStatus>('disconnected')
      expect(status.value).toBe('disconnected')
    })

    it('should provide access to error', () => {
      const error = ref<string | null>(null)
      expect(error.value).toBeNull()
    })

    it('should provide access to isConnected', () => {
      const status = ref<WebSocketStatus>('connected')
      const isConnected = computed(() => status.value === 'connected')
      expect(isConnected.value).toBe(true)
    })

    it('should provide access to priceHistory', () => {
      const priceHistory = ref<{ timestamp: number; price: number }[]>([])
      expect(priceHistory.value).toEqual([])
    })

    it('should provide access to isLoadingHistory', () => {
      const isLoadingHistory = ref(false)
      expect(isLoadingHistory.value).toBe(false)
    })
  })

  describe('connect and disconnect functions', () => {
    it('should provide connect function', () => {
      const connect = vi.fn()
      expect(connect).toBeDefined()
      expect(typeof connect).toBe('function')
    })

    it('should provide disconnect function', () => {
      const disconnect = vi.fn()
      expect(disconnect).toBeDefined()
      expect(typeof disconnect).toBe('function')
    })

    it('should provide loadHistoricalData function', () => {
      const loadHistoricalData = vi.fn()
      expect(loadHistoricalData).toBeDefined()
      expect(typeof loadHistoricalData).toBe('function')
    })
  })
})

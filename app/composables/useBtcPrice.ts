import type { BinanceTickerMessage, BtcPriceData, WebSocketStatus } from '~/types'

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@ticker'
const BINANCE_KLINE_API = 'https://api.binance.com/api/v3/klines'

// Global shared state
const priceData = ref<BtcPriceData | null>(null)
const priceHistory = ref<Array<{ timestamp: number; price: number }>>([])
const bidPrice = ref<number | null>(null)
const status = ref<WebSocketStatus>('disconnected')
const error = ref<string | null>(null)

let ws: WebSocket | null = null
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 3000

export const useBtcPrice = () => {

  const parseTickerMessage = (data: BinanceTickerMessage): BtcPriceData => ({
    price: parseFloat(data.c),
    priceChange24h: parseFloat(data.p),
    priceChangePercent24h: parseFloat(data.P),
    high24h: parseFloat(data.h),
    low24h: parseFloat(data.l),
    timestamp: data.E,
  })

  const fetchHistoricalData = async () => {
    try {
      // Fetch last 5 minutes of 1-second klines
      const endTime = Date.now()
      const startTime = endTime - (5 * 60 * 1000) // 5 minutes ago
      
      const url = `${BINANCE_KLINE_API}?symbol=BTCUSDT&interval=1s&startTime=${startTime}&endTime=${endTime}&limit=300`
      
      const response = await fetch(url)
      const data = await response.json()
      
      // Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
      priceHistory.value = data.map((kline: any[]) => ({
        timestamp: kline[0], // openTime
        price: parseFloat(kline[4]), // close price
      }))
      
      console.log(`[BTC] Loaded ${priceHistory.value.length} historical data points`)
    } catch (e) {
      console.error('[BTC] Failed to fetch historical data:', e)
    }
  }

  const connect = async () => {
    if (ws?.readyState === WebSocket.OPEN) return

    status.value = 'connecting'
    error.value = null

    // Fetch historical data first
    await fetchHistoricalData()

    try {
      ws = new WebSocket(BINANCE_WS_URL)

      ws.onopen = () => {
        status.value = 'connected'
        reconnectAttempts = 0
        console.log('[BTC WebSocket] Connected to Binance')
      }

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data: BinanceTickerMessage = JSON.parse(event.data)
          priceData.value = parseTickerMessage(data)
          
          // Add to history
          priceHistory.value.push({
            timestamp: data.E,
            price: parseFloat(data.c),
          })
          
          // Keep only last 5 minutes (300 seconds)
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000)
          priceHistory.value = priceHistory.value.filter(p => p.timestamp > fiveMinutesAgo)
        }
        catch (e) {
          console.error('[BTC WebSocket] Failed to parse message:', e)
        }
      }

      ws.onerror = (event) => {
        console.error('[BTC WebSocket] Error:', event)
        status.value = 'error'
        error.value = 'WebSocket connection error'
      }

      ws.onclose = (event) => {
        status.value = 'disconnected'
        console.log('[BTC WebSocket] Disconnected:', event.code, event.reason)

        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++
          console.log(`[BTC WebSocket] Reconnecting... Attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`)
          reconnectTimeout = setTimeout(connect, RECONNECT_DELAY)
        }
      }
    }
    catch (e) {
      status.value = 'error'
      error.value = 'Failed to create WebSocket connection'
      console.error('[BTC WebSocket] Failed to connect:', e)
    }
  }

  const disconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout)
      reconnectTimeout = null
    }
    reconnectAttempts = MAX_RECONNECT_ATTEMPTS // Prevent auto-reconnect

    if (ws) {
      ws.close(1000, 'Manual disconnect')
      ws = null
    }
    status.value = 'disconnected'
  }

  // Computed properties for easy access
  const price = computed(() => priceData.value?.price ?? null)
  const formattedPrice = computed(() =>
    priceData.value
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(priceData.value.price)
      : null,
  )
  const isConnected = computed(() => status.value === 'connected')
  
  const averagePrice = computed(() => {
    if (priceHistory.value.length === 0) return null
    const sum = priceHistory.value.reduce((acc, p) => acc + p.price, 0)
    return sum / priceHistory.value.length
  })

  return {
    // State
    priceData,
    priceHistory,
    bidPrice,
    price,
    formattedPrice,
    averagePrice,
    status,
    error,
    isConnected,

    // Actions
    connect,
    disconnect,
  }
}

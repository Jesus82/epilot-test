import type { BinanceTickerMessage, BtcPriceData, WebSocketStatus } from '~/types/btc'

// Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
type BinanceKline = [number, string, string, string, string, string, number, string, number, string, string, string]

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@ticker'
const BINANCE_KLINE_API = 'https://api.binance.com/api/v3/klines'

// Global shared state
const priceData = ref<BtcPriceData | null>(null)
const priceHistory = ref<Array<{ timestamp: number; price: number }>>([])
const bidPrice = ref<number | null>(null)
const status = ref<WebSocketStatus>('disconnected')
const error = ref<string | null>(null)
const isLoadingHistory = ref(false)

// Track the oldest data we have loaded (in minutes from now)
const loadedRangeMinutes = ref(0)

let ws: WebSocket | null = null
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 3000
const MAX_HISTORY_POINTS = 100000 // Limit total stored points

export const useBtcPrice = () => {

  const parseTickerMessage = (data: BinanceTickerMessage): BtcPriceData => ({
    price: parseFloat(data.c),
    priceChange24h: parseFloat(data.p),
    priceChangePercent24h: parseFloat(data.P),
    high24h: parseFloat(data.h),
    low24h: parseFloat(data.l),
    timestamp: data.E,
  })

  // Fetch historical data for a specific time range
  const fetchHistoricalData = async (minutes: number) => {
    try {
      const endTime = Date.now()
      const startTime = endTime - (minutes * 60 * 1000)
      
      // Choose interval to get 300-600 data points
      let interval: string
      let limit: number
      
      if (minutes <= 15) {
        // Up to 15m: 1s candles
        interval = '1s'
        limit = minutes * 60
      } else if (minutes <= 400) {
        // Up to ~6h: 1m candles
        interval = '1m'
        limit = minutes
      } else {
        // 24h: 5m candles
        interval = '5m'
        limit = Math.ceil(minutes / 5)
      }
      
      limit = Math.min(limit, 1000) // Binance max limit
      
      const url = `${BINANCE_KLINE_API}?symbol=BTCUSDT&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      return data.map((kline: BinanceKline) => ({
        timestamp: kline[0], // openTime
        price: parseFloat(kline[4]), // close price
      }))
    } catch (e) {
      console.error('[BTC] Failed to fetch historical data:', e)
      return []
    }
  }

  // Load historical data on-demand for a specific time range
  const loadHistoricalData = async (minutes: number) => {
    // Skip if we already have data for this range
    if (minutes <= loadedRangeMinutes.value) {
      console.log(`[BTC] Already have ${loadedRangeMinutes.value}m of data, skipping load for ${minutes}m`)
      return
    }
    
    isLoadingHistory.value = true
    console.log(`[BTC] Loading historical data for ${minutes} minutes...`)
    
    try {
      const historicalData = await fetchHistoricalData(minutes)
      
      if (historicalData.length > 0) {
        // Get existing timestamps to avoid duplicates
        const existingTimestamps = new Set(priceHistory.value.map(p => p.timestamp))
        
        // Add only new data points
        const newPoints = historicalData.filter(
          (p: { timestamp: number }) => !existingTimestamps.has(p.timestamp)
        )
        
        // Merge and sort by timestamp
        priceHistory.value = [...newPoints, ...priceHistory.value]
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-MAX_HISTORY_POINTS) // Keep only recent points if too many
        
        loadedRangeMinutes.value = minutes
        console.log(`[BTC] Loaded ${newPoints.length} new points, total: ${priceHistory.value.length}`)
      }
    } finally {
      isLoadingHistory.value = false
    }
  }

  const connect = async () => {
    if (ws?.readyState === WebSocket.OPEN) return

    status.value = 'connecting'
    error.value = null

    // Fetch initial 5 minutes of historical data
    await loadHistoricalData(5)

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
          
          // Trim if exceeding max points
          if (priceHistory.value.length > MAX_HISTORY_POINTS) {
            priceHistory.value = priceHistory.value.slice(-MAX_HISTORY_POINTS)
          }
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
  const isConnected = computed(() => status.value === 'connected')

  // Set bid price for display on chart
  const setBidPrice = (price: number | null) => {
    bidPrice.value = price
  }

  return {
    // State
    priceData,
    priceHistory,
    bidPrice,
    price,
    status,
    error,
    isConnected,
    isLoadingHistory,

    // Actions
    connect,
    disconnect,
    loadHistoricalData,
    setBidPrice,
  }
}

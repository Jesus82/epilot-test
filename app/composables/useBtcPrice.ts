import type { BinanceTickerMessage, BtcPriceData, WebSocketStatus } from '~/types'

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@ticker'

export const useBtcPrice = () => {
  const priceData = ref<BtcPriceData | null>(null)
  const status = ref<WebSocketStatus>('disconnected')
  const error = ref<string | null>(null)

  let ws: WebSocket | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  const MAX_RECONNECT_ATTEMPTS = 5
  const RECONNECT_DELAY = 3000

  const parseTickerMessage = (data: BinanceTickerMessage): BtcPriceData => ({
    price: parseFloat(data.c),
    priceChange24h: parseFloat(data.p),
    priceChangePercent24h: parseFloat(data.P),
    high24h: parseFloat(data.h),
    low24h: parseFloat(data.l),
    timestamp: data.E,
  })

  const connect = () => {
    if (ws?.readyState === WebSocket.OPEN) return

    status.value = 'connecting'
    error.value = null

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

  return {
    // State
    priceData,
    price,
    formattedPrice,
    status,
    error,
    isConnected,

    // Actions
    connect,
    disconnect,
  }
}

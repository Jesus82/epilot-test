import type { BinanceTickerMessage } from '../../../shared/types/binance'
import type { BtcPriceData, WebSocketStatus } from '../../../shared/types/btc'
import { parseTickerMessage, shouldAttemptReconnect } from '~/helpers/btcWSHelpers'

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws/btcusdt@ticker'

const priceData = ref<BtcPriceData | null>(null)
const status = ref<WebSocketStatus>('disconnected')
const error = ref<string | null>(null)

let ws: WebSocket | null = null
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 3000

export const useBtcWS = () => {
  const { addPricePoint, loadHistoricalData } = useBtcHistory()

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

          // Add to shared history
          addPricePoint(data.E, parseFloat(data.c))
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

        if (shouldAttemptReconnect(event.code, reconnectAttempts, MAX_RECONNECT_ATTEMPTS)) {
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

  return {
    // State
    priceData,
    price,
    status,
    error,
    isConnected,

    // Actions
    connect,
    disconnect,
  }
}

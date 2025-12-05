/**
 * Price point for chart data
 */
export type PricePoint = { timestamp: number, price: number }

/**
 * Simplified BTC price data for the app
 */
export interface BtcPriceData {
  price: number
  priceChange24h: number
  priceChangePercent24h: number
  high24h: number
  low24h: number
  timestamp: number
}

/**
 * WebSocket connection status
 */
export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * Binance 24hr Ticker WebSocket message
 * Stream: wss://stream.binance.com:9443/ws/btcusdt@ticker
 */
export interface BinanceTickerMessage {
  e: string // Event type (e.g., "24hrTicker")
  E: number // Event time (timestamp)
  s: string // Symbol (e.g., "BTCUSDT")
  p: string // Price change
  P: string // Price change percent
  w: string // Weighted average price
  x: string // First trade price (previous day)
  c: string // Last price (current price)
  Q: string // Last quantity
  b: string // Best bid price
  B: string // Best bid quantity
  a: string // Best ask price
  A: string // Best ask quantity
  o: string // Open price
  h: string // High price
  l: string // Low price
  v: string // Total traded base asset volume
  q: string // Total traded quote asset volume
  O: number // Statistics open time
  C: number // Statistics close time
  F: number // First trade ID
  L: number // Last trade ID
  n: number // Total number of trades
}

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

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
 * Binance Kline/Candlestick data from REST API
 * Endpoint: GET /api/v3/klines
 * Format: [openTime, open, high, low, close, volume, closeTime, quoteVolume, trades, takerBuyBase, takerBuyQuote, ignore]
 */
export type BinanceKline = [
  number, // 0: Open time (timestamp)
  string, // 1: Open price
  string, // 2: High price
  string, // 3: Low price
  string, // 4: Close price
  string, // 5: Volume
  number, // 6: Close time (timestamp)
  string, // 7: Quote asset volume
  number, // 8: Number of trades
  string, // 9: Taker buy base asset volume
  string, // 10: Taker buy quote asset volume
  string, // 11: Ignore
]

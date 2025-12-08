/**
 * Pure helper functions for BTC WebSocket management
 * These functions have no Vue/Nuxt dependencies and are easily testable
 */

import type { BinanceTickerMessage } from '../../shared/types/binance'
import type { BtcPriceData } from '../../shared/types/btc'

/**
 * Determine if a reconnection should be attempted based on close code and attempts
 * @param closeCode - WebSocket close code (1000 = normal closure)
 * @param attempts - Current number of reconnection attempts
 * @param maxAttempts - Maximum allowed reconnection attempts (default: 5)
 */
export const shouldAttemptReconnect = (
  closeCode: number,
  attempts: number,
  maxAttempts: number = 5,
): boolean => {
  return closeCode !== 1000 && attempts < maxAttempts
}

/**
 * Parse Binance ticker WebSocket message to BtcPriceData format
 */
export const parseTickerMessage = (data: BinanceTickerMessage): BtcPriceData => ({
  price: parseFloat(data.c),
  priceChange24h: parseFloat(data.p),
  priceChangePercent24h: parseFloat(data.P),
  high24h: parseFloat(data.h),
  low24h: parseFloat(data.l),
  timestamp: data.E,
})

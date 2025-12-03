import type { BinanceKline } from '~/types/binance'
import type { PricePoint } from '~/types/btc'
import {
  getKlineParams,
  getMaxPointsForRange,
  klinesToPricePoints,
  takeRecentPoints,
  trimOldPoints,
} from '~/helpers/btcHistoryHelpers'

const BINANCE_KLINE_API = 'https://api.binance.com/api/v3/klines'

const priceHistory = ref<PricePoint[]>([])
const isLoadingHistory = ref(false)
const currentRangeMinutes = ref(5)

const fetchBinanceKlines = async (
  symbol: string,
  interval: string,
  startTime: number,
  endTime: number,
  limit: number,
): Promise<BinanceKline[]> => {
  const url = `${BINANCE_KLINE_API}?symbol=${symbol}&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`
  const response = await fetch(url)
  return response.json() as Promise<BinanceKline[]>
}

const clearHistoryOnRangeChange = (newMinutes: number): boolean => {
  if (newMinutes === currentRangeMinutes.value) return false

  console.log(`[BTC History] Range changed from ${currentRangeMinutes.value}m to ${newMinutes}m, clearing history`)
  priceHistory.value = []
  currentRangeMinutes.value = newMinutes
  return true
}

export const useBtcHistory = () => {
  const fetchHistoricalData = async (minutes: number): Promise<PricePoint[]> => {
    try {
      const endTime = Date.now()
      const startTime = endTime - (minutes * 60 * 1000)

      const { interval, limit } = getKlineParams(minutes)

      const klines = await fetchBinanceKlines('BTCUSDT', interval, startTime, endTime, limit)
      return klinesToPricePoints(klines)
    }
    catch (e) {
      console.error('[BTC History] Failed to fetch historical data:', e)
      return []
    }
  }

  const loadHistoricalData = async (minutes: number) => {
    clearHistoryOnRangeChange(minutes)

    isLoadingHistory.value = true
    console.log(`[BTC History] Loading historical data for ${minutes} minutes...`)

    try {
      const historicalData = await fetchHistoricalData(minutes)
      const maxPoints = getMaxPointsForRange(minutes)

      if (historicalData.length > 0) {
        priceHistory.value = takeRecentPoints(historicalData, maxPoints)
        console.log(`[BTC History] Loaded ${priceHistory.value.length} points (max: ${maxPoints})`)
      }
    }
    finally {
      isLoadingHistory.value = false
    }
  }

  const addPricePoint = (timestamp: number, price: number) => {
    const maxPoints = getMaxPointsForRange(currentRangeMinutes.value)
    const cutoffTime = Date.now() - (currentRangeMinutes.value * 60 * 1000)

    priceHistory.value.push({ timestamp, price })

    if (priceHistory.value.length > maxPoints) {
      priceHistory.value = trimOldPoints(priceHistory.value, maxPoints, cutoffTime)
    }
  }

  const clearHistory = () => {
    priceHistory.value = []
    currentRangeMinutes.value = 5
    console.log('[BTC History] History cleared')
  }

  return {
    // State
    priceHistory,
    isLoadingHistory,
    currentRangeMinutes,

    // Actions
    loadHistoricalData,
    addPricePoint,
    clearHistory,
  }
}

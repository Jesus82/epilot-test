import type { BinanceKline } from '../../../shared/types/binance'
import type { PricePoint } from '../../../shared/types/chart'
import {
  getKlineParams,
  getMaxPointsForRange,
  getSampleIntervalForRange,
  klinesToPricePoints,
  shouldStorePoint,
  takeRecentPoints,
  trimOldPoints,
} from '~/helpers/btcHistoryHelpers'

const BINANCE_KLINE_API = 'https://api.binance.com/api/v3/klines'

const priceHistory = ref<PricePoint[]>([])
const isLoadingHistory = ref(false)
const currentRangeMinutes = ref(5)
// Track last stored timestamp to prevent excessive point storage
let lastStoredTimestamp: number | null = null

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

  priceHistory.value = []
  currentRangeMinutes.value = newMinutes
  lastStoredTimestamp = null
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

    try {
      const historicalData = await fetchHistoricalData(minutes)
      const maxPoints = getMaxPointsForRange(minutes)

      if (historicalData.length > 0) {
        priceHistory.value = takeRecentPoints(historicalData, maxPoints)
        // Set lastStoredTimestamp to the latest point in history
        const lastPoint = priceHistory.value[priceHistory.value.length - 1]
        lastStoredTimestamp = lastPoint?.timestamp ?? null
      }
    }
    finally {
      isLoadingHistory.value = false
    }
  }

  const addPricePoint = (timestamp: number, price: number) => {
    const sampleInterval = getSampleIntervalForRange(currentRangeMinutes.value)

    // Only store points at the appropriate sample interval to prevent memory bloat
    if (!shouldStorePoint(lastStoredTimestamp, timestamp, sampleInterval)) {
      return
    }

    const maxPoints = getMaxPointsForRange(currentRangeMinutes.value)
    const cutoffTime = Date.now() - (currentRangeMinutes.value * 60 * 1000)

    // Single reactivity trigger: create new array instead of push + reassign
    const newHistory = [...priceHistory.value, { timestamp, price }]

    if (newHistory.length > maxPoints) {
      priceHistory.value = trimOldPoints(newHistory, maxPoints, cutoffTime)
    }
    else {
      priceHistory.value = newHistory
    }

    lastStoredTimestamp = timestamp
  }

  const clearHistory = () => {
    priceHistory.value = []
    currentRangeMinutes.value = 5
    lastStoredTimestamp = null
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

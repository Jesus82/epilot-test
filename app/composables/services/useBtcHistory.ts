import type { BinanceKline } from '~/types/binance'
import type { PricePoint } from '~/types/btc'

const BINANCE_KLINE_API = 'https://api.binance.com/api/v3/klines'

// Global shared state for price history
const priceHistory = ref<PricePoint[]>([])
const isLoadingHistory = ref(false)
const currentRangeMinutes = ref(5)

// Max points based on time range to prevent memory leaks
// We keep slightly more than needed to avoid edge cases
const getMaxPointsForRange = (minutes: number): number => {
  if (minutes <= 5) return 400      // 1s interval -> ~300 points + buffer
  if (minutes <= 10) return 400     // 2s interval -> ~300 points + buffer
  if (minutes <= 60) return 100     // 1m interval -> 60 points + buffer
  if (minutes <= 360) return 500    // 1m interval -> 360 points + buffer
  return 400                         // 5m interval -> 288 points + buffer
}

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

const klinesToPricePoints = (klines: BinanceKline[]): PricePoint[] => {
  return klines.map((kline) => ({
    timestamp: kline[0], // openTime
    price: parseFloat(kline[4]), // close price
  }))
}

// Choose interval to get appropriate data points
const getKlineParams = (minutes: number): { interval: string; limit: number } => {
  let interval: string
  let limit: number

  if (minutes <= 15) {
    // Up to 15m: 1s candles
    interval = '1s'
    limit = minutes * 60
  }
  else if (minutes <= 400) {
    // Up to ~6h: 1m candles
    interval = '1m'
    limit = minutes
  }
  else {
    // 24h: 5m candles
    interval = '5m'
    limit = Math.ceil(minutes / 5)
  }

  return { interval, limit: Math.min(limit, 1000) } // Binance max limit
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
    // Always clear and reload when range changes to prevent memory leaks
    const rangeChanged = minutes !== currentRangeMinutes.value

    if (rangeChanged) {
      console.log(`[BTC History] Range changed from ${currentRangeMinutes.value}m to ${minutes}m, clearing history`)
      priceHistory.value = []
      currentRangeMinutes.value = minutes
    }

    isLoadingHistory.value = true
    console.log(`[BTC History] Loading historical data for ${minutes} minutes...`)

    try {
      const historicalData = await fetchHistoricalData(minutes)
      const maxPoints = getMaxPointsForRange(minutes)

      if (historicalData.length > 0) {
        // Take only the most recent points up to max
        priceHistory.value = historicalData.slice(-maxPoints)
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

    // Add new point
    priceHistory.value.push({ timestamp, price })

    // Trim old data: remove points outside time range AND respect max points
    if (priceHistory.value.length > maxPoints) {
      // First, remove points that are too old
      const validPoints = priceHistory.value.filter(p => p.timestamp >= cutoffTime)
      // Then apply max points limit
      priceHistory.value = validPoints.slice(-maxPoints)
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

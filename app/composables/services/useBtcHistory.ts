import type { BinanceKline } from '~/types/binance'
import type { PricePoint } from '~/types/btc'

const BINANCE_KLINE_API = 'https://api.binance.com/api/v3/klines'

// Global shared state for price history
const priceHistory = ref<PricePoint[]>([])
const isLoadingHistory = ref(false)
const loadedRangeMinutes = ref(0)

const MAX_HISTORY_POINTS = 100000

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

const mergeHistoricalData = (
  existingData: PricePoint[],
  newData: PricePoint[],
  maxPoints: number,
): { mergedData: PricePoint[]; newPointsCount: number } => {
  const existingTimestamps = new Set(existingData.map(p => p.timestamp))

  const newPoints = newData.filter(p => !existingTimestamps.has(p.timestamp))

  const mergedData = [...newPoints, ...existingData]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-maxPoints)

  return { mergedData, newPointsCount: newPoints.length }
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
    // Skip if we already have data for this range
    if (minutes <= loadedRangeMinutes.value) {
      console.log(`[BTC History] Already have ${loadedRangeMinutes.value}m of data, skipping load for ${minutes}m`)
      return
    }

    isLoadingHistory.value = true
    console.log(`[BTC History] Loading historical data for ${minutes} minutes...`)

    try {
      const historicalData = await fetchHistoricalData(minutes)

      if (historicalData.length > 0) {
        const { mergedData, newPointsCount } = mergeHistoricalData(
          priceHistory.value,
          historicalData,
          MAX_HISTORY_POINTS,
        )

        priceHistory.value = mergedData
        loadedRangeMinutes.value = minutes
        console.log(`[BTC History] Loaded ${newPointsCount} new points, total: ${priceHistory.value.length}`)
      }
    }
    finally {
      isLoadingHistory.value = false
    }
  }

  const addPricePoint = (timestamp: number, price: number) => {
    priceHistory.value.push({ timestamp, price })

    // Trim if exceeding max points
    if (priceHistory.value.length > MAX_HISTORY_POINTS) {
      priceHistory.value = priceHistory.value.slice(-MAX_HISTORY_POINTS)
    }
  }

  return {
    // State
    priceHistory,
    isLoadingHistory,

    // Actions
    loadHistoricalData,
    addPricePoint,
  }
}

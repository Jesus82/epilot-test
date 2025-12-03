import type { BinanceKline } from '~/types/binance'
import type { PricePoint } from '~/types/btc'

const BINANCE_KLINE_API = 'https://api.binance.com/api/v3/klines'

const priceHistory = ref<PricePoint[]>([])
const isLoadingHistory = ref(false)
const currentRangeMinutes = ref(5)


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

const getKlineParams = (minutes: number): { interval: string; limit: number } => {
  let interval: string
  let limit: number

  if (minutes <= 15) {
    interval = '1s'
    limit = minutes * 60
  }
  else if (minutes <= 400) {
    interval = '1m'
    limit = minutes
  }
  else {
    interval = '5m'
    limit = Math.ceil(minutes / 5)
  }

  return { interval, limit: Math.min(limit, 1000) } // Binance max limit
}

const trimOldPoints = (
  points: PricePoint[],
  maxPoints: number,
  cutoffTime: number,
): PricePoint[] => {
  const validPoints = points.filter(p => p.timestamp >= cutoffTime)
  return validPoints.slice(-maxPoints)
}

const takeRecentPoints = (points: PricePoint[], maxPoints: number): PricePoint[] => {
  return points.slice(-maxPoints)
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

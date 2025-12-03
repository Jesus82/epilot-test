// Binance kline format: [openTime, open, high, low, close, volume, closeTime, ...]
type BinanceKline = [number, string, string, string, string, string, number, string, number, string, string, string]

const BINANCE_KLINE_API = 'https://api.binance.com/api/v3/klines'

// Global shared state for price history
const priceHistory = ref<Array<{ timestamp: number; price: number }>>([])
const isLoadingHistory = ref(false)
const loadedRangeMinutes = ref(0)

const MAX_HISTORY_POINTS = 100000

export const useBtcHistory = () => {
  // Fetch historical data for a specific time range
  const fetchHistoricalData = async (minutes: number) => {
    try {
      const endTime = Date.now()
      const startTime = endTime - (minutes * 60 * 1000)

      // Choose interval to get appropriate data points
      let interval: string
      let limit: number

      if (minutes <= 15) {
        // Up to 15m: 1s candles
        interval = '1s'
        limit = minutes * 60
      } else if (minutes <= 400) {
        // Up to ~6h: 1m candles
        interval = '1m'
        limit = minutes
      } else {
        // 24h: 5m candles
        interval = '5m'
        limit = Math.ceil(minutes / 5)
      }

      limit = Math.min(limit, 1000) // Binance max limit

      const url = `${BINANCE_KLINE_API}?symbol=BTCUSDT&interval=${interval}&startTime=${startTime}&endTime=${endTime}&limit=${limit}`

      const response = await fetch(url)
      const data = await response.json()

      return data.map((kline: BinanceKline) => ({
        timestamp: kline[0], // openTime
        price: parseFloat(kline[4]), // close price
      }))
    }
    catch (e) {
      console.error('[BTC History] Failed to fetch historical data:', e)
      return []
    }
  }

  // Load historical data on-demand for a specific time range
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
        // Get existing timestamps to avoid duplicates
        const existingTimestamps = new Set(priceHistory.value.map(p => p.timestamp))

        // Add only new data points
        const newPoints = historicalData.filter(
          (p: { timestamp: number }) => !existingTimestamps.has(p.timestamp),
        )

        // Merge and sort by timestamp
        priceHistory.value = [...newPoints, ...priceHistory.value]
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(-MAX_HISTORY_POINTS)

        loadedRangeMinutes.value = minutes
        console.log(`[BTC History] Loaded ${newPoints.length} new points, total: ${priceHistory.value.length}`)
      }
    }
    finally {
      isLoadingHistory.value = false
    }
  }

  // Add a single price point (called by WebSocket on each tick)
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

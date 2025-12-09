/**
 * Unified BTC price composable
 * Combines useBtcWS (WebSocket connection) and useBtcHistory (price history)
 * into a single interface, plus shared state for bid markers and chart configuration
 */

import type { GuessDirection } from '../../../shared/types/game'
import { filterByTimeRange } from '~/helpers/btcPriceChartHelpers'
import { calculateYDomain } from '~/helpers/btcChartHelpers'

// Shared bid state (used for chart marker)
const bidPrice = ref<number | null>(null)
const bidTimestamp = ref<number | null>(null)
const guessDirection = ref<GuessDirection>(null)

// Shared time range selection (used by chart and progress bar)
const selectedRange = ref(5) // Default 5 minutes

export const useBtcPrice = () => {
  const { priceData, price, status, error, isConnected, connect, disconnect } = useBtcWS()
  const { priceHistory, isLoadingHistory, loadHistoricalData } = useBtcHistory()

  // Computed filtered data based on selected range
  const filteredPriceHistory = computed(() =>
    filterByTimeRange(priceHistory.value, selectedRange.value),
  )

  // Computed Y domain for charts/progress bar
  const yDomain = computed(() => calculateYDomain(filteredPriceHistory.value))

  const setBidPrice = (price: number | null) => {
    bidPrice.value = price
  }

  const setBid = (price: number | null, direction: GuessDirection = null) => {
    bidPrice.value = price
    bidTimestamp.value = price ? Date.now() : null
    guessDirection.value = direction
  }

  const clearBid = () => {
    bidPrice.value = null
    bidTimestamp.value = null
    guessDirection.value = null
  }

  const formatPrice = (value: number | null) => {
    if (value === null) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  return {
    // From useBtcWS
    priceData,
    price,
    status,
    error,
    isConnected,
    connect,
    disconnect,

    // From useBtcHistory
    priceHistory,
    isLoadingHistory,
    loadHistoricalData,

    // Chart/range state
    selectedRange,
    filteredPriceHistory,
    yDomain,

    // Local state
    bidPrice,
    bidTimestamp,
    guessDirection,
    setBidPrice,
    setBid,
    clearBid,
    formatPrice,
  }
}

/**
 * Unified BTC price composable
 * Re-exports useBtcWS and useBtcHistory for backward compatibility
 * Also provides shared bid state for the chart
 */

import type { GuessDirection } from '~/composables/useGameLogic'

// Shared bid state (used for chart marker)
const bidPrice = ref<number | null>(null)
const bidTimestamp = ref<number | null>(null)
const guessDirection = ref<GuessDirection>(null)

export const useBtcPrice = () => {
  const { priceData, price, status, error, isConnected, connect, disconnect } = useBtcWS()
  const { priceHistory, isLoadingHistory, loadHistoricalData } = useBtcHistory()

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

  const formattedPrice = computed(() => {
    if (!priceData.value) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(priceData.value.price)
  })

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

    // Local state
    bidPrice,
    bidTimestamp,
    guessDirection,
    setBidPrice,
    setBid,
    clearBid,
    formattedPrice,
  }
}

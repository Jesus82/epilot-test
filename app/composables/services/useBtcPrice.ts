/**
 * Unified BTC price composable
 * Re-exports useBtcWS and useBtcHistory for backward compatibility
 * Also provides shared bidPrice state for the chart
 */

// Shared bid price state (used for chart marker)
const bidPrice = ref<number | null>(null)

export const useBtcPrice = () => {
  const { priceData, price, status, error, isConnected, connect, disconnect } = useBtcWS()
  const { priceHistory, isLoadingHistory, loadHistoricalData } = useBtcHistory()

  const setBidPrice = (price: number | null) => {
    bidPrice.value = price
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
    setBidPrice,
    formattedPrice,
  }
}


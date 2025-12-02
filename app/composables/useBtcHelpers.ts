/**
 * Helper functions for BTC chart calculations and formatting
 * Pure functions with no state - used by BtcPriceChart component
 */
export const useBtcHelpers = () => {
  // Get D3 time interval for axis ticks and grid lines based on time range
  const getTimeInterval = (d3: typeof import('d3'), rangeMinutes: number) => {
    if (rangeMinutes <= 10) return d3.timeMinute.every(1)
    if (rangeMinutes <= 60) return d3.timeMinute.every(5)
    if (rangeMinutes <= 360) return d3.timeMinute.every(30)
    return d3.timeHour.every(2)
  }

  // Get sample interval for downsampling price data (in milliseconds)
  // Must match API intervals for consistency across historical and live data
  const getSampleInterval = (rangeMinutes: number): number => {
    if (rangeMinutes <= 5) return 1000           // 1s -> 300 points
    if (rangeMinutes <= 10) return 2000          // 2s -> 300 points
    if (rangeMinutes <= 60) return 60 * 1000     // 1m -> 60 points (matches API 1m candles)
    if (rangeMinutes <= 360) return 60 * 1000    // 1m -> 360 points
    return 5 * 60 * 1000                          // 5m -> 288 points (24h)
  }

  // Calculate "nice" step value for Y axis ticks
  // Rounds to values like 1, 2, 5, 10, 20, 50, 100, etc.
  const calculateNiceStep = (range: number, targetTicks: number): number => {
    const rawStep = range / targetTicks
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
    const normalized = rawStep / magnitude

    let nice: number
    if (normalized <= 1) nice = 1
    else if (normalized <= 2) nice = 2
    else if (normalized <= 5) nice = 5
    else nice = 10

    return Math.max(1, nice * magnitude) // Minimum $1 step
  }

  // Format price for display
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  // Format price without currency symbol (for chart labels)
  const formatPriceCompact = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price)
  }

  return {
    getTimeInterval,
    getSampleInterval,
    calculateNiceStep,
    formatPrice,
    formatPriceCompact,
  }
}

<script setup lang="ts">
import {
  bucketDataByInterval,
  calculateAveragePrice,
  getSampleInterval,
} from '~/helpers/btcPriceChartHelpers'

const { price, bidPrice, bidTimestamp, guessDirection, loadHistoricalData, isLoadingHistory, selectedRange, filteredPriceHistory } = useBtcPrice()

// Downsample data for consistent density across time ranges
const sampledPriceHistory = computed(() => {
  const data = filteredPriceHistory.value
  if (data.length === 0) return []

  const sampleIntervalMs = getSampleInterval(selectedRange.value)
  return bucketDataByInterval(data, sampleIntervalMs)
})

const averagePrice = computed(() =>
  calculateAveragePrice(filteredPriceHistory.value),
)

watch(selectedRange, async (newRange) => {
  await loadHistoricalData(newRange)
})
</script>

<template>
  <div class="btc-price-chart">
    <div class="flex gap-eighth justify-end">
      <div class="flex gap-fourth items-center">
        <p
          v-if="isLoadingHistory"
          class="text-xs font-sans"
        >
          Loading...
        </p>
      </div>
      <TimeRangeSelector v-model="selectedRange" />
    </div>
    <div class="btc-price-chart__wrapper">
      <BtcChartRenderer
        :data="sampledPriceHistory"
        :average-price="averagePrice"
        :bid-price="bidPrice"
        :bid-timestamp="bidTimestamp"
        :guess-direction="guessDirection"
        :current-price="price"
        :selected-range="selectedRange"
      />
      <div
        v-if="isLoadingHistory"
        class="chart-loading-overlay"
      >
        <span>Loading historical data...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btc-price-chart {
  display: flex;
  flex-direction: column;
  padding: var(--spacing-quarter) 0;
  gap: var(--spacing-quarter);
}

.btc-price-chart__wrapper {
  position: relative;
  width: 100%;
  background: var(--color-white);
  border: 1px solid var(--color-gray-lightest);
  padding: var(--spacing-quarter) 0;
  border-radius: 4px;
}

.chart-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  color: #6b7280;
  font-size: 14px;
  z-index: 10;
}
</style>

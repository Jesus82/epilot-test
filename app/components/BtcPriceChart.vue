<script setup lang="ts">
import type { PricePoint } from '~/types/btc'
import {
  TIME_RANGES,
  bucketDataByInterval,
  calculateAveragePrice,
  filterByTimeRange,
  getSampleInterval,
} from '~/helpers/btcPriceChartHelpers'

const { priceHistory, bidPrice, loadHistoricalData, isLoadingHistory } = useBtcPrice()

const selectedRange = ref(5) // Default 5 minutes

const hoveredData = ref<PricePoint | null>(null)

const filteredPriceHistory = computed(() =>
  filterByTimeRange(priceHistory.value, selectedRange.value),
)

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

const handleHover = (data: PricePoint | null) => {
  hoveredData.value = data
}
</script>

<template>
  <div class="btc-price-chart">
    <div class="chart-header">
      <h2>Live BTC Price Chart</h2>
      <div class="chart-controls">
        <div class="time-range-selector">
          <button
            v-for="range in TIME_RANGES"
            :key="range.minutes"
            :class="['range-btn', { active: selectedRange === range.minutes }]"
            @click="selectedRange = range.minutes"
          >
            {{ range.label }}
          </button>
        </div>
        <div class="chart-info">
          <span v-if="isLoadingHistory" class="loading-indicator">Loading...</span>
          <span class="data-points">{{ sampledPriceHistory.length }} points</span>
          <span v-if="hoveredData" class="hovered-info">
            <span class="hovered-price">${{ hoveredData.price.toFixed(2) }}</span>
            <span class="hovered-time">{{ new Date(hoveredData.timestamp).toLocaleTimeString() }}</span>
          </span>
        </div>
      </div>
    </div>
    <div class="chart-container">
      <BtcChartRenderer
        :data="sampledPriceHistory"
        :average-price="averagePrice"
        :bid-price="bidPrice"
        :selected-range="selectedRange"
        @hover="handleHover"
      />
      <div v-if="isLoadingHistory" class="chart-loading-overlay">
        <span>Loading historical data...</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btc-price-chart {
  margin: 20px 0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 10px;
}

.chart-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.chart-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.time-range-selector {
  display: flex;
  gap: 4px;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 6px;
}

.range-btn {
  padding: 4px 10px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.range-btn:hover {
  color: #374151;
  background: #e5e7eb;
}

.range-btn.active {
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.chart-info {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
}

.loading-indicator {
  color: #f59e0b;
  font-weight: 500;
}

.data-points {
  color: #6b7280;
}

.hovered-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hovered-price {
  font-weight: 600;
  color: #2563eb;
}

.hovered-time {
  color: #6b7280;
}

.chart-container {
  position: relative;
  width: 100%;
  min-height: 300px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
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

.chart-container :deep(.x-axis),
.chart-container :deep(.y-axis) {
  font-size: var(--text-2xs);
  color: var(--color-gray-dark);
}

.chart-container :deep(.x-axis path),
.chart-container :deep(.y-axis path) {
  stroke: #e0e0e0;
}

.chart-container :deep(.x-axis .tick line),
.chart-container :deep(.y-axis .tick line) {
  stroke: #e0e0e0;
}
</style>

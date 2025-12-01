<script setup lang="ts">
const { priceData, priceHistory, averagePrice, bidPrice } = useBtcPrice()

const chartContainerRef = ref<HTMLDivElement | null>(null)
const isMounted = ref(false)
let chart: any = null
let lineSeries: any = null
let avgLine: any = null
let bidLine: any = null

// Watch for price updates
watch(() => priceData.value, (data) => {
  if (!data || !lineSeries) return
  
  // Update the series with all data from shared history
  const tvData = priceHistory.value.map(p => ({
    time: Math.floor(p.timestamp / 1000),
    value: p.price,
  }))
  
  lineSeries.setData(tvData)
})

// Watch for average and bid changes
watch([averagePrice, bidPrice], () => {
  if (!chart) return
  
  // Remove old price lines
  if (avgLine) {
    lineSeries.removePriceLine(avgLine)
    avgLine = null
  }
  if (bidLine) {
    lineSeries.removePriceLine(bidLine)
    bidLine = null
  }
  
  // Add average line
  if (averagePrice.value) {
    avgLine = lineSeries.createPriceLine({
      price: averagePrice.value,
      color: '#10b981',
      lineWidth: 2,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: 'Avg',
    })
  }
  
  // Add bid line
  if (bidPrice.value) {
    bidLine = lineSeries.createPriceLine({
      price: bidPrice.value,
      color: '#f59e0b',
      lineWidth: 2,
      lineStyle: 2, // Dashed
      axisLabelVisible: true,
      title: 'Bid',
    })
  }
})

onMounted(async () => {
  try {
    isMounted.value = true
    
    // Wait for next tick to ensure ref is available
    await nextTick()
    
    if (!chartContainerRef.value) return
    
    // Dynamic import
    const LightweightCharts = await import('lightweight-charts')
    
    chart = LightweightCharts.createChart(chartContainerRef.value, {
      width: chartContainerRef.value.clientWidth,
      height: 300,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#e1e1e1' },
        horzLines: { color: '#e1e1e1' },
      },
      rightPriceScale: {
        borderColor: '#cccccc',
      },
      timeScale: {
        borderColor: '#cccccc',
        timeVisible: true,
        secondsVisible: true,
      },
    })
    
    lineSeries = chart.addSeries(LightweightCharts.LineSeries, {
      color: '#2962FF',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    })
    
    // Set initial data if we have any
    if (priceHistory.value.length > 0) {
      const tvData = priceHistory.value.map(p => ({
        time: Math.floor(p.timestamp / 1000),
        value: p.price,
      }))
      lineSeries.setData(tvData)
    }
    
    // Handle resize
    const handleResize = () => {
      if (chart && chartContainerRef.value) {
        chart.applyOptions({ width: chartContainerRef.value.clientWidth })
      }
    }
    
    window.addEventListener('resize', handleResize)
    
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize)
      if (chart) {
        chart.remove()
      }
    })
  } catch (error) {
    console.error('TradingView initialization error:', error)
  }
})
</script>

<template>
  <div v-if="isMounted" class="btc-chart">
    <h2>TradingView Lightweight Charts</h2>
    <p>Data points: {{ priceHistory.length }}</p>
    <div ref="chartContainerRef" class="chart-container"></div>
  </div>
</template>

<style scoped>
.btc-chart {
  margin: 20px 0;
}

.chart-container {
  width: 100%;
  min-height: 300px;
  background: #f9f9f9;
  border: 1px solid #ddd;
}
</style>

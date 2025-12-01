<script setup lang="ts">
const { priceHistory, averagePrice, bidPrice } = useBtcPrice()

const chartRef = ref<HTMLDivElement | null>(null)
const isMounted = ref(false)

// Watch for price updates
watch(priceHistory, () => {
  if (!isMounted.value) return
  updateChart()
}, { deep: true })

// Watch for bid price changes
watch(bidPrice, () => {
  if (!isMounted.value) return
  updateChart()
})

const updateChart = async () => {
  if (!chartRef.value) return
  if (priceHistory.value.length < 2) return
  
  // Dynamic import D3 only on client
  const d3 = await import('d3')
  
  const container = chartRef.value
  const margin = { top: 20, right: 30, bottom: 30, left: 60 }
  const width = Math.max(container.clientWidth, 400) - margin.left - margin.right
  const height = 300 - margin.top - margin.bottom
  
  // Clear previous chart
  d3.select(container).selectAll('*').remove()
  
  // Create SVG
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
  
  // Scales
  const x = d3.scaleTime()
    .domain(d3.extent(priceHistory.value, (d: { timestamp: number; price: number }) => new Date(d.timestamp)) as [Date, Date])
    .range([0, width])
  
  const y = d3.scaleLinear()
    .domain([
      d3.min(priceHistory.value, (d: { timestamp: number; price: number }) => d.price)! * 0.9999,
      d3.max(priceHistory.value, (d: { timestamp: number; price: number }) => d.price)! * 1.0001
    ])
    .range([height, 0])
  
  // Line generator
  const line = d3.line<{ timestamp: number; price: number }>()
    .x((d: { timestamp: number; price: number }) => x(new Date(d.timestamp)))
    .y((d: { timestamp: number; price: number }) => y(d.price))
    .curve(d3.curveMonotoneX)
  
  // Draw line
  svg.append('path')
    .datum(priceHistory.value)
    .attr('fill', 'none')
    .attr('stroke', '#2563eb')
    .attr('stroke-width', 2)
    .attr('d', line)
  
  // Draw average line
  if (averagePrice.value) {
    svg.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', y(averagePrice.value))
      .attr('y2', y(averagePrice.value))
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '5,5')
    
    svg.append('text')
      .attr('x', width - 5)
      .attr('y', y(averagePrice.value) - 5)
      .attr('text-anchor', 'end')
      .attr('fill', '#10b981')
      .attr('font-size', '12px')
      .text(`Avg: $${averagePrice.value.toFixed(2)}`)
  }
  
  // Draw bid line
  if (bidPrice.value) {
    svg.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', y(bidPrice.value))
      .attr('y2', y(bidPrice.value))
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '3,3')
    
    svg.append('text')
      .attr('x', width - 5)
      .attr('y', y(bidPrice.value) + 15)
      .attr('text-anchor', 'end')
      .attr('fill', '#f59e0b')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(`Bid: $${bidPrice.value.toFixed(2)}`)
  }
  
  // Add axes
  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(5))
  
  svg.append('g')
    .call(d3.axisLeft(y).tickFormat((d: d3.NumberValue) => `$${d3.format(',.2f')(d as number)}`))
}

onMounted(() => {
  isMounted.value = true
  window.addEventListener('resize', updateChart)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateChart)
})
</script>

<template>
  <div v-if="isMounted" class="btc-chart">
    <h2>Live BTC Price Chart</h2>
    <p>Data points: {{ priceHistory.length }}</p>
    <div ref="chartRef" class="chart-container"></div>
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

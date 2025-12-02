<script setup lang="ts">
import { interpolatePath } from 'd3-interpolate-path'

const { priceHistory, averagePrice, bidPrice } = useBtcPrice()

const chartRef = ref<HTMLDivElement | null>(null)
const isChartReady = ref(false)

// Store D3 selections for updates (avoid recreating)
let svg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let gridGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let priceLine: d3.Selection<SVGPathElement, unknown, null, undefined> | null = null
let avgLine: d3.Selection<SVGLineElement, unknown, null, undefined> | null = null
let avgText: d3.Selection<SVGTextElement, unknown, null, undefined> | null = null
let bidLine: d3.Selection<SVGLineElement, unknown, null, undefined> | null = null
let bidText: d3.Selection<SVGTextElement, unknown, null, undefined> | null = null
let xAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let yAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let d3Module: typeof import('d3') | null = null

const margin = { top: 20, right: 80, bottom: 30, left: 10 }
const TRANSITION_DURATION = 300

// Watch for price updates - only when chart is ready
watch(priceHistory, () => {
  if (!isChartReady.value) return
  updateChart()
}, { deep: true })

// Watch for bid price changes
watch(bidPrice, () => {
  if (!isChartReady.value) return
  updateChart()
})

const initChart = async () => {
  if (!chartRef.value) return
  
  // Dynamic import D3 only on client
  d3Module = await import('d3')
  const d3 = d3Module
  
  const container = chartRef.value
  const width = Math.max(container.clientWidth, 400) - margin.left - margin.right
  const height = 300 - margin.top - margin.bottom
  
  // Clear any existing SVG
  d3.select(container).selectAll('*').remove()
  
  // Create SVG structure once
  const svgElement = d3.select(container)
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
  
  svg = svgElement
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
  
  // Create grid group (behind everything)
  gridGroup = svg.append('g')
    .attr('class', 'grid')
  
  // Create elements (empty initially)
  priceLine = svg.append('path')
    .attr('class', 'price-line')
    .attr('fill', 'none')
    .attr('stroke', '#2563eb')
    .attr('stroke-width', 2)
  
  avgLine = svg.append('line')
    .attr('class', 'avg-line')
    .attr('stroke', '#10b981')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '5,5')
    .style('opacity', 0)
  
  avgText = svg.append('text')
    .attr('class', 'avg-text')
    .attr('text-anchor', 'end')
    .attr('fill', '#10b981')
    .attr('font-size', '12px')
    .style('opacity', 0)
  
  bidLine = svg.append('line')
    .attr('class', 'bid-line')
    .attr('stroke', '#f59e0b')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '3,3')
    .style('opacity', 0)
  
  bidText = svg.append('text')
    .attr('class', 'bid-text')
    .attr('text-anchor', 'end')
    .attr('fill', '#f59e0b')
    .attr('font-size', '12px')
    .attr('font-weight', 'bold')
    .style('opacity', 0)
  
  // Create axis groups
  xAxisGroup = svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height})`)
  
  // Y-axis on the right side
  yAxisGroup = svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${width},0)`)
  
  // Mark chart as ready and do initial update
  isChartReady.value = true
  updateChart()
}

const updateChart = () => {
  if (!chartRef.value || !svg || !d3Module || priceHistory.value.length < 2) return
  
  const d3 = d3Module
  const container = chartRef.value
  const width = Math.max(container.clientWidth, 400) - margin.left - margin.right
  const height = 300 - margin.top - margin.bottom
  
  // Update scales
  const x = d3.scaleTime()
    .domain(d3.extent(priceHistory.value, (d: { timestamp: number; price: number }) => new Date(d.timestamp)) as [Date, Date])
    .range([0, width])
  
  // Calculate nice $20 step ticks for Y axis
  const minPrice = d3.min(priceHistory.value, (d: { timestamp: number; price: number }) => d.price)!
  const maxPrice = d3.max(priceHistory.value, (d: { timestamp: number; price: number }) => d.price)!
  const priceStep = 20
  const yMin = Math.floor(minPrice / priceStep) * priceStep - priceStep
  const yMax = Math.ceil(maxPrice / priceStep) * priceStep + priceStep
  
  const y = d3.scaleLinear()
    .domain([yMin, yMax])
    .range([height, 0])
  
  // Generate tick values for $20 steps
  const yTickValues: number[] = []
  for (let tick = yMin; tick <= yMax; tick += priceStep) {
    yTickValues.push(tick)
  }
  
  // Generate time ticks (one per minute)
  const xTicks = d3.timeMinute.every(1)
  
  // Update grid lines
  if (gridGroup) {
    // Remove old grid lines
    gridGroup.selectAll('*').remove()
    
    // Horizontal grid lines (price steps)
    yTickValues.forEach((tickValue) => {
      gridGroup!.append('line')
        .attr('class', 'grid-line-h')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(tickValue))
        .attr('y2', y(tickValue))
        .attr('stroke', '#e0e0e0')
        .attr('stroke-width', 1)
    })
    
    // Vertical grid lines (time steps - one per minute)
    const timeExtent = x.domain() as [Date, Date]
    const timeTicks = d3.timeMinute.range(timeExtent[0], timeExtent[1])
    timeTicks.forEach((tickTime) => {
      gridGroup!.append('line')
        .attr('class', 'grid-line-v')
        .attr('x1', x(tickTime))
        .attr('x2', x(tickTime))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#e0e0e0')
        .attr('stroke-width', 1)
    })
  }
  
  // Line generator
  const line = d3.line<{ timestamp: number; price: number }>()
    .x((d: { timestamp: number; price: number }) => x(new Date(d.timestamp)))
    .y((d: { timestamp: number; price: number }) => y(d.price))
    .curve(d3.curveMonotoneX)
  
  // Animate price line with path interpolation
  const newPath = line(priceHistory.value) || ''
  const currentPath = priceLine?.attr('d') || ''
  
  if (currentPath && currentPath !== newPath) {
    priceLine
      ?.transition()
      .duration(TRANSITION_DURATION)
      .ease(d3.easeCubicOut)
      .attrTween('d', () => interpolatePath(currentPath, newPath))
  } else {
    priceLine?.attr('d', newPath)
  }
  
  // Animate average line
  if (averagePrice.value) {
    const avgY = y(averagePrice.value)
    avgLine
      ?.transition()
      .duration(TRANSITION_DURATION)
      .ease(d3.easeCubicOut)
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', avgY)
      .attr('y2', avgY)
      .style('opacity', 1)
    
    avgText
      ?.transition()
      .duration(TRANSITION_DURATION)
      .ease(d3.easeCubicOut)
      .attr('x', width - 5)
      .attr('y', avgY - 5)
      .style('opacity', 1)
      .text(`Avg: $${averagePrice.value.toFixed(2)}`)
  } else {
    avgLine?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
    avgText?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
  }
  
  // Animate bid line
  if (bidPrice.value) {
    const bidY = y(bidPrice.value)
    bidLine
      ?.transition()
      .duration(TRANSITION_DURATION)
      .ease(d3.easeCubicOut)
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', bidY)
      .attr('y2', bidY)
      .style('opacity', 1)
    
    bidText
      ?.transition()
      .duration(TRANSITION_DURATION)
      .ease(d3.easeCubicOut)
      .attr('x', width - 5)
      .attr('y', bidY + 15)
      .style('opacity', 1)
      .text(`Bid: $${bidPrice.value.toFixed(2)}`)
  } else {
    bidLine?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
    bidText?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
  }
  
  // Update axes with transition
  // X-axis: show time in HH:mm format, one tick per minute
  xAxisGroup?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).call(
    d3.axisBottom(x)
      .ticks(xTicks)
      .tickFormat((d) => d3.timeFormat('%H:%M')(d as Date))
  )
  
  // Y-axis on the right: $20 steps, no decimals
  yAxisGroup?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).call(
    d3.axisRight(y)
      .tickValues(yTickValues)
      .tickFormat((d: d3.NumberValue) => d3.format(',.0f')(d as number))
  )
}

const handleResize = () => {
  initChart()
}

// Register lifecycle hooks synchronously (before any await)
onMounted(() => {
  window.addEventListener('resize', handleResize)
  // Use nextTick to ensure DOM is ready, then init chart
  nextTick(() => {
    initChart()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  isChartReady.value = false
})
</script>

<template>
  <div class="btc-chart">
    <h2>Live BTC Price Chart</h2>
    <p>Data points: {{ priceHistory.length }}</p>
    <div ref="chartRef" class="chart-container" />
  </div>
</template>

<style scoped>
.btc-chart {
  margin: 20px 0;
}

.chart-container {
  width: 100%;
  min-height: 300px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
}

.chart-container :deep(.x-axis),
.chart-container :deep(.y-axis) {
  font-size: 11px;
  color: #666;
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

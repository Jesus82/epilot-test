<script setup lang="ts">
import { interpolatePath } from 'd3-interpolate-path'

const { priceHistory, averagePrice, bidPrice } = useBtcPrice()

const chartRef = ref<HTMLDivElement | null>(null)
const isChartReady = ref(false)

// Hover state
const hoveredData = ref<{ price: number; timestamp: number } | null>(null)

// Store D3 selections for updates (avoid recreating)
let svg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let gridGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let priceLine: d3.Selection<SVGPathElement, unknown, null, undefined> | null = null
let avgLine: d3.Selection<SVGLineElement, unknown, null, undefined> | null = null
let avgLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let bidLine: d3.Selection<SVGLineElement, unknown, null, undefined> | null = null
let bidLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let xAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let yAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let crosshairGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let _hoverOverlay: d3.Selection<SVGRectElement, unknown, null, undefined> | null = null
let d3Module: typeof import('d3') | null = null

// Store scales for hover calculations
let currentXScale: d3.ScaleTime<number, number> | null = null
let currentYScale: d3.ScaleLinear<number, number> | null = null
let currentWidth = 0
let currentHeight = 0

// Store adjusted label Y positions for crosshair collision detection
let currentAvgLabelY: number | null = null
let currentBidLabelY: number | null = null

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

// Store current SVG element for viewBox updates
let svgElement: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null

const initChart = async () => {
  if (!chartRef.value) return
  
  // Dynamic import D3 only on client
  d3Module = await import('d3')
  const d3 = d3Module
  
  const container = chartRef.value
  const containerWidth = container.clientWidth || 800
  const containerHeight = 300
  const width = containerWidth - margin.left - margin.right
  const height = containerHeight - margin.top - margin.bottom
  
  // Store dimensions for hover
  currentWidth = width
  currentHeight = height
  
  // Clear any existing SVG
  d3.select(container).selectAll('*').remove()
  
  // Create SVG with viewBox for responsive scaling
  svgElement = d3.select(container)
    .append('svg')
    .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
    .attr('preserveAspectRatio', 'xMidYMid meet')
    .style('width', '100%')
    .style('height', 'auto')
  
  svg = svgElement
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`)
  
  // Create grid group (behind everything)
  gridGroup = svg.append('g')
    .attr('class', 'grid')
  
  // Create axis groups (before labels so labels appear on top)
  xAxisGroup = svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0,${height})`)
  
  // Y-axis on the right side (position updated in updateChart)
  yAxisGroup = svg.append('g')
    .attr('class', 'y-axis')
  
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
    .attr('stroke-dasharray', '4,4')
    .style('opacity', 0)
  
  // Avg label group - small "Avg" label + price value
  avgLabel = svg.append('g')
    .attr('class', 'avg-label')
    .style('opacity', 0)
  
  // Small "Avg" text label
  avgLabel.append('rect')
    .attr('class', 'avg-name-bg')
    .attr('fill', '#10b981')
    .attr('rx', 2)
    .attr('ry', 2)
  
  avgLabel.append('text')
    .attr('class', 'avg-name-text')
    .attr('fill', '#ffffff')
    .attr('font-size', '10px')
    .attr('font-weight', '500')
    .attr('dominant-baseline', 'middle')
    .text('Avg')
  
  // Price value label
  avgLabel.append('rect')
    .attr('class', 'avg-price-bg')
    .attr('fill', '#10b981')
    .attr('rx', 2)
    .attr('ry', 2)
  
  avgLabel.append('text')
    .attr('class', 'avg-price-text')
    .attr('fill', '#ffffff')
    .attr('font-size', '11px')
    .attr('font-weight', '500')
    .attr('dominant-baseline', 'middle')
  
  bidLine = svg.append('line')
    .attr('class', 'bid-line')
    .attr('stroke', '#f59e0b')
    .attr('stroke-width', 2)
    .attr('stroke-dasharray', '4,4')
    .style('opacity', 0)
  
  // Bid label group - same structure as avg
  bidLabel = svg.append('g')
    .attr('class', 'bid-label')
    .style('opacity', 0)
  
  bidLabel.append('rect')
    .attr('class', 'bid-name-bg')
    .attr('fill', '#f59e0b')
    .attr('rx', 2)
    .attr('ry', 2)
  
  bidLabel.append('text')
    .attr('class', 'bid-name-text')
    .attr('fill', '#ffffff')
    .attr('font-size', '10px')
    .attr('font-weight', '500')
    .attr('dominant-baseline', 'middle')
    .text('Bid')
  
  bidLabel.append('rect')
    .attr('class', 'bid-price-bg')
    .attr('fill', '#f59e0b')
    .attr('rx', 2)
    .attr('ry', 2)
  
  bidLabel.append('text')
    .attr('class', 'bid-price-text')
    .attr('fill', '#ffffff')
    .attr('font-size', '11px')
    .attr('font-weight', '500')
    .attr('dominant-baseline', 'middle')
  
  // Create crosshair group
  crosshairGroup = svg.append('g')
    .attr('class', 'crosshair')
    .style('display', 'none')
  
  // Vertical crosshair line
  crosshairGroup.append('line')
    .attr('class', 'crosshair-v')
    .attr('stroke', '#999')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,3')
  
  // Horizontal crosshair line
  crosshairGroup.append('line')
    .attr('class', 'crosshair-h')
    .attr('stroke', '#999')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,3')
  
  // Crosshair dot
  crosshairGroup.append('circle')
    .attr('class', 'crosshair-dot')
    .attr('r', 4)
    .attr('fill', '#2563eb')
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)
  
  // Price label on Y axis
  crosshairGroup.append('g')
    .attr('class', 'crosshair-price-label')
    .append('rect')
    .attr('fill', '#374151')
    .attr('rx', 2)
    .attr('ry', 2)
  
  crosshairGroup.select('.crosshair-price-label')
    .append('text')
    .attr('fill', '#fff')
    .attr('font-size', '11px')
    .attr('dominant-baseline', 'middle')
  
  // Time label on X axis
  crosshairGroup.append('g')
    .attr('class', 'crosshair-time-label')
    .append('rect')
    .attr('fill', '#374151')
    .attr('rx', 2)
    .attr('ry', 2)
  
  crosshairGroup.select('.crosshair-time-label')
    .append('text')
    .attr('fill', '#fff')
    .attr('font-size', '11px')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
  
  // Hover overlay (must be on top for mouse events)
  _hoverOverlay = svg.append('rect')
    .attr('class', 'hover-overlay')
    .attr('width', currentWidth)
    .attr('height', currentHeight)
    .attr('fill', 'transparent')
    .style('cursor', 'crosshair')
    .on('mousemove', handleMouseMove)
    .on('mouseleave', handleMouseLeave)
  
  // Mark chart as ready and do initial update
  isChartReady.value = true
  updateChart()
}

const handleMouseMove = (event: MouseEvent) => {
  if (!d3Module || !currentXScale || !currentYScale || !crosshairGroup || priceHistory.value.length < 2) return
  
  const d3 = d3Module
  const [mouseX] = d3.pointer(event)
  
  // Find closest data point
  const bisect = d3.bisector((d: { timestamp: number; price: number }) => d.timestamp).left
  const x0 = currentXScale.invert(mouseX).getTime()
  const i = bisect(priceHistory.value, x0, 1)
  const d0 = priceHistory.value[i - 1]
  const d1 = priceHistory.value[i]
  
  if (!d0) return
  
  const closestPoint = d1 && (x0 - d0.timestamp > d1.timestamp - x0) ? d1 : d0
  
  hoveredData.value = closestPoint
  
  const xPos = currentXScale(new Date(closestPoint.timestamp))
  const yPos = currentYScale(closestPoint.price)
  
  // Show crosshair
  crosshairGroup.style('display', null)
  
  // Update vertical line
  crosshairGroup.select('.crosshair-v')
    .attr('x1', xPos)
    .attr('x2', xPos)
    .attr('y1', 0)
    .attr('y2', currentHeight)
  
  // Update horizontal line
  crosshairGroup.select('.crosshair-h')
    .attr('x1', 0)
    .attr('x2', currentWidth)
    .attr('y1', yPos)
    .attr('y2', yPos)
  
  // Update dot
  crosshairGroup.select('.crosshair-dot')
    .attr('cx', xPos)
    .attr('cy', yPos)
  
  // Update price label with collision detection
  const priceText = d3.format(',.2f')(closestPoint.price)
  const priceLabelGroup = crosshairGroup.select('.crosshair-price-label')
  const priceLabelText = priceLabelGroup.select('text').text(priceText)
  const priceLabelWidth = (priceLabelText.node() as SVGTextElement)?.getBBox().width || 60
  const labelHeight = 20
  const collisionThreshold = labelHeight + 4 // minimum vertical distance to avoid overlap
  
  // Calculate Y positions of other labels for collision detection
  let adjustedYPos = yPos
  const labelsToCheck: { y: number; active: boolean }[] = []
  
  if (averagePrice.value) {
    labelsToCheck.push({ y: currentYScale(averagePrice.value), active: true })
  }
  if (bidPrice.value) {
    labelsToCheck.push({ y: currentYScale(bidPrice.value), active: true })
  }
  
  // Check for collisions and adjust position
  for (const label of labelsToCheck) {
    if (!label.active) continue
    const distance = Math.abs(adjustedYPos - label.y)
    if (distance < collisionThreshold) {
      // Move crosshair label away from the static label
      if (adjustedYPos < label.y) {
        adjustedYPos = label.y - collisionThreshold
      } else {
        adjustedYPos = label.y + collisionThreshold
      }
    }
  }
  
  // Clamp to chart bounds
  adjustedYPos = Math.max(10, Math.min(currentHeight - 10, adjustedYPos))
  
  priceLabelGroup.attr('transform', `translate(${currentWidth + 5}, ${adjustedYPos})`)
  priceLabelGroup.select('rect')
    .attr('x', 0)
    .attr('y', -10)
    .attr('width', priceLabelWidth + 10)
    .attr('height', 20)
  priceLabelGroup.select('text')
    .attr('x', 5)
    .attr('y', 0)
  
  // Update time label
  const timeText = d3.timeFormat('%H:%M:%S')(new Date(closestPoint.timestamp))
  const timeLabelGroup = crosshairGroup.select('.crosshair-time-label')
  const timeLabelText = timeLabelGroup.select('text').text(timeText)
  const timeLabelWidth = (timeLabelText.node() as SVGTextElement)?.getBBox().width || 50
  
  timeLabelGroup.attr('transform', `translate(${xPos}, ${currentHeight + 15})`)
  timeLabelGroup.select('rect')
    .attr('x', -timeLabelWidth / 2 - 5)
    .attr('y', -10)
    .attr('width', timeLabelWidth + 10)
    .attr('height', 20)
  timeLabelGroup.select('text')
    .attr('y', 0)
}

const handleMouseLeave = () => {
  if (crosshairGroup) {
    crosshairGroup.style('display', 'none')
  }
  hoveredData.value = null
}

const updateChart = () => {
  if (!chartRef.value || !svg || !d3Module || priceHistory.value.length < 2) return
  
  const d3 = d3Module
  const container = chartRef.value
  const containerWidth = container.clientWidth || 800
  const containerHeight = 300
  const width = containerWidth - margin.left - margin.right
  const height = containerHeight - margin.top - margin.bottom
  
  // Store dimensions for hover
  currentWidth = width
  currentHeight = height
  
  // Update viewBox to match container
  svgElement?.attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
  
  // Update Y-axis position (in case width changed)
  yAxisGroup?.attr('transform', `translate(${width},0)`)
  
  // Update hover overlay size
  _hoverOverlay?.attr('width', width).attr('height', height)
  
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
  
  // Store scales for hover
  currentXScale = x
  currentYScale = y
  
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
  
  // Calculate label positions with collision detection
  const labelHeight = 18
  const labelCollisionThreshold = labelHeight + 2
  
  // Get raw Y positions for both labels
  const avgY = averagePrice.value ? y(averagePrice.value) : null
  const bidY = bidPrice.value ? y(bidPrice.value) : null
  
  // Adjusted positions (will be modified if collision detected)
  let adjustedAvgY = avgY
  let adjustedBidY = bidY
  
  // Check for collision between Avg and Bid labels
  if (avgY !== null && bidY !== null) {
    const distance = Math.abs(avgY - bidY)
    if (distance < labelCollisionThreshold) {
      // Labels are colliding - spread them apart
      const midpoint = (avgY + bidY) / 2
      const halfSpread = labelCollisionThreshold / 2
      
      if (avgY < bidY) {
        // Avg is above Bid
        adjustedAvgY = midpoint - halfSpread
        adjustedBidY = midpoint + halfSpread
      } else {
        // Bid is above Avg
        adjustedBidY = midpoint - halfSpread
        adjustedAvgY = midpoint + halfSpread
      }
      
      // Clamp to chart bounds
      adjustedAvgY = Math.max(9, Math.min(height - 9, adjustedAvgY))
      adjustedBidY = Math.max(9, Math.min(height - 9, adjustedBidY))
    }
  }
  
  // Store adjusted positions for crosshair collision detection
  currentAvgLabelY = adjustedAvgY
  currentBidLabelY = adjustedBidY
  
  // Animate average line with TradingView-style label
  if (averagePrice.value && adjustedAvgY !== null) {
    avgLine
      ?.transition()
      .duration(TRANSITION_DURATION)
      .ease(d3.easeCubicOut)
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', avgY!) // Line stays at actual price position
      .attr('y2', avgY!)
      .style('opacity', 1)
    
    // Update avg label - TradingView style: "Avg" on left of axis, price on right
    const priceText = d3.format(',.2f')(averagePrice.value)
    avgLabel?.select('.avg-price-text').text(priceText)
    
    // Calculate widths
    const nameWidth = 28 // "Avg" is small fixed width
    const priceTextWidth = (avgLabel?.select('.avg-price-text').node() as SVGTextElement)?.getBBox().width || 60
    
    avgLabel
      ?.transition()
      .duration(TRANSITION_DURATION)
      .ease(d3.easeCubicOut)
      .attr('transform', `translate(${width - nameWidth - 2}, ${adjustedAvgY})`) // Label uses adjusted position
      .style('opacity', 1)
    
    // "Avg" name label (left of axis)
    avgLabel?.select('.avg-name-bg')
      .attr('x', 3)
      .attr('y', -9)
      .attr('width', nameWidth)
      .attr('height', 18)
    
    avgLabel?.select('.avg-name-text')
      .attr('x', 8)
      .attr('y', 0)
    
    // Price label (right of axis, aligned with axis numbers)
    avgLabel?.select('.avg-price-bg')
      .attr('x', nameWidth + 6)
      .attr('y', -9)
      .attr('width', priceTextWidth + 10)
      .attr('height', 18)
    
    avgLabel?.select('.avg-price-text')
      .attr('x', nameWidth + 11)
      .attr('y', 0)
  } else {
    avgLine?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
    avgLabel?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
  }
  
  // Animate bid line with TradingView-style label
  if (bidPrice.value && adjustedBidY !== null) {
    bidLine
      ?.transition()
      .duration(TRANSITION_DURATION)
      .ease(d3.easeCubicOut)
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', bidY!) // Line stays at actual price position
      .attr('y2', bidY!)
      .style('opacity', 1)
    
    // Update bid label - TradingView style: "Bid" on left of axis, price on right
    const priceText = d3.format(',.2f')(bidPrice.value)
    bidLabel?.select('.bid-price-text').text(priceText)
    
    // Calculate widths
    const nameWidth = 26 // "Bid" is small fixed width
    const priceTextWidth = (bidLabel?.select('.bid-price-text').node() as SVGTextElement)?.getBBox().width || 60
    
    bidLabel
      ?.transition()
      .duration(TRANSITION_DURATION)
      .ease(d3.easeCubicOut)
      .attr('transform', `translate(${width - nameWidth - 2}, ${adjustedBidY})`) // Label uses adjusted position
      .style('opacity', 1)
    
    // "Bid" name label (left of axis)
    bidLabel?.select('.bid-name-bg')
      .attr('x', 0)
      .attr('y', -9)
      .attr('width', nameWidth)
      .attr('height', 18)
    
    bidLabel?.select('.bid-name-text')
      .attr('x', 5)
      .attr('y', 0)
    
    // Price label (right of axis, aligned with axis numbers)
    bidLabel?.select('.bid-price-bg')
      .attr('x', nameWidth + 6)
      .attr('y', -9)
      .attr('width', priceTextWidth + 10)
      .attr('height', 18)
    
    bidLabel?.select('.bid-price-text')
      .attr('x', nameWidth + 11)
      .attr('y', 0)
  } else {
    bidLine?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
    bidLabel?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
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
  if (!isChartReady.value) return
  updateChart()
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
    <div class="chart-header">
      <h2>Live BTC Price Chart</h2>
      <div class="chart-info">
        <span class="data-points">{{ priceHistory.length }} points</span>
        <span v-if="hoveredData" class="hovered-info">
          <span class="hovered-price">${{ hoveredData.price.toFixed(2) }}</span>
          <span class="hovered-time">{{ new Date(hoveredData.timestamp).toLocaleTimeString() }}</span>
        </span>
      </div>
    </div>
    <div ref="chartRef" class="chart-container" />
  </div>
</template>

<style scoped>
.btc-chart {
  margin: 20px 0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.chart-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.chart-info {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
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
  width: 100%;
  min-height: 300px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
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

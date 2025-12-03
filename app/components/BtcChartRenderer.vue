<script setup lang="ts">
import type { PricePoint } from '~/types/btc'

const props = defineProps<{
  data: PricePoint[]
  averagePrice: number | null
  bidPrice: number | null
  selectedRange: number
}>()

const emit = defineEmits<{
  hover: [data: PricePoint | null]
}>()

const {
  updateScales,
  updateGridLines,
  getLabelPositions,
  updateAverageLine,
  updateBidLine,
  createLineGenerator,
  animatePriceLine,
  updateAxes,
  updateMinMaxLabels,
} = useBtcChartUpdateHelper()

const {
  findClosestPoint,
  updateCrosshairPosition,
  getAdjustedPriceLabelY,
  updatePriceLabel,
  updateTimeLabel,
  hideCrosshair,
} = useBtcChartMouseHelper()

const {
  createSvgElement,
  createAxisGroups,
  createPriceLine,
  createAverageLineElements,
  createBidLineElements,
  createMinMaxLabelElements,
  createCrosshairGroup,
  createHoverOverlay,
} = useBtcChartInitHelper()

const chartRef = ref<HTMLDivElement | null>(null)
const isChartReady = ref(false)

// Store D3 selections for updates (avoid recreating)
let svg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let gridGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let priceLine: d3.Selection<SVGPathElement, unknown, null, undefined> | null = null
let avgLine: d3.Selection<SVGLineElement, unknown, null, undefined> | null = null
let avgLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let bidLine: d3.Selection<SVGLineElement, unknown, null, undefined> | null = null
let bidLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let maxLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let minLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let xAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let yAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let crosshairGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let hoverOverlay: d3.Selection<SVGRectElement, unknown, null, undefined> | null = null
let svgElement: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null
let d3Module: typeof import('d3') | null = null

// Store scales for hover calculations
let currentXScale: d3.ScaleTime<number, number> | null = null
let currentYScale: d3.ScaleLinear<number, number> | null = null
let currentWidth = 0
let currentHeight = 0

const margin = { top: 20, right: 80, bottom: 30, left: 10 }

watch(() => props.data, () => {
  if (!isChartReady.value) return
  updateChart()
}, { deep: true })

watch(() => props.selectedRange, () => {
  if (!isChartReady.value) return
  updateChart()
})

watch([() => props.bidPrice, () => props.averagePrice], () => {
  if (!isChartReady.value) return
  updateChart()
})

const initChart = async () => {
  if (!chartRef.value) return

  d3Module = await import('d3')
  const d3 = d3Module

  const container = chartRef.value
  const containerWidth = container.clientWidth || 800
  const containerHeight = 300
  const width = containerWidth - margin.left - margin.right
  const height = containerHeight - margin.top - margin.bottom

  currentWidth = width
  currentHeight = height

  // Create SVG structure
  const svgResult = createSvgElement(d3, container, containerWidth, containerHeight, margin)
  svgElement = svgResult.svgElement
  svg = svgResult.svg

  // Create axis groups
  const axisResult = createAxisGroups(svg, height)
  gridGroup = axisResult.gridGroup
  xAxisGroup = axisResult.xAxisGroup
  yAxisGroup = axisResult.yAxisGroup

  // Create chart elements
  priceLine = createPriceLine(svg)

  const avgResult = createAverageLineElements(svg)
  avgLine = avgResult.avgLine
  avgLabel = avgResult.avgLabel

  const bidResult = createBidLineElements(svg)
  bidLine = bidResult.bidLine
  bidLabel = bidResult.bidLabel

  // Create min/max labels
  const minMaxResult = createMinMaxLabelElements(svg)
  maxLabel = minMaxResult.maxLabel
  minLabel = minMaxResult.minLabel

  // Create crosshair
  crosshairGroup = createCrosshairGroup(svg)

  // Create hover overlay
  hoverOverlay = createHoverOverlay(svg, width, height, handleMouseMove, handleMouseLeave)

  isChartReady.value = true
  updateChart()
}

const handleMouseMove = (event: MouseEvent) => {
  if (!d3Module || !currentXScale || !currentYScale || !crosshairGroup || props.data.length < 2) return

  const d3 = d3Module
  const [mouseX] = d3.pointer(event)

  const closestPoint = findClosestPoint(d3, props.data, currentXScale, mouseX)
  if (!closestPoint) return

  emit('hover', closestPoint)

  const xPos = currentXScale(new Date(closestPoint.timestamp))
  const yPos = currentYScale(closestPoint.price)

  updateCrosshairPosition(crosshairGroup, xPos, yPos, currentWidth, currentHeight)

  const adjustedYPos = getAdjustedPriceLabelY(
    yPos,
    currentYScale,
    props.averagePrice,
    props.bidPrice,
    currentHeight,
  )

  updatePriceLabel(d3, crosshairGroup, closestPoint.price, adjustedYPos, currentWidth)
  updateTimeLabel(d3, crosshairGroup, closestPoint.timestamp, xPos, currentHeight)
}

const handleMouseLeave = () => {
  hideCrosshair(crosshairGroup)
  emit('hover', null)
}

const updateChart = () => {
  if (!chartRef.value || !svg || !d3Module || props.data.length < 2) return

  const d3 = d3Module
  const container = chartRef.value
  const containerWidth = container.clientWidth || 800
  const containerHeight = 300
  const width = containerWidth - margin.left - margin.right
  const height = containerHeight - margin.top - margin.bottom

  currentWidth = width
  currentHeight = height

  svgElement?.attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
  yAxisGroup?.attr('transform', `translate(${width},0)`)
  hoverOverlay?.attr('width', width).attr('height', height)

  const { x, y, yTickValues, xTicks } = updateScales(d3, props.data, props.selectedRange, width, height)
  currentXScale = x
  currentYScale = y

  updateGridLines(gridGroup, x, y, yTickValues, xTicks!, width, height)

  const line = createLineGenerator(d3, x, y)
  animatePriceLine(d3, priceLine, line, props.data)

  const { avgY, bidY, adjustedAvgY, adjustedBidY } = getLabelPositions(y, props.averagePrice, props.bidPrice, height)
  updateAverageLine(d3, avgLine, avgLabel, props.averagePrice, width, avgY, adjustedAvgY)
  updateBidLine(d3, bidLine, bidLabel, props.bidPrice, width, bidY, adjustedBidY)

  updateMinMaxLabels(d3, maxLabel, minLabel, props.data, x, y, width, height)

  updateAxes(d3, xAxisGroup, yAxisGroup, x, y, xTicks!, yTickValues)
}

const handleResize = () => {
  if (!isChartReady.value) return
  updateChart()
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
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
  <div ref="chartRef" class="chart-renderer" />
</template>

<style scoped>
.chart-renderer {
  width: 100%;
  min-height: 300px;
}

.chart-renderer :deep(.x-axis),
.chart-renderer :deep(.y-axis) {
  font-size: 11px;
  color: #666;
}

.chart-renderer :deep(.x-axis path),
.chart-renderer :deep(.y-axis path) {
  stroke: #e0e0e0;
}

.chart-renderer :deep(.x-axis .tick line),
.chart-renderer :deep(.y-axis .tick line) {
  stroke: #e0e0e0;
}
</style>

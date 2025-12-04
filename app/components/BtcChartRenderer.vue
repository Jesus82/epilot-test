<script setup lang="ts">
import type { PricePoint } from '~/types/btc'
import type { GuessDirection } from '~/composables/useGameLogic'

const props = defineProps<{
  data: PricePoint[]
  averagePrice: number | null
  bidPrice: number | null
  bidTimestamp: number | null
  guessDirection: GuessDirection
  currentPrice: number | null
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
  updateBidArea,
  createLineGenerator,
  createAreaGenerator,
  animatePriceLine,
  animatePriceArea,
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
  createPriceAreaGradient,
  createPriceArea,
  createBidAreaElements,
  createBidPriceLine,
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
let priceArea: d3.Selection<SVGPathElement, unknown, null, undefined> | null = null
let bidArea: d3.Selection<SVGPathElement, unknown, null, undefined> | null = null
let bidPriceLine: d3.Selection<SVGPathElement, unknown, null, undefined> | null = null
let avgLine: d3.Selection<SVGLineElement, unknown, null, undefined> | null = null
let avgLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let bidLine: d3.Selection<SVGLineElement, unknown, null, undefined> | null = null
let bidLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let bidDot: d3.Selection<SVGCircleElement, unknown, null, undefined> | null = null
let maxLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let minLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null = null
let maxDot: d3.Selection<SVGCircleElement, unknown, null, undefined> | null = null
let minDot: d3.Selection<SVGCircleElement, unknown, null, undefined> | null = null
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

watch([() => props.bidTimestamp, () => props.guessDirection, () => props.currentPrice], () => {
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

  const svgResult = createSvgElement(d3, container, containerWidth, containerHeight, margin)
  svgElement = svgResult.svgElement
  svg = svgResult.svg


  createPriceAreaGradient(svgElement)

  const axisResult = createAxisGroups(svg, height)
  gridGroup = axisResult.gridGroup
  xAxisGroup = axisResult.xAxisGroup
  yAxisGroup = axisResult.yAxisGroup

  priceArea = createPriceArea(svg)
  
  const bidAreaResult = createBidAreaElements(svg)
  bidArea = bidAreaResult.bidArea
  
  priceLine = createPriceLine(svg)
  
  // Create bid price line (green/red) ON TOP of the blue line
  bidPriceLine = createBidPriceLine(svg)

  const avgResult = createAverageLineElements(svg)
  avgLine = avgResult.avgLine
  avgLabel = avgResult.avgLabel

  const bidResult = createBidLineElements(svg)
  bidLine = bidResult.bidLine
  bidLabel = bidResult.bidLabel
  bidDot = bidResult.bidDot

  const minMaxResult = createMinMaxLabelElements(svg)
  maxLabel = minMaxResult.maxLabel
  minLabel = minMaxResult.minLabel
  maxDot = minMaxResult.maxDot
  minDot = minMaxResult.minDot

  crosshairGroup = createCrosshairGroup(svg)

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
  const area = createAreaGenerator(d3, x, y, height)
  animatePriceArea(d3, priceArea, area, props.data)
  animatePriceLine(d3, priceLine, line, props.data)

  const { avgY, adjustedAvgY } = getLabelPositions(y, props.averagePrice, height)
  updateAverageLine(d3, avgLine, avgLabel, props.averagePrice, width, avgY, adjustedAvgY)
  updateBidLine(d3, bidLine, bidLabel, bidDot, props.bidPrice, props.bidTimestamp, props.currentPrice, props.guessDirection, x, y, width, height)

  updateBidArea(d3, bidArea, bidPriceLine, props.data, props.bidTimestamp, props.bidPrice, props.guessDirection, x, y, height)

  updateMinMaxLabels(d3, maxLabel, minLabel, maxDot, minDot, props.data, x, y, width, height)

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
  <div ref="chartRef" class="btc-chart-renderer" />
</template>

<style scoped>
.btc-chart-renderer {
  width: 100%;
  min-height: 300px;
}

.btc-chart-renderer :deep(.x-axis path),
.btc-chart-renderer :deep(.y-axis path) {
  stroke: var(--color-gray-lightest);
}

.btc-chart-renderer :deep(.x-axis .tick line),
.btc-chart-renderer :deep(.y-axis .tick line) {
  stroke: var(--color-gray-lightest);
}

:deep(.btc-chart-renderer__grid-line) {
  stroke: var(--color-gray-lightest);
  stroke-width: 1;
}

.btc-chart-renderer :deep(text) {
  font-size: var(--text-xs);
  fill: var(--color-gray-dark);
  dominant-baseline: central;
}

:deep(.btc-chart-renderer__label text) {
  fill: var(--color-white);
}

:deep(.btc-chart-renderer__label) {
  --label-height: calc(var(--config-spacing-half) * 1.5);
  --label-padding-y: calc(var(--label-height) / 2);
}

:deep(.btc-chart-renderer__label rect) {
  height: var(--label-height);
  y: calc(-1 * var(--label-padding-y));
  rx: 2px;
  ry: 2px;
}

:deep(.btc-chart-renderer__label[data-label-variant="average"] rect) {
  fill: var(--color-blue);
}

:deep(.btc-chart-renderer__label[data-label-variant="bid"] rect) {
  fill: var(--color-blue);
}

:deep(.btc-chart-renderer__label[data-label-variant="bid-win"] rect) {
  fill: var(--color-green);
}

:deep(.btc-chart-renderer__label[data-label-variant="bid-lose"] rect) {
  fill: var(--color-red);
}

:deep(.btc-chart-renderer__label[data-label-variant="max"] rect) {
  fill: var(--color-gray-darkest);
}

:deep(.btc-chart-renderer__label[data-label-variant="min"] rect) {
  fill: var(--color-gray-dark);
}

:deep(.btc-chart-renderer__label[data-label-variant="crosshair-time"] text) {
  text-anchor: middle;
}

:deep(.btc-chart-renderer__price-line) {
  fill: none;
  stroke: var(--color-blue);
  stroke-width: 2;
}

:deep(.btc-chart-renderer__price-area) {
  fill: url(#price-area-gradient);
}

:deep(.btc-chart-renderer__gradient-stop--top) {
  stop-color: var(--color-blue);
  stop-opacity: 0.4;
}

:deep(.btc-chart-renderer__gradient-stop--bottom) {
  stop-color: var(--color-blue);
  stop-opacity: 0;
}

:deep(.btc-chart-renderer__gradient-stop--win-top) {
  stop-color: var(--color-green);
  stop-opacity: 0.6;
}

:deep(.btc-chart-renderer__gradient-stop--win-bottom) {
  stop-color: var(--color-green);
  stop-opacity: 0;
}

:deep(.btc-chart-renderer__gradient-stop--lose-top) {
  stop-color: var(--color-red);
  stop-opacity: 0.6;
}

:deep(.btc-chart-renderer__gradient-stop--lose-bottom) {
  stop-color: var(--color-red);
  stop-opacity: 0;
}

:deep(.btc-chart-renderer__bid-area) {
  opacity: 0;
}

:deep(.btc-chart-renderer__bid-price-line) {
  fill: none;
  stroke-width: 2;
  opacity: 0;
}

:deep(.btc-chart-renderer__bid-price-line--win) {
  stroke: var(--color-green);
}

:deep(.btc-chart-renderer__bid-price-line--lose) {
  stroke: var(--color-red);
}

:deep(.btc-chart-renderer__line) {
  stroke-width: 2;
}

:deep(.btc-chart-renderer__line--dashed) {
  stroke-dasharray: 2 4;
}

:deep(.btc-chart-renderer__line[data-line-variant="average"]),
:deep(.btc-chart-renderer__line[data-line-variant="bid"]) {
  stroke: var(--color-blue);
}

:deep(.btc-chart-renderer__line[data-line-variant="bid-win"]) {
  stroke: var(--color-green);
}

:deep(.btc-chart-renderer__line[data-line-variant="bid-lose"]) {
  stroke: var(--color-red);
}

:deep(.btc-chart-renderer__crosshair-line) {
  stroke: var(--color-gray-dark);
  stroke-width: 1;
  stroke-dasharray: 1 2;
}

:deep(.btc-chart-renderer__hover-overlay) {
  fill: transparent;
  cursor: crosshair;
}

/* Shared dot styles */
:deep(.btc-chart-renderer__min-max-dot),
:deep(.btc-chart-renderer__bid-dot),
:deep(.btc-chart-renderer__crosshair-dot) {
  r: 4px;
  stroke: var(--color-white);
  stroke-width: 2;
}

:deep(.btc-chart-renderer__crosshair-dot),
:deep(.btc-chart-renderer__bid-dot[data-dot-variant="bid"]) {
  fill: var(--color-blue);
}

:deep(.btc-chart-renderer__bid-dot[data-dot-variant="bid-win"]) {
  fill: var(--color-green);
}

:deep(.btc-chart-renderer__bid-dot[data-dot-variant="bid-lose"]) {
  fill: var(--color-red);
}

:deep(.btc-chart-renderer__min-max-dot[data-dot-variant="min"]) {
  fill: var(--color-gray-dark);
}

:deep(.btc-chart-renderer__min-max-dot[data-dot-variant="max"]) {
  fill: var(--color-gray-darkest);
}
</style>

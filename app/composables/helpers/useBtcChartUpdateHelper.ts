import { interpolatePath } from 'd3-interpolate-path'
import type { PricePoint } from '~/types/btc'
import {
  calculateNiceStep,
  calculateLabelCollision,
  findMinMaxPoints,
  calculateMinMaxLabelPosition,
} from '~/helpers/btcChartHelpers'

export type { PricePoint }

export interface ChartElements {
  gridGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null
  priceLine: d3.Selection<SVGPathElement, unknown, null, undefined> | null
  avgLine: d3.Selection<SVGLineElement, unknown, null, undefined> | null
  avgLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null
  bidLine: d3.Selection<SVGLineElement, unknown, null, undefined> | null
  bidLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null
  xAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null
  yAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null
}

// Padding for width calculation (must match CSS --label-padding-x)
const LABEL_PADDING_X = 5

export const useBtcChartUpdateHelper = () => {
  const TRANSITION_DURATION = 300

  // Helper to set label background width (height/y/text position handled by CSS)
  const setLabelWidth = (
    label: d3.Selection<SVGGElement, unknown, null, undefined> | null,
    bgSelector: string,
    textWidth: number,
    centered = false,
  ) => {
    const width = textWidth + LABEL_PADDING_X * 2
    const bgX = centered ? -width / 2 : 0

    label?.select(bgSelector).attr('x', bgX).attr('width', width)
  }

  const getTimeInterval = (d3: typeof import('d3'), rangeMinutes: number) => {
    if (rangeMinutes <= 10) return d3.timeMinute.every(1)
    if (rangeMinutes <= 60) return d3.timeMinute.every(5)
    if (rangeMinutes <= 360) return d3.timeMinute.every(30)
    return d3.timeHour.every(2)
  }

  const updateScales = (
    d3: typeof import('d3'),
    data: PricePoint[],
    selectedRange: number,
    width: number,
    height: number,
  ) => {
    const x = d3.scaleTime()
      .domain(d3.extent(data, (d: PricePoint) => new Date(d.timestamp)) as [Date, Date])
      .range([0, width])

    const minPrice = d3.min(data, (d: PricePoint) => d.price)!
    const maxPrice = d3.max(data, (d: PricePoint) => d.price)!
    const finalStep = calculateNiceStep(maxPrice - minPrice, 10)

    const yMin = Math.floor(minPrice / finalStep) * finalStep - finalStep
    const yMax = Math.ceil(maxPrice / finalStep) * finalStep + finalStep

    const y = d3.scaleLinear()
      .domain([yMin, yMax])
      .range([height, 0])

    const yTickValues: number[] = []
    for (let tick = yMin; tick <= yMax; tick += finalStep) {
      yTickValues.push(tick)
    }

    const xTicks = getTimeInterval(d3, selectedRange)

    return { x, y, yTickValues, xTicks }
  }

  const updateGridLines = (
    gridGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null,
    x: d3.ScaleTime<number, number>,
    y: d3.ScaleLinear<number, number>,
    yTickValues: number[],
    xTicks: d3.TimeInterval,
    width: number,
    height: number,
  ) => {
    if (!gridGroup) return

    gridGroup.selectAll('*').remove()

    yTickValues.forEach((tickValue) => {
      gridGroup.append('line')
        .attr('class', 'grid-line-h')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', y(tickValue))
        .attr('y2', y(tickValue))
        .attr('stroke', '#e0e0e0')
        .attr('stroke-width', 1)
    })

    const timeExtent = x.domain() as [Date, Date]
    const timeTicks = xTicks.range(timeExtent[0], timeExtent[1])
    timeTicks.forEach((tickTime) => {
      gridGroup.append('line')
        .attr('class', 'grid-line-v')
        .attr('x1', x(tickTime))
        .attr('x2', x(tickTime))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#e0e0e0')
        .attr('stroke-width', 1)
    })
  }

  const getLabelPositions = (
    y: d3.ScaleLinear<number, number>,
    averagePrice: number | null,
    bidPrice: number | null,
    height: number,
  ) => {
    const avgY = averagePrice ? y(averagePrice) : null
    const bidY = bidPrice ? y(bidPrice) : null

    const { adjustedAvgY, adjustedBidY } = calculateLabelCollision(avgY, bidY, height)

    return { avgY, bidY, adjustedAvgY, adjustedBidY }
  }

  const updateAverageLine = (
    d3: typeof import('d3'),
    avgLine: d3.Selection<SVGLineElement, unknown, null, undefined> | null,
    avgLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null,
    averagePrice: number | null,
    width: number,
    avgY: number | null,
    adjustedAvgY: number | null,
  ) => {
    if (averagePrice && adjustedAvgY !== null) {
      avgLine
        ?.transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicOut)
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', avgY!)
        .attr('y2', avgY!)
        .style('opacity', 1)

      const priceText = `Avg: ${d3.format(',.2f')(averagePrice)}`
      avgLabel?.select('[data-js="avg-text"]').text(priceText)

      const textWidth = (avgLabel?.select('[data-js="avg-text"]').node() as SVGTextElement)?.getBBox().width || 80

      avgLabel
        ?.transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicOut)
        .attr('transform', `translate(${width - 25}, ${adjustedAvgY})`)
        .style('opacity', 1)

      setLabelWidth(avgLabel, '[data-js="avg-bg"]', textWidth)
    }
    else {
      avgLine?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
      avgLabel?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
    }
  }

  const updateBidLine = (
    d3: typeof import('d3'),
    bidLine: d3.Selection<SVGLineElement, unknown, null, undefined> | null,
    bidLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null,
    bidPrice: number | null,
    width: number,
    bidY: number | null,
    adjustedBidY: number | null,
  ) => {
    if (bidPrice && adjustedBidY !== null) {
      bidLine
        ?.transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicOut)
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', bidY!)
        .attr('y2', bidY!)
        .style('opacity', 1)

      const priceText = `Bid: ${d3.format(',.2f')(bidPrice)}`
      bidLabel?.select('[data-js="bid-text"]').text(priceText)

      const textWidth = (bidLabel?.select('[data-js="bid-text"]').node() as SVGTextElement)?.getBBox().width || 80

      bidLabel
        ?.transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicOut)
        .attr('transform', `translate(${width - 25}, ${adjustedBidY})`)
        .style('opacity', 1)

      setLabelWidth(bidLabel, '[data-js="bid-bg"]', textWidth)
    }
    else {
      bidLine?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
      bidLabel?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
    }
  }

  const createLineGenerator = (
    d3: typeof import('d3'),
    x: d3.ScaleTime<number, number>,
    y: d3.ScaleLinear<number, number>,
  ) => {
    return d3.line<PricePoint>()
      .x((d) => x(new Date(d.timestamp)))
      .y((d) => y(d.price))
      .curve(d3.curveMonotoneX)
  }

  const createAreaGenerator = (
    d3: typeof import('d3'),
    x: d3.ScaleTime<number, number>,
    y: d3.ScaleLinear<number, number>,
    height: number,
  ) => {
    return d3.area<PricePoint>()
      .x((d) => x(new Date(d.timestamp)))
      .y0(height)
      .y1((d) => y(d.price))
      .curve(d3.curveMonotoneX)
  }

  const animatePriceLine = (
    d3: typeof import('d3'),
    priceLine: d3.Selection<SVGPathElement, unknown, null, undefined> | null,
    line: d3.Line<PricePoint>,
    data: PricePoint[],
  ) => {
    const newPath = line(data) || ''
    const currentPath = priceLine?.attr('d') || ''

    if (currentPath && currentPath !== newPath) {
      priceLine
        ?.transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicOut)
        .attrTween('d', () => interpolatePath(currentPath, newPath))
    }
    else {
      priceLine?.attr('d', newPath)
    }
  }

  const animatePriceArea = (
    d3: typeof import('d3'),
    priceArea: d3.Selection<SVGPathElement, unknown, null, undefined> | null,
    area: d3.Area<PricePoint>,
    data: PricePoint[],
  ) => {
    const newPath = area(data) || ''
    const currentPath = priceArea?.attr('d') || ''

    if (currentPath && currentPath !== newPath) {
      priceArea
        ?.transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicOut)
        .attrTween('d', () => interpolatePath(currentPath, newPath))
    }
    else {
      priceArea?.attr('d', newPath)
    }
  }

  const updateAxes = (
    d3: typeof import('d3'),
    xAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null,
    yAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null,
    x: d3.ScaleTime<number, number>,
    y: d3.ScaleLinear<number, number>,
    xTicks: d3.TimeInterval,
    yTickValues: number[],
  ) => {
    xAxisGroup?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).call(
      d3.axisBottom(x)
        .ticks(xTicks)
        .tickFormat((d) => d3.timeFormat('%H:%M')(d as Date)),
    )

    yAxisGroup?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).call(
      d3.axisRight(y)
        .tickValues(yTickValues)
        .tickFormat((d: d3.NumberValue) => d3.format(',.0f')(d as number)),
    )
  }

  const updateMinMaxLabels = (
    d3: typeof import('d3'),
    maxLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null,
    minLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null,
    data: PricePoint[],
    x: d3.ScaleTime<number, number>,
    y: d3.ScaleLinear<number, number>,
    width: number,
    height: number,
  ) => {
    const { minPoint, maxPoint } = findMinMaxPoints(data)

    if (maxPoint && maxLabel) {
      const maxX = x(new Date(maxPoint.timestamp))
      const maxY = y(maxPoint.price)

      const priceText = `Max: ${d3.format(',.2f')(maxPoint.price)}`
      maxLabel.select('[data-js="max-text"]').text(priceText)

      const textWidth = (maxLabel.select('[data-js="max-text"]').node() as SVGTextElement)?.getBBox().width || 80
      const totalWidth = textWidth + 10

      // Use pure function to calculate position
      const { labelX, labelY } = calculateMinMaxLabelPosition(
        maxX,
        maxY,
        totalWidth,
        width,
        height,
        'max',
      )

      maxLabel
        .transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicOut)
        .attr('transform', `translate(${labelX}, ${labelY})`)
        .style('opacity', 1)

      setLabelWidth(maxLabel, '[data-js="max-bg"]', textWidth)
    }
    else {
      maxLabel?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
    }

    if (minPoint && minLabel) {
      const minX = x(new Date(minPoint.timestamp))
      const minY = y(minPoint.price)

      const priceText = `Min: ${d3.format(',.2f')(minPoint.price)}`
      minLabel.select('[data-js="min-text"]').text(priceText)

      const textWidth = (minLabel.select('[data-js="min-text"]').node() as SVGTextElement)?.getBBox().width || 80
      const totalWidth = textWidth + 10

      const { labelX, labelY } = calculateMinMaxLabelPosition(
        minX,
        minY,
        totalWidth,
        width,
        height,
        'min',
      )

      minLabel
        .transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicOut)
        .attr('transform', `translate(${labelX}, ${labelY})`)
        .style('opacity', 1)

      setLabelWidth(minLabel, '[data-js="min-bg"]', textWidth)
    }
    else {
      minLabel?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
    }
  }

  const updateBidMarkerLine = (
    d3: typeof import('d3'),
    bidMarkerLine: d3.Selection<SVGLineElement, unknown, null, undefined> | null,
    bidTimestamp: number | null,
    x: d3.ScaleTime<number, number>,
    height: number,
  ) => {
    if (bidTimestamp && bidMarkerLine) {
      const bidX = x(new Date(bidTimestamp))

      bidMarkerLine
        .transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicOut)
        .attr('x1', bidX)
        .attr('x2', bidX)
        .attr('y1', 0)
        .attr('y2', height)
        .style('opacity', 1)
    }
    else {
      bidMarkerLine?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
    }
  }

  const updateBidArea = (
    d3: typeof import('d3'),
    bidArea: d3.Selection<SVGPathElement, unknown, null, undefined> | null,
    bidPriceLine: d3.Selection<SVGPathElement, unknown, null, undefined> | null,
    data: PricePoint[],
    bidTimestamp: number | null,
    bidPrice: number | null,
    guessDirection: 'up' | 'down' | null,
    x: d3.ScaleTime<number, number>,
    y: d3.ScaleLinear<number, number>,
    height: number,
  ) => {
    if (!bidTimestamp || !bidPrice || !guessDirection || !bidArea) {
      bidArea?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
      bidPriceLine?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
      return
    }

    // Filter data points after bid timestamp
    const bidData = data.filter((d) => d.timestamp >= bidTimestamp)

    if (bidData.length === 0) {
      bidArea?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
      bidPriceLine?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
      return
    }

    // Determine if winning based on current price vs bid price and guess direction
    const lastPoint = bidData[bidData.length - 1]
    if (!lastPoint) {
      bidArea?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
      bidPriceLine?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
      return
    }
    
    const currentPrice = lastPoint.price
    const isWinning = guessDirection === 'up'
      ? currentPrice > bidPrice
      : currentPrice < bidPrice

    // Create area generator for bid data
    const areaGenerator = d3.area<PricePoint>()
      .x((d) => x(new Date(d.timestamp)))
      .y0(height)
      .y1((d) => y(d.price))
      .curve(d3.curveMonotoneX)

    const newPath = areaGenerator(bidData) || ''
    const currentPath = bidArea?.attr('d') || ''

    // Update gradient based on winning/losing state
    const gradientUrl = isWinning
      ? 'url(#bid-area-gradient-win)'
      : 'url(#bid-area-gradient-lose)'

    bidArea?.attr('fill', gradientUrl)

    if (currentPath && currentPath !== newPath) {
      bidArea
        ?.transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicOut)
        .attrTween('d', () => interpolatePath(currentPath, newPath))
        .style('opacity', 1)
    }
    else {
      bidArea?.attr('d', newPath).style('opacity', 1)
    }

    // Update bid price line with matching color
    if (bidPriceLine) {
      const lineGenerator = d3.line<PricePoint>()
        .x((d) => x(new Date(d.timestamp)))
        .y((d) => y(d.price))
        .curve(d3.curveMonotoneX)

      const newLinePath = lineGenerator(bidData) || ''
      const currentLinePath = bidPriceLine.attr('d') || ''

      // Update line class based on winning/losing state
      const lineClass = isWinning
        ? 'btc-chart-renderer__bid-price-line btc-chart-renderer__bid-price-line--win'
        : 'btc-chart-renderer__bid-price-line btc-chart-renderer__bid-price-line--lose'

      bidPriceLine.attr('class', lineClass)

      if (currentLinePath && currentLinePath !== newLinePath) {
        bidPriceLine
          .transition()
          .duration(TRANSITION_DURATION)
          .ease(d3.easeCubicOut)
          .attrTween('d', () => interpolatePath(currentLinePath, newLinePath))
          .style('opacity', 1)
      }
      else {
        bidPriceLine.attr('d', newLinePath).style('opacity', 1)
      }
    }
  }

  return {
    TRANSITION_DURATION,
    updateScales,
    updateGridLines,
    getLabelPositions,
    updateAverageLine,
    updateBidLine,
    updateBidMarkerLine,
    updateBidArea,
    createLineGenerator,
    createAreaGenerator,
    animatePriceLine,
    animatePriceArea,
    updateAxes,
    updateMinMaxLabels,
  }
}

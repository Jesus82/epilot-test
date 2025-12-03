import { interpolatePath } from 'd3-interpolate-path'
import type { PricePoint } from '~/types/btc'

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

export const useBtcChartUpdateHelper = () => {
  const TRANSITION_DURATION = 300

  // Get D3 time interval for axis ticks and grid lines based on time range
  const getTimeInterval = (d3: typeof import('d3'), rangeMinutes: number) => {
    if (rangeMinutes <= 10) return d3.timeMinute.every(1)
    if (rangeMinutes <= 60) return d3.timeMinute.every(5)
    if (rangeMinutes <= 360) return d3.timeMinute.every(30)
    return d3.timeHour.every(2)
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

  // Update scales based on current data
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

  // Update grid lines
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

  // Calculate label positions with collision detection
  const calculateLabelCollision = (
    y: d3.ScaleLinear<number, number>,
    averagePrice: number | null,
    bidPrice: number | null,
    height: number,
  ) => {
    const labelHeight = 18
    const labelCollisionThreshold = labelHeight + 2

    const avgY = averagePrice ? y(averagePrice) : null
    const bidY = bidPrice ? y(bidPrice) : null

    let adjustedAvgY = avgY
    let adjustedBidY = bidY

    if (avgY !== null && bidY !== null) {
      const distance = Math.abs(avgY - bidY)
      if (distance < labelCollisionThreshold) {
        const midpoint = (avgY + bidY) / 2
        const halfSpread = labelCollisionThreshold / 2

        if (avgY < bidY) {
          adjustedAvgY = midpoint - halfSpread
          adjustedBidY = midpoint + halfSpread
        }
        else {
          adjustedBidY = midpoint - halfSpread
          adjustedAvgY = midpoint + halfSpread
        }

        adjustedAvgY = Math.max(9, Math.min(height - 9, adjustedAvgY))
        adjustedBidY = Math.max(9, Math.min(height - 9, adjustedBidY))
      }
    }

    return { avgY, bidY, adjustedAvgY, adjustedBidY }
  }

  // Update average line and label
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

      const priceText = d3.format(',.2f')(averagePrice)
      avgLabel?.select('.avg-price-text').text(priceText)

      const nameWidth = 28
      const priceTextWidth = (avgLabel?.select('.avg-price-text').node() as SVGTextElement)?.getBBox().width || 60

      avgLabel
        ?.transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicOut)
        .attr('transform', `translate(${width - nameWidth - 2}, ${adjustedAvgY})`)
        .style('opacity', 1)

      avgLabel?.select('.avg-name-bg')
        .attr('x', 3)
        .attr('y', -9)
        .attr('width', nameWidth)
        .attr('height', 18)

      avgLabel?.select('.avg-name-text')
        .attr('x', 8)
        .attr('y', 0)

      avgLabel?.select('.avg-price-bg')
        .attr('x', nameWidth + 6)
        .attr('y', -9)
        .attr('width', priceTextWidth + 10)
        .attr('height', 18)

      avgLabel?.select('.avg-price-text')
        .attr('x', nameWidth + 11)
        .attr('y', 0)
    }
    else {
      avgLine?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
      avgLabel?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
    }
  }

  // Update bid line and label
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

      const priceText = d3.format(',.2f')(bidPrice)
      bidLabel?.select('.bid-price-text').text(priceText)

      const nameWidth = 26
      const priceTextWidth = (bidLabel?.select('.bid-price-text').node() as SVGTextElement)?.getBBox().width || 60

      bidLabel
        ?.transition()
        .duration(TRANSITION_DURATION)
        .ease(d3.easeCubicOut)
        .attr('transform', `translate(${width - nameWidth - 2}, ${adjustedBidY})`)
        .style('opacity', 1)

      bidLabel?.select('.bid-name-bg')
        .attr('x', 0)
        .attr('y', -9)
        .attr('width', nameWidth)
        .attr('height', 18)

      bidLabel?.select('.bid-name-text')
        .attr('x', 5)
        .attr('y', 0)

      bidLabel?.select('.bid-price-bg')
        .attr('x', nameWidth + 6)
        .attr('y', -9)
        .attr('width', priceTextWidth + 10)
        .attr('height', 18)

      bidLabel?.select('.bid-price-text')
        .attr('x', nameWidth + 11)
        .attr('y', 0)
    }
    else {
      bidLine?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
      bidLabel?.transition().duration(TRANSITION_DURATION).ease(d3.easeCubicOut).style('opacity', 0)
    }
  }

  // Create line generator for price path
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

  // Animate price line transition
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

  // Update chart axes
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

  return {
    TRANSITION_DURATION,
    updateScales,
    updateGridLines,
    calculateLabelCollision,
    updateAverageLine,
    updateBidLine,
    createLineGenerator,
    animatePriceLine,
    updateAxes,
  }
}

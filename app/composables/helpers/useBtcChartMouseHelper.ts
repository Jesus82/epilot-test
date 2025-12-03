import type { PricePoint } from './useBtcChartUpdateHelper'

export interface MouseHelperParams {
  d3Module: typeof import('d3') | null
  crosshairGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null
  currentXScale: d3.ScaleTime<number, number> | null
  currentYScale: d3.ScaleLinear<number, number> | null
  currentWidth: number
  currentHeight: number
  data: PricePoint[]
  averagePrice: number | null
  bidPrice: number | null
}

export const useBtcChartMouseHelper = () => {

  const findClosestPoint = (
    d3: typeof import('d3'),
    data: PricePoint[],
    xScale: d3.ScaleTime<number, number>,
    mouseX: number,
  ): PricePoint | null => {
    const bisect = d3.bisector((d: PricePoint) => d.timestamp).left
    const x0 = xScale.invert(mouseX).getTime()
    const i = bisect(data, x0, 1)
    const d0 = data[i - 1]
    const d1 = data[i]

    if (!d0) return null

    return d1 && (x0 - d0.timestamp > d1.timestamp - x0) ? d1 : d0
  }

  const updateCrosshairPosition = (
    crosshairGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    xPos: number,
    yPos: number,
    width: number,
    height: number,
  ) => {
    crosshairGroup.style('display', null)

    crosshairGroup.select('.crosshair-v')
      .attr('x1', xPos)
      .attr('x2', xPos)
      .attr('y1', 0)
      .attr('y2', height)

    crosshairGroup.select('.crosshair-h')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', yPos)
      .attr('y2', yPos)

    crosshairGroup.select('.crosshair-dot')
      .attr('cx', xPos)
      .attr('cy', yPos)
  }

  const calculatePriceLabelPosition = (
    yPos: number,
    yScale: d3.ScaleLinear<number, number>,
    averagePrice: number | null,
    bidPrice: number | null,
    height: number,
  ): number => {
    const labelHeight = 20
    const collisionThreshold = labelHeight + 4

    let adjustedYPos = yPos
    const labelsToCheck: number[] = []

    if (averagePrice) labelsToCheck.push(yScale(averagePrice))
    if (bidPrice) labelsToCheck.push(yScale(bidPrice))

    for (const labelY of labelsToCheck) {
      const distance = Math.abs(adjustedYPos - labelY)
      if (distance < collisionThreshold) {
        adjustedYPos = adjustedYPos < labelY
          ? labelY - collisionThreshold
          : labelY + collisionThreshold
      }
    }

    return Math.max(10, Math.min(height - 10, adjustedYPos))
  }

  const updatePriceLabel = (
    d3: typeof import('d3'),
    crosshairGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    price: number,
    adjustedYPos: number,
    width: number,
  ) => {
    const priceText = d3.format(',.2f')(price)
    const priceLabelGroup = crosshairGroup.select('.crosshair-price-label')
    const priceLabelText = priceLabelGroup.select('text').text(priceText)
    const priceLabelWidth = (priceLabelText.node() as SVGTextElement)?.getBBox().width || 60

    priceLabelGroup.attr('transform', `translate(${width + 5}, ${adjustedYPos})`)
    priceLabelGroup.select('rect')
      .attr('x', 0)
      .attr('y', -10)
      .attr('width', priceLabelWidth + 10)
      .attr('height', 20)
    priceLabelGroup.select('text')
      .attr('x', 5)
      .attr('y', 0)
  }

  const updateTimeLabel = (
    d3: typeof import('d3'),
    crosshairGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    timestamp: number,
    xPos: number,
    height: number,
  ) => {
    const timeText = d3.timeFormat('%H:%M:%S')(new Date(timestamp))
    const timeLabelGroup = crosshairGroup.select('.crosshair-time-label')
    const timeLabelText = timeLabelGroup.select('text').text(timeText)
    const timeLabelWidth = (timeLabelText.node() as SVGTextElement)?.getBBox().width || 50

    timeLabelGroup.attr('transform', `translate(${xPos}, ${height + 15})`)
    timeLabelGroup.select('rect')
      .attr('x', -timeLabelWidth / 2 - 5)
      .attr('y', -10)
      .attr('width', timeLabelWidth + 10)
      .attr('height', 20)
    timeLabelGroup.select('text')
      .attr('y', 0)
  }

  const hideCrosshair = (
    crosshairGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null,
  ) => {
    if (crosshairGroup) {
      crosshairGroup.style('display', 'none')
    }
  }

  return {
    findClosestPoint,
    updateCrosshairPosition,
    calculatePriceLabelPosition,
    updatePriceLabel,
    updateTimeLabel,
    hideCrosshair,
  }
}

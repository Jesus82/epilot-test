import type { PricePoint } from '../../../shared/types/chart'
import { calculatePriceLabelPosition } from '~/helpers/btcChartHelpers'
import { setLabelWidth } from '~/helpers/d3LabelHelpers'

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

    crosshairGroup.select('[data-js="crosshair-v"]')
      .attr('x1', xPos)
      .attr('x2', xPos)
      .attr('y1', 0)
      .attr('y2', height)

    crosshairGroup.select('[data-js="crosshair-h"]')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', yPos)
      .attr('y2', yPos)

    crosshairGroup.select('[data-js="crosshair-dot"]')
      .attr('cx', xPos)
      .attr('cy', yPos)
  }

  const getAdjustedPriceLabelY = (
    yPos: number,
    yScale: d3.ScaleLinear<number, number>,
    averagePrice: number | null,
    bidPrice: number | null,
    height: number,
  ): number => {
    const otherLabelYPositions: number[] = []

    if (averagePrice) otherLabelYPositions.push(yScale(averagePrice))
    if (bidPrice) otherLabelYPositions.push(yScale(bidPrice))

    return calculatePriceLabelPosition(yPos, otherLabelYPositions, height)
  }

  const updatePriceLabel = (
    d3: typeof import('d3'),
    crosshairGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    price: number,
    adjustedYPos: number,
    width: number,
  ) => {
    const priceText = d3.format(',.2f')(price)
    const priceLabelGroup = crosshairGroup.select('[data-label-variant="crosshair-price"]')
    const priceLabelText = priceLabelGroup.select('[data-js="crosshair-price-text"]').text(priceText)
    const priceLabelWidth = (priceLabelText.node() as SVGTextElement)?.getBBox().width || 60

    priceLabelGroup.attr('transform', `translate(${width + 5}, ${adjustedYPos})`)
    setLabelWidth(priceLabelGroup, '[data-js="crosshair-price-bg"]', priceLabelWidth)
  }

  const updateTimeLabel = (
    d3: typeof import('d3'),
    crosshairGroup: d3.Selection<SVGGElement, unknown, null, undefined>,
    timestamp: number,
    xPos: number,
    height: number,
  ) => {
    const timeText = d3.timeFormat('%H:%M:%S')(new Date(timestamp))
    const timeLabelGroup = crosshairGroup.select('[data-label-variant="crosshair-time"]')
    const timeLabelText = timeLabelGroup.select('[data-js="crosshair-time-text"]').text(timeText)
    const timeLabelWidth = (timeLabelText.node() as SVGTextElement)?.getBBox().width || 50

    timeLabelGroup.attr('transform', `translate(${xPos}, ${height + 15})`)
    setLabelWidth(timeLabelGroup, '[data-js="crosshair-time-bg"]', timeLabelWidth, true)
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
    getAdjustedPriceLabelY,
    updatePriceLabel,
    updateTimeLabel,
    hideCrosshair,
  }
}

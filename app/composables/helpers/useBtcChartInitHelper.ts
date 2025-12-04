export interface ChartSelections {
  svg: d3.Selection<SVGGElement, unknown, null, undefined> | null
  svgElement: d3.Selection<SVGSVGElement, unknown, null, undefined> | null
  gridGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null
  priceLine: d3.Selection<SVGPathElement, unknown, null, undefined> | null
  avgLine: d3.Selection<SVGLineElement, unknown, null, undefined> | null
  avgLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null
  bidLine: d3.Selection<SVGLineElement, unknown, null, undefined> | null
  bidLabel: d3.Selection<SVGGElement, unknown, null, undefined> | null
  xAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null
  yAxisGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null
  crosshairGroup: d3.Selection<SVGGElement, unknown, null, undefined> | null
  hoverOverlay: d3.Selection<SVGRectElement, unknown, null, undefined> | null
}

export interface ChartMargin {
  top: number
  right: number
  bottom: number
  left: number
}

export const useBtcChartInitHelper = () => {
  // Create main SVG element
  const createSvgElement = (
    d3: typeof import('d3'),
    container: HTMLDivElement,
    containerWidth: number,
    containerHeight: number,
    margin: ChartMargin,
  ) => {
    d3.select(container).selectAll('*').remove()

    const svgElement = d3.select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${containerWidth} ${containerHeight}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', 'auto')

    const svg = svgElement
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    return { svgElement, svg }
  }

  const createAxisGroups = (
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
    height: number,
  ) => {
    const gridGroup = svg.append('g')
      .attr('class', 'grid')

    const xAxisGroup = svg.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${height})`)

    const yAxisGroup = svg.append('g')
      .attr('class', 'y-axis')

    return { gridGroup, xAxisGroup, yAxisGroup }
  }

  const createPriceLine = (
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  ) => {
    return svg.append('path')
      .attr('class', 'price-line')
      .attr('fill', 'none')
      .attr('stroke', '#2563eb')
      .attr('stroke-width', 2)
  }

  const createAverageLineElements = (
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  ) => {
    const avgLine = svg.append('line')
      .attr('class', 'avg-line')
      .attr('stroke', '#10b981')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,4')
      .style('opacity', 0)

    const avgLabel = svg.append('g')
      .attr('class', 'btc-chart-renderer__label')
      .attr('data-label-variant', 'average')

    avgLabel.append('rect')
      .attr('data-js', 'avg-bg')

    avgLabel.append('text')
      .attr('data-js', 'avg-text')
      .attr('dx', 5)

    return { avgLine, avgLabel }
  }

  const createBidLineElements = (
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  ) => {
    const bidLine = svg.append('line')
      .attr('class', 'bid-line')
      .attr('stroke', '#f59e0b')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,4')
      .style('opacity', 0)

    const bidLabel = svg.append('g')
      .attr('class', 'btc-chart-renderer__label')
      .attr('data-label-variant', 'bid')

    bidLabel.append('rect')
      .attr('data-js', 'bid-bg')

    bidLabel.append('text')
      .attr('data-js', 'bid-text')
      .attr('dx', 5)

    return { bidLine, bidLabel }
  }

  const createMinMaxLabelElements = (
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  ) => {
    // Max price label
    const maxLabel = svg.append('g')
      .attr('class', 'btc-chart-renderer__label')
      .attr('data-label-variant', 'max')

    maxLabel.append('rect')
      .attr('data-js', 'max-bg')

    maxLabel.append('text')
      .attr('data-js', 'max-text')
      .attr('dx', 5)

    // Min price label
    const minLabel = svg.append('g')
      .attr('class', 'btc-chart-renderer__label')
      .attr('data-label-variant', 'min')

    minLabel.append('rect')
      .attr('data-js', 'min-bg')

    minLabel.append('text')
      .attr('data-js', 'min-text')
      .attr('dx', 5)

    return { maxLabel, minLabel }
  }

  const createCrosshairGroup = (
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  ) => {
    const crosshairGroup = svg.append('g')
      .attr('class', 'crosshair')
      .style('display', 'none')

    crosshairGroup.append('line')
      .attr('data-js', 'crosshair-v')

    crosshairGroup.append('line')
      .attr('data-js', 'crosshair-h')

    crosshairGroup.append('circle')
      .attr('data-js', 'crosshair-dot')
      .attr('r', 4)

    // Price label
    const priceLabel = crosshairGroup.append('g')
      .attr('class', 'btc-chart-renderer__label')
      .attr('data-label-variant', 'crosshair-price')

    priceLabel.append('rect')
      .attr('data-js', 'crosshair-price-bg')

    priceLabel.append('text')
      .attr('data-js', 'crosshair-price-text')
      .attr('dx', 5)

    // Time label
    const timeLabel = crosshairGroup.append('g')
      .attr('class', 'btc-chart-renderer__label')
      .attr('data-label-variant', 'crosshair-time')

    timeLabel.append('rect')
      .attr('data-js', 'crosshair-time-bg')

    timeLabel.append('text')
      .attr('data-js', 'crosshair-time-text')

    return crosshairGroup
  }

  const createHoverOverlay = (
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
    width: number,
    height: number,
    onMouseMove: (event: MouseEvent) => void,
    onMouseLeave: () => void,
  ) => {
    return svg.append('rect')
      .attr('class', 'hover-overlay')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair')
      .on('mousemove', onMouseMove)
      .on('mouseleave', onMouseLeave)
  }

  return {
    createSvgElement,
    createAxisGroups,
    createPriceLine,
    createAverageLineElements,
    createBidLineElements,
    createMinMaxLabelElements,
    createCrosshairGroup,
    createHoverOverlay,
  }
}

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
      .attr('class', 'btc-chart-renderer__price-line')
  }

  const createPriceAreaGradient = (
    svgElement: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  ) => {
    const defs = svgElement.append('defs')

    // Default blue gradient
    const gradient = defs.append('linearGradient')
      .attr('id', 'price-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%')

    gradient.append('stop')
      .attr('class', 'btc-chart-renderer__gradient-stop--top')
      .attr('offset', '0%')

    gradient.append('stop')
      .attr('class', 'btc-chart-renderer__gradient-stop--bottom')
      .attr('offset', '100%')

    // Winning (green) gradient for bid area
    const winGradient = defs.append('linearGradient')
      .attr('id', 'bid-area-gradient-win')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%')

    winGradient.append('stop')
      .attr('class', 'btc-chart-renderer__gradient-stop--win-top')
      .attr('offset', '0%')

    winGradient.append('stop')
      .attr('class', 'btc-chart-renderer__gradient-stop--win-bottom')
      .attr('offset', '100%')

    // Losing (red) gradient for bid area
    const loseGradient = defs.append('linearGradient')
      .attr('id', 'bid-area-gradient-lose')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%')

    loseGradient.append('stop')
      .attr('class', 'btc-chart-renderer__gradient-stop--lose-top')
      .attr('offset', '0%')

    loseGradient.append('stop')
      .attr('class', 'btc-chart-renderer__gradient-stop--lose-bottom')
      .attr('offset', '100%')

    return defs
  }

  const createPriceArea = (
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  ) => {
    return svg.append('path')
      .attr('class', 'btc-chart-renderer__price-area')
  }

  const createBidAreaElements = (
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  ) => {
    // Vertical line marking when bid was placed
    const bidMarkerLine = svg.append('line')
      .attr('class', 'btc-chart-renderer__bid-marker')
      .style('opacity', 0)

    // Area path for the bid period (after bid timestamp)
    const bidArea = svg.append('path')
      .attr('class', 'btc-chart-renderer__bid-area')
      .style('opacity', 0)

    return { bidMarkerLine, bidArea }
  }

  const createBidPriceLine = (
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  ) => {
    // Line path for the bid period (green/red based on win/lose)
    // Created separately so it can be layered on top of the main price line
    return svg.append('path')
      .attr('class', 'btc-chart-renderer__bid-price-line')
      .style('opacity', 0)
  }

  const createAverageLineElements = (
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  ) => {
    const avgLine = svg.append('line')
      .attr('class', 'btc-chart-renderer__line btc-chart-renderer__line--dashed')
      .attr('data-line-variant', 'average')
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
      .attr('class', 'btc-chart-renderer__line btc-chart-renderer__line--dashed')
      .attr('data-line-variant', 'bid')
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
      .attr('class', 'btc-chart-renderer__crosshair')
      .style('display', 'none')

    crosshairGroup.append('line')
      .attr('class', 'btc-chart-renderer__crosshair-line')
      .attr('data-js', 'crosshair-v')

    crosshairGroup.append('line')
      .attr('class', 'btc-chart-renderer__crosshair-line')
      .attr('data-js', 'crosshair-h')

    crosshairGroup.append('circle')
      .attr('class', 'btc-chart-renderer__crosshair-dot')
      .attr('data-js', 'crosshair-dot')

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
      .attr('class', 'btc-chart-renderer__hover-overlay')
      .attr('width', width)
      .attr('height', height)
      .on('mousemove', onMouseMove)
      .on('mouseleave', onMouseLeave)
  }

  return {
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
  }
}

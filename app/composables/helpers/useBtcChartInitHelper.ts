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
      .attr('class', 'avg-label')
      .style('opacity', 0)

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

    return { bidLine, bidLabel }
  }

  const createMinMaxLabelElements = (
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  ) => {
    // Max price label
    const maxLabel = svg.append('g')
      .attr('class', 'max-label')
      .style('opacity', 0)

    maxLabel.append('rect')
      .attr('class', 'max-name-bg')
      .attr('fill', '#22c55e')
      .attr('rx', 2)
      .attr('ry', 2)

    maxLabel.append('text')
      .attr('class', 'max-name-text')
      .attr('fill', '#ffffff')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('dominant-baseline', 'middle')
      .text('Max')

    maxLabel.append('rect')
      .attr('class', 'max-price-bg')
      .attr('fill', '#22c55e')
      .attr('rx', 2)
      .attr('ry', 2)

    maxLabel.append('text')
      .attr('class', 'max-price-text')
      .attr('fill', '#ffffff')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('dominant-baseline', 'middle')

    // Min price label
    const minLabel = svg.append('g')
      .attr('class', 'min-label')
      .style('opacity', 0)

    minLabel.append('rect')
      .attr('class', 'min-name-bg')
      .attr('fill', '#ef4444')
      .attr('rx', 2)
      .attr('ry', 2)

    minLabel.append('text')
      .attr('class', 'min-name-text')
      .attr('fill', '#ffffff')
      .attr('font-size', '10px')
      .attr('font-weight', '500')
      .attr('dominant-baseline', 'middle')
      .text('Min')

    minLabel.append('rect')
      .attr('class', 'min-price-bg')
      .attr('fill', '#ef4444')
      .attr('rx', 2)
      .attr('ry', 2)

    minLabel.append('text')
      .attr('class', 'min-price-text')
      .attr('fill', '#ffffff')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .attr('dominant-baseline', 'middle')

    return { maxLabel, minLabel }
  }

  const createCrosshairGroup = (
    svg: d3.Selection<SVGGElement, unknown, null, undefined>,
  ) => {
    const crosshairGroup = svg.append('g')
      .attr('class', 'crosshair')
      .style('display', 'none')

    crosshairGroup.append('line')
      .attr('class', 'crosshair-v')
      .attr('stroke', '#999')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')

    crosshairGroup.append('line')
      .attr('class', 'crosshair-h')
      .attr('stroke', '#999')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '3,3')

    crosshairGroup.append('circle')
      .attr('class', 'crosshair-dot')
      .attr('r', 4)
      .attr('fill', '#2563eb')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)

    // Price label
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

    // Time label
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

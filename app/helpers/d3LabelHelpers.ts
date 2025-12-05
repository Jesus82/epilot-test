// Padding for width calculation (must match CSS --label-padding-x)
export const LABEL_PADDING_X = 5

/**
 * Helper to set label background width (height/y/text position handled by CSS)
 */
export const setLabelWidth = (
  label: d3.Selection<SVGGElement | Element, unknown, null, undefined> | null,
  bgSelector: string,
  textWidth: number,
  centered = false,
) => {
  const width = textWidth + LABEL_PADDING_X * 2
  const bgX = centered ? -width / 2 : 0

  label?.select(bgSelector).attr('x', bgX).attr('width', width)
}

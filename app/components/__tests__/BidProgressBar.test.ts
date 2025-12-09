import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BidProgressBar from '../BidProgressBar.vue'

describe('BidProgressBar', () => {
  const defaultProps = {
    bidPrice: 50000,
    currentPrice: 50000,
    isWinning: true,
    yMin: 49000,
    yMax: 51000,
  }

  describe('rendering', () => {
    it('should render the progress bar container', () => {
      const wrapper = mount(BidProgressBar, { props: defaultProps })

      expect(wrapper.find('.bid-progress-bar').exists()).toBe(true)
    })

    it('should always render the bid line at 50%', () => {
      const wrapper = mount(BidProgressBar, { props: defaultProps })
      const bidLine = wrapper.find('.bid-progress-bar__bid-line')

      expect(bidLine.exists()).toBe(true)
      expect(bidLine.attributes('style')).toContain('bottom: 50%')
    })
  })

  describe('fill visibility', () => {
    it('should not render fill when currentPrice equals bidPrice', () => {
      const wrapper = mount(BidProgressBar, {
        props: {
          ...defaultProps,
          currentPrice: 50000,
          bidPrice: 50000,
        },
      })

      expect(wrapper.find('.bid-progress-bar__fill').exists()).toBe(false)
    })

    it('should render fill when currentPrice is above bidPrice', () => {
      const wrapper = mount(BidProgressBar, {
        props: {
          ...defaultProps,
          currentPrice: 50500,
          bidPrice: 50000,
        },
      })

      expect(wrapper.find('.bid-progress-bar__fill').exists()).toBe(true)
    })

    it('should render fill when currentPrice is below bidPrice', () => {
      const wrapper = mount(BidProgressBar, {
        props: {
          ...defaultProps,
          currentPrice: 49500,
          bidPrice: 50000,
        },
      })

      expect(wrapper.find('.bid-progress-bar__fill').exists()).toBe(true)
    })
  })

  describe('winning/losing styling', () => {
    it('should apply winning class when isWinning is true', () => {
      const wrapper = mount(BidProgressBar, {
        props: {
          ...defaultProps,
          currentPrice: 50500,
          isWinning: true,
        },
      })

      const fill = wrapper.find('.bid-progress-bar__fill')
      expect(fill.classes()).toContain('bid-progress-bar__fill--winning')
      expect(fill.classes()).not.toContain('bid-progress-bar__fill--losing')
    })

    it('should apply losing class when isWinning is false', () => {
      const wrapper = mount(BidProgressBar, {
        props: {
          ...defaultProps,
          currentPrice: 50500,
          isWinning: false,
        },
      })

      const fill = wrapper.find('.bid-progress-bar__fill')
      expect(fill.classes()).toContain('bid-progress-bar__fill--losing')
      expect(fill.classes()).not.toContain('bid-progress-bar__fill--winning')
    })
  })

  describe('fill positioning', () => {
    it('should position fill at 50% bottom when price is above bid', () => {
      const wrapper = mount(BidProgressBar, {
        props: {
          ...defaultProps,
          bidPrice: 50000,
          currentPrice: 50500,
          yMin: 49000,
          yMax: 51000,
        },
      })

      const fill = wrapper.find('.bid-progress-bar__fill')
      expect(fill.attributes('style')).toContain('bottom: 50%')
    })

    it('should calculate correct height for price above bid', () => {
      const wrapper = mount(BidProgressBar, {
        props: {
          bidPrice: 50000,
          currentPrice: 51000, // At max
          isWinning: true,
          yMin: 49000,
          yMax: 51000,
        },
      })

      const fill = wrapper.find('.bid-progress-bar__fill')
      // Symmetric range: bid ± 1000, so range = 2000
      // currentPrice (51000) is at 100%, movePercent = 100 - 50 = 50%
      expect(fill.attributes('style')).toContain('height: 50%')
    })

    it('should calculate correct height for price below bid', () => {
      const wrapper = mount(BidProgressBar, {
        props: {
          bidPrice: 50000,
          currentPrice: 49000, // At min
          isWinning: false,
          yMin: 49000,
          yMax: 51000,
        },
      })

      const fill = wrapper.find('.bid-progress-bar__fill')
      // Symmetric range: bid ± 1000, so range = 2000
      // currentPrice (49000) is at 0%, movePercent = 0 - 50 = -50, abs = 50%
      expect(fill.attributes('style')).toContain('height: 50%')
    })

    it('should position fill at currentPositionPercent when price is below bid', () => {
      const wrapper = mount(BidProgressBar, {
        props: {
          bidPrice: 50000,
          currentPrice: 49500, // Halfway between min and bid
          isWinning: false,
          yMin: 49000,
          yMax: 51000,
        },
      })

      const fill = wrapper.find('.bid-progress-bar__fill')
      // Symmetric range: 49000-51000, currentPrice at 49500 = 25%
      expect(fill.attributes('style')).toContain('bottom: 25%')
    })
  })

  describe('symmetric range calculation', () => {
    it('should handle asymmetric yMin/yMax by using larger distance', () => {
      const wrapper = mount(BidProgressBar, {
        props: {
          bidPrice: 50000,
          currentPrice: 50500,
          isWinning: true,
          yMin: 49500, // 500 away from bid
          yMax: 52000, // 2000 away from bid - larger
        },
      })

      const fill = wrapper.find('.bid-progress-bar__fill')
      // maxDistance = 2000, range = 4000
      // symmetricMin = 48000, symmetricMax = 52000
      // currentPrice 50500 position = (50500 - 48000) / 4000 = 62.5%
      // movePercent = 62.5 - 50 = 12.5%
      expect(fill.attributes('style')).toContain('height: 12.5%')
    })
  })
})

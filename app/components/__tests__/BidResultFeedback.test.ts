import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BidResultFeedback from '../BidResultFeedback.vue'

// Mock useBtcPrice
const mockFormatPrice = vi.fn((value: number) => `$${value.toFixed(2)}`)

vi.stubGlobal('useBtcPrice', () => ({
  formatPrice: mockFormatPrice,
}))

describe('BidResultFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('visibility', () => {
    it('should show overlay when show is true', () => {
      const wrapper = mount(BidResultFeedback, {
        props: {
          show: true,
          won: true,
          earnings: 100,
        },
      })

      expect(wrapper.find('[data-testid="result-feedback-overlay"]').exists()).toBe(true)
    })

    it('should not show overlay when show is false', () => {
      const wrapper = mount(BidResultFeedback, {
        props: {
          show: false,
          won: true,
          earnings: 100,
        },
      })

      expect(wrapper.find('[data-testid="result-feedback-overlay"]').exists()).toBe(false)
    })
  })

  describe('win feedback', () => {
    it('should display win message when won is true', () => {
      const wrapper = mount(BidResultFeedback, {
        props: {
          show: true,
          won: true,
          earnings: 150,
        },
      })

      expect(wrapper.find('[data-testid="result-feedback-message"]').text()).toContain('You Won!')
    })

    it('should display positive earnings with plus sign', () => {
      const wrapper = mount(BidResultFeedback, {
        props: {
          show: true,
          won: true,
          earnings: 150,
        },
      })

      expect(wrapper.find('[data-testid="result-feedback-earnings"]').text()).toContain('+$150.00')
    })

    it('should apply green styling for win', () => {
      const wrapper = mount(BidResultFeedback, {
        props: {
          show: true,
          won: true,
          earnings: 150,
        },
      })

      const message = wrapper.find('[data-testid="result-feedback-message"]')
      expect(message.attributes('data-status')).toBe('positive')

      const earnings = wrapper.find('[data-testid="result-feedback-earnings"]')
      expect(earnings.attributes('data-status')).toBe('positive')
    })
  })

  describe('loss feedback', () => {
    it('should display loss message when won is false', () => {
      const wrapper = mount(BidResultFeedback, {
        props: {
          show: true,
          won: false,
          earnings: -100,
        },
      })

      expect(wrapper.find('[data-testid="result-feedback-message"]').text()).toContain('You Lost')
    })

    it('should display negative earnings without plus sign', () => {
      const wrapper = mount(BidResultFeedback, {
        props: {
          show: true,
          won: false,
          earnings: -100,
        },
      })

      expect(wrapper.find('[data-testid="result-feedback-earnings"]').text()).toContain('$-100.00')
    })

    it('should apply red styling for loss', () => {
      const wrapper = mount(BidResultFeedback, {
        props: {
          show: true,
          won: false,
          earnings: -100,
        },
      })

      const message = wrapper.find('[data-testid="result-feedback-message"]')
      expect(message.attributes('data-status')).toBe('negative')

      const earnings = wrapper.find('[data-testid="result-feedback-earnings"]')
      expect(earnings.attributes('data-status')).toBe('negative')
    })
  })

  describe('edge cases', () => {
    it('should display zero earnings with plus sign', () => {
      const wrapper = mount(BidResultFeedback, {
        props: {
          show: true,
          won: true,
          earnings: 0,
        },
      })

      expect(wrapper.find('[data-testid="result-feedback-earnings"]').text()).toContain('+$0.00')
    })

    it('should call formatPrice with the earnings value', () => {
      mount(BidResultFeedback, {
        props: {
          show: true,
          won: true,
          earnings: 250.50,
        },
      })

      expect(mockFormatPrice).toHaveBeenCalledWith(250.50)
    })
  })
})

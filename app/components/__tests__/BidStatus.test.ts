import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, defineComponent, h } from 'vue'
import BidStatus from '../BidStatus.vue'

// Mock useGameLogic
const mockCountdown = ref<number | null>(null)
const mockIsLocked = ref(false)
const mockGuessPrice = ref<number | null>(null)
const mockIsWinning = ref(false)
const mockGuess = ref<'up' | 'down' | null>(null)
const mockBidToPriceDifference = ref<number | null>(null)
const mockShowResultFeedback = ref(false)
const mockLastBidResult = ref<{ won: boolean, earnings: number } | null>(null)

vi.stubGlobal('useGameLogic', () => ({
  countdown: mockCountdown,
  isLocked: mockIsLocked,
  guessPrice: mockGuessPrice,
  isWinning: mockIsWinning,
  guess: mockGuess,
  bidToPriceDifference: mockBidToPriceDifference,
  showResultFeedback: mockShowResultFeedback,
  lastBidResult: mockLastBidResult,
}))

// Mock useBtcPrice
const mockPrice = ref<number | null>(null)
const mockYDomain = ref({ yMin: 49000, yMax: 51000 })
const mockFormatPrice = vi.fn((value: number) => `$${value.toFixed(2)}`)

vi.stubGlobal('useBtcPrice', () => ({
  price: mockPrice,
  yDomain: mockYDomain,
  formatPrice: mockFormatPrice,
}))

// Stub for BidProgressBar component
const BidProgressBarStub = defineComponent({
  name: 'BidProgressBar',
  props: ['bidPrice', 'currentPrice', 'isWinning', 'yMin', 'yMax'],
  setup(_props) {
    return () => h('div', { 'class': 'bid-progress-bar-stub', 'data-testid': 'bid-progress-bar' })
  },
})

// Stub for BidResultFeedback component
const BidResultFeedbackStub = defineComponent({
  name: 'BidResultFeedback',
  props: ['show', 'won', 'earnings'],
  setup(props) {
    return () => props.show
      ? h('div', {
          'data-testid': 'result-feedback-overlay',
        }, [
          h('p', { 'data-testid': 'result-feedback-message' }, props.won ? '🎉 You Won!' : '😔 You Lost'),
          h('p', { 'data-testid': 'result-feedback-earnings' }, `${props.earnings >= 0 ? '+' : ''}$${props.earnings.toFixed(2)}`),
        ])
      : null
  },
})

describe('BidStatus', () => {
  const mountOptions = {
    global: {
      stubs: {
        BidProgressBar: BidProgressBarStub,
        BidResultFeedback: BidResultFeedbackStub,
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCountdown.value = null
    mockIsLocked.value = false
    mockGuessPrice.value = null
    mockIsWinning.value = false
    mockGuess.value = null
    mockBidToPriceDifference.value = null
    mockShowResultFeedback.value = false
    mockLastBidResult.value = null
    mockPrice.value = null
    mockYDomain.value = { yMin: 49000, yMax: 51000 }
  })

  describe('countdown display', () => {
    it('should display countdown when countdown value exists', () => {
      mockCountdown.value = 30

      const wrapper = mount(BidStatus, mountOptions)

      expect(wrapper.text()).toContain('30s')
    })

    it('should not display countdown when countdown is null', () => {
      mockCountdown.value = null

      const wrapper = mount(BidStatus, mountOptions)

      expect(wrapper.text()).not.toContain('s')
    })
  })

  describe('bid progress bar', () => {
    it('should show BidProgressBar when locked with all required data', () => {
      mockIsLocked.value = true
      mockGuessPrice.value = 50000
      mockPrice.value = 50500
      mockGuess.value = 'up'

      const wrapper = mount(BidStatus, mountOptions)

      expect(wrapper.findComponent({ name: 'BidProgressBar' }).exists()).toBe(true)
    })

    it('should not show BidProgressBar when not locked', () => {
      mockIsLocked.value = false
      mockGuessPrice.value = 50000
      mockPrice.value = 50500
      mockGuess.value = 'up'

      const wrapper = mount(BidStatus, mountOptions)

      expect(wrapper.findComponent({ name: 'BidProgressBar' }).exists()).toBe(false)
    })

    it('should not show BidProgressBar when guessPrice is missing', () => {
      mockIsLocked.value = true
      mockGuessPrice.value = null
      mockPrice.value = 50500
      mockGuess.value = 'up'

      const wrapper = mount(BidStatus, mountOptions)

      expect(wrapper.findComponent({ name: 'BidProgressBar' }).exists()).toBe(false)
    })
  })

  describe('bid difference display', () => {
    it('should show positive difference with plus sign when winning', () => {
      mockIsLocked.value = true
      mockBidToPriceDifference.value = 500
      mockIsWinning.value = true
      mockGuessPrice.value = 50000
      mockGuess.value = 'up'

      const wrapper = mount(BidStatus, mountOptions)

      expect(wrapper.text()).toContain('+')
      expect(mockFormatPrice).toHaveBeenCalledWith(500)
    })

    it('should show negative difference without plus sign', () => {
      mockIsLocked.value = true
      mockBidToPriceDifference.value = -500
      mockIsWinning.value = false
      mockGuessPrice.value = 50000
      mockGuess.value = 'down'

      mount(BidStatus, mountOptions)

      expect(mockFormatPrice).toHaveBeenCalledWith(-500)
    })

    it('should apply green text class when winning', () => {
      mockIsLocked.value = true
      mockBidToPriceDifference.value = 500
      mockIsWinning.value = true
      mockGuessPrice.value = 50000
      mockGuess.value = 'up'

      const wrapper = mount(BidStatus, mountOptions)
      const diffElement = wrapper.find('.text-green')

      expect(diffElement.exists()).toBe(true)
    })

    it('should apply red text class when losing', () => {
      mockIsLocked.value = true
      mockBidToPriceDifference.value = -500
      mockIsWinning.value = false
      mockGuessPrice.value = 50000
      mockGuess.value = 'down'

      const wrapper = mount(BidStatus, mountOptions)
      const diffElement = wrapper.find('.text-red')

      expect(diffElement.exists()).toBe(true)
    })

    it('should position difference at row 1 when positive', () => {
      mockIsLocked.value = true
      mockBidToPriceDifference.value = 500
      mockIsWinning.value = true
      mockGuessPrice.value = 50000
      mockGuess.value = 'up'

      const wrapper = mount(BidStatus, mountOptions)
      const diffElement = wrapper.find('.row-start-1')

      expect(diffElement.exists()).toBe(true)
    })

    it('should position difference at row 3 when negative', () => {
      mockIsLocked.value = true
      mockBidToPriceDifference.value = -500
      mockIsWinning.value = false
      mockGuessPrice.value = 50000
      mockGuess.value = 'down'

      const wrapper = mount(BidStatus, mountOptions)
      const diffElement = wrapper.find('.row-start-3')

      expect(diffElement.exists()).toBe(true)
    })
  })

  describe('your bid display', () => {
    it('should show bid price when guessPrice exists', () => {
      mockGuessPrice.value = 50000
      mockGuess.value = 'up'

      const wrapper = mount(BidStatus, mountOptions)

      expect(wrapper.text()).toContain('Your bid:')
      expect(mockFormatPrice).toHaveBeenCalledWith(50000)
    })

    it('should not show bid price when guessPrice is null', () => {
      mockGuessPrice.value = null

      const wrapper = mount(BidStatus, mountOptions)

      expect(wrapper.text()).not.toContain('Your bid:')
    })

    it('should show up arrow when guess is up', () => {
      mockGuessPrice.value = 50000
      mockGuess.value = 'up'

      const wrapper = mount(BidStatus, mountOptions)

      expect(wrapper.text()).toContain('⬆')
    })

    it('should show down arrow when guess is down', () => {
      mockGuessPrice.value = 50000
      mockGuess.value = 'down'

      const wrapper = mount(BidStatus, mountOptions)

      expect(wrapper.text()).toContain('⬇')
    })
  })

  describe('result feedback overlay', () => {
    it('should pass show=true to BidResultFeedback when showResultFeedback is true and lastBidResult exists', () => {
      mockShowResultFeedback.value = true
      mockLastBidResult.value = { won: true, earnings: 150 }

      const wrapper = mount(BidStatus, mountOptions)

      const feedback = wrapper.findComponent({ name: 'BidResultFeedback' })
      expect(feedback.exists()).toBe(true)
      expect(feedback.props('show')).toBe(true)
    })

    it('should pass won and earnings props to BidResultFeedback for winning bid', () => {
      mockShowResultFeedback.value = true
      mockLastBidResult.value = { won: true, earnings: 150 }

      const wrapper = mount(BidStatus, mountOptions)

      const feedback = wrapper.findComponent({ name: 'BidResultFeedback' })
      expect(feedback.props('won')).toBe(true)
      expect(feedback.props('earnings')).toBe(150)
    })

    it('should pass won and earnings props to BidResultFeedback for losing bid', () => {
      mockShowResultFeedback.value = true
      mockLastBidResult.value = { won: false, earnings: -100 }

      const wrapper = mount(BidStatus, mountOptions)

      const feedback = wrapper.findComponent({ name: 'BidResultFeedback' })
      expect(feedback.props('won')).toBe(false)
      expect(feedback.props('earnings')).toBe(-100)
    })

    it('should pass show=false to BidResultFeedback when showResultFeedback is false', () => {
      mockShowResultFeedback.value = false
      mockLastBidResult.value = { won: true, earnings: 150 }
      // Need to set guessPrice to ensure the wrapper renders
      mockGuessPrice.value = 50000
      mockGuess.value = 'up'

      const wrapper = mount(BidStatus, mountOptions)

      const feedback = wrapper.findComponent({ name: 'BidResultFeedback' })
      expect(feedback.props('show')).toBe(false)
    })

    it('should pass show=false to BidResultFeedback when lastBidResult is null', () => {
      mockShowResultFeedback.value = true
      mockLastBidResult.value = null
      // Need to set guessPrice to ensure the wrapper renders
      mockGuessPrice.value = 50000
      mockGuess.value = 'up'

      const wrapper = mount(BidStatus, mountOptions)

      const feedback = wrapper.findComponent({ name: 'BidResultFeedback' })
      expect(feedback.props('show')).toBe(false)
    })
  })
})

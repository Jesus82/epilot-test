import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import PlayerStatsPanel from '../PlayerStatsPanel.vue'

// Mock useGameLogic
const mockTotalEarnings = ref(0)
const mockCurrentStreak = ref(0)
const mockLongestStreak = ref(0)
const mockTotalWins = ref(0)
const mockTotalLosses = ref(0)
const mockPotentialEarnings = ref(0)
const mockIsLocked = ref(false)
const mockLastBidResult = ref<{ won: boolean, earnings: number } | null>(null)

vi.stubGlobal('useGameLogic', () => ({
  totalEarnings: mockTotalEarnings,
  currentStreak: mockCurrentStreak,
  longestStreak: mockLongestStreak,
  totalWins: mockTotalWins,
  totalLosses: mockTotalLosses,
  potentialEarnings: mockPotentialEarnings,
  isLocked: mockIsLocked,
  lastBidResult: mockLastBidResult,
}))

// Mock useBtcPrice
const mockFormatPrice = vi.fn((value: number) => `$${value.toFixed(2)}`)

vi.stubGlobal('useBtcPrice', () => ({
  formatPrice: mockFormatPrice,
}))

describe('PlayerStatsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTotalEarnings.value = 0
    mockCurrentStreak.value = 0
    mockLongestStreak.value = 0
    mockTotalWins.value = 0
    mockTotalLosses.value = 0
    mockPotentialEarnings.value = 0
    mockIsLocked.value = false
    mockLastBidResult.value = null
  })

  describe('total earnings display', () => {
    it('should display total earnings', () => {
      mockTotalEarnings.value = 1500

      const wrapper = mount(PlayerStatsPanel)

      expect(wrapper.text()).toContain('Total Earnings:')
      expect(mockFormatPrice).toHaveBeenCalledWith(1500)
    })

    it('should show green text for positive earnings', () => {
      mockTotalEarnings.value = 500

      const wrapper = mount(PlayerStatsPanel)
      const earningsSpan = wrapper.find('.text-green')

      expect(earningsSpan.exists()).toBe(true)
    })

    it('should show red text for negative earnings', () => {
      mockTotalEarnings.value = -500

      const wrapper = mount(PlayerStatsPanel)
      const earningsSpan = wrapper.find('.text-red')

      expect(earningsSpan.exists()).toBe(true)
    })

    it('should show plus sign for positive earnings', () => {
      mockTotalEarnings.value = 500

      const wrapper = mount(PlayerStatsPanel)

      expect(wrapper.text()).toContain('+')
    })

    it('should not show plus sign for negative earnings', () => {
      mockTotalEarnings.value = -500
      mockFormatPrice.mockReturnValue('$-500.00')

      const wrapper = mount(PlayerStatsPanel)
      const text = wrapper.text()

      // Should not have a standalone + before the negative value
      expect(text).not.toMatch(/Total Earnings:\s*\+.*-/)
    })
  })

  describe('streak display', () => {
    it('should display current streak', () => {
      mockCurrentStreak.value = 5

      const wrapper = mount(PlayerStatsPanel)

      expect(wrapper.text()).toContain('Current Streak:')
      expect(wrapper.text()).toContain('5')
    })

    it('should display longest streak', () => {
      mockLongestStreak.value = 10

      const wrapper = mount(PlayerStatsPanel)

      expect(wrapper.text()).toContain('Longest Streak:')
      expect(wrapper.text()).toContain('10')
    })
  })

  describe('wins and losses display', () => {
    it('should display total wins', () => {
      mockTotalWins.value = 15

      const wrapper = mount(PlayerStatsPanel)

      expect(wrapper.text()).toContain('Wins:')
      expect(wrapper.text()).toContain('15')
    })

    it('should display total losses', () => {
      mockTotalLosses.value = 8

      const wrapper = mount(PlayerStatsPanel)

      expect(wrapper.text()).toContain('Losses:')
      expect(wrapper.text()).toContain('8')
    })
  })

  describe('potential earnings display', () => {
    it('should show potential earnings when locked', () => {
      mockIsLocked.value = true
      mockPotentialEarnings.value = 250

      const wrapper = mount(PlayerStatsPanel)

      expect(wrapper.text()).toContain('Potential Earnings:')
      expect(mockFormatPrice).toHaveBeenCalledWith(250)
    })

    it('should not show potential earnings when not locked', () => {
      mockIsLocked.value = false
      mockPotentialEarnings.value = 250

      const wrapper = mount(PlayerStatsPanel)

      expect(wrapper.text()).not.toContain('Potential Earnings:')
    })

    it('should show green text for positive potential earnings', () => {
      mockIsLocked.value = true
      mockPotentialEarnings.value = 250

      const wrapper = mount(PlayerStatsPanel)
      // Find the potential earnings section
      const greenSpans = wrapper.findAll('.text-green')

      expect(greenSpans.length).toBeGreaterThan(0)
    })

    it('should show red text for negative potential earnings', () => {
      mockIsLocked.value = true
      mockPotentialEarnings.value = -250
      mockTotalEarnings.value = -100 // Make total also negative for consistency

      const wrapper = mount(PlayerStatsPanel)
      const redSpans = wrapper.findAll('.text-red')

      expect(redSpans.length).toBeGreaterThan(0)
    })
  })

  describe('last bid result display', () => {
    it('should show last bid result when available', () => {
      mockLastBidResult.value = { won: true, earnings: 100 }

      const wrapper = mount(PlayerStatsPanel)

      expect(wrapper.text()).toContain('Last Bid:')
      expect(wrapper.text()).toContain('Won')
    })

    it('should not show last bid result when null', () => {
      mockLastBidResult.value = null

      const wrapper = mount(PlayerStatsPanel)

      expect(wrapper.text()).not.toContain('Last Bid:')
    })

    it('should show Won with green text for winning bid', () => {
      mockLastBidResult.value = { won: true, earnings: 100 }

      const wrapper = mount(PlayerStatsPanel)

      expect(wrapper.text()).toContain('Won')
      expect(wrapper.find('.text-green').exists()).toBe(true)
    })

    it('should show Lost with red text for losing bid', () => {
      mockLastBidResult.value = { won: false, earnings: -100 }
      mockTotalEarnings.value = 100 // Keep positive to isolate the test

      const wrapper = mount(PlayerStatsPanel)

      expect(wrapper.text()).toContain('Lost')
      expect(wrapper.findAll('.text-red').length).toBeGreaterThan(0)
    })

    it('should display earnings from last bid', () => {
      mockLastBidResult.value = { won: true, earnings: 150 }

      mount(PlayerStatsPanel)

      expect(mockFormatPrice).toHaveBeenCalledWith(150)
    })
  })
})

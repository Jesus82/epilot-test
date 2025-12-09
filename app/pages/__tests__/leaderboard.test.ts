import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, computed, defineComponent } from 'vue'
import LeaderboardPage from '../leaderboard.vue'

// Mock data for leaderboard
const mockLeaderboardData = [
  { playerId: '1', playerName: 'Alice', score: 100, longestStreak: 5, totalEarnings: 1000 },
  { playerId: '2', playerName: 'Bob', score: 200, longestStreak: 10, totalEarnings: 500 },
  { playerId: '3', playerName: 'Charlie', score: 150, longestStreak: 3, totalEarnings: 2000 },
  { playerId: '4', playerName: null, score: 50, longestStreak: 2, totalEarnings: 100 },
]

// Mock refs for useFetch
const mockData = ref(mockLeaderboardData)
const mockStatus = ref('success')
const mockError = ref<{ message: string } | null>(null)
const mockRefresh = vi.fn()
const mockFormatPrice = vi.fn((val: number) => `$${val.toFixed(2)}`)

// Stub NuxtLink
const NuxtLinkStub = defineComponent({
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
})

describe('leaderboard.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockData.value = [...mockLeaderboardData]
    mockStatus.value = 'success'
    mockError.value = null

    // Stub Nuxt auto-imports - return a resolved promise for async setup
    vi.stubGlobal('useFetch', vi.fn(() => Promise.resolve({
      data: mockData,
      status: mockStatus,
      error: mockError,
      refresh: mockRefresh,
    })))

    vi.stubGlobal('useBtcPrice', () => ({
      formatPrice: mockFormatPrice,
    }))

    vi.stubGlobal('useRoute', () => ({
      fullPath: '/leaderboard',
    }))

    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Helper to mount with Suspense wrapper for async component
  const mountPage = async () => {
    const wrapper = mount(
      defineComponent({
        components: { LeaderboardPage },
        template: '<Suspense><LeaderboardPage /></Suspense>',
      }),
      {
        global: {
          stubs: {
            NuxtLink: NuxtLinkStub,
          },
        },
      },
    )
    await flushPromises()
    return wrapper
  }

  describe('loading state', () => {
    it('should display loading message when status is pending', async () => {
      mockStatus.value = 'pending'
      const wrapper = await mountPage()

      expect(wrapper.text()).toContain('Loading...')
    })

    it('should not show loading when status is success', async () => {
      mockStatus.value = 'success'
      const wrapper = await mountPage()

      expect(wrapper.text()).not.toContain('Loading...')
    })
  })

  describe('error state', () => {
    it('should display error message when error exists', async () => {
      mockError.value = { message: 'Failed to load' }
      const wrapper = await mountPage()

      expect(wrapper.text()).toContain('Error loading leaderboard: Failed to load')
    })

    it('should show retry button on error', async () => {
      mockError.value = { message: 'Network error' }
      const wrapper = await mountPage()

      expect(wrapper.find('button').text()).toBe('Retry')
    })

    it('should call refresh when retry button is clicked', async () => {
      mockError.value = { message: 'Network error' }
      const wrapper = await mountPage()

      await wrapper.find('button').trigger('click')

      expect(mockRefresh).toHaveBeenCalled()
    })
  })

  describe('empty state', () => {
    it('should display empty message when leaderboard is empty', async () => {
      mockData.value = []
      const wrapper = await mountPage()

      expect(wrapper.text()).toContain('No players on the leaderboard yet.')
    })

    it('should display empty message when leaderboard is null', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockData.value = null as any
      const wrapper = await mountPage()

      expect(wrapper.text()).toContain('No players on the leaderboard yet.')
    })
  })

  describe('tabs', () => {
    it('should render three tab buttons', async () => {
      const wrapper = await mountPage()
      const buttons = wrapper.findAll('button')

      expect(buttons).toHaveLength(3)
      expect(buttons[0]!.text()).toBe('Score')
      expect(buttons[1]!.text()).toBe('Streak')
      expect(buttons[2]!.text()).toBe('Earnings')
    })

    it('should default to score tab', async () => {
      const wrapper = await mountPage()
      const scoreButton = wrapper.findAll('button')[0]!

      expect(scoreButton.attributes('data-active')).toBe('true')
      expect(scoreButton.classes()).toContain('underline')
    })

    it('should switch to streak tab when clicked', async () => {
      const wrapper = await mountPage()
      const streakButton = wrapper.findAll('button')[1]!

      await streakButton.trigger('click')

      expect(streakButton.attributes('data-active')).toBe('true')
      expect(streakButton.classes()).toContain('underline')
    })

    it('should switch to earnings tab when clicked', async () => {
      const wrapper = await mountPage()
      const earningsButton = wrapper.findAll('button')[2]!

      await earningsButton.trigger('click')

      expect(earningsButton.attributes('data-active')).toBe('true')
      expect(earningsButton.classes()).toContain('underline')
    })
  })

  describe('score leaderboard', () => {
    it('should display "Highest Scores" heading', async () => {
      const wrapper = await mountPage()

      expect(wrapper.find('h1').text()).toBe('Highest Scores')
    })

    it('should sort players by score descending', async () => {
      const wrapper = await mountPage()
      const playerNames = wrapper.findAll('[data-testid="leaderboard-name"]')

      // Bob (200) > Charlie (150) > Alice (100) > Anonymous (50)
      expect(playerNames[0]!.text()).toContain('Bob')
      expect(playerNames[1]!.text()).toContain('Charlie')
      expect(playerNames[2]!.text()).toContain('Alice')
    })

    it('should show Anonymous for players without name', async () => {
      const wrapper = await mountPage()
      const playerRows = wrapper.findAll('[data-testid="leaderboard-row"]')

      // The 4th player has null name
      expect(playerRows[3]!.text()).toContain('Anonymous')
    })

    it('should display ranking numbers', async () => {
      const wrapper = await mountPage()
      const playerNames = wrapper.findAll('[data-testid="leaderboard-name"]')

      expect(playerNames[0]!.text()).toContain('1.')
      expect(playerNames[1]!.text()).toContain('2.')
      expect(playerNames[2]!.text()).toContain('3.')
    })

    it('should limit to top 10', async () => {
      // Create more than 10 players
      mockData.value = Array.from({ length: 15 }, (_, i) => ({
        playerId: `${i}`,
        playerName: `Player${i}`,
        score: i * 10,
        longestStreak: i,
        totalEarnings: i * 100,
      }))

      const wrapper = await mountPage()
      const playerRows = wrapper.findAll('[data-testid="leaderboard-row"]')

      expect(playerRows.length).toBeLessThanOrEqual(10)
    })
  })

  describe('streak leaderboard', () => {
    it('should display "Best Streaks" heading when on streak tab', async () => {
      const wrapper = await mountPage()

      await wrapper.findAll('button')[1]!.trigger('click')

      expect(wrapper.find('h1').text()).toBe('Best Streaks')
    })

    it('should sort players by longest streak descending', async () => {
      const wrapper = await mountPage()

      await wrapper.findAll('button')[1]!.trigger('click')

      const playerNames = wrapper.findAll('[data-testid="leaderboard-name"]')
      // Bob (10) > Alice (5) > Charlie (3) > Anonymous (2)
      expect(playerNames[0]!.text()).toContain('Bob')
      expect(playerNames[1]!.text()).toContain('Alice')
      expect(playerNames[2]!.text()).toContain('Charlie')
    })

    it('should display streak values', async () => {
      const wrapper = await mountPage()

      await wrapper.findAll('button')[1]!.trigger('click')

      const streakValues = wrapper.findAll('[data-testid="leaderboard-value"]')
      expect(streakValues[0]!.text()).toBe('10') // Bob's streak
    })
  })

  describe('earnings leaderboard', () => {
    it('should display "Top Earnings" heading when on earnings tab', async () => {
      const wrapper = await mountPage()

      await wrapper.findAll('button')[2]!.trigger('click')

      expect(wrapper.find('h1').text()).toBe('Top Earnings')
    })

    it('should sort players by total earnings descending', async () => {
      const wrapper = await mountPage()

      await wrapper.findAll('button')[2]!.trigger('click')

      const playerNames = wrapper.findAll('[data-testid="leaderboard-name"]')
      // Charlie (2000) > Alice (1000) > Bob (500) > Anonymous (100)
      expect(playerNames[0]!.text()).toContain('Charlie')
      expect(playerNames[1]!.text()).toContain('Alice')
      expect(playerNames[2]!.text()).toContain('Bob')
    })

    it('should format earnings using formatPrice', async () => {
      const wrapper = await mountPage()

      await wrapper.findAll('button')[2]!.trigger('click')
      await flushPromises()

      expect(mockFormatPrice).toHaveBeenCalled()
    })
  })

  describe('navigation', () => {
    it('should have a link back to the game', async () => {
      const wrapper = await mountPage()
      const link = wrapper.findComponent(NuxtLinkStub)

      expect(link.exists()).toBe(true)
      expect(link.props('to')).toBe('/')
      expect(link.text()).toBe('Back to Game')
    })
  })

  describe('useFetch configuration', () => {
    it('should fetch leaderboard data on mount', async () => {
      const useFetchSpy = vi.fn(() => Promise.resolve({
        data: mockData,
        status: mockStatus,
        error: mockError,
        refresh: mockRefresh,
      }))
      vi.stubGlobal('useFetch', useFetchSpy)

      await mountPage()

      expect(useFetchSpy).toHaveBeenCalledWith('/api/leaderboard', { query: { limit: 50 } })
    })
  })
})

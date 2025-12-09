import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref, defineComponent } from 'vue'
import IndexPage from '../index.vue'

// Mock refs for composables
const mockPriceData = ref({ price: '50000', timestamp: 123456789 })
const mockSetBid = vi.fn()
const mockClearBid = vi.fn()
const mockConnect = vi.fn()
const mockDisconnect = vi.fn()
const mockGetPlayerId = vi.fn(() => 'test-player-id')
const mockFetchStats = vi.fn()
const mockOnBidComplete = vi.fn()
const mockIsLocked = ref(false)
const mockCleanup = vi.fn()
const mockLoadStats = vi.fn()
const mockRestoreBid = vi.fn()
const mockSetPlayerName = vi.fn()

// Stub child components
const PlayerNamePromptStub = defineComponent({
  name: 'PlayerNamePrompt',
  props: ['show', 'showContent', 'showInput'],
  emits: ['update:show', 'saved'],
  template: '<div data-testid="player-name-prompt" />',
})

const PlayerHeaderStub = defineComponent({
  name: 'PlayerHeader',
  template: '<div data-testid="player-header" />',
})

const BtcPriceChartStub = defineComponent({
  name: 'BtcPriceChart',
  template: '<div data-testid="btc-price-chart" />',
})

const BidStatusStub = defineComponent({
  name: 'BidStatus',
  template: '<div data-testid="bid-status" />',
})

const BidButtonsStub = defineComponent({
  name: 'BidButtons',
  template: '<div data-testid="bid-buttons" />',
})

const PlayerStatsPanelStub = defineComponent({
  name: 'PlayerStatsPanel',
  template: '<div data-testid="player-stats-panel" />',
})

const ClientOnlyStub = defineComponent({
  name: 'ClientOnly',
  template: '<slot />',
})

describe('index.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLocked.value = false
    mockPriceData.value = { price: '50000', timestamp: 123456789 }

    // Stub Nuxt auto-imports
    vi.stubGlobal('useBtcPrice', () => ({
      priceData: mockPriceData,
      setBid: mockSetBid,
      clearBid: mockClearBid,
      connect: mockConnect,
      disconnect: mockDisconnect,
    }))

    vi.stubGlobal('usePlayerId', () => ({
      getPlayerId: mockGetPlayerId,
    }))

    vi.stubGlobal('usePlayerService', () => ({
      fetchStats: mockFetchStats,
      onBidComplete: mockOnBidComplete,
    }))

    vi.stubGlobal('useGameLogic', () => ({
      isLocked: mockIsLocked,
      cleanup: mockCleanup,
      loadStats: mockLoadStats,
      restoreBid: mockRestoreBid,
    }))

    vi.stubGlobal('usePlayerProfile', () => ({
      setPlayerName: mockSetPlayerName,
    }))

    vi.stubGlobal('ref', ref)
    vi.stubGlobal('onMounted', (fn: () => void) => fn())
    vi.stubGlobal('onUnmounted', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const mountPage = () => {
    return mount(IndexPage, {
      global: {
        stubs: {
          PlayerNamePrompt: PlayerNamePromptStub,
          PlayerHeader: PlayerHeaderStub,
          BtcPriceChart: BtcPriceChartStub,
          BidStatus: BidStatusStub,
          BidButtons: BidButtonsStub,
          PlayerStatsPanel: PlayerStatsPanelStub,
          ClientOnly: ClientOnlyStub,
        },
      },
    })
  }

  describe('rendering', () => {
    it('should render all child components', () => {
      mockFetchStats.mockResolvedValue(null)
      const wrapper = mountPage()

      expect(wrapper.find('[data-testid="player-name-prompt"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="player-header"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="btc-price-chart"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="bid-status"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="bid-buttons"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="player-stats-panel"]').exists()).toBe(true)
    })

    it('should have correct layout structure', () => {
      mockFetchStats.mockResolvedValue(null)
      const wrapper = mountPage()

      expect(wrapper.find('main').exists()).toBe(true)
      expect(wrapper.find('.md\\:grid-cols-3').exists()).toBe(true)
    })
  })

  describe('lifecycle - onMounted', () => {
    it('should connect to BTC price on mount', async () => {
      mockFetchStats.mockResolvedValue(null)
      mountPage()
      await flushPromises()

      expect(mockConnect).toHaveBeenCalled()
    })

    it('should get player ID on mount', async () => {
      mockFetchStats.mockResolvedValue(null)
      mountPage()
      await flushPromises()

      expect(mockGetPlayerId).toHaveBeenCalled()
    })

    it('should fetch stats when player ID exists', async () => {
      mockFetchStats.mockResolvedValue(null)
      mountPage()
      await flushPromises()

      expect(mockFetchStats).toHaveBeenCalledWith('test-player-id')
    })

    it('should not fetch stats when no player ID', async () => {
      mockGetPlayerId.mockReturnValueOnce(null as unknown as string)
      mountPage()
      await flushPromises()

      expect(mockFetchStats).not.toHaveBeenCalled()
    })
  })

  describe('player state handling', () => {
    it('should show input for new player with isNewPlayer flag', async () => {
      mockFetchStats.mockResolvedValue({
        isNewPlayer: true,
        playerName: null,
      })

      const wrapper = mountPage()
      await flushPromises()

      const prompt = wrapper.findComponent(PlayerNamePromptStub)
      expect(prompt.props('showInput')).toBe(true)
      expect(prompt.props('showContent')).toBe(true)
    })

    it('should show input for player without name', async () => {
      mockFetchStats.mockResolvedValue({
        isNewPlayer: false,
        playerName: null,
      })

      const wrapper = mountPage()
      await flushPromises()

      const prompt = wrapper.findComponent(PlayerNamePromptStub)
      expect(prompt.props('showInput')).toBe(true)
    })

    it('should hide prompt and load stats for existing player with name', async () => {
      mockFetchStats.mockResolvedValue({
        isNewPlayer: false,
        playerName: 'TestPlayer',
        score: 100,
        wins: 10,
        losses: 5,
      })

      const wrapper = mountPage()
      await flushPromises()

      const prompt = wrapper.findComponent(PlayerNamePromptStub)
      expect(prompt.props('show')).toBe(false)
      expect(mockSetPlayerName).toHaveBeenCalledWith('TestPlayer')
      expect(mockLoadStats).toHaveBeenCalledWith({
        isNewPlayer: false,
        playerName: 'TestPlayer',
        score: 100,
        wins: 10,
        losses: 5,
      })
    })

    it('should handle null stats response', async () => {
      mockFetchStats.mockResolvedValue(null)
      const wrapper = mountPage()
      await flushPromises()

      const prompt = wrapper.findComponent(PlayerNamePromptStub)
      // Should remain in default state
      expect(prompt.props('show')).toBe(true)
      expect(prompt.props('showContent')).toBe(false)
    })
  })

  describe('composable initialization', () => {
    it('should initialize useBtcPrice with correct methods', () => {
      mockFetchStats.mockResolvedValue(null)
      mountPage()

      expect(mockConnect).toBeDefined()
      expect(mockDisconnect).toBeDefined()
      expect(mockSetBid).toBeDefined()
      expect(mockClearBid).toBeDefined()
    })

    it('should pass isLocked to usePlayerProfile', () => {
      mockFetchStats.mockResolvedValue(null)
      const usePlayerProfileSpy = vi.fn(() => ({
        setPlayerName: mockSetPlayerName,
      }))
      vi.stubGlobal('usePlayerProfile', usePlayerProfileSpy)

      mountPage()

      expect(usePlayerProfileSpy).toHaveBeenCalledWith({ isLocked: mockIsLocked })
    })

    it('should pass required args to useGameLogic', () => {
      mockFetchStats.mockResolvedValue(null)
      const useGameLogicSpy = vi.fn(() => ({
        isLocked: mockIsLocked,
        cleanup: mockCleanup,
        loadStats: mockLoadStats,
        restoreBid: mockRestoreBid,
      }))
      vi.stubGlobal('useGameLogic', useGameLogicSpy)

      mountPage()

      expect(useGameLogicSpy).toHaveBeenCalledWith(
        mockPriceData,
        mockSetBid,
        mockClearBid,
        mockOnBidComplete,
      )
    })
  })

  describe('events', () => {
    it('should call setPlayerName when saved event is emitted', async () => {
      mockFetchStats.mockResolvedValue(null)
      const wrapper = mountPage()
      await flushPromises()

      const prompt = wrapper.findComponent(PlayerNamePromptStub)
      await prompt.vm.$emit('saved', 'NewPlayerName')

      expect(mockSetPlayerName).toHaveBeenCalledWith('NewPlayerName')
    })
  })

  describe('lifecycle - onUnmounted', () => {
    it('should register cleanup handlers for unmount', () => {
      mockFetchStats.mockResolvedValue(null)
      const onUnmountedMock = vi.fn()
      vi.stubGlobal('onUnmounted', onUnmountedMock)

      mountPage()

      expect(onUnmountedMock).toHaveBeenCalled()
    })
  })
})

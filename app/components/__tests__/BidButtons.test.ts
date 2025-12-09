import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import BidButtons from '../BidButtons.vue'

// Mock useGameLogic
const mockGuess = ref<'up' | 'down' | null>(null)
const mockIsLocked = ref(false)
const mockMakeGuess = vi.fn()

vi.stubGlobal('useGameLogic', () => ({
  guess: mockGuess,
  isLocked: mockIsLocked,
  makeGuess: mockMakeGuess,
}))

// Mock useBtcPrice
const mockStatus = ref<'connected' | 'connecting' | 'disconnected'>('connected')

vi.stubGlobal('useBtcPrice', () => ({
  status: mockStatus,
}))

describe('BidButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGuess.value = null
    mockIsLocked.value = false
    mockStatus.value = 'connected'
  })

  describe('rendering', () => {
    it('should render two buttons (UP and DOWN)', () => {
      const wrapper = mount(BidButtons)

      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(2)
      expect(buttons[0].text()).toContain('UP')
      expect(buttons[1].text()).toContain('DOWN')
    })

    it('should show arrow icons in buttons', () => {
      const wrapper = mount(BidButtons)

      const buttons = wrapper.findAll('button')
      expect(buttons[0].text()).toContain('⬆')
      expect(buttons[1].text()).toContain('⬇')
    })
  })

  describe('button states', () => {
    it('should enable buttons when connected and not locked', () => {
      mockStatus.value = 'connected'
      mockIsLocked.value = false

      const wrapper = mount(BidButtons)
      const buttons = wrapper.findAll('button')

      expect(buttons[0].attributes('disabled')).toBeUndefined()
      expect(buttons[1].attributes('disabled')).toBeUndefined()
    })

    it('should disable buttons when locked', () => {
      mockIsLocked.value = true

      const wrapper = mount(BidButtons)
      const buttons = wrapper.findAll('button')

      expect(buttons[0].attributes('disabled')).toBeDefined()
      expect(buttons[1].attributes('disabled')).toBeDefined()
    })

    it('should disable buttons when disconnected', () => {
      mockStatus.value = 'disconnected'

      const wrapper = mount(BidButtons)
      const buttons = wrapper.findAll('button')

      expect(buttons[0].attributes('disabled')).toBeDefined()
      expect(buttons[1].attributes('disabled')).toBeDefined()
    })

    it('should disable buttons when connecting', () => {
      mockStatus.value = 'connecting'

      const wrapper = mount(BidButtons)
      const buttons = wrapper.findAll('button')

      expect(buttons[0].attributes('disabled')).toBeDefined()
      expect(buttons[1].attributes('disabled')).toBeDefined()
    })
  })

  describe('active state styling', () => {
    it('should apply active styling to UP button when guess is up', () => {
      mockGuess.value = 'up'

      const wrapper = mount(BidButtons)
      const upButton = wrapper.findAll('button')[0]

      expect(upButton.attributes('data-button-color')).toBe('active')
    })

    it('should apply active styling to DOWN button when guess is down', () => {
      mockGuess.value = 'down'

      const wrapper = mount(BidButtons)
      const downButton = wrapper.findAll('button')[1]

      expect(downButton.attributes('data-button-variant')).toBe('active')
    })

    it('should not apply active styling when no guess', () => {
      mockGuess.value = null

      const wrapper = mount(BidButtons)
      const buttons = wrapper.findAll('button')

      expect(buttons[0].attributes('data-button-color')).toBeUndefined()
      expect(buttons[1].attributes('data-button-variant')).toBeUndefined()
    })
  })

  describe('click interactions', () => {
    it('should call makeGuess with "up" when UP button is clicked', async () => {
      const wrapper = mount(BidButtons)
      const upButton = wrapper.findAll('button')[0]

      await upButton.trigger('click')

      expect(mockMakeGuess).toHaveBeenCalledWith('up')
      expect(mockMakeGuess).toHaveBeenCalledTimes(1)
    })

    it('should call makeGuess with "down" when DOWN button is clicked', async () => {
      const wrapper = mount(BidButtons)
      const downButton = wrapper.findAll('button')[1]

      await downButton.trigger('click')

      expect(mockMakeGuess).toHaveBeenCalledWith('down')
      expect(mockMakeGuess).toHaveBeenCalledTimes(1)
    })

    it('should not call makeGuess when button is disabled and clicked', async () => {
      mockIsLocked.value = true

      const wrapper = mount(BidButtons)
      const upButton = wrapper.findAll('button')[0]

      await upButton.trigger('click')

      // Native disabled buttons don't fire click events
      expect(mockMakeGuess).not.toHaveBeenCalled()
    })
  })
})

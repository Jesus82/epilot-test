import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, defineComponent, h, nextTick } from 'vue'
import PlayerNamePrompt from '../PlayerNamePrompt.vue'

// Mock usePlayerId
const mockGetPlayerId = vi.fn(() => 'test-player-id')
vi.stubGlobal('usePlayerId', () => ({
  getPlayerId: mockGetPlayerId,
}))

// Mock usePlayerService
const mockUpdatePlayerName = vi.fn()
const mockIsLoading = ref(false)
const mockApiError = ref<string | null>(null)

vi.stubGlobal('usePlayerService', () => ({
  updatePlayerName: mockUpdatePlayerName,
  isLoading: mockIsLoading,
  error: mockApiError,
}))

// Stub for PlayerNameInput
const PlayerNameInputStub = defineComponent({
  name: 'PlayerNameInput',
  props: ['modelValue', 'disabled', 'isEditing', 'showCancel'],
  emits: ['update:modelValue', 'save'],
  setup(props, { emit }) {
    return () => h('div', { class: 'player-name-input-stub' }, [
      h('input', {
        value: props.modelValue,
        disabled: props.disabled,
        onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
      }),
      h('button', {
        'onClick': () => emit('save'),
        'data-testid': 'save-btn',
      }, 'Save'),
    ])
  },
})

describe('PlayerNamePrompt', () => {
  const mountOptions = {
    global: {
      stubs: {
        PlayerNameInput: PlayerNameInputStub,
        Transition: false, // Don't stub Transition, let it render
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLoading.value = false
    mockApiError.value = null
    mockUpdatePlayerName.mockReset()
    mockGetPlayerId.mockReturnValue('test-player-id')
  })

  describe('visibility', () => {
    it('should render when show is true', () => {
      const wrapper = mount(PlayerNamePrompt, {
        ...mountOptions,
        props: { show: true },
      })

      expect(wrapper.find('.c-player-name-prompt').exists()).toBe(true)
    })

    it('should not render when show is false', () => {
      const wrapper = mount(PlayerNamePrompt, {
        ...mountOptions,
        props: { show: false },
      })

      expect(wrapper.find('.c-player-name-prompt').exists()).toBe(false)
    })
  })

  describe('content visibility', () => {
    it('should show content when showContent is true', () => {
      const wrapper = mount(PlayerNamePrompt, {
        ...mountOptions,
        props: { show: true, showContent: true },
      })

      expect(wrapper.text()).toContain('Welcome to the BTC Price Prediction Contest!')
    })

    it('should not show content when showContent is false', () => {
      const wrapper = mount(PlayerNamePrompt, {
        ...mountOptions,
        props: { show: true, showContent: false },
      })

      expect(wrapper.text()).not.toContain('Welcome')
    })

    it('should show PlayerNameInput when showInput is true', () => {
      const wrapper = mount(PlayerNamePrompt, {
        ...mountOptions,
        props: { show: true, showContent: true, showInput: true },
      })

      expect(wrapper.findComponent({ name: 'PlayerNameInput' }).exists()).toBe(true)
    })

    it('should not show PlayerNameInput when showInput is false', () => {
      const wrapper = mount(PlayerNamePrompt, {
        ...mountOptions,
        props: { show: true, showContent: true, showInput: false },
      })

      expect(wrapper.findComponent({ name: 'PlayerNameInput' }).exists()).toBe(false)
    })

    it('should pass showCancel=false to PlayerNameInput', () => {
      const wrapper = mount(PlayerNamePrompt, {
        ...mountOptions,
        props: { show: true, showContent: true, showInput: true },
      })

      const playerNameInput = wrapper.findComponent({ name: 'PlayerNameInput' })
      expect(playerNameInput.props('showCancel')).toBe(false)
    })
  })

  describe('save functionality', () => {
    it('should call updatePlayerName when save is triggered with valid name', async () => {
      mockUpdatePlayerName.mockResolvedValue(true)

      const wrapper = mount(PlayerNamePrompt, {
        ...mountOptions,
        props: { show: true, showContent: true, showInput: true },
      })

      // Set the local name via the input
      const input = wrapper.find('input')
      await input.setValue('NewPlayer')

      // Trigger save
      const saveBtn = wrapper.find('[data-testid="save-btn"]')
      await saveBtn.trigger('click')

      expect(mockUpdatePlayerName).toHaveBeenCalledWith('test-player-id', 'NewPlayer')
    })

    it('should emit update:show with false on successful save', async () => {
      mockUpdatePlayerName.mockResolvedValue(true)

      const wrapper = mount(PlayerNamePrompt, {
        ...mountOptions,
        props: { show: true, showContent: true, showInput: true },
      })

      const input = wrapper.find('input')
      await input.setValue('NewPlayer')

      const saveBtn = wrapper.find('[data-testid="save-btn"]')
      await saveBtn.trigger('click')

      expect(wrapper.emitted('update:show')).toBeTruthy()
      expect(wrapper.emitted('update:show')![0]).toEqual([false])
    })

    it('should emit saved event with player name on successful save', async () => {
      mockUpdatePlayerName.mockResolvedValue(true)

      const wrapper = mount(PlayerNamePrompt, {
        ...mountOptions,
        props: { show: true, showContent: true, showInput: true },
      })

      const input = wrapper.find('input')
      await input.setValue('  NewPlayer  ') // With whitespace

      const saveBtn = wrapper.find('[data-testid="save-btn"]')
      await saveBtn.trigger('click')

      expect(wrapper.emitted('saved')).toBeTruthy()
      expect(wrapper.emitted('saved')![0]).toEqual(['NewPlayer']) // Trimmed
    })

    it('should not call updatePlayerName if name is empty', async () => {
      const wrapper = mount(PlayerNamePrompt, {
        ...mountOptions,
        props: { show: true, showContent: true, showInput: true },
      })

      // Don't set any value (empty)
      const saveBtn = wrapper.find('[data-testid="save-btn"]')
      await saveBtn.trigger('click')

      expect(mockUpdatePlayerName).not.toHaveBeenCalled()
    })

    it('should not call updatePlayerName if playerId is empty', async () => {
      mockGetPlayerId.mockReturnValue('')

      const wrapper = mount(PlayerNamePrompt, {
        ...mountOptions,
        props: { show: true, showContent: true, showInput: true },
      })

      const input = wrapper.find('input')
      await input.setValue('NewPlayer')

      const saveBtn = wrapper.find('[data-testid="save-btn"]')
      await saveBtn.trigger('click')

      expect(mockUpdatePlayerName).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should display error when save fails', async () => {
      mockUpdatePlayerName.mockResolvedValue(false)
      mockApiError.value = 'Name already taken'

      const wrapper = mount(PlayerNamePrompt, {
        ...mountOptions,
        props: { show: true, showContent: true, showInput: true },
      })

      const input = wrapper.find('input')
      await input.setValue('TakenName')

      const saveBtn = wrapper.find('[data-testid="save-btn"]')
      await saveBtn.trigger('click')

      await nextTick()

      expect(wrapper.text()).toContain('Name already taken')
    })

    it('should apply red text styling to error', async () => {
      mockUpdatePlayerName.mockResolvedValue(false)
      mockApiError.value = 'Error message'

      const wrapper = mount(PlayerNamePrompt, {
        ...mountOptions,
        props: { show: true, showContent: true, showInput: true },
      })

      const input = wrapper.find('input')
      await input.setValue('Name')

      const saveBtn = wrapper.find('[data-testid="save-btn"]')
      await saveBtn.trigger('click')

      await nextTick()

      expect(wrapper.find('[data-testid="name-error"]').exists()).toBe(true)
    })

    it('should not emit events on failed save', async () => {
      mockUpdatePlayerName.mockResolvedValue(false)
      mockApiError.value = 'Error'

      const wrapper = mount(PlayerNamePrompt, {
        ...mountOptions,
        props: { show: true, showContent: true, showInput: true },
      })

      const input = wrapper.find('input')
      await input.setValue('Name')

      const saveBtn = wrapper.find('[data-testid="save-btn"]')
      await saveBtn.trigger('click')

      expect(wrapper.emitted('update:show')).toBeFalsy()
      expect(wrapper.emitted('saved')).toBeFalsy()
    })
  })

  describe('loading state', () => {
    it('should pass isLoading to PlayerNameInput as disabled', () => {
      mockIsLoading.value = true

      const wrapper = mount(PlayerNamePrompt, {
        ...mountOptions,
        props: { show: true, showContent: true, showInput: true },
      })

      const nameInput = wrapper.findComponent({ name: 'PlayerNameInput' })
      expect(nameInput.props('disabled')).toBe(true)
    })
  })
})

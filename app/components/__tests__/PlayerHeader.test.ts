import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, defineComponent, h, nextTick } from 'vue'
import PlayerHeader from '../PlayerHeader.vue'

// Mock useGameLogic
const mockScore = ref(0)
const mockIsLocked = ref(false)
const mockShowResultFeedback = ref(false)
const mockLastScoreChange = ref<number | null>(null)

vi.stubGlobal('useGameLogic', () => ({
  score: mockScore,
  isLocked: mockIsLocked,
  showResultFeedback: mockShowResultFeedback,
  lastScoreChange: mockLastScoreChange,
}))

// Mock usePlayerProfile
const mockPlayerName = ref('')
const mockIsEditingName = ref(false)
const mockNameError = ref<string | null>(null)
const mockIsLoading = ref(false)
const mockStartEditing = vi.fn()
const mockCancelEditing = vi.fn()
const mockSaveName = vi.fn()

vi.stubGlobal('usePlayerProfile', () => ({
  playerName: mockPlayerName,
  isEditingName: mockIsEditingName,
  nameError: mockNameError,
  isLoading: mockIsLoading,
  startEditing: mockStartEditing,
  cancelEditing: mockCancelEditing,
  saveName: mockSaveName,
}))

// Stub for PlayerNameInput component
const PlayerNameInputStub = defineComponent({
  name: 'PlayerNameInput',
  props: ['modelValue', 'disabled', 'isEditing'],
  emits: ['update:modelValue', 'save', 'cancel'],
  setup(props, { emit }) {
    return () => h('input', {
      'class': 'player-name-input-stub',
      'value': props.modelValue,
      'disabled': props.disabled,
      'data-testid': 'player-name-input',
      'onInput': (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
    })
  },
})

describe('PlayerHeader', () => {
  const mountOptions = {
    global: {
      stubs: {
        PlayerNameInput: PlayerNameInputStub,
      },
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockScore.value = 0
    mockIsLocked.value = false
    mockShowResultFeedback.value = false
    mockLastScoreChange.value = null
    mockPlayerName.value = ''
    mockIsEditingName.value = false
    mockNameError.value = null
    mockIsLoading.value = false
  })

  describe('score display', () => {
    it('should display the current score', () => {
      mockScore.value = 100

      const wrapper = mount(PlayerHeader, mountOptions)

      expect(wrapper.text()).toContain('Score: 100')
    })

    it('should update when score changes', async () => {
      mockScore.value = 50

      const wrapper = mount(PlayerHeader, mountOptions)
      expect(wrapper.text()).toContain('Score: 50')

      mockScore.value = 75
      await nextTick()

      expect(wrapper.text()).toContain('Score: 75')
    })
  })

  describe('player name display', () => {
    it('should display player name when not editing', () => {
      mockPlayerName.value = 'TestPlayer'
      mockIsEditingName.value = false

      const wrapper = mount(PlayerHeader, mountOptions)

      expect(wrapper.text()).toContain('TestPlayer')
    })

    it('should not display name span when editing', () => {
      mockPlayerName.value = 'TestPlayer'
      mockIsEditingName.value = true

      const wrapper = mount(PlayerHeader, mountOptions)
      const nameSpan = wrapper.find('.cursor-pointer')

      expect(nameSpan.exists()).toBe(false)
    })

    it('should not display name span when playerName is empty', () => {
      mockPlayerName.value = ''
      mockIsEditingName.value = false

      const wrapper = mount(PlayerHeader, mountOptions)
      const nameSpan = wrapper.find('.cursor-pointer')

      expect(nameSpan.exists()).toBe(false)
    })
  })

  describe('edit mode toggle', () => {
    it('should call startEditing when name is clicked and not locked', async () => {
      mockPlayerName.value = 'TestPlayer'
      mockIsEditingName.value = false
      mockIsLocked.value = false

      const wrapper = mount(PlayerHeader, mountOptions)
      const nameSpan = wrapper.find('.cursor-pointer')

      await nameSpan.trigger('click')

      expect(mockStartEditing).toHaveBeenCalled()
    })

    it('should not call startEditing when name is clicked and locked', async () => {
      mockPlayerName.value = 'TestPlayer'
      mockIsEditingName.value = false
      mockIsLocked.value = true

      const wrapper = mount(PlayerHeader, mountOptions)
      const nameSpan = wrapper.find('.cursor-pointer')

      await nameSpan.trigger('click')

      expect(mockStartEditing).not.toHaveBeenCalled()
    })

    it('should apply opacity class when locked', () => {
      mockPlayerName.value = 'TestPlayer'
      mockIsEditingName.value = false
      mockIsLocked.value = true

      const wrapper = mount(PlayerHeader, mountOptions)
      const nameSpan = wrapper.find('.cursor-pointer')

      expect(nameSpan.classes()).toContain('opacity-50')
      expect(nameSpan.classes()).toContain('cursor-not-allowed')
    })

    it('should have tooltip indicating locked state', () => {
      mockPlayerName.value = 'TestPlayer'
      mockIsEditingName.value = false
      mockIsLocked.value = true

      const wrapper = mount(PlayerHeader, mountOptions)
      const nameSpan = wrapper.find('.cursor-pointer')

      expect(nameSpan.attributes('title')).toContain('Cannot edit while bid is locked')
    })
  })

  describe('editing mode', () => {
    it('should show PlayerNameInput when editing', () => {
      mockPlayerName.value = 'TestPlayer'
      mockIsEditingName.value = true

      const wrapper = mount(PlayerHeader, mountOptions)

      expect(wrapper.findComponent({ name: 'PlayerNameInput' }).exists()).toBe(true)
    })

    it('should hide PlayerNameInput when not editing', () => {
      mockPlayerName.value = 'TestPlayer'
      mockIsEditingName.value = false

      const wrapper = mount(PlayerHeader, mountOptions)

      expect(wrapper.findComponent({ name: 'PlayerNameInput' }).exists()).toBe(false)
    })

    it('should pass disabled prop based on isLoading', () => {
      mockPlayerName.value = 'TestPlayer'
      mockIsEditingName.value = true
      mockIsLoading.value = true

      const wrapper = mount(PlayerHeader, mountOptions)
      const input = wrapper.findComponent({ name: 'PlayerNameInput' })

      expect(input.props('disabled')).toBe(true)
    })
  })

  describe('error display', () => {
    it('should show error message when nameError exists during editing', () => {
      mockPlayerName.value = 'TestPlayer'
      mockIsEditingName.value = true
      mockNameError.value = 'Name already taken'

      const wrapper = mount(PlayerHeader, mountOptions)

      expect(wrapper.text()).toContain('Name already taken')
    })

    it('should apply red text styling to error', () => {
      mockPlayerName.value = 'TestPlayer'
      mockIsEditingName.value = true
      mockNameError.value = 'Name already taken'

      const wrapper = mount(PlayerHeader, mountOptions)
      const errorElement = wrapper.find('.text-red')

      expect(errorElement.exists()).toBe(true)
    })

    it('should not show error when nameError is null', () => {
      mockPlayerName.value = 'TestPlayer'
      mockIsEditingName.value = true
      mockNameError.value = null

      const wrapper = mount(PlayerHeader, mountOptions)

      expect(wrapper.text()).not.toContain('error')
    })
  })

  describe('score change indicator', () => {
    it('should not show score change indicator when showResultFeedback is false', () => {
      mockShowResultFeedback.value = false
      mockLastScoreChange.value = 1

      const wrapper = mount(PlayerHeader, mountOptions)

      expect(wrapper.find('[data-testid="score-change-indicator"]').exists()).toBe(false)
    })

    it('should not show score change indicator when lastScoreChange is null', () => {
      mockShowResultFeedback.value = true
      mockLastScoreChange.value = null

      const wrapper = mount(PlayerHeader, mountOptions)

      expect(wrapper.find('[data-testid="score-change-indicator"]').exists()).toBe(false)
    })

    it('should show +1 with green text for winning bid', () => {
      mockShowResultFeedback.value = true
      mockLastScoreChange.value = 1

      const wrapper = mount(PlayerHeader, mountOptions)

      const scoreIndicator = wrapper.find('[data-testid="score-change-indicator"]')
      expect(scoreIndicator.exists()).toBe(true)
      expect(scoreIndicator.text()).toBe('+1')
      expect(scoreIndicator.classes()).toContain('text-green')
    })

    it('should show -1 with red text for losing bid', () => {
      mockShowResultFeedback.value = true
      mockLastScoreChange.value = -1

      const wrapper = mount(PlayerHeader, mountOptions)

      const scoreIndicator = wrapper.find('[data-testid="score-change-indicator"]')
      expect(scoreIndicator.exists()).toBe(true)
      expect(scoreIndicator.text()).toBe('-1')
      expect(scoreIndicator.classes()).toContain('text-red')
    })
  })
})

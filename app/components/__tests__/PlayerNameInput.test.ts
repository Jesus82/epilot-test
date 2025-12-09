import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import PlayerNameInput from '../PlayerNameInput.vue'

// Stub nextTick for auto-imports
vi.stubGlobal('nextTick', nextTick)

describe('PlayerNameInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render input with initial value', () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: 'TestPlayer' },
      })

      const input = wrapper.find('input')
      expect(input.element.value).toBe('TestPlayer')
    })

    it('should render Save and Cancel buttons', () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: '' },
      })

      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(2)
      expect(buttons[0].text()).toBe('Save')
      expect(buttons[1].text()).toBe('Cancel')
    })

    it('should have maxlength of 20 on input', () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: '' },
      })

      const input = wrapper.find('input')
      expect(input.attributes('maxlength')).toBe('20')
    })

    it('should show placeholder when empty', () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: '' },
      })

      const input = wrapper.find('input')
      expect(input.attributes('placeholder')).toBe('Enter your name')
    })
  })

  describe('disabled state', () => {
    it('should disable input when disabled prop is true', () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: 'Test', disabled: true },
      })

      const input = wrapper.find('input')
      expect(input.attributes('disabled')).toBeDefined()
    })

    it('should disable Save button when disabled prop is true', () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: 'Test', disabled: true, isEditing: true },
      })

      const saveButton = wrapper.findAll('button')[0]
      expect(saveButton.attributes('disabled')).toBeDefined()
    })

    it('should disable Cancel button when disabled prop is true', () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: 'Test', disabled: true },
      })

      const cancelButton = wrapper.findAll('button')[1]
      expect(cancelButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('Save button state', () => {
    it('should disable Save button when input is empty', () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: '' },
      })

      const saveButton = wrapper.findAll('button')[0]
      expect(saveButton.attributes('disabled')).toBeDefined()
    })

    it('should disable Save button when input is only whitespace', async () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: '   ' },
      })

      const saveButton = wrapper.findAll('button')[0]
      expect(saveButton.attributes('disabled')).toBeDefined()
    })

    it('should disable Save button when value has not changed', () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: 'TestPlayer', isEditing: true },
      })

      const saveButton = wrapper.findAll('button')[0]
      expect(saveButton.attributes('disabled')).toBeDefined()
    })

    it('should enable Save button when value has changed and is valid', async () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: 'TestPlayer', isEditing: true },
      })

      // Simulate input change
      const input = wrapper.find('input')
      await input.setValue('NewName')

      const saveButton = wrapper.findAll('button')[0]
      expect(saveButton.attributes('disabled')).toBeUndefined()
    })
  })

  describe('input events', () => {
    it('should emit update:modelValue when input changes', async () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: '' },
      })

      const input = wrapper.find('input')
      await input.setValue('NewName')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })

    it('should update local value when typing', async () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: '' },
      })

      const input = wrapper.find('input')
      await input.setValue('Hello')

      expect(input.element.value).toBe('Hello')
    })
  })

  describe('keyboard interactions', () => {
    it('should emit save on Enter key when value is valid', async () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: 'Original', isEditing: true },
      })

      const input = wrapper.find('input')
      await input.setValue('Changed')
      await input.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('save')).toBeTruthy()
    })

    it('should not emit save on Enter key when value is empty', async () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: '' },
      })

      const input = wrapper.find('input')
      await input.trigger('keydown', { key: 'Enter' })

      expect(wrapper.emitted('save')).toBeFalsy()
    })

    it('should emit cancel on Escape key', async () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: 'Test' },
      })

      const input = wrapper.find('input')
      await input.trigger('keydown', { key: 'Escape' })

      expect(wrapper.emitted('cancel')).toBeTruthy()
    })
  })

  describe('button clicks', () => {
    it('should emit save when Save button is clicked', async () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: 'Original', isEditing: true },
      })

      const input = wrapper.find('input')
      await input.setValue('Changed')

      const saveButton = wrapper.findAll('button')[0]
      await saveButton.trigger('click')

      expect(wrapper.emitted('save')).toBeTruthy()
    })

    it('should emit cancel when Cancel button is clicked', async () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: 'Test' },
      })

      const cancelButton = wrapper.findAll('button')[1]
      await cancelButton.trigger('click')

      expect(wrapper.emitted('cancel')).toBeTruthy()
    })

    it('should reset value to original on cancel', async () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: 'Original', isEditing: true },
      })

      const input = wrapper.find('input')
      await input.setValue('Changed')

      const cancelButton = wrapper.findAll('button')[1]
      await cancelButton.trigger('click')

      // Should emit update:modelValue with original value
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      expect(emitted![emitted!.length - 1]).toEqual(['Original'])
    })
  })

  describe('prop reactivity', () => {
    it('should update local value when modelValue prop changes', async () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: 'Initial' },
      })

      await wrapper.setProps({ modelValue: 'Updated' })

      const input = wrapper.find('input')
      expect(input.element.value).toBe('Updated')
    })
  })

  describe('hasChanged computed', () => {
    it('should consider trimmed values for change detection', async () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: 'Test', isEditing: true },
      })

      const input = wrapper.find('input')
      // Add whitespace but same trimmed value
      await input.setValue('Test  ')

      const saveButton = wrapper.findAll('button')[0]
      // Should still be disabled because trimmed values are the same
      expect(saveButton.attributes('disabled')).toBeDefined()
    })
  })

  describe('isEditing behavior', () => {
    it('should store original name when isEditing becomes true', async () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: 'Original', isEditing: false },
      })

      // Change to editing mode
      await wrapper.setProps({ isEditing: true })
      await nextTick()

      // Now change the value
      const input = wrapper.find('input')
      await input.setValue('Changed')

      // Cancel should restore to Original
      const cancelButton = wrapper.findAll('button')[1]
      await cancelButton.trigger('click')

      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted![emitted!.length - 1]).toEqual(['Original'])
    })

    it('should focus input when isEditing becomes true', async () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: 'Test', isEditing: false },
        attachTo: document.body,
      })

      const input = wrapper.find('input')
      const focusSpy = vi.spyOn(input.element, 'focus')
      const selectSpy = vi.spyOn(input.element, 'select')

      await wrapper.setProps({ isEditing: true })
      await nextTick()
      await nextTick() // Extra tick for the internal nextTick in the watcher

      expect(focusSpy).toHaveBeenCalled()
      expect(selectSpy).toHaveBeenCalled()

      wrapper.unmount()
    })
  })

  describe('showCancel prop', () => {
    it('should show Cancel button by default', () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: '' },
      })

      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(2)
      expect(buttons[1].text()).toBe('Cancel')
    })

    it('should hide Cancel button when showCancel is false', () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: '', showCancel: false },
      })

      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(1)
      expect(buttons[0].text()).toBe('Save')
    })

    it('should show Cancel button when showCancel is true', () => {
      const wrapper = mount(PlayerNameInput, {
        props: { modelValue: '', showCancel: true },
      })

      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(2)
    })
  })
})

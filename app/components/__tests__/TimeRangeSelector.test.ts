import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TimeRangeSelector from '../TimeRangeSelector.vue'
import { TIME_RANGES } from '~/helpers/btcPriceChartHelpers'

describe('TimeRangeSelector', () => {
  describe('rendering', () => {
    it('should render all time range buttons', () => {
      const wrapper = mount(TimeRangeSelector, {
        props: { modelValue: 5 },
      })

      const buttons = wrapper.findAll('button')
      expect(buttons).toHaveLength(TIME_RANGES.length)
    })

    it('should display correct labels for each range', () => {
      const wrapper = mount(TimeRangeSelector, {
        props: { modelValue: 5 },
      })

      const buttons = wrapper.findAll('button')
      TIME_RANGES.forEach((range, index) => {
        expect(buttons[index]!.text()).toBe(range.label)
      })
    })

    it('should render the container with correct class', () => {
      const wrapper = mount(TimeRangeSelector, {
        props: { modelValue: 5 },
      })

      expect(wrapper.find('.time-range-selector').exists()).toBe(true)
    })
  })

  describe('active state', () => {
    it('should apply active class to button matching modelValue', () => {
      const wrapper = mount(TimeRangeSelector, {
        props: { modelValue: 60 },
      })

      const buttons = wrapper.findAll('button')
      const hourButton = buttons.find(btn => btn.text() === '1h')

      expect(hourButton?.classes()).toContain('time-range-selector__btn--active')
    })

    it('should only have one active button at a time', () => {
      const wrapper = mount(TimeRangeSelector, {
        props: { modelValue: 5 },
      })

      const activeButtons = wrapper.findAll('.time-range-selector__btn--active')
      expect(activeButtons).toHaveLength(1)
    })

    it('should update active button when modelValue changes', async () => {
      const wrapper = mount(TimeRangeSelector, {
        props: { modelValue: 5 },
      })

      // Initially 5m should be active
      let activeButton = wrapper.find('.time-range-selector__btn--active')
      expect(activeButton.text()).toBe('5m')

      // Change to 24h
      await wrapper.setProps({ modelValue: 1440 })

      activeButton = wrapper.find('.time-range-selector__btn--active')
      expect(activeButton.text()).toBe('24h')
    })
  })

  describe('click interactions', () => {
    it('should emit update:modelValue when button is clicked', async () => {
      const wrapper = mount(TimeRangeSelector, {
        props: { modelValue: 5 },
      })

      const buttons = wrapper.findAll('button')
      const hourButton = buttons.find(btn => btn.text() === '1h')

      await hourButton?.trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
      expect(wrapper.emitted('update:modelValue')![0]).toEqual([60])
    })

    it('should emit correct value for each time range', async () => {
      const wrapper = mount(TimeRangeSelector, {
        props: { modelValue: 5 },
      })

      const buttons = wrapper.findAll('button')

      // Click buttons that are NOT the current value (to get emissions)
      // Start from index 1 since index 0 (5m) is already the current value
      for (let i = 1; i < TIME_RANGES.length; i++) {
        await buttons[i]!.trigger('click')
      }

      const emitted = wrapper.emitted('update:modelValue')!
      expect(emitted).toHaveLength(TIME_RANGES.length - 1)

      // Verify the emitted values match the expected ranges (skipping first)
      for (let i = 0; i < emitted.length; i++) {
        expect(emitted[i]).toEqual([TIME_RANGES[i + 1]!.minutes])
      }
    })

    it('should not emit when clicking already active button with same value', async () => {
      const wrapper = mount(TimeRangeSelector, {
        props: { modelValue: 5 },
      })

      const activeButton = wrapper.find('.time-range-selector__btn--active')
      await activeButton.trigger('click')

      // Vue's defineModel optimizes and doesn't emit if value hasn't changed
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeFalsy()
    })
  })

  describe('button styling', () => {
    it('should apply base class to all buttons', () => {
      const wrapper = mount(TimeRangeSelector, {
        props: { modelValue: 5 },
      })

      const buttons = wrapper.findAll('button')
      buttons.forEach((button) => {
        expect(button.classes()).toContain('time-range-selector__btn')
      })
    })

    it('should not apply active class to non-selected buttons', () => {
      const wrapper = mount(TimeRangeSelector, {
        props: { modelValue: 5 },
      })

      const buttons = wrapper.findAll('button')
      const nonActiveButtons = buttons.filter(btn => btn.text() !== '5m')

      nonActiveButtons.forEach((button) => {
        expect(button.classes()).not.toContain('time-range-selector__btn--active')
      })
    })
  })
})

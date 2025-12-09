<script setup lang="ts">
import { TIME_RANGES } from '~/helpers/btcPriceChartHelpers'

const model = defineModel<number>({ required: true })
</script>

<template>
  <div class="time-range-selector" role="group" aria-label="Select time range">
    <button
      v-for="range in TIME_RANGES"
      :key="range.minutes"
      :class="['time-range-selector__btn', { 'time-range-selector__btn--active': model === range.minutes }]"
      :aria-pressed="model === range.minutes"
      :aria-label="`Show last ${range.label} of data`"
      @click="model = range.minutes"
    >
      {{ range.label }}
    </button>
  </div>
</template>

<style scoped>
.time-range-selector {
  display: flex;
  gap: var(--spacing-sixteenth);
  background: var(--color-gray-lightest);
  padding: var(--spacing-sixteenth);
  border-radius: 6px;
}

.time-range-selector__btn {
  padding: var(--spacing-sixteenth) var(--spacing-quarter);
  border: none;
  background: transparent;
  color: var(--color-gray);
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.time-range-selector__btn:hover {
  color: var(--color-gray-dark);
  background: var(--color-gray-light);
}

.time-range-selector__btn--active {
  background: var(--color-white);
  color: var(--color-blue);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>

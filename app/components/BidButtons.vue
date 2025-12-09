<script setup lang="ts">
import type { GuessDirection } from '../../shared/types/game'

interface Props {
  isLocked: boolean
  isConnected: boolean
  guess: GuessDirection
}

interface Emits {
  (e: 'guess', direction: 'up' | 'down'): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

const handleGuess = (direction: 'up' | 'down') => {
  emit('guess', direction)
}
</script>

<template>
  <div class="col-start-2 flex flex-col p-second">
    <div class="flex justify-center gap-half">
      <button
        class="o-button"
        :disabled="isLocked || !isConnected"
        :data-button-color="guess === 'up' ? 'active' : null"
        @click="handleGuess('up')"
      >
        <span>⬆</span>
        <span>UP</span>
      </button>

      <button
        class="o-button"
        :disabled="isLocked || !isConnected"
        :data-button-variant="guess === 'down' ? 'active' : null"
        @click="handleGuess('down')"
      >
        <span>⬇</span>
        <span>DOWN</span>
      </button>
    </div>
  </div>
</template>

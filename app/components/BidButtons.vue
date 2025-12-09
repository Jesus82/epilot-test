<script setup lang="ts">
const { guess, isLocked, makeGuess } = useGameLogic()
const { status } = useBtcPrice()

const isConnected = computed(() => status.value === 'connected')

const handleGuess = (direction: 'up' | 'down') => {
  makeGuess(direction)
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

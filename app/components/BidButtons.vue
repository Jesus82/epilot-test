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
        aria-label="Predict price will go up"
        @click="handleGuess('up')"
      >
        <span aria-hidden="true">⬆</span>
        <span>UP</span>
      </button>

      <button
        class="o-button"
        :disabled="isLocked || !isConnected"
        :data-button-variant="guess === 'down' ? 'active' : null"
        aria-label="Predict price will go down"
        @click="handleGuess('down')"
      >
        <span aria-hidden="true">⬇</span>
        <span>DOWN</span>
      </button>
    </div>
  </div>
</template>

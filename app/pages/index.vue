<script setup lang="ts">
const { priceData, formattedPrice, status, setBid, clearBid, connect, disconnect } = useBtcPrice()

// Game logic composable
const {
  score,
  guess,
  isLocked,
  countdown,
  guessPrice,
  makeGuess,
  cleanup,
} = useGameLogic(priceData, setBid, clearBid)

onMounted(() => {
  connect()
})

onUnmounted(() => {
  disconnect()
  cleanup()
})
</script>

<template>
  <main>
    <h1>BTC Price Prediction Game</h1>
    
    <ClientOnly fallback-tag="div">
      <BtcPriceChart />
      
      <div>
        <p><strong>Status:</strong> {{ status }}</p>
        <p><strong>Current Price:</strong> {{ formattedPrice ?? 'Loading...' }}</p>
        <p><strong>Score:</strong> {{ score }}</p>
      </div>
      
      <div v-if="isLocked">
        <p><strong>Your guess:</strong> {{ guess?.toUpperCase() }}</p>
        <p><strong>Price when guessed:</strong> ${{ guessPrice?.toFixed(2) }}</p>
        <p>{{ countdown }}s</p>
      </div>
      
      <div>
        <button 
          @click="makeGuess('up')"
          :disabled="isLocked || status !== 'connected'"
        >
          ⬆ UP
        </button>
        
        <button 
          @click="makeGuess('down')"
          :disabled="isLocked || status !== 'connected'"
        >
          ⬇ DOWN
        </button>
      </div>
    </ClientOnly>
  </main>
</template>

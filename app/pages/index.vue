<script setup lang="ts">
const { priceData, formattedPrice, status, bidPrice, connect, disconnect } = useBtcPrice()

// Game state
const score = ref(0)
const guess = ref<'up' | 'down' | null>(null)
const isLocked = ref(false)
const countdown = ref(0)
const guessPrice = ref<number | null>(null)

let countdownInterval: ReturnType<typeof setInterval> | null = null

const makeGuess = (direction: 'up' | 'down') => {
  if (isLocked.value || !priceData.value) return
  
  // Lock the buttons
  isLocked.value = true
  guess.value = direction
  guessPrice.value = priceData.value.price
  bidPrice.value = priceData.value.price // Set bid marker
  countdown.value = 60
  
  // Start countdown
  countdownInterval = setInterval(() => {
    countdown.value--
    
    if (countdown.value <= 0) {
      checkGuess()
    }
  }, 1000)
}

const checkGuess = () => {
  if (!priceData.value || !guessPrice.value || !guess.value) return
  
  const currentPrice = priceData.value.price
  const priceWentUp = currentPrice > guessPrice.value
  
  const isCorrect = (guess.value === 'up' && priceWentUp) || (guess.value === 'down' && !priceWentUp)
  
  if (isCorrect) {
    score.value++
  } else {
    score.value--
  }
  
  // Reset game state
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
  
  isLocked.value = false
  guess.value = null
  guessPrice.value = null
  bidPrice.value = null // Clear bid marker
  countdown.value = 0
}

onMounted(() => {
  connect()
})

onUnmounted(() => {
  disconnect()
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})
</script>

<template>
  <main>
    <h1>BTC Price Prediction Game</h1>
    
    <ClientOnly fallback-tag="div">
      <BtcPriceChart />
      <BtcPriceTradingView />
      
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

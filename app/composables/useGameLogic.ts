import type { BtcPriceData } from '~/types/btc'

export type GuessDirection = 'up' | 'down' | null

export interface GameState {
  score: Ref<number>
  guess: Ref<GuessDirection>
  isLocked: Ref<boolean>
  countdown: Ref<number>
  guessPrice: Ref<number | null>
}

export const useGameLogic = (
  priceData: Ref<BtcPriceData | null>,
  setBid: (price: number | null, direction: GuessDirection) => void,
  clearBid: () => void,
) => {
  // Game state
  const score = ref(0)
  const guess = ref<GuessDirection>(null)
  const isLocked = ref(false)
  const countdown = ref(0)
  const guessPrice = ref<number | null>(null)

  let countdownInterval: ReturnType<typeof setInterval> | null = null

  /**
   * Evaluate if the guess was correct based on price movement
   */
  const evaluateGuess = (
    guessDirection: 'up' | 'down',
    priceAtGuess: number,
    currentPrice: number,
  ): boolean => {
    const priceWentUp = currentPrice > priceAtGuess
    return (guessDirection === 'up' && priceWentUp) || (guessDirection === 'down' && !priceWentUp)
  }

  /**
   * Reset the game state after a guess is evaluated
   */
  const resetGameState = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }

    isLocked.value = false
    guess.value = null
    guessPrice.value = null
    clearBid()
    countdown.value = 0
  }

  /**
   * Check the guess result and update score
   */
  const checkGuess = () => {
    if (!priceData.value || !guessPrice.value || !guess.value) return

    const currentPrice = priceData.value.price
    const isCorrect = evaluateGuess(guess.value, guessPrice.value, currentPrice)

    if (isCorrect) {
      score.value++
    }
    else {
      score.value--
    }

    resetGameState()
  }

  /**
   * Make a guess (up or down) and start the countdown
   */
  const makeGuess = (direction: 'up' | 'down', countdownSeconds: number = 60) => {
    if (isLocked.value || !priceData.value) return

    // Lock the buttons
    isLocked.value = true
    guess.value = direction
    guessPrice.value = priceData.value.price
    setBid(priceData.value.price, direction) // Set bid marker with direction
    countdown.value = countdownSeconds

    // Start countdown
    countdownInterval = setInterval(() => {
      countdown.value--

      if (countdown.value <= 0) {
        checkGuess()
      }
    }, 1000)
  }

  /**
   * Cancel an active guess (useful for testing or user cancellation)
   */
  const cancelGuess = () => {
    resetGameState()
  }

  /**
   * Computed that determines if the current bet is winning
   */
  const isWinning = computed(() => {
    if (!guess.value || !guessPrice.value || !priceData.value) return false

    const difference = priceData.value.price - guessPrice.value
    return guess.value === 'up' ? difference > 0 : difference < 0
  })

  /**
   * Cleanup function to be called on unmount
   */
  const cleanup = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }
  }

  return {
    // State
    score,
    guess,
    isLocked,
    countdown,
    guessPrice,
    isWinning,

    // Actions
    makeGuess,
    checkGuess,
    cancelGuess,
    cleanup,

    // Pure function exposed for testing
    evaluateGuess,
  }
}

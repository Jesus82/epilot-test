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
  bidPrice: Ref<number | null>,
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
    bidPrice.value = null
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
    bidPrice.value = priceData.value.price // Set bid marker
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

    // Actions
    makeGuess,
    checkGuess,
    cancelGuess,
    cleanup,

    // Pure function exposed for testing
    evaluateGuess,
  }
}

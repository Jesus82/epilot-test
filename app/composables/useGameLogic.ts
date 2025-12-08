import type { BtcPriceData } from '~/types/btc'
import type { GuessDirection, BidResult, GameState } from '~/types/game'
import type { PlayerStats } from '~/types/player'
import { calculateIsWinning } from '~/helpers/btcChartHelpers'

export type { GuessDirection, BidResult, GameState, PlayerStats }

export const useGameLogic = (
  priceData: Ref<BtcPriceData | null>,
  setBid: (price: number | null, direction: GuessDirection) => void,
  clearBid: () => void,
  onBidComplete?: (result: BidResult) => void,
) => {
  // Game state
  const score = ref(0)
  const guess = ref<GuessDirection>(null)
  const isLocked = ref(false)
  const countdown = ref(0)
  const guessPrice = ref<number | null>(null)

  // Stats state
  const currentStreak = ref(0)
  const longestStreak = ref(0)
  const totalWins = ref(0)
  const totalLosses = ref(0)
  const totalEarnings = ref(0)
  const lastBidResult = ref<BidResult | null>(null)

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
   * Calculate earnings based on price difference and guess direction
   * Positive if won, negative if lost
   */
  const calculateEarnings = (
    guessDirection: 'up' | 'down',
    priceAtGuess: number,
    currentPrice: number,
  ): number => {
    const priceDiff = currentPrice - priceAtGuess
    // If guessed up: earn the difference (positive if price went up)
    // If guessed down: earn the inverse (positive if price went down)
    return guessDirection === 'up' ? priceDiff : -priceDiff
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
   * Check the guess result and update score and stats
   */
  const checkGuess = () => {
    if (!priceData.value || !guessPrice.value || !guess.value) return

    const currentPrice = priceData.value.price
    const isCorrect = evaluateGuess(guess.value, guessPrice.value, currentPrice)
    const earnings = calculateEarnings(guess.value, guessPrice.value, currentPrice)

    // Update score
    if (isCorrect) {
      score.value++
      totalWins.value++
      currentStreak.value++
      if (currentStreak.value > longestStreak.value) {
        longestStreak.value = currentStreak.value
      }
    }
    else {
      score.value--
      totalLosses.value++
      currentStreak.value = 0
    }

    // Update earnings
    totalEarnings.value += earnings

    // Create bid result
    const bidResult: BidResult = {
      direction: guess.value,
      bidPrice: guessPrice.value,
      finalPrice: currentPrice,
      earnings,
      won: isCorrect,
      timestamp: Date.now(),
    }
    lastBidResult.value = bidResult

    // Notify callback if provided
    onBidComplete?.(bidResult)

    resetGameState()
  }

  /**
   * Check if price has changed from bid price
   */
  const hasPriceChanged = (): boolean => {
    if (!priceData.value || !guessPrice.value) return false
    return priceData.value.price !== guessPrice.value
  }

  /**
   * Tracks if minimum time has passed (countdown <= 0)
   */
  const isMinimumTimePassed = ref(false)

  /**
   * Make a guess (up or down) and start the countdown
   * The guess resolves when: countdown reaches 0 AND price has changed
   */
  const makeGuess = (direction: 'up' | 'down', countdownSeconds: number = 60) => {
    if (isLocked.value || !priceData.value) return

    // Lock the buttons
    isLocked.value = true
    guess.value = direction
    guessPrice.value = priceData.value.price
    isMinimumTimePassed.value = false
    setBid(priceData.value.price, direction) // Set bid marker with direction
    countdown.value = countdownSeconds

    // Start countdown
    countdownInterval = setInterval(() => {
      countdown.value--

      if (countdown.value <= 0) {
        isMinimumTimePassed.value = true
        // Check if price has already changed
        if (hasPriceChanged()) {
          checkGuess()
        }
        // If price hasn't changed, keep interval running to check on each tick
        // The watcher on priceData will handle resolution when price changes
      }
    }, 1000)
  }

  /**
   * Watch for price changes after minimum time has passed
   */
  watch(() => priceData.value?.price, () => {
    if (isMinimumTimePassed.value && hasPriceChanged()) {
      checkGuess()
    }
  })

  /**
   * Cancel an active guess (useful for testing or user cancellation)
   */
  const cancelGuess = () => {
    isMinimumTimePassed.value = false
    resetGameState()
  }

  /**
   * Computed that determines if the current bet is winning
   */
  const isWinning = computed(() => {
    if (!guess.value || !guessPrice.value || !priceData.value) return false

    return calculateIsWinning(guess.value, priceData.value.price, guessPrice.value)
  })

  /**
   * Computed for current potential earnings (before bid completes)
   */
  const potentialEarnings = computed(() => {
    if (!guess.value || !guessPrice.value || !priceData.value) return 0

    return calculateEarnings(guess.value, guessPrice.value, priceData.value.price)
  })

  /**
   * Load stats from external source (e.g., API or localStorage)
   */
  const loadStats = (stats: PlayerStats) => {
    currentStreak.value = stats.currentStreak
    longestStreak.value = stats.longestStreak
    totalWins.value = stats.totalWins
    totalLosses.value = stats.totalLosses
    totalEarnings.value = stats.totalEarnings
  }

  /**
   * Get current stats as a plain object
   */
  const getStats = (): PlayerStats => ({
    currentStreak: currentStreak.value,
    longestStreak: longestStreak.value,
    totalWins: totalWins.value,
    totalLosses: totalLosses.value,
    totalEarnings: totalEarnings.value,
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
    isMinimumTimePassed,

    // Stats state
    currentStreak,
    longestStreak,
    totalWins,
    totalLosses,
    totalEarnings,
    lastBidResult,
    potentialEarnings,

    // Actions
    makeGuess,
    checkGuess,
    cancelGuess,
    cleanup,
    loadStats,
    getStats,

    // Pure functions exposed for testing
    evaluateGuess,
    calculateEarnings,
    hasPriceChanged,
  }
}

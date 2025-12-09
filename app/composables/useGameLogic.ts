import type { BtcPriceData } from '../../shared/types/btc'
import type { GuessDirection, GameState } from '../../shared/types/game'
import type { BidResult } from '../../shared/types/api'
import type { PlayerStats } from '../../shared/types/player'
import { calculateIsWinning } from '~/helpers/btcChartHelpers'
import {
  evaluateGuess,
  calculateEarnings,
  calculateStatsUpdate,
  createBidResult,
  createInitialBidState,
} from '~/helpers/gameLogicHelpers'

// Shared game state (module-level for singleton behavior)
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

// Internal state for minimum time tracking
const isMinimumTimePassed = ref(false)

// Store dependencies (set once during initialization)
let priceDataRef: Ref<BtcPriceData | null> | null = null
let setBidFn: ((price: number | null, direction: GuessDirection) => void) | null = null
let clearBidFn: (() => void) | null = null
let onBidCompleteFn: ((result: BidResult) => void) | null = null
let countdownInterval: ReturnType<typeof setInterval> | null = null
let isInitialized = false

export const useGameLogic = (
  priceData?: Ref<BtcPriceData | null>,
  setBid?: (price: number | null, direction: GuessDirection) => void,
  clearBid?: () => void,
  onBidComplete?: (result: BidResult) => void,
) => {
  // Initialize dependencies on first call with params
  if (priceData && setBid && clearBid && !isInitialized) {
    priceDataRef = priceData
    setBidFn = setBid
    clearBidFn = clearBid
    onBidCompleteFn = onBidComplete ?? null
    isInitialized = true

    // Set up watcher for price changes after minimum time has passed
    watch(() => priceDataRef?.value?.price, () => {
      if (isMinimumTimePassed.value && hasPriceChanged()) {
        checkGuess()
      }
    })
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
    clearBidFn?.()
    countdown.value = 0
  }

  /**
   * Check the guess result and update score and stats
   */
  const checkGuess = () => {
    if (!priceDataRef?.value || !guessPrice.value || !guess.value) return

    const currentPrice = priceDataRef.value.price
    const isCorrect = evaluateGuess(guess.value, guessPrice.value, currentPrice)
    const earnings = calculateEarnings(guess.value, guessPrice.value, currentPrice)

    const newStats = calculateStatsUpdate(getStats(), isCorrect, earnings)

    loadStats(newStats)

    const bidResult = createBidResult(guess.value, guessPrice.value, currentPrice, earnings, isCorrect)
    lastBidResult.value = bidResult

    // Notify callback if provided
    onBidCompleteFn?.(bidResult)

    resetGameState()
  }

  /**
   * Check if price has changed from bid price
   */
  const hasPriceChanged = (): boolean => {
    if (!priceDataRef?.value || !guessPrice.value) return false
    return priceDataRef.value.price !== guessPrice.value
  }

  /**
   * Make a guess (up or down) and start the countdown
   * The guess resolves when: countdown reaches 0 AND price has changed
   */
  const makeGuess = (direction: 'up' | 'down', countdownSeconds: number = 60) => {
    if (isLocked.value || !priceDataRef?.value) return

    const bidState = createInitialBidState(direction, priceDataRef.value.price, countdownSeconds)

    // Apply bid state
    isLocked.value = true
    guess.value = bidState.direction
    guessPrice.value = bidState.price
    isMinimumTimePassed.value = false
    setBidFn?.(bidState.price, bidState.direction)
    countdown.value = bidState.countdownSeconds

    // Start countdown interval
    countdownInterval = setInterval(() => {
      countdown.value--

      if (countdown.value <= 0) {
        isMinimumTimePassed.value = true
        if (hasPriceChanged()) {
          checkGuess()
        }
      }
    }, 1000)
  }

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
    if (!guess.value || !guessPrice.value || !priceDataRef?.value) return false

    return calculateIsWinning(guess.value, priceDataRef.value.price, guessPrice.value)
  })

  /**
   * Computed for the difference between current price and bid price
   */
  const bidToPriceDifference = computed(() => {
    if (!guessPrice.value || !priceDataRef?.value) return null
    return priceDataRef.value.price - guessPrice.value
  })

  /**
   * Computed for current potential earnings (before bid completes)
   */
  const potentialEarnings = computed(() => {
    if (!guess.value || !guessPrice.value || !priceDataRef?.value) return 0

    return calculateEarnings(guess.value, guessPrice.value, priceDataRef.value.price)
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
    score.value = stats.score
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
    score: score.value,
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

  /**
   * Reset all state for testing purposes
   * This allows tests to start with fresh state
   */
  const resetForTesting = () => {
    cleanup()
    score.value = 0
    guess.value = null
    isLocked.value = false
    countdown.value = 0
    guessPrice.value = null
    currentStreak.value = 0
    longestStreak.value = 0
    totalWins.value = 0
    totalLosses.value = 0
    totalEarnings.value = 0
    lastBidResult.value = null
    isMinimumTimePassed.value = false
    priceDataRef = null
    setBidFn = null
    clearBidFn = null
    onBidCompleteFn = null
    isInitialized = false
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
    bidToPriceDifference,

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
    resetForTesting,

    // Helper for testing
    hasPriceChanged,
  }
}

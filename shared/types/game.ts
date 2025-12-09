/**
 * Game-related types for BTC Price Prediction
 * Core game state types
 */

import type { Ref } from 'vue'

/**
 * Direction of a price guess
 */
export type GuessDirection = 'up' | 'down' | null

/**
 * Initial bid state when a guess is made
 */
export interface InitialBidState {
  direction: 'up' | 'down'
  price: number
  countdownSeconds: number
}

/**
 * Game state interface (Vue reactive refs)
 */
export interface GameState {
  score: Ref<number>
  guess: Ref<GuessDirection>
  isLocked: Ref<boolean>
  countdown: Ref<number>
  guessPrice: Ref<number | null>
}

/**
 * Persisted bid state for localStorage
 * Used to restore active bids after page refresh
 */
export interface PersistedBid {
  guessPrice: number
  guess: 'up' | 'down'
  startTime: number // timestamp when bid was placed
  bidDuration: number // countdown duration in seconds
}

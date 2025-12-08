/**
 * Game-related types for BTC Price Prediction
 */

import type { Ref } from 'vue'

/**
 * Direction of a price guess
 */
export type GuessDirection = 'up' | 'down' | null

/**
 * Result of a completed bid
 */
export interface BidResult {
  direction: 'up' | 'down'
  bidPrice: number
  finalPrice: number
  earnings: number
  won: boolean
  timestamp: number
}

/**
 * Game state interface
 */
export interface GameState {
  score: Ref<number>
  guess: Ref<GuessDirection>
  isLocked: Ref<boolean>
  countdown: Ref<number>
  guessPrice: Ref<number | null>
}

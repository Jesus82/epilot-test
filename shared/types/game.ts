/**
 * Game-related types for BTC Price Prediction
 * Single source of truth for both app and server contexts
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
 * Result of a completed bid (API format)
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
 * Request body for saving a bid
 */
export interface SaveBidBody {
  bid: BidResult
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

/**
 * API request/response types for BTC Price Prediction
 * Single source of truth for API contracts (camelCase)
 */

import type { PlayerStats } from './player'

/**
 * Extended player stats from API (includes additional fields)
 */
export interface ApiPlayerStats extends PlayerStats {
  playerName?: string | null
  isNewPlayer?: boolean
  updatedAt?: string
}

/**
 * Leaderboard entry with rank and player ID
 */
export interface LeaderboardEntry extends ApiPlayerStats {
  playerId: string
  rank: number
}

/**
 * Request body for updating player name
 */
export interface UpdateNameBody {
  playerName: string
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

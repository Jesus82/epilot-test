/**
 * Player-related types for BTC Price Prediction
 * Single source of truth for both app and server contexts
 */

// ============================================
// Database Row Types (snake_case - matches DB)
// ============================================

/**
 * Database row type for players table
 */
export interface PlayerInfo {
  id?: string | number
  player_id: string
  player_name: string | null
  current_streak: number
  longest_streak: number
  total_wins: number
  total_losses: number
  total_earnings: number
  created_at: string
  updated_at: string
}

/**
 * Database row type for bids table
 */
export interface BidInfo {
  id: string | number
  player_id: string
  direction: 'up' | 'down'
  bid_price: number
  final_price: number
  earnings: number
  won: boolean
  timestamp: number
  created_at: string
}

// ============================================
// API Response Types (camelCase - for clients)
// ============================================

/**
 * Player statistics (in-game state)
 */
export interface PlayerStats {
  currentStreak: number
  longestStreak: number
  totalWins: number
  totalLosses: number
  totalEarnings: number
}

/**
 * Extended player stats from API (includes additional fields)
 */
export interface ApiPlayerStats extends PlayerStats {
  playerName?: string | null
  isNewPlayer?: boolean
  updatedAt?: string
}

// ============================================
// Internal Helper Types
// ============================================

/**
 * Default stats for a new player (DB format)
 */
export interface DefaultPlayerStats {
  current_streak: number
  longest_streak: number
  total_wins: number
  total_losses: number
  total_earnings: number
}

/**
 * Stats update after a bid (DB format)
 */
export interface UpdatedPlayerStats extends DefaultPlayerStats {
  player_name?: string | null
}

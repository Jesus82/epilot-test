/**
 * Player-related types for BTC Price Prediction
 * Core player state types
 */

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

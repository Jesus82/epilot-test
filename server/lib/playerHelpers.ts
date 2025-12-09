/**
 * Server-side player helpers
 * Pure functions for database operations - no external dependencies
 */

import type {
  PlayerInfo,
  BidInfo,
  DefaultPlayerStats,
  UpdatedPlayerStats,
} from '../../shared/types/db'
import type { ApiPlayerStats, BidResult } from '../../shared/types/api'

/**
 * Creates default stats for a new player
 */
export const createDefaultPlayerStats = (): DefaultPlayerStats => ({
  current_streak: 0,
  longest_streak: 0,
  total_wins: 0,
  total_losses: 0,
  total_earnings: 0,
  score: 0,
})

/**
 * Creates default API stats for a new player (used when no record found)
 */
export const createNewPlayerApiStats = (): ApiPlayerStats => ({
  currentStreak: 0,
  longestStreak: 0,
  totalWins: 0,
  totalLosses: 0,
  totalEarnings: 0,
  score: 0,
  isNewPlayer: true,
})

/**
 * Maps a PlayerInfo database row to ApiPlayerStats
 */
export const mapPlayerInfoToApiStats = (row: PlayerInfo): ApiPlayerStats => ({
  currentStreak: row.current_streak,
  longestStreak: row.longest_streak,
  totalWins: row.total_wins,
  totalLosses: row.total_losses,
  totalEarnings: row.total_earnings,
  score: row.score,
  playerName: row.player_name,
  updatedAt: row.updated_at,
})

/**
 * Maps a BidInfo database row to BidResult
 */
export const mapBidInfoToBidResult = (row: BidInfo): BidResult => ({
  direction: row.direction,
  bidPrice: row.bid_price,
  finalPrice: row.final_price,
  earnings: row.earnings,
  won: row.won,
  timestamp: row.timestamp,
})

/**
 * Calculates updated player stats after a bid result
 */
export const calculateUpdatedStats = (
  currentStats: PlayerInfo,
  bid: BidResult,
): UpdatedPlayerStats => {
  const newCurrentStreak = bid.won ? (currentStats.current_streak + 1) : 0
  const newLongestStreak = Math.max(newCurrentStreak, currentStats.longest_streak)
  const newScore = currentStats.score + (bid.won ? 1 : -1)

  return {
    current_streak: newCurrentStreak,
    longest_streak: newLongestStreak,
    total_wins: currentStats.total_wins + (bid.won ? 1 : 0),
    total_losses: currentStats.total_losses + (bid.won ? 0 : 1),
    total_earnings: Number(currentStats.total_earnings) + bid.earnings,
    score: newScore,
  }
}

/**
 * Creates a bid record object for database insertion
 */
export const createBidRecord = (playerId: string, bid: BidResult) => ({
  player_id: playerId,
  direction: bid.direction,
  bid_price: bid.bidPrice,
  final_price: bid.finalPrice,
  earnings: bid.earnings,
  won: bid.won,
  timestamp: bid.timestamp,
})

/**
 * Checks if an error is a PostgreSQL unique constraint violation
 */
export const isUniqueConstraintError = (err: unknown): boolean => {
  const pgError = err as { code?: string }
  return pgError.code === '23505'
}

/**
 * Checks if an error is a "record not found" error from Supabase
 */
export const isRecordNotFoundError = (err: { code?: string }): boolean => {
  return err.code === 'PGRST116'
}

/**
 * Game logic helper functions
 * Pure functions for game state calculations
 */

import type { BidResult, InitialBidState } from '../../shared/types/game'
import type { PlayerStats } from '../../shared/types/player'

/**
 * Evaluate if the guess was correct based on price movement
 */
export const evaluateGuess = (
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
export const calculateEarnings = (
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
 * Calculate updated player stats after a guess result
 */
export const calculateStatsUpdate = (
  currentStats: PlayerStats,
  isCorrect: boolean,
  earnings: number,
): PlayerStats => {
  const newStreak = isCorrect ? currentStats.currentStreak + 1 : 0
  return {
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, currentStats.longestStreak),
    totalWins: currentStats.totalWins + (isCorrect ? 1 : 0),
    totalLosses: currentStats.totalLosses + (isCorrect ? 0 : 1),
    totalEarnings: currentStats.totalEarnings + earnings,
  }
}

/**
 * Create a bid result object
 */
export const createBidResult = (
  direction: 'up' | 'down',
  bidPrice: number,
  finalPrice: number,
  earnings: number,
  won: boolean,
): BidResult => ({
  direction,
  bidPrice,
  finalPrice,
  earnings,
  won,
  timestamp: Date.now(),
})

/**
 * Create initial bid state for a new guess
 */
export const createInitialBidState = (
  direction: 'up' | 'down',
  currentPrice: number,
  countdownSeconds: number = 60,
): InitialBidState => ({
  direction,
  price: currentPrice,
  countdownSeconds,
})

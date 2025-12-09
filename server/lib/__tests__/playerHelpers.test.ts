/**
 * Unit tests for server/lib/playerHelpers.ts
 * These are pure functions that can be tested without Nuxt runtime
 */
import { describe, it, expect } from 'vitest'
import {
  createDefaultPlayerStats,
  createNewPlayerApiStats,
  mapPlayerInfoToApiStats,
  mapBidInfoToBidResult,
  calculateUpdatedStats,
  createBidRecord,
  isUniqueConstraintError,
  isRecordNotFoundError,
} from '../playerHelpers'
import type { PlayerInfo, BidInfo } from '../../../shared/types/db'
import type { BidResult } from '../../../shared/types/api'

describe('playerHelpers', () => {
  describe('createDefaultPlayerStats', () => {
    it('should return default stats with all zeros', () => {
      const stats = createDefaultPlayerStats()

      expect(stats).toEqual({
        current_streak: 0,
        longest_streak: 0,
        total_wins: 0,
        total_losses: 0,
        total_earnings: 0,
        score: 0,
      })
    })

    it('should return a new object each time', () => {
      const stats1 = createDefaultPlayerStats()
      const stats2 = createDefaultPlayerStats()

      expect(stats1).not.toBe(stats2)
      expect(stats1).toEqual(stats2)
    })
  })

  describe('createNewPlayerApiStats', () => {
    it('should return default API stats with isNewPlayer true', () => {
      const stats = createNewPlayerApiStats()

      expect(stats).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        totalWins: 0,
        totalLosses: 0,
        totalEarnings: 0,
        score: 0,
        isNewPlayer: true,
      })
    })

    it('should always have isNewPlayer as true', () => {
      const stats = createNewPlayerApiStats()

      expect(stats.isNewPlayer).toBe(true)
    })
  })

  describe('mapPlayerInfoToApiStats', () => {
    it('should correctly map database row to API format', () => {
      const dbRow: PlayerInfo = {
        player_id: 'test-id',
        player_name: 'TestPlayer',
        current_streak: 5,
        longest_streak: 10,
        total_wins: 20,
        total_losses: 10,
        total_earnings: 1500.50,
        score: 100,
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      }

      const result = mapPlayerInfoToApiStats(dbRow)

      expect(result).toEqual({
        currentStreak: 5,
        longestStreak: 10,
        totalWins: 20,
        totalLosses: 10,
        totalEarnings: 1500.50,
        score: 100,
        playerName: 'TestPlayer',
        updatedAt: '2024-01-01T00:00:00Z',
      })
    })

    it('should handle null player_name', () => {
      const dbRow: PlayerInfo = {
        player_id: 'test-id',
        player_name: null,
        current_streak: 0,
        longest_streak: 0,
        total_wins: 0,
        total_losses: 0,
        total_earnings: 0,
        score: 0,
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      }

      const result = mapPlayerInfoToApiStats(dbRow)

      expect(result.playerName).toBeNull()
    })

    it('should handle negative total_earnings', () => {
      const dbRow: PlayerInfo = {
        player_id: 'test-id',
        player_name: 'Loser',
        current_streak: 0,
        longest_streak: 3,
        total_wins: 5,
        total_losses: 15,
        total_earnings: -500,
        score: -10,
        updated_at: '2024-01-01T00:00:00Z',
        created_at: '2024-01-01T00:00:00Z',
      }

      const result = mapPlayerInfoToApiStats(dbRow)

      expect(result.totalEarnings).toBe(-500)
      expect(result.score).toBe(-10)
    })
  })

  describe('mapBidInfoToBidResult', () => {
    it('should correctly map bid database row to API format', () => {
      const bidRow: BidInfo = {
        id: 1,
        player_id: 'test-id',
        direction: 'up',
        bid_price: 50000,
        final_price: 51000,
        earnings: 100,
        won: true,
        timestamp: 1704067200000,
        created_at: '2024-01-01T00:00:00Z',
      }

      const result = mapBidInfoToBidResult(bidRow)

      expect(result).toEqual({
        direction: 'up',
        bidPrice: 50000,
        finalPrice: 51000,
        earnings: 100,
        won: true,
        timestamp: 1704067200000,
      })
    })

    it('should handle losing bid', () => {
      const bidRow: BidInfo = {
        id: 2,
        player_id: 'test-id',
        direction: 'down',
        bid_price: 50000,
        final_price: 51000,
        earnings: -50,
        won: false,
        timestamp: 1704067200000,
        created_at: '2024-01-01T00:00:00Z',
      }

      const result = mapBidInfoToBidResult(bidRow)

      expect(result.won).toBe(false)
      expect(result.earnings).toBe(-50)
    })
  })

  describe('calculateUpdatedStats', () => {
    const basePlayerInfo: PlayerInfo = {
      player_id: 'test-id',
      player_name: 'TestPlayer',
      current_streak: 3,
      longest_streak: 5,
      total_wins: 10,
      total_losses: 5,
      total_earnings: 500,
      score: 50,
      updated_at: '2024-01-01T00:00:00Z',
      created_at: '2024-01-01T00:00:00Z',
    }

    it('should increment streak and wins on winning bid', () => {
      const winningBid: BidResult = {
        direction: 'up',
        bidPrice: 50000,
        finalPrice: 51000,
        earnings: 100,
        won: true,
        timestamp: 1704067200000,
      }

      const result = calculateUpdatedStats(basePlayerInfo, winningBid)

      expect(result.current_streak).toBe(4) // 3 + 1
      expect(result.total_wins).toBe(11) // 10 + 1
      expect(result.total_losses).toBe(5) // unchanged
      expect(result.total_earnings).toBe(600) // 500 + 100
      expect(result.score).toBe(51) // 50 + 1
    })

    it('should reset streak and increment losses on losing bid', () => {
      const losingBid: BidResult = {
        direction: 'down',
        bidPrice: 50000,
        finalPrice: 51000,
        earnings: -50,
        won: false,
        timestamp: 1704067200000,
      }

      const result = calculateUpdatedStats(basePlayerInfo, losingBid)

      expect(result.current_streak).toBe(0) // reset
      expect(result.total_wins).toBe(10) // unchanged
      expect(result.total_losses).toBe(6) // 5 + 1
      expect(result.total_earnings).toBe(450) // 500 - 50
      expect(result.score).toBe(49) // 50 - 1
    })

    it('should update longest_streak when current exceeds it', () => {
      const playerAtLongest: PlayerInfo = {
        ...basePlayerInfo,
        current_streak: 5,
        longest_streak: 5,
      }

      const winningBid: BidResult = {
        direction: 'up',
        bidPrice: 50000,
        finalPrice: 51000,
        earnings: 100,
        won: true,
        timestamp: 1704067200000,
      }

      const result = calculateUpdatedStats(playerAtLongest, winningBid)

      expect(result.current_streak).toBe(6)
      expect(result.longest_streak).toBe(6) // updated
    })

    it('should not update longest_streak when current does not exceed it', () => {
      const result = calculateUpdatedStats(basePlayerInfo, {
        direction: 'up',
        bidPrice: 50000,
        finalPrice: 51000,
        earnings: 100,
        won: true,
        timestamp: 1704067200000,
      })

      expect(result.current_streak).toBe(4)
      expect(result.longest_streak).toBe(5) // unchanged, still longer
    })

    it('should handle negative earnings correctly', () => {
      const playerWithNegativeEarnings: PlayerInfo = {
        ...basePlayerInfo,
        total_earnings: -100,
      }

      const losingBid: BidResult = {
        direction: 'up',
        bidPrice: 50000,
        finalPrice: 49000,
        earnings: -50,
        won: false,
        timestamp: 1704067200000,
      }

      const result = calculateUpdatedStats(playerWithNegativeEarnings, losingBid)

      expect(result.total_earnings).toBe(-150)
    })

    it('should handle score going negative', () => {
      const playerWithZeroScore: PlayerInfo = {
        ...basePlayerInfo,
        score: 0,
      }

      const losingBid: BidResult = {
        direction: 'up',
        bidPrice: 50000,
        finalPrice: 49000,
        earnings: -50,
        won: false,
        timestamp: 1704067200000,
      }

      const result = calculateUpdatedStats(playerWithZeroScore, losingBid)

      expect(result.score).toBe(-1)
    })
  })

  describe('createBidRecord', () => {
    it('should create a bid record for database insertion', () => {
      const playerId = 'test-player-123'
      const bid: BidResult = {
        direction: 'up',
        bidPrice: 50000,
        finalPrice: 51000,
        earnings: 100,
        won: true,
        timestamp: 1704067200000,
      }

      const result = createBidRecord(playerId, bid)

      expect(result).toEqual({
        player_id: 'test-player-123',
        direction: 'up',
        bid_price: 50000,
        final_price: 51000,
        earnings: 100,
        won: true,
        timestamp: 1704067200000,
      })
    })

    it('should handle down direction', () => {
      const result = createBidRecord('player-1', {
        direction: 'down',
        bidPrice: 60000,
        finalPrice: 59000,
        earnings: 150,
        won: true,
        timestamp: 1704153600000,
      })

      expect(result.direction).toBe('down')
      expect(result.player_id).toBe('player-1')
    })
  })

  describe('isUniqueConstraintError', () => {
    it('should return true for PostgreSQL unique constraint error code', () => {
      const error = { code: '23505' }

      expect(isUniqueConstraintError(error)).toBe(true)
    })

    it('should return false for other error codes', () => {
      expect(isUniqueConstraintError({ code: '12345' })).toBe(false)
      expect(isUniqueConstraintError({ code: 'PGRST116' })).toBe(false)
      expect(isUniqueConstraintError({ code: '23503' })).toBe(false)
    })

    it('should return false for errors without code', () => {
      expect(isUniqueConstraintError({})).toBe(false)
      expect(isUniqueConstraintError({ message: 'Some error' })).toBe(false)
    })
  })

  describe('isRecordNotFoundError', () => {
    it('should return true for Supabase not found error code', () => {
      const error = { code: 'PGRST116' }

      expect(isRecordNotFoundError(error)).toBe(true)
    })

    it('should return false for other error codes', () => {
      expect(isRecordNotFoundError({ code: '12345' })).toBe(false)
      expect(isRecordNotFoundError({ code: '23505' })).toBe(false)
      expect(isRecordNotFoundError({ code: 'PGRST000' })).toBe(false)
    })

    it('should return false for errors without code', () => {
      expect(isRecordNotFoundError({})).toBe(false)
    })
  })
})

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
  getErrorMessage,
} from '../playerServiceHelpers'
import type { PlayerInfo, BidInfo } from '../../../shared/types/db'
import type { BidResult } from '../../../shared/types/api'

describe('playerServiceHelpers', () => {
  describe('createDefaultPlayerStats', () => {
    it('should return all stats as zero', () => {
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
  })

  describe('createNewPlayerApiStats', () => {
    it('should return zero stats with isNewPlayer flag', () => {
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
  })

  describe('mapPlayerInfoToApiStats', () => {
    it('should map database row to API stats', () => {
      const playerInfo: PlayerInfo = {
        id: '123',
        player_id: 'player-uuid',
        player_name: 'TestPlayer',
        current_streak: 5,
        longest_streak: 10,
        total_wins: 20,
        total_losses: 5,
        total_earnings: 1500.50,
        score: 15,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      const result = mapPlayerInfoToApiStats(playerInfo)

      expect(result).toEqual({
        currentStreak: 5,
        longestStreak: 10,
        totalWins: 20,
        totalLosses: 5,
        totalEarnings: 1500.50,
        score: 15,
        playerName: 'TestPlayer',
        updatedAt: '2024-01-02T00:00:00Z',
      })
    })

    it('should handle null player name', () => {
      const playerInfo: PlayerInfo = {
        id: '123',
        player_id: 'player-uuid',
        player_name: null,
        current_streak: 0,
        longest_streak: 0,
        total_wins: 0,
        total_losses: 0,
        total_earnings: 0,
        score: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const result = mapPlayerInfoToApiStats(playerInfo)

      expect(result.playerName).toBeNull()
    })
  })

  describe('mapBidInfoToBidResult', () => {
    it('should map database bid row to BidResult', () => {
      const bidInfo: BidInfo = {
        id: '456',
        player_id: 'player-uuid',
        direction: 'up',
        bid_price: 50000,
        final_price: 50500,
        earnings: 500,
        won: true,
        timestamp: 1704067200000,
        created_at: '2024-01-01T00:00:00Z',
      }

      const result = mapBidInfoToBidResult(bidInfo)

      expect(result).toEqual({
        direction: 'up',
        bidPrice: 50000,
        finalPrice: 50500,
        earnings: 500,
        won: true,
        timestamp: 1704067200000,
      })
    })
  })

  describe('calculateUpdatedStats', () => {
    const basePlayerInfo: PlayerInfo = {
      id: '123',
      player_id: 'player-uuid',
      player_name: 'TestPlayer',
      current_streak: 3,
      longest_streak: 5,
      total_wins: 10,
      total_losses: 5,
      total_earnings: 1000,
      score: 5,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    it('should increment streak and wins on winning bid', () => {
      const winningBid: BidResult = {
        direction: 'up',
        bidPrice: 50000,
        finalPrice: 50100,
        earnings: 100,
        won: true,
        timestamp: Date.now(),
      }

      const result = calculateUpdatedStats(basePlayerInfo, winningBid)

      expect(result.current_streak).toBe(4)
      expect(result.total_wins).toBe(11)
      expect(result.total_losses).toBe(5)
      expect(result.total_earnings).toBe(1100)
    })

    it('should reset streak and increment losses on losing bid', () => {
      const losingBid: BidResult = {
        direction: 'up',
        bidPrice: 50000,
        finalPrice: 49900,
        earnings: -100,
        won: false,
        timestamp: Date.now(),
      }

      const result = calculateUpdatedStats(basePlayerInfo, losingBid)

      expect(result.current_streak).toBe(0)
      expect(result.total_wins).toBe(10)
      expect(result.total_losses).toBe(6)
      expect(result.total_earnings).toBe(900)
    })

    it('should update longest streak when current exceeds it', () => {
      const playerAtLongestStreak: PlayerInfo = {
        ...basePlayerInfo,
        current_streak: 5,
        longest_streak: 5,
      }

      const winningBid: BidResult = {
        direction: 'up',
        bidPrice: 50000,
        finalPrice: 50100,
        earnings: 100,
        won: true,
        timestamp: Date.now(),
      }

      const result = calculateUpdatedStats(playerAtLongestStreak, winningBid)

      expect(result.current_streak).toBe(6)
      expect(result.longest_streak).toBe(6)
    })

    it('should not update longest streak when current is below it', () => {
      const winningBid: BidResult = {
        direction: 'up',
        bidPrice: 50000,
        finalPrice: 50100,
        earnings: 100,
        won: true,
        timestamp: Date.now(),
      }

      const result = calculateUpdatedStats(basePlayerInfo, winningBid)

      expect(result.current_streak).toBe(4)
      expect(result.longest_streak).toBe(5) // Unchanged
    })
  })

  describe('createBidRecord', () => {
    it('should create a bid record object for database insertion', () => {
      const playerId = 'player-uuid'
      const bid: BidResult = {
        direction: 'down',
        bidPrice: 50000,
        finalPrice: 49500,
        earnings: 500,
        won: true,
        timestamp: 1704067200000,
      }

      const result = createBidRecord(playerId, bid)

      expect(result).toEqual({
        player_id: 'player-uuid',
        direction: 'down',
        bid_price: 50000,
        final_price: 49500,
        earnings: 500,
        won: true,
        timestamp: 1704067200000,
      })
    })
  })

  describe('isUniqueConstraintError', () => {
    it('should return true for PostgreSQL unique constraint error', () => {
      const error = { code: '23505', message: 'duplicate key value' }

      expect(isUniqueConstraintError(error)).toBe(true)
    })

    it('should return false for other errors', () => {
      const error = { code: '42P01', message: 'table not found' }

      expect(isUniqueConstraintError(error)).toBe(false)
    })

    it('should return false for errors without code', () => {
      const error = new Error('Some error')

      expect(isUniqueConstraintError(error)).toBe(false)
    })
  })

  describe('isRecordNotFoundError', () => {
    it('should return true for Supabase not found error', () => {
      const error = { code: 'PGRST116' }

      expect(isRecordNotFoundError(error)).toBe(true)
    })

    it('should return false for other errors', () => {
      const error = { code: 'PGRST000' }

      expect(isRecordNotFoundError(error)).toBe(false)
    })
  })

  describe('getErrorMessage', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Something went wrong')

      expect(getErrorMessage(error)).toBe('Something went wrong')
    })

    it('should return default message for non-Error objects', () => {
      const error = { foo: 'bar' }

      expect(getErrorMessage(error)).toBe('Unknown error')
    })

    it('should return custom default message', () => {
      const error = { foo: 'bar' }

      expect(getErrorMessage(error, 'Custom default')).toBe('Custom default')
    })

    it('should return default message for null', () => {
      expect(getErrorMessage(null)).toBe('Unknown error')
    })

    it('should return default message for undefined', () => {
      expect(getErrorMessage(undefined)).toBe('Unknown error')
    })
  })
})

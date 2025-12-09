import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePlayerService } from '../usePlayerService'
import type { ApiPlayerStats, BidResult } from '../../../../shared/types/api'

// Mock $fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Mock usePlayerId composable
const mockGetPlayerId = vi.fn(() => 'mock-player-id')
vi.stubGlobal('usePlayerId', () => ({
  getPlayerId: mockGetPlayerId,
}))

describe('usePlayerService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchStats', () => {
    it('should return stats for existing player', async () => {
      const mockStats: ApiPlayerStats = {
        currentStreak: 5,
        longestStreak: 10,
        totalWins: 20,
        totalLosses: 5,
        totalEarnings: 1500,
        score: 15,
        playerName: 'TestPlayer',
        updatedAt: '2024-01-02',
      }

      mockFetch.mockResolvedValue(mockStats)

      const { fetchStats } = usePlayerService()
      const stats = await fetchStats('test-player-id')

      expect(mockFetch).toHaveBeenCalledWith('/api/players/test-player-id')
      expect(stats).toEqual(mockStats)
    })

    it('should return stats for new player', async () => {
      const mockStats: ApiPlayerStats = {
        currentStreak: 0,
        longestStreak: 0,
        totalWins: 0,
        totalLosses: 0,
        totalEarnings: 0,
        score: 0,
        isNewPlayer: true,
      }

      mockFetch.mockResolvedValue(mockStats)

      const { fetchStats } = usePlayerService()
      const stats = await fetchStats('new-player-id')

      expect(stats?.isNewPlayer).toBe(true)
    })

    it('should return null and set error on failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const { fetchStats, error } = usePlayerService()
      const stats = await fetchStats('test-player-id')

      expect(stats).toBeNull()
      expect(error.value).toBe('Network error')
    })

    it('should set isLoading during request', async () => {
      let resolvePromise: (value: ApiPlayerStats) => void
      const promise = new Promise<ApiPlayerStats>((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValue(promise)

      const { fetchStats, isLoading } = usePlayerService()

      expect(isLoading.value).toBe(false)

      const statsPromise = fetchStats('test-player-id')
      expect(isLoading.value).toBe(true)

      resolvePromise!({
        currentStreak: 0,
        longestStreak: 0,
        totalWins: 0,
        totalLosses: 0,
        totalEarnings: 0,
        score: 0,
      })
      await statsPromise

      expect(isLoading.value).toBe(false)
    })
  })

  describe('saveBid', () => {
    const mockBid: BidResult = {
      direction: 'up',
      bidPrice: 50000,
      finalPrice: 51000,
      earnings: 100,
      won: true,
      timestamp: Date.now(),
    }

    it('should save bid and return updated stats', async () => {
      const mockUpdatedStats: ApiPlayerStats = {
        currentStreak: 1,
        longestStreak: 1,
        totalWins: 1,
        totalLosses: 0,
        totalEarnings: 100,
        score: 1,
      }

      mockFetch.mockResolvedValue(mockUpdatedStats)

      const { saveBid } = usePlayerService()
      const result = await saveBid('test-player-id', mockBid)

      expect(mockFetch).toHaveBeenCalledWith('/api/players/test-player-id/bids', {
        method: 'POST',
        body: { bid: mockBid },
      })
      expect(result).toEqual(mockUpdatedStats)
    })

    it('should return null on error', async () => {
      mockFetch.mockRejectedValue(new Error('Failed to save'))

      const { saveBid, error } = usePlayerService()
      const result = await saveBid('test-player-id', mockBid)

      expect(result).toBeNull()
      expect(error.value).toBe('Failed to save')
    })
  })

  describe('fetchBids', () => {
    it('should fetch bid history', async () => {
      const mockBids: BidResult[] = [
        {
          direction: 'up',
          bidPrice: 50000,
          finalPrice: 51000,
          earnings: 100,
          won: true,
          timestamp: Date.now(),
        },
      ]

      mockFetch.mockResolvedValue(mockBids)

      const { fetchBids } = usePlayerService()
      const result = await fetchBids('test-player-id', 10)

      expect(mockFetch).toHaveBeenCalledWith('/api/players/test-player-id/bids', {
        query: { limit: 10 },
      })
      expect(result).toEqual(mockBids)
    })

    it('should return empty array on error', async () => {
      mockFetch.mockRejectedValue(new Error('Failed to fetch'))

      const { fetchBids } = usePlayerService()
      const result = await fetchBids('test-player-id')

      expect(result).toEqual([])
    })
  })

  describe('updatePlayerName', () => {
    it('should update player name successfully', async () => {
      mockFetch.mockResolvedValue({ success: true })

      const { updatePlayerName } = usePlayerService()
      const result = await updatePlayerName('test-player-id', 'NewName')

      expect(mockFetch).toHaveBeenCalledWith('/api/players/test-player-id/name', {
        method: 'PUT',
        body: { playerName: 'NewName' },
      })
      expect(result).toBe(true)
    })

    it('should return false on error', async () => {
      mockFetch.mockRejectedValue(new Error('Name taken'))

      const { updatePlayerName, error } = usePlayerService()
      const result = await updatePlayerName('test-player-id', 'TakenName')

      expect(result).toBe(false)
      expect(error.value).toBe('Name taken')
    })

    it('should extract statusMessage from API error response', async () => {
      const apiError = {
        data: {
          statusMessage: 'Player name already exists',
        },
      }
      mockFetch.mockRejectedValue(apiError)

      const { updatePlayerName, error } = usePlayerService()
      await updatePlayerName('test-player-id', 'TakenName')

      expect(error.value).toBe('Player name already exists')
    })
  })

  describe('fetchLeaderboard', () => {
    it('should fetch leaderboard', async () => {
      const mockLeaderboard = [
        {
          playerId: 'player-1',
          playerName: 'TopPlayer',
          totalEarnings: 5000,
          currentStreak: 10,
          longestStreak: 15,
          totalWins: 50,
          totalLosses: 10,
          rank: 1,
        },
      ]

      mockFetch.mockResolvedValue(mockLeaderboard)

      const { fetchLeaderboard } = usePlayerService()
      const result = await fetchLeaderboard(10)

      expect(mockFetch).toHaveBeenCalledWith('/api/leaderboard', {
        query: { limit: 10 },
      })
      expect(result).toEqual(mockLeaderboard)
    })

    it('should return empty array on error', async () => {
      mockFetch.mockRejectedValue(new Error('Failed'))

      const { fetchLeaderboard } = usePlayerService()
      const result = await fetchLeaderboard()

      expect(result).toEqual([])
    })
  })
})

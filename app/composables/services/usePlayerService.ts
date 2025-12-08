/**
 * Client-side player service
 * Calls REST API endpoints instead of directly accessing the database
 */

import { ref, readonly } from 'vue'
import type { ApiPlayerStats } from '../../../shared/types/player'
import type { BidResult } from '../../../shared/types/game'
import { getErrorMessage } from '~/helpers/playerServiceHelpers'

/**
 * Leaderboard entry with rank and player ID
 */
export interface LeaderboardEntry extends ApiPlayerStats {
  playerId: string
  rank: number
}

/**
 * Composable for interacting with player REST API
 */
export const usePlayerService = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch player stats from API
   */
  const fetchStats = async (playerId: string): Promise<ApiPlayerStats | null> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<ApiPlayerStats>(`/api/players/${playerId}`)
      return response
    }
    catch (err) {
      error.value = getErrorMessage(err)
      console.error('[usePlayerService] Error fetching stats:', err)
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Save a completed bid and update player stats
   */
  const saveBid = async (playerId: string, bid: BidResult): Promise<ApiPlayerStats | null> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<ApiPlayerStats>(`/api/players/${playerId}/bids`, {
        method: 'POST',
        body: { bid },
      })
      return response
    }
    catch (err) {
      error.value = getErrorMessage(err)
      console.error('[usePlayerService] Error saving bid:', err)
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch player's bid history
   */
  const fetchBids = async (playerId: string, limit: number = 50): Promise<BidResult[]> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<BidResult[]>(`/api/players/${playerId}/bids`, {
        query: { limit },
      })
      return response
    }
    catch (err) {
      error.value = getErrorMessage(err)
      console.error('[usePlayerService] Error fetching bids:', err)
      return []
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Update player name
   */
  const updatePlayerName = async (playerId: string, playerName: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      await $fetch(`/api/players/${playerId}/name`, {
        method: 'PUT',
        body: { playerName },
      })
      return true
    }
    catch (err: unknown) {
      // Check for conflict (duplicate name)
      const fetchError = err as { data?: { statusMessage?: string }, statusCode?: number, statusMessage?: string }
      if (fetchError.statusCode === 409) {
        error.value = 'Player name already exists'
      }
      else if (fetchError.data?.statusMessage) {
        error.value = fetchError.data.statusMessage
      }
      else {
        error.value = fetchError.statusMessage || getErrorMessage(err)
      }
      console.error('[usePlayerService] Error updating player name:', err)
      return false
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch leaderboard (top players by earnings)
   */
  const fetchLeaderboard = async (limit: number = 10): Promise<LeaderboardEntry[]> => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<LeaderboardEntry[]>('/api/leaderboard', {
        query: { limit },
      })
      return response
    }
    catch (err) {
      error.value = getErrorMessage(err)
      console.error('[usePlayerService] Error fetching leaderboard:', err)
      return []
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchStats,
    saveBid,
    fetchBids,
    updatePlayerName,
    fetchLeaderboard,
  }
}

// Re-export for backward compatibility
export const usePlayerApi = usePlayerService

import { ref, readonly } from 'vue'
import type { PlayerStats, BidResult } from './useGameLogic'

export interface ApiPlayerStats extends PlayerStats {
  isNewPlayer?: boolean
  updatedAt?: string
}

export interface ApiBidResponse {
  bid: BidResult & { playerId: string }
  stats: ApiPlayerStats
}

/**
 * Composable for interacting with the player stats API
 */
export const usePlayerApi = () => {
  // API base URL - configure via runtime config
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBaseUrl || ''

  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch player stats from API
   */
  const fetchStats = async (playerId: string): Promise<ApiPlayerStats | null> => {
    if (!baseUrl) {
      console.warn('[usePlayerApi] No API base URL configured, skipping fetch')
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${baseUrl}/players/${playerId}/stats`)

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`)
      }

      const data = await response.json()
      return data as ApiPlayerStats
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('[usePlayerApi] Error fetching stats:', err)
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Save a completed bid to the API
   */
  const saveBid = async (playerId: string, bid: BidResult): Promise<ApiBidResponse | null> => {
    if (!baseUrl) {
      console.warn('[usePlayerApi] No API base URL configured, skipping save')
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${baseUrl}/players/${playerId}/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bid),
      })

      if (!response.ok) {
        throw new Error(`Failed to save bid: ${response.status}`)
      }

      const data = await response.json()
      return data as ApiBidResponse
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('[usePlayerApi] Error saving bid:', err)
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
    if (!baseUrl) {
      console.warn('[usePlayerApi] No API base URL configured, skipping fetch')
      return []
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await fetch(`${baseUrl}/players/${playerId}/bids?limit=${limit}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch bids: ${response.status}`)
      }

      const data = await response.json()
      return data.bids as BidResult[]
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('[usePlayerApi] Error fetching bids:', err)
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
  }
}

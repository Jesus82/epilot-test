import { ref, readonly } from 'vue'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'
import type { PlayerStats, BidResult } from './useGameLogic'

export interface ApiPlayerStats extends PlayerStats {
  isNewPlayer?: boolean
  updatedAt?: string
}

// Database row types
interface PlayerRow {
  id: string
  player_id: string
  current_streak: number
  longest_streak: number
  total_wins: number
  total_losses: number
  total_earnings: number
  created_at: string
  updated_at: string
}

interface BidRow {
  id: string
  player_id: string
  direction: 'up' | 'down'
  bid_price: number
  final_price: number
  earnings: number
  won: boolean
  timestamp: number
  created_at: string
}

let supabaseClient: SupabaseClient | null = null

/**
 * Get or create Supabase client
 */
const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseClient) return supabaseClient

  const config = useRuntimeConfig()
  const supabaseUrl = config.public.supabaseUrl as string
  const supabaseAnonKey = config.public.supabaseAnonKey as string

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[usePlayerApi] Supabase not configured')
    return null
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  return supabaseClient
}

/**
 * Composable for interacting with Supabase for player stats
 */
export const usePlayerApi = () => {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * Fetch player stats from Supabase
   */
  const fetchStats = async (playerId: string): Promise<ApiPlayerStats | null> => {
    const supabase = getSupabaseClient()
    if (!supabase) return null

    isLoading.value = true
    error.value = null

    try {
      const { data, error: dbError } = await supabase
        .from('players')
        .select('*')
        .eq('player_id', playerId)
        .single()

      if (dbError) {
        // No record found - new player
        if (dbError.code === 'PGRST116') {
          return {
            currentStreak: 0,
            longestStreak: 0,
            totalWins: 0,
            totalLosses: 0,
            totalEarnings: 0,
            isNewPlayer: true,
          }
        }
        throw dbError
      }

      const row = data as PlayerRow
      return {
        currentStreak: row.current_streak,
        longestStreak: row.longest_streak,
        totalWins: row.total_wins,
        totalLosses: row.total_losses,
        totalEarnings: row.total_earnings,
        updatedAt: row.updated_at,
      }
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
   * Save a completed bid and update player stats
   */
  const saveBid = async (playerId: string, bid: BidResult): Promise<ApiPlayerStats | null> => {
    const supabase = getSupabaseClient()
    if (!supabase) return null

    isLoading.value = true
    error.value = null

    try {
      // First, ensure player exists or create them
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('player_id', playerId)
        .single()

      let currentStats: PlayerRow | null = existingPlayer as PlayerRow | null

      if (!currentStats) {
        // Create new player
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert({
            player_id: playerId,
            current_streak: 0,
            longest_streak: 0,
            total_wins: 0,
            total_losses: 0,
            total_earnings: 0,
          })
          .select()
          .single()

        if (createError) throw createError
        currentStats = newPlayer as PlayerRow
      }

      // Calculate new stats
      const newCurrentStreak = bid.won ? (currentStats.current_streak + 1) : 0
      const newLongestStreak = Math.max(newCurrentStreak, currentStats.longest_streak)
      const newTotalWins = currentStats.total_wins + (bid.won ? 1 : 0)
      const newTotalLosses = currentStats.total_losses + (bid.won ? 0 : 1)
      const newTotalEarnings = Number(currentStats.total_earnings) + bid.earnings

      // Update player stats
      const { data: updatedPlayer, error: updateError } = await supabase
        .from('players')
        .update({
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          total_wins: newTotalWins,
          total_losses: newTotalLosses,
          total_earnings: newTotalEarnings,
        })
        .eq('player_id', playerId)
        .select()
        .single()

      if (updateError) throw updateError

      // Insert bid record
      const { error: bidError } = await supabase
        .from('bids')
        .insert({
          player_id: playerId,
          direction: bid.direction,
          bid_price: bid.bidPrice,
          final_price: bid.finalPrice,
          earnings: bid.earnings,
          won: bid.won,
          timestamp: bid.timestamp,
        })

      if (bidError) throw bidError

      const row = updatedPlayer as PlayerRow
      return {
        currentStreak: row.current_streak,
        longestStreak: row.longest_streak,
        totalWins: row.total_wins,
        totalLosses: row.total_losses,
        totalEarnings: row.total_earnings,
        updatedAt: row.updated_at,
      }
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
    const supabase = getSupabaseClient()
    if (!supabase) return []

    isLoading.value = true
    error.value = null

    try {
      const { data, error: dbError } = await supabase
        .from('bids')
        .select('*')
        .eq('player_id', playerId)
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (dbError) throw dbError

      return (data as BidRow[]).map(row => ({
        direction: row.direction,
        bidPrice: row.bid_price,
        finalPrice: row.final_price,
        earnings: row.earnings,
        won: row.won,
        timestamp: row.timestamp,
      }))
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

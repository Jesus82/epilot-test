/**
 * Server-side player database operations
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  type PlayerInfo,
  type BidInfo,
  type BidResult,
  createDefaultPlayerStats,
  mapBidInfoToBidResult,
  calculateUpdatedStats,
  createBidRecord,
  isRecordNotFoundError,
} from '../lib/playerHelpers'

/**
 * Find a player by their UUID
 */
export const findPlayerById = async (
  supabase: SupabaseClient,
  playerId: string,
): Promise<PlayerInfo | null> => {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('player_id', playerId)
    .single()

  if (error) {
    if (isRecordNotFoundError(error)) {
      return null
    }
    throw error
  }

  return data as PlayerInfo
}

/**
 * Create a new player
 */
export const createPlayer = async (
  supabase: SupabaseClient,
  playerId: string,
  playerName?: string,
): Promise<PlayerInfo> => {
  const { data, error } = await supabase
    .from('players')
    .insert({
      player_id: playerId,
      player_name: playerName ?? null,
      ...createDefaultPlayerStats(),
    })
    .select()
    .single()

  if (error) throw error
  return data as PlayerInfo
}

/**
 * Update player stats after a bid
 */
export const updatePlayerStats = async (
  supabase: SupabaseClient,
  playerId: string,
  currentStats: PlayerInfo,
  bid: BidResult,
): Promise<PlayerInfo> => {
  const updatedStats = calculateUpdatedStats(currentStats, bid)

  const { data, error } = await supabase
    .from('players')
    .update(updatedStats)
    .eq('player_id', playerId)
    .select()
    .single()

  if (error) throw error
  return data as PlayerInfo
}

/**
 * Insert a bid record
 */
export const insertBid = async (
  supabase: SupabaseClient,
  playerId: string,
  bid: BidResult,
): Promise<void> => {
  const { error } = await supabase
    .from('bids')
    .insert(createBidRecord(playerId, bid))

  if (error) throw error
}

/**
 * Update player name
 */
export const updatePlayerNameInDb = async (
  supabase: SupabaseClient,
  playerId: string,
  playerName: string,
): Promise<void> => {
  const { error } = await supabase
    .from('players')
    .update({ player_name: playerName })
    .eq('player_id', playerId)

  if (error) throw error
}

/**
 * Fetch bids for a player
 */
export const fetchPlayerBids = async (
  supabase: SupabaseClient,
  playerId: string,
  limit: number = 50,
): Promise<BidResult[]> => {
  const { data, error } = await supabase
    .from('bids')
    .select('*')
    .eq('player_id', playerId)
    .order('timestamp', { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data as BidInfo[]).map(mapBidInfoToBidResult)
}

/**
 * Fetch leaderboard (top players by earnings)
 */
export const fetchLeaderboard = async (
  supabase: SupabaseClient,
  limit: number = 10,
): Promise<PlayerInfo[]> => {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .not('player_name', 'is', null)
    .order('total_earnings', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as PlayerInfo[]
}

// Re-export types only (functions are imported from ../lib/playerHelpers)
export type {
  PlayerInfo,
  BidInfo,
  BidResult,
  ApiPlayerStats,
} from '../lib/playerHelpers'

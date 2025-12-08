/**
 * POST /api/players/:playerId/bids
 * Save a completed bid and update player stats
 */

import { getServerSupabase } from '~~/server/utils/supabase'
import { findPlayerById, createPlayer, updatePlayerStats, insertBid } from '~~/server/utils/playerDb'
import { mapPlayerInfoToApiStats } from '~~/server/lib/playerHelpers'
import type { SaveBidBody } from '~~/shared/types/api'

export default defineEventHandler(async (event) => {
  const playerId = getRouterParam(event, 'playerId')

  if (!playerId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Player ID is required',
    })
  }

  const body = await readBody<SaveBidBody>(event)

  if (!body?.bid) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bid data is required',
    })
  }

  const { bid } = body

  // Validate bid structure
  if (
    !bid.direction
    || typeof bid.bidPrice !== 'number'
    || typeof bid.finalPrice !== 'number'
    || typeof bid.earnings !== 'number'
    || typeof bid.won !== 'boolean'
    || typeof bid.timestamp !== 'number'
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid bid data structure',
    })
  }

  try {
    const supabase = getServerSupabase()

    // Ensure player exists
    let currentStats = await findPlayerById(supabase, playerId)

    if (!currentStats) {
      currentStats = await createPlayer(supabase, playerId)
    }

    // Update player stats
    const updatedPlayer = await updatePlayerStats(supabase, playerId, currentStats, bid)

    // Insert bid record
    await insertBid(supabase, playerId, bid)

    return mapPlayerInfoToApiStats(updatedPlayer)
  }
  catch (err) {
    console.error('[API] Error saving bid:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to save bid',
    })
  }
})

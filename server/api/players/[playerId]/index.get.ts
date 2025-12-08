/**
 * GET /api/players/:playerId
 * Fetch player stats
 */

import { getServerSupabase } from '~~/server/utils/supabase'
import { findPlayerById } from '~~/server/utils/playerDb'
import { mapPlayerInfoToApiStats, createNewPlayerApiStats } from '~~/server/lib/playerHelpers'

export default defineEventHandler(async (event) => {
  const playerId = getRouterParam(event, 'playerId')

  if (!playerId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Player ID is required',
    })
  }

  try {
    const supabase = getServerSupabase()
    const player = await findPlayerById(supabase, playerId)

    if (!player) {
      return createNewPlayerApiStats()
    }

    return mapPlayerInfoToApiStats(player)
  }
  catch (err) {
    console.error('[API] Error fetching player stats:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch player stats',
    })
  }
})

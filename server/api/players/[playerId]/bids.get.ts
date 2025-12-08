/**
 * GET /api/players/:playerId/bids
 * Fetch player's bid history
 */

import { getServerSupabase } from '~~/server/utils/supabase'
import { fetchPlayerBids } from '~~/server/utils/playerDb'

export default defineEventHandler(async (event) => {
  const playerId = getRouterParam(event, 'playerId')

  if (!playerId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Player ID is required',
    })
  }

  const query = getQuery(event)
  const limit = Number(query.limit) || 50

  try {
    const supabase = getServerSupabase()
    const bids = await fetchPlayerBids(supabase, playerId, limit)
    return bids
  }
  catch (err) {
    console.error('[API] Error fetching bids:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch bid history',
    })
  }
})

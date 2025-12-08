/**
 * GET /api/leaderboard
 * Fetch top players by earnings
 */

import { getServerSupabase } from '~~/server/utils/supabase'
import { fetchLeaderboard } from '~~/server/utils/playerDb'
import { mapPlayerInfoToApiStats } from '~~/server/lib/playerHelpers'
import type { PlayerInfo } from '~~/shared/types/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const limit = Number(query.limit) || 10

  try {
    const supabase = getServerSupabase()
    const players = await fetchLeaderboard(supabase, limit)

    // Map to API format with rank
    return players.map((player: PlayerInfo, index: number) => ({
      ...mapPlayerInfoToApiStats(player),
      playerId: player.player_id,
      rank: index + 1,
    }))
  }
  catch (err) {
    console.error('[API] Error fetching leaderboard:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch leaderboard',
    })
  }
})

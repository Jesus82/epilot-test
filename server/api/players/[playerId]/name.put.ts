/**
 * PUT /api/players/:playerId/name
 * Update player name
 */

import { getServerSupabase } from '~~/server/utils/supabase'
import { findPlayerById, createPlayer, updatePlayerNameInDb } from '~~/server/utils/playerDb'
import { isUniqueConstraintError } from '~~/server/lib/playerHelpers'
import type { UpdateNameBody } from '~~/shared/types/api'

export default defineEventHandler(async (event) => {
  const playerId = getRouterParam(event, 'playerId')

  if (!playerId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Player ID is required',
    })
  }

  const body = await readBody<UpdateNameBody>(event)

  if (!body?.playerName?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Player name is required',
    })
  }

  const playerName = body.playerName.trim()

  try {
    const supabase = getServerSupabase()
    const existingPlayer = await findPlayerById(supabase, playerId)

    if (existingPlayer) {
      await updatePlayerNameInDb(supabase, playerId, playerName)
    }
    else {
      await createPlayer(supabase, playerId, playerName)
    }

    return { success: true }
  }
  catch (err) {
    console.error('[API] Error updating player name:', err)

    if (isUniqueConstraintError(err)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Player name already exists',
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update player name',
    })
  }
})

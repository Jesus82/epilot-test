import { getPlayerStats } from '../lib/dynamodb.js'

/**
 * GET /players/{playerId}/stats
 * Returns player statistics
 */
export const handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Credentials': true,
  }

  try {
    const playerId = event.pathParameters?.playerId

    if (!playerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Player ID is required' }),
      }
    }

    const stats = await getPlayerStats(playerId)

    if (!stats) {
      // Return default stats for new player
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          currentStreak: 0,
          longestStreak: 0,
          totalWins: 0,
          totalLosses: 0,
          totalEarnings: 0,
          isNewPlayer: true,
        }),
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(stats),
    }
  }
  catch (error) {
    console.error('Error getting player stats:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get player stats' }),
    }
  }
}

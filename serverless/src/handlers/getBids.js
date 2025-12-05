import { getPlayerBids } from '../lib/dynamodb.js'

/**
 * GET /players/{playerId}/bids
 * Returns player's bid history
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

    // Get limit from query params (default 50)
    const limit = parseInt(event.queryStringParameters?.limit || '50', 10)

    const bids = await getPlayerBids(playerId, Math.min(limit, 100))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        bids,
        count: bids.length,
      }),
    }
  }
  catch (error) {
    console.error('Error getting player bids:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get player bids' }),
    }
  }
}

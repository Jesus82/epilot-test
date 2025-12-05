import { saveBidRecord, updatePlayerStatsAfterBid } from '../lib/dynamodb.js'

/**
 * POST /players/{playerId}/bids
 * Records a completed bid and updates player stats
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

    const body = JSON.parse(event.body || '{}')

    // Validate required fields
    const { direction, bidPrice, finalPrice, earnings, won, timestamp } = body

    if (!direction || bidPrice === undefined || finalPrice === undefined || earnings === undefined || won === undefined) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: direction, bidPrice, finalPrice, earnings, won' }),
      }
    }

    if (!['up', 'down'].includes(direction)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Direction must be "up" or "down"' }),
      }
    }

    // Save bid record
    const bidRecord = {
      playerId,
      timestamp: timestamp || Date.now(),
      direction,
      bidPrice,
      finalPrice,
      earnings,
      won,
    }

    await saveBidRecord(bidRecord)

    // Update player stats
    const updatedStats = await updatePlayerStatsAfterBid(playerId, won, earnings)

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        bid: bidRecord,
        stats: updatedStats,
      }),
    }
  }
  catch (error) {
    console.error('Error saving bid:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to save bid' }),
    }
  }
}

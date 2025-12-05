import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const client = new DynamoDBClient({})
const docClient = DynamoDBDocumentClient.from(client)

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'btc-game-api-dev'

export interface PlayerStats {
  currentStreak: number
  longestStreak: number
  totalWins: number
  totalLosses: number
  totalEarnings: number
  updatedAt: string
}

export interface BidRecord {
  playerId: string
  timestamp: number
  direction: 'up' | 'down'
  bidPrice: number
  finalPrice: number
  earnings: number
  won: boolean
}

/**
 * Get player stats
 */
export const getPlayerStats = async (playerId: string): Promise<PlayerStats | null> => {
  const command = new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `PLAYER#${playerId}`,
      SK: 'STATS',
    },
  })

  const response = await docClient.send(command)

  if (!response.Item) {
    return null
  }

  return {
    currentStreak: response.Item.currentStreak || 0,
    longestStreak: response.Item.longestStreak || 0,
    totalWins: response.Item.totalWins || 0,
    totalLosses: response.Item.totalLosses || 0,
    totalEarnings: response.Item.totalEarnings || 0,
    updatedAt: response.Item.updatedAt || new Date().toISOString(),
  }
}

/**
 * Save or update player stats
 */
export const savePlayerStats = async (playerId: string, stats: PlayerStats): Promise<void> => {
  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `PLAYER#${playerId}`,
      SK: 'STATS',
      ...stats,
      updatedAt: new Date().toISOString(),
    },
  })

  await docClient.send(command)
}

/**
 * Update player stats after a bid (atomic update)
 */
export const updatePlayerStatsAfterBid = async (
  playerId: string,
  won: boolean,
  earnings: number,
): Promise<PlayerStats> => {
  // First, get current stats to calculate new values
  const currentStats = await getPlayerStats(playerId)

  const newCurrentStreak = won ? (currentStats?.currentStreak || 0) + 1 : 0
  const newLongestStreak = Math.max(newCurrentStreak, currentStats?.longestStreak || 0)

  const command = new UpdateCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `PLAYER#${playerId}`,
      SK: 'STATS',
    },
    UpdateExpression: `
      SET currentStreak = :currentStreak,
          longestStreak = :longestStreak,
          totalWins = if_not_exists(totalWins, :zero) + :winIncrement,
          totalLosses = if_not_exists(totalLosses, :zero) + :lossIncrement,
          totalEarnings = if_not_exists(totalEarnings, :zero) + :earnings,
          updatedAt = :updatedAt
    `,
    ExpressionAttributeValues: {
      ':currentStreak': newCurrentStreak,
      ':longestStreak': newLongestStreak,
      ':winIncrement': won ? 1 : 0,
      ':lossIncrement': won ? 0 : 1,
      ':earnings': earnings,
      ':updatedAt': new Date().toISOString(),
      ':zero': 0,
    },
    ReturnValues: 'ALL_NEW',
  })

  const response = await docClient.send(command)

  return {
    currentStreak: response.Attributes?.currentStreak || 0,
    longestStreak: response.Attributes?.longestStreak || 0,
    totalWins: response.Attributes?.totalWins || 0,
    totalLosses: response.Attributes?.totalLosses || 0,
    totalEarnings: response.Attributes?.totalEarnings || 0,
    updatedAt: response.Attributes?.updatedAt || new Date().toISOString(),
  }
}

/**
 * Save a bid record
 */
export const saveBidRecord = async (bid: BidRecord): Promise<void> => {
  const command = new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: `PLAYER#${bid.playerId}`,
      SK: `BID#${bid.timestamp}`,
      ...bid,
    },
  })

  await docClient.send(command)
}

/**
 * Get player's bid history (most recent first)
 */
export const getPlayerBids = async (
  playerId: string,
  limit: number = 50,
): Promise<BidRecord[]> => {
  const command = new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': `PLAYER#${playerId}`,
      ':skPrefix': 'BID#',
    },
    ScanIndexForward: false, // Most recent first
    Limit: limit,
  })

  const response = await docClient.send(command)

  return (response.Items || []).map(item => ({
    playerId: item.playerId,
    timestamp: item.timestamp,
    direction: item.direction,
    bidPrice: item.bidPrice,
    finalPrice: item.finalPrice,
    earnings: item.earnings,
    won: item.won,
  }))
}

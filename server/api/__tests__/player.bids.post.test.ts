/**
 * Unit tests for POST /api/players/:playerId/bids
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

// Import after mocking
import bidsPostHandler from '../players/[playerId]/bids.post'
import {
  findPlayerById,
  createPlayer,
  updatePlayerStats,
  insertBid,
} from '../../utils/playerDb'

// Mock the dependencies
vi.mock('../../utils/supabase', () => ({
  getServerSupabase: vi.fn(() => ({})),
}))

vi.mock('../../utils/playerDb', () => ({
  findPlayerById: vi.fn(),
  createPlayer: vi.fn(),
  updatePlayerStats: vi.fn(),
  insertBid: vi.fn(),
}))

vi.mock('../../lib/playerHelpers', () => ({
  mapPlayerInfoToApiStats: vi.fn(row => ({
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    totalWins: row.total_wins,
    totalLosses: row.total_losses,
    totalEarnings: row.total_earnings,
    score: row.score,
    playerName: row.player_name,
    updatedAt: row.updated_at,
  })),
}))

// Mock readBody global - use vi.fn() that we can configure per test
const mockReadBody = vi.fn()

// Create mock event
function createMockEvent(playerId?: string): H3Event {
  return {
    node: {
      req: {
        url: `/api/players/${playerId}/bids`,
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      },
      res: {},
    },
    context: {
      params: playerId ? { playerId } : {},
    },
    path: `/api/players/${playerId}/bids`,
  } as unknown as H3Event
}

describe('POST /api/players/:playerId/bids', () => {
  const validBid = {
    direction: 'up' as const,
    bidPrice: 50000,
    finalPrice: 51000,
    earnings: 100,
    won: true,
    timestamp: Date.now(),
  }

  const mockExistingPlayer = {
    player_id: 'player-123',
    player_name: 'TestPlayer',
    current_streak: 2,
    longest_streak: 5,
    total_wins: 5,
    total_losses: 3,
    total_earnings: 500,
    score: 50,
    created_at: '2024-01-01',
    updated_at: '2024-01-02',
  }

  const mockUpdatedPlayer = {
    ...mockExistingPlayer,
    current_streak: 3,
    total_wins: 6,
    total_earnings: 600,
    score: 60,
    updated_at: '2024-01-03',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset readBody mock - the global stub from vitest.setup.ts
    vi.stubGlobal('readBody', mockReadBody)
  })

  it('throws 400 when playerId is missing', async () => {
    const event = {
      node: { req: { url: '/api/players//bids', method: 'POST' }, res: {} },
      context: { params: {} },
      path: '/api/players//bids',
    } as unknown as H3Event

    mockReadBody.mockResolvedValue({ bid: validBid })

    await expect(bidsPostHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Player ID is required',
    })
  })

  it('throws 400 when body is missing', async () => {
    mockReadBody.mockResolvedValue(null)

    const event = createMockEvent('player-123')

    await expect(bidsPostHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Bid data is required',
    })
  })

  it('throws 400 when bid is missing from body', async () => {
    mockReadBody.mockResolvedValue({})

    const event = createMockEvent('player-123')

    await expect(bidsPostHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Bid data is required',
    })
  })

  it('throws 400 for invalid bid structure - missing direction', async () => {
    mockReadBody.mockResolvedValue({
      bid: { ...validBid, direction: undefined },
    })

    const event = createMockEvent('player-123')

    await expect(bidsPostHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid bid data structure',
    })
  })

  it('throws 400 for invalid bid structure - wrong type bidPrice', async () => {
    mockReadBody.mockResolvedValue({
      bid: { ...validBid, bidPrice: '50000' },
    })

    const event = createMockEvent('player-123')

    await expect(bidsPostHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid bid data structure',
    })
  })

  it('throws 400 for invalid bid structure - wrong type won', async () => {
    mockReadBody.mockResolvedValue({
      bid: { ...validBid, won: 'yes' },
    })

    const event = createMockEvent('player-123')

    await expect(bidsPostHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid bid data structure',
    })
  })

  it('creates new player if not exists and saves bid', async () => {
    mockReadBody.mockResolvedValue({ bid: validBid })
    vi.mocked(findPlayerById).mockResolvedValue(null)
    vi.mocked(createPlayer).mockResolvedValue(mockExistingPlayer)
    vi.mocked(updatePlayerStats).mockResolvedValue(mockUpdatedPlayer)
    vi.mocked(insertBid).mockResolvedValue(undefined)

    const event = createMockEvent('new-player')
    const result = await bidsPostHandler(event)

    expect(findPlayerById).toHaveBeenCalled()
    expect(createPlayer).toHaveBeenCalled()
    expect(updatePlayerStats).toHaveBeenCalled()
    expect(insertBid).toHaveBeenCalled()
    expect(result).toMatchObject({
      totalWins: 6,
      totalEarnings: 600,
    })
  })

  it('updates existing player stats and saves bid', async () => {
    mockReadBody.mockResolvedValue({ bid: validBid })
    vi.mocked(findPlayerById).mockResolvedValue(mockExistingPlayer)
    vi.mocked(updatePlayerStats).mockResolvedValue(mockUpdatedPlayer)
    vi.mocked(insertBid).mockResolvedValue(undefined)

    const event = createMockEvent('player-123')
    const result = await bidsPostHandler(event)

    expect(findPlayerById).toHaveBeenCalled()
    expect(createPlayer).not.toHaveBeenCalled()
    expect(updatePlayerStats).toHaveBeenCalled()
    expect(insertBid).toHaveBeenCalled()
    expect(result).toMatchObject({
      playerName: 'TestPlayer',
      totalWins: 6,
    })
  })

  it('throws 500 error on database failure', async () => {
    mockReadBody.mockResolvedValue({ bid: validBid })
    vi.mocked(findPlayerById).mockRejectedValue(new Error('DB error'))

    const event = createMockEvent('player-123')

    await expect(bidsPostHandler(event)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to save bid',
    })
  })
})

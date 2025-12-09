/**
 * Unit tests for GET /api/players/:playerId/bids
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

// Import after mocking
import bidsGetHandler from '../players/[playerId]/bids.get'
import { fetchPlayerBids } from '../../utils/playerDb'

// Mock the dependencies
vi.mock('../../utils/supabase', () => ({
  getServerSupabase: vi.fn(() => ({})),
}))

vi.mock('../../utils/playerDb', () => ({
  fetchPlayerBids: vi.fn(),
}))

// Create mock event
function createMockEvent(playerId?: string, query: Record<string, string> = {}): H3Event {
  const url = new URL(`http://localhost/api/players/${playerId}/bids`)
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v))

  return {
    node: {
      req: { url: url.pathname + url.search, method: 'GET' },
      res: {},
    },
    context: {
      params: playerId ? { playerId } : {},
    },
    path: url.pathname,
  } as unknown as H3Event
}

describe('GET /api/players/:playerId/bids', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws 400 when playerId is missing', async () => {
    const event = {
      node: { req: { url: '/api/players//bids', method: 'GET' }, res: {} },
      context: { params: {} },
      path: '/api/players//bids',
    } as unknown as H3Event

    await expect(bidsGetHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Player ID is required',
    })
  })

  it('returns empty array when player has no bids', async () => {
    vi.mocked(fetchPlayerBids).mockResolvedValue([])

    const event = createMockEvent('player-123')
    const result = await bidsGetHandler(event)

    expect(result).toEqual([])
    expect(fetchPlayerBids).toHaveBeenCalledWith({}, 'player-123', 50)
  })

  it('uses default limit of 50', async () => {
    vi.mocked(fetchPlayerBids).mockResolvedValue([])

    const event = createMockEvent('player-123')
    await bidsGetHandler(event)

    expect(fetchPlayerBids).toHaveBeenCalledWith({}, 'player-123', 50)
  })

  it('returns bid history for player', async () => {
    const mockBids = [
      {
        direction: 'up' as const,
        bidPrice: 50000,
        finalPrice: 51000,
        earnings: 100,
        won: true,
        timestamp: 1704067200000,
      },
      {
        direction: 'down' as const,
        bidPrice: 51000,
        finalPrice: 52000,
        earnings: -100,
        won: false,
        timestamp: 1704067300000,
      },
    ]

    vi.mocked(fetchPlayerBids).mockResolvedValue(mockBids)

    const event = createMockEvent('player-123')
    const result = await bidsGetHandler(event)

    expect(result).toEqual(mockBids)
    expect(result).toHaveLength(2)
  })

  it('throws 500 error on database failure', async () => {
    vi.mocked(fetchPlayerBids).mockRejectedValue(new Error('DB error'))

    const event = createMockEvent('player-123')

    await expect(bidsGetHandler(event)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to fetch bid history',
    })
  })
})

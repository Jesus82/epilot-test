/**
 * Unit tests for GET /api/players/:playerId
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

// Import after mocking
import playerHandler from '../players/[playerId]/index.get'
import { findPlayerById } from '../../utils/playerDb'

// Mock the dependencies
vi.mock('../../utils/supabase', () => ({
  getServerSupabase: vi.fn(() => ({})),
}))

vi.mock('../../utils/playerDb', () => ({
  findPlayerById: vi.fn(),
}))

// Create mock event with router params
function createMockEvent(playerId?: string): H3Event {
  return {
    node: {
      req: { url: `/api/players/${playerId}`, method: 'GET' },
      res: {},
    },
    context: {
      params: playerId ? { playerId } : {},
    },
    path: `/api/players/${playerId}`,
  } as unknown as H3Event
}

describe('GET /api/players/:playerId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws 400 when playerId is missing', async () => {
    const event = {
      node: { req: { url: '/api/players/', method: 'GET' }, res: {} },
      context: { params: {} },
      path: '/api/players/',
    } as unknown as H3Event

    await expect(playerHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Player ID is required',
    })
  })

  it('returns default stats for new player', async () => {
    vi.mocked(findPlayerById).mockResolvedValue(null)

    const event = createMockEvent('new-player-123')
    const result = await playerHandler(event)

    expect(result).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      totalWins: 0,
      totalLosses: 0,
      totalEarnings: 0,
      score: 0,
      isNewPlayer: true,
    })
    expect(findPlayerById).toHaveBeenCalled()
  })

  it('returns mapped stats for existing player', async () => {
    vi.mocked(findPlayerById).mockResolvedValue({
      player_id: 'player-123',
      player_name: 'TestPlayer',
      current_streak: 2,
      longest_streak: 5,
      total_wins: 15,
      total_losses: 10,
      total_earnings: 2500.75,
      score: 150,
      created_at: '2024-01-01',
      updated_at: '2024-01-02',
    })

    const event = createMockEvent('player-123')
    const result = await playerHandler(event)

    expect(result).toEqual({
      currentStreak: 2,
      longestStreak: 5,
      totalWins: 15,
      totalLosses: 10,
      totalEarnings: 2500.75,
      score: 150,
      playerName: 'TestPlayer',
      updatedAt: '2024-01-02',
    })
  })

  it('throws 500 error on database failure', async () => {
    vi.mocked(findPlayerById).mockRejectedValue(new Error('DB error'))

    const event = createMockEvent('player-123')

    await expect(playerHandler(event)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to fetch player stats',
    })
  })
})

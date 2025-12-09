/**
 * Unit tests for PUT /api/players/:playerId/name
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { H3Event } from 'h3'

// Import after mocking
import namePutHandler from '../players/[playerId]/name.put'
import {
  findPlayerById,
  createPlayer,
  updatePlayerNameInDb,
} from '../../utils/playerDb'

// Mock the dependencies
vi.mock('../../utils/supabase', () => ({
  getServerSupabase: vi.fn(() => ({})),
}))

vi.mock('../../utils/playerDb', () => ({
  findPlayerById: vi.fn(),
  createPlayer: vi.fn(),
  updatePlayerNameInDb: vi.fn(),
}))

vi.mock('../../lib/playerHelpers', () => ({
  isUniqueConstraintError: vi.fn((err) => {
    // Simulate checking for PostgreSQL unique constraint error
    return err?.code === '23505' || err?.message?.includes('unique constraint')
  }),
}))

// Mock readBody global - use vi.fn() that we can configure per test
const mockReadBody = vi.fn()

// Create mock event
function createMockEvent(playerId?: string): H3Event {
  return {
    node: {
      req: {
        url: `/api/players/${playerId}/name`,
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
      },
      res: {},
    },
    context: {
      params: playerId ? { playerId } : {},
    },
    path: `/api/players/${playerId}/name`,
  } as unknown as H3Event
}

describe('PUT /api/players/:playerId/name', () => {
  const mockExistingPlayer = {
    player_id: 'player-123',
    player_name: 'OldName',
    current_streak: 2,
    longest_streak: 5,
    total_wins: 5,
    total_losses: 3,
    total_earnings: 500,
    score: 50,
    created_at: '2024-01-01',
    updated_at: '2024-01-02',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset readBody mock - the global stub from vitest.setup.ts
    vi.stubGlobal('readBody', mockReadBody)
  })

  it('throws 400 when playerId is missing', async () => {
    const event = {
      node: { req: { url: '/api/players//name', method: 'PUT' }, res: {} },
      context: { params: {} },
      path: '/api/players//name',
    } as unknown as H3Event

    mockReadBody.mockResolvedValue({ playerName: 'NewName' })

    await expect(namePutHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Player ID is required',
    })
  })

  it('throws 400 when body is missing', async () => {
    mockReadBody.mockResolvedValue(null)

    const event = createMockEvent('player-123')

    await expect(namePutHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Player name is required',
    })
  })

  it('throws 400 when playerName is missing', async () => {
    mockReadBody.mockResolvedValue({})

    const event = createMockEvent('player-123')

    await expect(namePutHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Player name is required',
    })
  })

  it('throws 400 when playerName is empty string', async () => {
    mockReadBody.mockResolvedValue({ playerName: '' })

    const event = createMockEvent('player-123')

    await expect(namePutHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Player name is required',
    })
  })

  it('throws 400 when playerName is only whitespace', async () => {
    mockReadBody.mockResolvedValue({ playerName: '   ' })

    const event = createMockEvent('player-123')

    await expect(namePutHandler(event)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Player name is required',
    })
  })

  it('updates name for existing player', async () => {
    mockReadBody.mockResolvedValue({ playerName: 'NewName' })
    vi.mocked(findPlayerById).mockResolvedValue(mockExistingPlayer)
    vi.mocked(updatePlayerNameInDb).mockResolvedValue(undefined)

    const event = createMockEvent('player-123')
    const result = await namePutHandler(event)

    expect(findPlayerById).toHaveBeenCalled()
    expect(updatePlayerNameInDb).toHaveBeenCalledWith({}, 'player-123', 'NewName')
    expect(createPlayer).not.toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })

  it('trims whitespace from player name', async () => {
    mockReadBody.mockResolvedValue({ playerName: '  NewName  ' })
    vi.mocked(findPlayerById).mockResolvedValue(mockExistingPlayer)
    vi.mocked(updatePlayerNameInDb).mockResolvedValue(undefined)

    const event = createMockEvent('player-123')
    await namePutHandler(event)

    expect(updatePlayerNameInDb).toHaveBeenCalledWith({}, 'player-123', 'NewName')
  })

  it('creates new player if not exists', async () => {
    mockReadBody.mockResolvedValue({ playerName: 'NewPlayer' })
    vi.mocked(findPlayerById).mockResolvedValue(null)
    vi.mocked(createPlayer).mockResolvedValue(mockExistingPlayer)

    const event = createMockEvent('new-player')
    const result = await namePutHandler(event)

    expect(findPlayerById).toHaveBeenCalled()
    expect(createPlayer).toHaveBeenCalledWith({}, 'new-player', 'NewPlayer')
    expect(updatePlayerNameInDb).not.toHaveBeenCalled()
    expect(result).toEqual({ success: true })
  })

  it('throws 409 for duplicate player name', async () => {
    mockReadBody.mockResolvedValue({ playerName: 'ExistingName' })
    vi.mocked(findPlayerById).mockResolvedValue(mockExistingPlayer)
    // Simulate unique constraint error
    const uniqueError = new Error('duplicate key value violates unique constraint') as Error & { code?: string }
    uniqueError.code = '23505'
    vi.mocked(updatePlayerNameInDb).mockRejectedValue(uniqueError)

    const event = createMockEvent('player-123')

    await expect(namePutHandler(event)).rejects.toMatchObject({
      statusCode: 409,
      statusMessage: 'Player name already exists',
    })
  })

  it('throws 500 error on other database failure', async () => {
    mockReadBody.mockResolvedValue({ playerName: 'NewName' })
    vi.mocked(findPlayerById).mockRejectedValue(new Error('DB connection error'))

    const event = createMockEvent('player-123')

    await expect(namePutHandler(event)).rejects.toMatchObject({
      statusCode: 500,
      statusMessage: 'Failed to update player name',
    })
  })
})

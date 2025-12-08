import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { usePlayerApi, resetSupabaseClient } from '../usePlayerApi'
import type { ApiPlayerStats } from '../usePlayerApi'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
}

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Mock useRuntimeConfig as a global
vi.stubGlobal('useRuntimeConfig', () => ({
  public: {
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-anon-key',
  },
}))

// Helper to create chainable query mock
const createQueryMock = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error }),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue({ data, error }),
})

describe('usePlayerApi', () => {
  beforeEach(() => {
    resetSupabaseClient()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchStats', () => {
    it('should return stats with player name for existing player', async () => {
      const mockPlayer = {
        id: '1',
        player_id: 'test-player-id',
        player_name: 'TestPlayer',
        current_streak: 5,
        longest_streak: 10,
        total_wins: 20,
        total_losses: 5,
        total_earnings: 1500,
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      }

      const queryMock = createQueryMock(mockPlayer)
      mockSupabaseClient.from.mockReturnValue(queryMock)

      const { fetchStats } = usePlayerApi()
      const stats = await fetchStats('test-player-id')

      expect(stats).not.toBeNull()
      expect(stats?.playerName).toBe('TestPlayer')
      expect(stats?.currentStreak).toBe(5)
      expect(stats?.longestStreak).toBe(10)
      expect(stats?.totalWins).toBe(20)
      expect(stats?.totalLosses).toBe(5)
      expect(stats?.totalEarnings).toBe(1500)
    })

    it('should return null player name for new player', async () => {
      const mockPlayer = {
        id: '1',
        player_id: 'new-player-id',
        player_name: null,
        current_streak: 0,
        longest_streak: 0,
        total_wins: 0,
        total_losses: 0,
        total_earnings: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }

      const queryMock = createQueryMock(mockPlayer)
      mockSupabaseClient.from.mockReturnValue(queryMock)

      const { fetchStats } = usePlayerApi()
      const stats = await fetchStats('new-player-id')

      expect(stats).not.toBeNull()
      expect(stats?.playerName).toBeNull()
    })

    it('should return isNewPlayer true when no record found', async () => {
      const queryMock = createQueryMock(null, { code: 'PGRST116' })
      mockSupabaseClient.from.mockReturnValue(queryMock)

      const { fetchStats } = usePlayerApi()
      const stats = await fetchStats('brand-new-player')

      expect(stats).not.toBeNull()
      expect(stats?.isNewPlayer).toBe(true)
      expect(stats?.currentStreak).toBe(0)
    })
  })

  describe('updatePlayerName', () => {
    it('should update name for existing player', async () => {
      // Mock existing player check
      const existingPlayerMock = createQueryMock({ id: '1' })

      // Mock update operation
      const updateMock = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(existingPlayerMock) // First call: check existence
        .mockReturnValueOnce(updateMock) // Second call: update

      const { updatePlayerName } = usePlayerApi()
      const success = await updatePlayerName('existing-player', 'NewName')

      expect(success).toBe(true)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('players')
    })

    it('should create new player with name if not exists', async () => {
      // Mock no existing player
      const noPlayerMock = createQueryMock(null, { code: 'PGRST116' })

      // Mock insert operation
      const insertMock = {
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(noPlayerMock) // First call: check existence
        .mockReturnValueOnce(insertMock) // Second call: insert

      const { updatePlayerName } = usePlayerApi()
      const success = await updatePlayerName('new-player', 'BrandNewPlayer')

      expect(success).toBe(true)
    })

    it('should return false on error', async () => {
      // Mock existing player check
      const existingPlayerMock = createQueryMock({ id: '1' })

      // Mock update error
      const updateMock = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: new Error('Update failed') }),
        }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(existingPlayerMock)
        .mockReturnValueOnce(updateMock)

      const { updatePlayerName, error } = usePlayerApi()
      const success = await updatePlayerName('player-id', 'Name')

      expect(success).toBe(false)
      expect(error.value).toBeTruthy()
    })

    it('should set isLoading during operation', async () => {
      const queryMock = createQueryMock({ id: '1' })
      const updateMock = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(queryMock)
        .mockReturnValueOnce(updateMock)

      const { updatePlayerName, isLoading } = usePlayerApi()

      expect(isLoading.value).toBe(false)

      const promise = updatePlayerName('player-id', 'Name')
      // isLoading should be true during operation
      expect(isLoading.value).toBe(true)

      await promise

      expect(isLoading.value).toBe(false)
    })
  })

  describe('saveBid', () => {
    it('should return playerName after saving bid', async () => {
      const mockExistingPlayer = {
        id: '1',
        player_id: 'test-player',
        player_name: 'TestPlayer',
        current_streak: 2,
        longest_streak: 5,
        total_wins: 10,
        total_losses: 3,
        total_earnings: 500,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }

      const mockUpdatedPlayer = {
        ...mockExistingPlayer,
        current_streak: 3,
        total_wins: 11,
        total_earnings: 600,
      }

      // Mock for checking existing player
      const selectMock = createQueryMock(mockExistingPlayer)

      // Mock for update
      const updateMock = {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockUpdatedPlayer, error: null }),
            }),
          }),
        }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockExistingPlayer, error: null }),
      }

      // Mock for inserting bid
      const insertBidMock = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      }

      mockSupabaseClient.from
        .mockReturnValueOnce(selectMock) // Check existing player
        .mockReturnValueOnce(updateMock) // Update player stats
        .mockReturnValueOnce(insertBidMock) // Insert bid

      const { saveBid } = usePlayerApi()
      const result = await saveBid('test-player', {
        direction: 'up',
        bidPrice: 50000,
        finalPrice: 50100,
        earnings: 100,
        won: true,
        timestamp: Date.now(),
      })

      expect(result).not.toBeNull()
      expect(result?.playerName).toBe('TestPlayer')
    })
  })
})

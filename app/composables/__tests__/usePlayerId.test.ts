import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { usePlayerId } from '../usePlayerId'

describe('usePlayerId', () => {
  const PLAYER_ID_KEY = 'btc-game-player-id'
  let localStorageMock: { [key: string]: string }

  beforeEach(() => {
    localStorageMock = {}

    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key]
      }),
      clear: vi.fn(() => {
        localStorageMock = {}
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('initPlayerId', () => {
    it('should generate a new UUID if none exists', () => {
      const { initPlayerId, playerId } = usePlayerId()

      const id = initPlayerId()

      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      expect(playerId.value).toBe(id)
      expect(localStorage.setItem).toHaveBeenCalledWith(PLAYER_ID_KEY, id)
    })

    it('should retrieve existing UUID from localStorage', () => {
      const existingId = 'existing-uuid-1234'
      localStorageMock[PLAYER_ID_KEY] = existingId

      const { initPlayerId, playerId } = usePlayerId()

      const id = initPlayerId()

      expect(id).toBe(existingId)
      expect(playerId.value).toBe(existingId)
      expect(localStorage.setItem).not.toHaveBeenCalled()
    })

    it('should set isInitialized to true after init', () => {
      const { initPlayerId, isInitialized } = usePlayerId()

      expect(isInitialized.value).toBe(false)

      initPlayerId()

      expect(isInitialized.value).toBe(true)
    })
  })

  describe('getPlayerId', () => {
    it('should return existing playerId if already initialized', () => {
      const { initPlayerId, getPlayerId } = usePlayerId()

      const id1 = initPlayerId()
      const id2 = getPlayerId()

      expect(id1).toBe(id2)
    })

    it('should initialize if not already done', () => {
      const { getPlayerId, isInitialized } = usePlayerId()

      expect(isInitialized.value).toBe(false)

      const id = getPlayerId()

      expect(id).toBeTruthy()
      expect(isInitialized.value).toBe(true)
    })
  })

  describe('resetPlayerId', () => {
    it('should generate a new UUID', () => {
      const { initPlayerId, resetPlayerId } = usePlayerId()

      const oldId = initPlayerId()
      const newId = resetPlayerId()

      expect(newId).not.toBe(oldId)
      expect(newId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    })

    it('should update localStorage with new ID', () => {
      const { initPlayerId, resetPlayerId } = usePlayerId()

      initPlayerId()
      const newId = resetPlayerId()

      expect(localStorage.setItem).toHaveBeenLastCalledWith(PLAYER_ID_KEY, newId)
    })

    it('should update playerId ref', () => {
      const { initPlayerId, resetPlayerId, playerId } = usePlayerId()

      initPlayerId()
      const newId = resetPlayerId()

      expect(playerId.value).toBe(newId)
    })
  })

  describe('hasExistingId', () => {
    it('should return false if no ID exists', () => {
      const { hasExistingId } = usePlayerId()

      expect(hasExistingId()).toBe(false)
    })

    it('should return true if ID exists in localStorage', () => {
      localStorageMock[PLAYER_ID_KEY] = 'existing-id'

      const { hasExistingId } = usePlayerId()

      expect(hasExistingId()).toBe(true)
    })
  })

  describe('UUID format', () => {
    // Generate multiple UUIDs to verify format consistency
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx where y is 8, 9, a, or b
    it.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])(
      'should generate valid UUID v4 format (iteration %i)',
      () => {
        localStorageMock = {} // Clear storage to force new generation
        const { initPlayerId } = usePlayerId()
        const id = initPlayerId()

        expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      }
    })
  })
})

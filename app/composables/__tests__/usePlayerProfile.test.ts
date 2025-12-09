import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { usePlayerProfile } from '../usePlayerProfile'

// Mock usePlayerId
const mockGetPlayerId = vi.fn(() => 'test-player-id')
vi.stubGlobal('usePlayerId', () => ({
  getPlayerId: mockGetPlayerId,
}))

// Mock usePlayerService
const mockUpdatePlayerName = vi.fn()
const mockIsLoading = ref(false)
const mockApiError = ref<string | null>(null)
vi.stubGlobal('usePlayerService', () => ({
  updatePlayerName: mockUpdatePlayerName,
  isLoading: mockIsLoading,
  error: mockApiError,
}))

describe('usePlayerProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLoading.value = false
    mockApiError.value = null
    mockUpdatePlayerName.mockReset()

    // Reset the singleton state by calling the composable and resetting values
    const { playerName, isEditingName, nameError } = usePlayerProfile()
    playerName.value = ''
    isEditingName.value = false
    nameError.value = null
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have empty playerName initially', () => {
      const { playerName } = usePlayerProfile()
      expect(playerName.value).toBe('')
    })

    it('should not be editing initially', () => {
      const { isEditingName } = usePlayerProfile()
      expect(isEditingName.value).toBe(false)
    })

    it('should have no error initially', () => {
      const { nameError } = usePlayerProfile()
      expect(nameError.value).toBeNull()
    })

    it('should expose isLoading from usePlayerService', () => {
      const { isLoading } = usePlayerProfile()
      expect(isLoading.value).toBe(false)

      mockIsLoading.value = true
      expect(isLoading.value).toBe(true)
    })
  })

  describe('setPlayerName', () => {
    it('should set the player name', () => {
      const { setPlayerName, playerName } = usePlayerProfile()

      setPlayerName('TestPlayer')

      expect(playerName.value).toBe('TestPlayer')
    })

    it('should update playerName across multiple calls to usePlayerProfile (singleton)', () => {
      const profile1 = usePlayerProfile()
      const profile2 = usePlayerProfile()

      profile1.setPlayerName('SharedName')

      expect(profile2.playerName.value).toBe('SharedName')
    })
  })

  describe('startEditing', () => {
    it('should set isEditingName to true', () => {
      const { startEditing, isEditingName } = usePlayerProfile()

      startEditing()

      expect(isEditingName.value).toBe(true)
    })

    it('should clear any existing errors', () => {
      const { startEditing, nameError } = usePlayerProfile()
      nameError.value = 'Previous error'

      startEditing()

      expect(nameError.value).toBeNull()
    })

    it('should not start editing if isLocked is true', () => {
      const isLocked = ref(true)
      const { startEditing, isEditingName } = usePlayerProfile({ isLocked })

      startEditing()

      expect(isEditingName.value).toBe(false)
    })

    it('should start editing if isLocked is false', () => {
      const isLocked = ref(false)
      const { startEditing, isEditingName } = usePlayerProfile({ isLocked })

      startEditing()

      expect(isEditingName.value).toBe(true)
    })

    it('should start editing if isLocked is not provided', () => {
      const { startEditing, isEditingName } = usePlayerProfile()

      startEditing()

      expect(isEditingName.value).toBe(true)
    })
  })

  describe('cancelEditing', () => {
    it('should set isEditingName to false', () => {
      const { startEditing, cancelEditing, isEditingName } = usePlayerProfile()

      startEditing()
      expect(isEditingName.value).toBe(true)

      cancelEditing()
      expect(isEditingName.value).toBe(false)
    })

    it('should clear any errors', () => {
      const { cancelEditing, nameError } = usePlayerProfile()
      nameError.value = 'Some error'

      cancelEditing()

      expect(nameError.value).toBeNull()
    })
  })

  describe('saveName', () => {
    it('should call updatePlayerName with playerId and trimmed name', async () => {
      mockUpdatePlayerName.mockResolvedValue(true)
      const { setPlayerName, saveName } = usePlayerProfile()

      setPlayerName('  NewName  ')
      await saveName()

      expect(mockUpdatePlayerName).toHaveBeenCalledWith('test-player-id', 'NewName')
    })

    it('should return true on successful save', async () => {
      mockUpdatePlayerName.mockResolvedValue(true)
      const { setPlayerName, saveName } = usePlayerProfile()

      setPlayerName('TestName')
      const result = await saveName()

      expect(result).toBe(true)
    })

    it('should set isEditingName to false on success', async () => {
      mockUpdatePlayerName.mockResolvedValue(true)
      const { setPlayerName, startEditing, saveName, isEditingName } = usePlayerProfile()

      setPlayerName('TestName')
      startEditing()
      expect(isEditingName.value).toBe(true)

      await saveName()

      expect(isEditingName.value).toBe(false)
    })

    it('should clear nameError on success', async () => {
      mockUpdatePlayerName.mockResolvedValue(true)
      const { setPlayerName, saveName, nameError } = usePlayerProfile()
      nameError.value = 'Previous error'

      setPlayerName('TestName')
      await saveName()

      expect(nameError.value).toBeNull()
    })

    it('should return false on failed save', async () => {
      mockUpdatePlayerName.mockResolvedValue(false)
      mockApiError.value = 'API Error'
      const { setPlayerName, saveName } = usePlayerProfile()

      setPlayerName('TestName')
      const result = await saveName()

      expect(result).toBe(false)
    })

    it('should set nameError from apiError on failure', async () => {
      mockUpdatePlayerName.mockResolvedValue(false)
      mockApiError.value = 'Name already taken'
      const { setPlayerName, saveName, nameError } = usePlayerProfile()

      setPlayerName('TestName')
      await saveName()

      expect(nameError.value).toBe('Name already taken')
    })

    it('should not call updatePlayerName if playerId is empty', async () => {
      mockGetPlayerId.mockReturnValue('')
      const { setPlayerName, saveName } = usePlayerProfile()

      setPlayerName('TestName')
      const result = await saveName()

      expect(result).toBe(false)
      expect(mockUpdatePlayerName).not.toHaveBeenCalled()
    })

    it('should not call updatePlayerName if playerName is empty', async () => {
      const { setPlayerName, saveName } = usePlayerProfile()

      setPlayerName('')
      const result = await saveName()

      expect(result).toBe(false)
      expect(mockUpdatePlayerName).not.toHaveBeenCalled()
    })

    it('should not call updatePlayerName if playerName is only whitespace', async () => {
      const { setPlayerName, saveName } = usePlayerProfile()

      setPlayerName('   ')
      const result = await saveName()

      expect(result).toBe(false)
      expect(mockUpdatePlayerName).not.toHaveBeenCalled()
    })

    it('should clear nameError before attempting save', async () => {
      mockUpdatePlayerName.mockResolvedValue(true)
      const { setPlayerName, saveName, nameError } = usePlayerProfile()
      nameError.value = 'Old error'

      setPlayerName('TestName')
      await saveName()

      // nameError should be cleared even before the async call
      expect(nameError.value).toBeNull()
    })
  })

  describe('singleton behavior', () => {
    it('should share state between multiple calls', () => {
      const profile1 = usePlayerProfile()
      const profile2 = usePlayerProfile()

      profile1.setPlayerName('Player1')
      profile1.startEditing()

      expect(profile2.playerName.value).toBe('Player1')
      expect(profile2.isEditingName.value).toBe(true)
    })

    it('should share nameError between instances', () => {
      const profile1 = usePlayerProfile()
      const profile2 = usePlayerProfile()

      profile1.nameError.value = 'Test error'

      expect(profile2.nameError.value).toBe('Test error')
    })
  })

  describe('with isLocked option', () => {
    it('should respect isLocked ref changes', () => {
      const isLocked = ref(true)
      const { startEditing, isEditingName } = usePlayerProfile({ isLocked })

      // Should not edit when locked
      startEditing()
      expect(isEditingName.value).toBe(false)

      // Change to unlocked
      isLocked.value = false
      startEditing()
      expect(isEditingName.value).toBe(true)
    })
  })
})

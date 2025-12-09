/**
 * Composable for managing player profile state
 * Handles player name display, editing, and persistence
 */

interface UsePlayerProfileOptions {
  isLocked?: Ref<boolean>
}

export const usePlayerProfile = (options: UsePlayerProfileOptions = {}) => {
  const { isLocked } = options
  const { getPlayerId } = usePlayerId()
  const { updatePlayerName, isLoading, error: apiError } = usePlayerService()

  // Profile state
  const playerName = ref<string>('')
  const isEditingName = ref(false)
  const nameError = ref<string | null>(null)

  /**
   * Set the player name (e.g., after loading from API)
   */
  const setPlayerName = (name: string) => {
    playerName.value = name
  }

  /**
   * Start editing the player name
   * Will not start if isLocked is provided and true
   */
  const startEditing = () => {
    if (isLocked?.value) {
      return
    }
    isEditingName.value = true
    nameError.value = null
  }

  /**
   * Cancel editing and clear any errors
   */
  const cancelEditing = () => {
    isEditingName.value = false
    nameError.value = null
  }

  /**
   * Save the player name to the API
   * Returns true if successful, false otherwise
   */
  const saveName = async (): Promise<boolean> => {
    nameError.value = null
    const playerId = getPlayerId()

    if (!playerId || !playerName.value.trim()) {
      return false
    }

    const success = await updatePlayerName(playerId, playerName.value.trim())

    if (success) {
      isEditingName.value = false
      nameError.value = null
      return true
    }
    else {
      nameError.value = apiError.value
      return false
    }
  }

  return {
    // State
    playerName,
    isEditingName,
    nameError,
    isLoading,

    // Actions
    setPlayerName,
    startEditing,
    cancelEditing,
    saveName,
  }
}

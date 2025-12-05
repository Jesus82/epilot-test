import { ref, readonly } from 'vue'

const PLAYER_ID_KEY = 'btc-game-player-id'

/**
 * Generate a UUID v4
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Composable for managing player identification
 * Uses localStorage to persist the player ID across sessions
 */
export const usePlayerId = () => {
  const playerId = ref<string | null>(null)
  const isInitialized = ref(false)

  /**
   * Initialize player ID - retrieves from localStorage or generates new one
   */
  const initPlayerId = (): string => {
    if (import.meta.server) {
      return ''
    }

    let id = localStorage.getItem(PLAYER_ID_KEY)

    if (!id) {
      id = generateUUID()
      localStorage.setItem(PLAYER_ID_KEY, id)
    }

    playerId.value = id
    isInitialized.value = true
    return id
  }

  /**
   * Get current player ID (initializes if needed)
   */
  const getPlayerId = (): string => {
    if (playerId.value) {
      return playerId.value
    }
    return initPlayerId()
  }

  /**
   * Reset player ID (generates a new one)
   * Useful for "start fresh" functionality
   */
  const resetPlayerId = (): string => {
    if (import.meta.server) {
      return ''
    }

    const newId = generateUUID()
    localStorage.setItem(PLAYER_ID_KEY, newId)
    playerId.value = newId
    return newId
  }

  /**
   * Check if player has an existing ID (returning player)
   */
  const hasExistingId = (): boolean => {
    if (import.meta.server) {
      return false
    }
    return localStorage.getItem(PLAYER_ID_KEY) !== null
  }

  return {
    playerId: readonly(playerId),
    isInitialized: readonly(isInitialized),
    initPlayerId,
    getPlayerId,
    resetPlayerId,
    hasExistingId,
  }
}

import type { PersistedBid } from '../../shared/types/game'

const BID_STORAGE_KEY = 'activeBid'

/**
 * Save active bid to localStorage
 */
export const saveBidToStorage = (
  guessPrice: number,
  guess: 'up' | 'down',
  bidDuration: number,
): void => {
  const bid: PersistedBid = {
    guessPrice,
    guess,
    startTime: Date.now(),
    bidDuration,
  }
  try {
    localStorage.setItem(BID_STORAGE_KEY, JSON.stringify(bid))
  }
  catch {
    // localStorage may not be available (SSR, private browsing, etc.)
  }
}

/**
 * Load active bid from localStorage
 * Returns null if no bid exists or data is invalid
 */
export const loadBidFromStorage = (): PersistedBid | null => {
  try {
    const stored = localStorage.getItem(BID_STORAGE_KEY)
    if (!stored) return null

    const bid = JSON.parse(stored) as PersistedBid

    // Validate the bid structure
    if (
      typeof bid.guessPrice !== 'number'
      || (bid.guess !== 'up' && bid.guess !== 'down')
      || typeof bid.startTime !== 'number'
      || typeof bid.bidDuration !== 'number'
    ) {
      clearBidFromStorage()
      return null
    }

    return bid
  }
  catch {
    return null
  }
}

/**
 * Clear the active bid from localStorage
 */
export const clearBidFromStorage = (): void => {
  try {
    localStorage.removeItem(BID_STORAGE_KEY)
  }
  catch {
    // localStorage may not be available
  }
}

/**
 * Calculate remaining time for a persisted bid
 * Returns negative number if bid has expired
 */
export const calculateRemainingTime = (bid: PersistedBid): number => {
  const elapsed = Math.floor((Date.now() - bid.startTime) / 1000)
  return bid.bidDuration - elapsed
}

/**
 * Check if a persisted bid has expired (countdown finished while away)
 */
export const isBidExpired = (bid: PersistedBid): boolean => {
  return calculateRemainingTime(bid) <= 0
}

/**
 * Client-side player service helpers
 * Re-exports from shared helpers for backward compatibility
 */

export {
  createDefaultPlayerStats,
  createNewPlayerApiStats,
  mapPlayerInfoToApiStats,
  mapBidInfoToBidResult,
  calculateUpdatedStats,
  createBidRecord,
  isUniqueConstraintError,
  isRecordNotFoundError,
  getErrorMessage,
} from '../../shared/helpers/playerHelpers'

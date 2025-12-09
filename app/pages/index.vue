<script setup lang="ts">
import { calculateYDomain } from '~/helpers/btcChartHelpers'
import { filterByTimeRange } from '~/helpers/btcPriceChartHelpers'
import type { BidResult } from '../../shared/types/api'

const { priceData, price, status, priceHistory, setBid, clearBid, connect, disconnect } = useBtcPrice()

// Player identification
const { getPlayerId } = usePlayerId()

// Player API for persistence
const { fetchStats, saveBid, updatePlayerName, isLoading: isApiLoading, error: apiError } = usePlayerService()

// Player name state
const playerName = ref<string>('')
const isEditingName = ref(false)
const showNamePrompt = ref(true)
const isNewPlayer = ref(false)
const isPlayerChecked = ref(false)
const nameError = ref<string | null>(null)

// Callback when a bid completes - save to Supabase
const onBidComplete = async (result: BidResult) => {
  const playerId = getPlayerId()
  if (playerId) {
    await saveBid(playerId, result)
  }
}

// Game logic composable with bid completion callback
const {
  score,
  guess,
  isLocked,
  countdown,
  guessPrice,
  isWinning,
  currentStreak,
  longestStreak,
  totalWins,
  totalLosses,
  totalEarnings,
  potentialEarnings,
  lastBidResult,
  makeGuess,
  cleanup,
  loadStats,
} = useGameLogic(priceData, setBid, clearBid, onBidComplete)

// Track selected range (default 5 minutes, same as chart)
const selectedRange = ref(5)

const yDomain = computed(() => {
  const filteredData = filterByTimeRange(priceHistory.value, selectedRange.value)
  return calculateYDomain(filteredData)
})

const bidToPriceDifference = computed(() => {
  if (guessPrice.value && price.value) {
    return price.value - guessPrice.value
  }
  return null
})

// Load player stats on mount
onMounted(async () => {
  connect()

  const playerId = getPlayerId()
  if (playerId) {
    const stats = await fetchStats(playerId)
    if (stats) {
      if (stats.isNewPlayer || !stats.playerName) {
        // New player - show the input
        isNewPlayer.value = true
        isPlayerChecked.value = true
      }
      else {
        // Existing player with name - hide prompt and load stats
        showNamePrompt.value = false
        playerName.value = stats.playerName
        loadStats(stats)
      }
    }
  }
})

const handleSaveName = async () => {
  nameError.value = null
  const playerId = getPlayerId()
  if (playerId && playerName.value.trim()) {
    const success = await updatePlayerName(playerId, playerName.value.trim())
    if (success) {
      showNamePrompt.value = false
      isEditingName.value = false
      nameError.value = null
    }
    else {
      nameError.value = apiError.value
    }
  }
}

const handleCancelNameEdit = () => {
  isEditingName.value = false
  nameError.value = null
}

const startEditingName = () => {
  if (!isLocked.value) {
    isEditingName.value = true
  }
}

onUnmounted(() => {
  disconnect()
  cleanup()
})
</script>

<template>
  <main class="p-second">
    <PlayerNamePrompt
      v-model="playerName"
      :show="showNamePrompt"
      :show-content="isPlayerChecked"
      :show-input="isNewPlayer"
      :loading="isApiLoading"
      :error="nameError"
      @save="handleSaveName"
    />

    <div class="flex justify-between items-center">
      <div class="flex items-center gap-half">
        <template v-if="!isEditingName && playerName">
          <span
            class="font-display text-lg cursor-pointer hover:text-orange"
            :class="{ 'opacity-50 cursor-not-allowed': isLocked }"
            :title="isLocked ? 'Cannot edit while bid is locked' : 'Click to edit name'"
            @click="startEditingName"
          >
            {{ playerName }}
          </span>
        </template>
        <template v-else-if="isEditingName">
          <div class="flex flex-col">
            <PlayerNameInput
              v-model="playerName"
              :disabled="isApiLoading"
              :is-editing="true"
              @save="handleSaveName"
              @cancel="handleCancelNameEdit"
            />
            <p
              v-if="nameError"
              class="text-red text-sm mt-1"
            >
              {{ nameError }}
            </p>
          </div>
        </template>
      </div>

      <p class="font-display text-lg">
        Score: {{ score }}
      </p>
    </div>

    <ClientOnly fallback-tag="div">
      <BtcPriceChart />

      <div class="grid grid-cols-3 py-second">
        <BidStatus
          :countdown="countdown"
          :is-locked="isLocked"
          :guess-price="guessPrice"
          :current-price="price"
          :is-winning="isWinning"
          :guess="guess"
          :bid-to-price-difference="bidToPriceDifference"
          :y-min="yDomain.yMin"
          :y-max="yDomain.yMax"
        />
        <BidButtons
          :is-locked="isLocked"
          :is-connected="status === 'connected'"
          :guess="guess"
          @guess="makeGuess"
        />
        <PlayerStatsPanel
          :total-earnings="totalEarnings"
          :current-streak="currentStreak"
          :longest-streak="longestStreak"
          :total-wins="totalWins"
          :total-losses="totalLosses"
          :potential-earnings="potentialEarnings"
          :is-locked="isLocked"
          :last-bid-result="lastBidResult"
        />
      </div>
    </ClientOnly>
  </main>
</template>

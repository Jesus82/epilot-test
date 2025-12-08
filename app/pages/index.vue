<script setup lang="ts">
import { calculateYDomain } from '~/helpers/btcChartHelpers'
import { filterByTimeRange } from '~/helpers/btcPriceChartHelpers'
import type { BidResult } from '../../shared/types/api'

const { priceData, price, formatPrice, status, priceHistory, setBid, clearBid, connect, disconnect } = useBtcPrice()

// Player identification
const { getPlayerId } = usePlayerId()

// Player API for persistence
const { fetchStats, saveBid, updatePlayerName, isLoading: isApiLoading, error: apiError } = usePlayerService()

// Player name state
const playerName = ref<string>('')
const isEditingName = ref(false)
const showNamePrompt = ref(false)
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

  // Load existing stats from Supabase
  const playerId = getPlayerId()
  if (playerId) {
    const stats = await fetchStats(playerId)
    if (stats) {
      if (stats.isNewPlayer || !stats.playerName) {
        // New player or player without name - prompt for name
        showNamePrompt.value = true
      }
      else {
        playerName.value = stats.playerName
        loadStats(stats)
      }
    }
  }
})

// Handle saving player name
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
      // Show the error from the API
      nameError.value = apiError.value
    }
  }
}

// Handle canceling name edit
const handleCancelNameEdit = () => {
  isEditingName.value = false
  nameError.value = null
}

// Start editing name (only when not locked)
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
    <!-- Player Name Prompt Overlay -->
    <div
      v-if="showNamePrompt"
      class="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
    >
      <div class="bg-gray-900 p-8 rounded-lg max-w-md w-full mx-4">
        <h2 class="font-display text-2xl mb-4 text-center">
          Welcome to BTC Price Prediction!
        </h2>
        <p class="text-gray-400 mb-6 text-center">
          Enter your name to get started
        </p>
        <PlayerNameInput
          v-model="playerName"
          :disabled="isApiLoading"
          :is-editing="true"
          @save="handleSaveName"
        />
        <p
          v-if="nameError"
          class="text-red text-sm mt-2 text-center"
        >
          {{ nameError }}
        </p>
      </div>
    </div>

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
      <p class="font-display text-lg capitalize">
        {{ status }}
      </p>
      <p class="font-display text-lg">
        Score: {{ score }}
      </p>
    </div>

    <ClientOnly fallback-tag="div">
      <BtcPriceChart />

      <div class="grid grid-cols-3 py-second">
        <div class="flex justify-center items-center gap-half">
          <p
            v-if="countdown"
            class="font-display text-3xl"
          >
            {{ countdown }}s
          </p>
          <BidProgressBar
            v-if="isLocked && guessPrice && price && guess"
            :bid-price="guessPrice"
            :current-price="price"
            :is-winning="isWinning"
            :y-min="yDomain.yMin"
            :y-max="yDomain.yMax"
          />
          <div class="grid grid-rows-3">
            <p
              v-if="isLocked && bidToPriceDifference"
              :class="[
                'font-display text-lg',
                isWinning
                  ? 'text-green'
                  : 'text-red',
                bidToPriceDifference >= 0
                  ? 'row-start-1'
                  : 'row-start-3',
              ]"
            >
              {{ bidToPriceDifference > 0 ? '+' : '' }}{{ formatPrice(bidToPriceDifference) }}
            </p>
            <p
              v-if="guessPrice"
              class="font-display text-lg text-gray-dark row-start-2"
            >
              Your bid: <span
                :class="[
                  'font-display text-lg',
                  isWinning
                    ? 'text-green'
                    : 'text-red',
                ]"
              >{{ formatPrice(guessPrice) }} <span
                v-if="guess === 'up'"
              >⬆</span><span
                v-else
                :class="[
                  'font-display text-lg',
                  isWinning
                    ? 'text-green'
                    : 'text-red',
                ]"
              >⬇</span></span>
            </p>
          </div>
        </div>
        <div class="col-start-2 flex flex-col p-second">
          <div class="flex justify-center gap-half">
            <button
              class="o-button"
              :disabled="isLocked || status !== 'connected'"
              :data-button-variant="guess === 'up' ? 'is-bet-active' : null"
              @click="makeGuess('up')"
            >
              <span>⬆</span>
              <span>UP</span>
            </button>

            <button
              class="o-button"
              :disabled="isLocked || status !== 'connected'"
              :data-button-variant="guess === 'down' ? 'is-bet-active' : null"
              @click="makeGuess('down')"
            >
              <span>⬇</span>
              <span>DOWN</span>
            </button>
          </div>
        </div>
        <div>
          <div>
            <p class="font-display text-md">
              Total Earnings:
              <span :class="totalEarnings >= 0 ? 'text-green' : 'text-red'">
                {{ totalEarnings >= 0 ? '+' : '' }}{{ formatPrice(totalEarnings) }}
              </span>
            </p>
          </div>
          <div>
            <p class="font-display text-md">
              Current Streak:
              <span>{{ currentStreak }}</span>
            </p>
          </div>
          <div>
            <p class="font-display text-md">
              Longest Streak:
              <span>{{ longestStreak }}</span>
            </p>
          </div>
          <div>
            <p class="font-display text-md">
              Wins:
              <span>{{ totalWins }}</span>
            </p>
          </div>
          <div>
            <p class="font-display text-md">
              Losses:
              <span>{{ totalLosses }}</span>
            </p>
          </div>
          <div v-if="isLocked">
            <p class="font-display text-md">
              Potential Earnings:
              <span :class="potentialEarnings >= 0 ? 'text-green' : 'text-red'">
                {{ potentialEarnings >= 0 ? '+' : '' }}{{ formatPrice(potentialEarnings) }}
              </span>
            </p>
          </div>
          <div v-if="lastBidResult">
            <p class="font-display text-md">
              Last Bid:
              <span :class="lastBidResult.won ? 'text-green' : 'text-red'">
                {{ lastBidResult.won ? 'Won' : 'Lost' }}
                {{ lastBidResult.earnings >= 0 ? '+' : '' }}{{ formatPrice(lastBidResult.earnings) }}
              </span>
            </p>
          </div>
        </div>
      </div>
    </ClientOnly>
  </main>
</template>

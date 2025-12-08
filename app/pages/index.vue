<script setup lang="ts">
import { calculateYDomain } from '~/helpers/btcChartHelpers'
import { filterByTimeRange } from '~/helpers/btcPriceChartHelpers'
import type { BidResult } from '~/composables/useGameLogic'

const { priceData, price, formatPrice, status, priceHistory, setBid, clearBid, connect, disconnect } = useBtcPrice()

// Player identification
const { getPlayerId } = usePlayerId()

// Player API for persistence
const { fetchStats, saveBid, isLoading: isApiLoading } = usePlayerApi()

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
    if (stats && !stats.isNewPlayer) {
      loadStats(stats)
    }
  }
})

onUnmounted(() => {
  disconnect()
  cleanup()
})
</script>

<template>
  <main class="p-second">
    <div class="flex justify-between">
      <p class="font-display text-lg  capitalize">
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

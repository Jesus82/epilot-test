<script setup lang="ts">
import { calculateYDomain } from '~/helpers/btcChartHelpers'
import { filterByTimeRange } from '~/helpers/btcPriceChartHelpers'

const { priceData, price, formatPrice, status, priceHistory, setBid, clearBid, connect, disconnect } = useBtcPrice()

// Game logic composable
const {
  score,
  guess,
  isLocked,
  countdown,
  guessPrice,
  isWinning,
  makeGuess,
  cleanup,
} = useGameLogic(priceData, setBid, clearBid)

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

onMounted(() => {
  connect()
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
      </div>
    </ClientOnly>
  </main>
</template>

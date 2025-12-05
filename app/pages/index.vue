<script setup lang="ts">
const { priceData, price, formattedPrice, status, setBid, clearBid, connect, disconnect } = useBtcPrice()

// Game logic composable
const {
  score,
  guess,
  isLocked,
  countdown,
  guessPrice,
  makeGuess,
  cleanup,
} = useGameLogic(priceData, setBid, clearBid)

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

      <div class="grid grid-cols-3">
        <div class="flex justify-center items-center">
          <p class="font-display text-3xl">
            {{ countdown }}s
          </p>
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

          <div
            v-if="isLocked"
            class="flex flex-col items-center"
          >
            <p
              v-if="guessPrice"
              class="font-display text-lg text-gray-dark"
            >
              Current Price <span class="text-xl text-gray-darkest">{{ formattedPrice ?? 'Loading...' }}</span>
            </p>
            <p
              v-if="guessPrice && price"
              class="font-display text-xl"
            >
              Your bet is {{ guess }} at {{ guessPrice?.toFixed(2) }} ({{ (price - guessPrice).toFixed(2) }})
            </p>
          </div>
        </div>
      </div>
    </ClientOnly>
  </main>
</template>

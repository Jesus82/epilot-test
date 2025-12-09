<script setup lang="ts">
import type { GuessDirection } from '../../shared/types/game'

interface Props {
  countdown: number
  isLocked: boolean
  guessPrice: number | null
  currentPrice: number | null
  isWinning: boolean
  guess: GuessDirection
  bidToPriceDifference: number | null
  yMin: number
  yMax: number
}

defineProps<Props>()

const { formatPrice } = useBtcPrice()
</script>

<template>
  <div class="flex justify-center items-center gap-half">
    <p
      v-if="countdown"
      class="font-display text-3xl"
    >
      {{ countdown }}s
    </p>
    <BidProgressBar
      v-if="isLocked && guessPrice && currentPrice && guess"
      :bid-price="guessPrice"
      :current-price="currentPrice"
      :is-winning="isWinning"
      :y-min="yMin"
      :y-max="yMax"
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
</template>

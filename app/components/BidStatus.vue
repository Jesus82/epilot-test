<script setup lang="ts">
const {
  countdown,
  isLocked,
  guessPrice,
  isWinning,
  guess,
  bidToPriceDifference,
  showResultFeedback,
  lastBidResult,
} = useGameLogic()

const { price, yDomain, formatPrice } = useBtcPrice()
</script>

<template>
  <div class="flex justify-center items-center gap-half relative">
    <BidResultFeedback
      :show="showResultFeedback && !!lastBidResult"
      :won="lastBidResult?.won ?? false"
      :earnings="lastBidResult?.earnings ?? 0"
    />

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
</template>

<script setup lang="ts">
const {
  totalEarnings,
  currentStreak,
  longestStreak,
  totalWins,
  totalLosses,
  potentialEarnings,
  isLocked,
  lastBidResult,
} = useGameLogic()

const { formatPrice } = useBtcPrice()
</script>

<template>
  <ul class="list-none">
    <li>
      <p class="font-display text-md">
        Current Streak:
        <span>{{ currentStreak }}</span>
      </p>
    </li>
    <li>
      <p class="font-display text-md">
        Longest Streak:
        <span>{{ longestStreak }}</span>
      </p>
    </li>
    <li>
      <p class="font-display text-md">
        Wins:
        <span>{{ totalWins }}</span>
      </p>
    </li>
    <li>
      <p class="font-display text-md">
        Losses:
        <span>{{ totalLosses }}</span>
      </p>
    </li>
    <li>
      <p class="font-display text-md">
        Total Earnings:
        <span
          data-testid="total-earnings"
          :data-status="totalEarnings >= 0 ? 'positive' : 'negative'"
          :class="totalEarnings >= 0 ? 'text-green' : 'text-red'"
        >
          {{ totalEarnings >= 0 ? '+' : '' }}{{ formatPrice(totalEarnings) }}
        </span>
      </p>
    </li>
    <li v-if="isLocked">
      <p class="font-display text-md">
        Potential Earnings:
        <span
          data-testid="potential-earnings"
          :data-status="potentialEarnings >= 0 ? 'positive' : 'negative'"
          :class="potentialEarnings >= 0 ? 'text-green' : 'text-red'"
        >
          {{ potentialEarnings >= 0 ? '+' : '' }}{{ formatPrice(potentialEarnings) }}
        </span>
      </p>
    </li>
    <li v-if="lastBidResult">
      <p class="font-display text-md">
        Last Bid:
        <span
          data-testid="last-bid-result"
          :data-status="lastBidResult.won ? 'positive' : 'negative'"
          :class="lastBidResult.won ? 'text-green' : 'text-red'"
        >
          {{ lastBidResult.won ? 'Won' : 'Lost' }}
          {{ lastBidResult.earnings >= 0 ? '+' : '' }}{{ formatPrice(lastBidResult.earnings) }}
        </span>
      </p>
    </li>
  </ul>
</template>

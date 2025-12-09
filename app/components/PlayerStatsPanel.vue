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
  <ul>
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
        <span :class="totalEarnings >= 0 ? 'text-green' : 'text-red'">
          {{ totalEarnings >= 0 ? '+' : '' }}{{ formatPrice(totalEarnings) }}
        </span>
      </p>
    </li>
    <li v-if="isLocked">
      <p class="font-display text-md">
        Potential Earnings:
        <span :class="potentialEarnings >= 0 ? 'text-green' : 'text-red'">
          {{ potentialEarnings >= 0 ? '+' : '' }}{{ formatPrice(potentialEarnings) }}
        </span>
      </p>
    </li>
    <li v-if="lastBidResult">
      <p class="font-display text-md">
        Last Bid:
        <span :class="lastBidResult.won ? 'text-green' : 'text-red'">
          {{ lastBidResult.won ? 'Won' : 'Lost' }}
          {{ lastBidResult.earnings >= 0 ? '+' : '' }}{{ formatPrice(lastBidResult.earnings) }}
        </span>
      </p>
    </li>
  </ul>
</template>

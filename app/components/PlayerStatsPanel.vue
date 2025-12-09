<script setup lang="ts">
import type { BidResult } from '../../shared/types/api'

interface Props {
  totalEarnings: number
  currentStreak: number
  longestStreak: number
  totalWins: number
  totalLosses: number
  potentialEarnings: number
  isLocked: boolean
  lastBidResult: BidResult | null
}

defineProps<Props>()

const { formatPrice } = useBtcPrice()
</script>

<template>
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
</template>

<script setup lang="ts">
import type { LeaderboardEntry } from '../../shared/types/api'

const { formatPrice } = useBtcPrice()

const { data: leaderboard, status, error, refresh } = await useFetch<LeaderboardEntry[]>('/api/leaderboard', {
  query: { limit: 50 },
})

// Top 10 by score (from database)
const topByScore = computed(() => {
  if (!leaderboard.value) return []
  return [...leaderboard.value]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
})

const topByStreak = computed(() => {
  if (!leaderboard.value) return []
  return [...leaderboard.value]
    .sort((a, b) => b.longestStreak - a.longestStreak)
    .slice(0, 10)
})

const topByEarnings = computed(() => {
  if (!leaderboard.value) return []
  return [...leaderboard.value]
    .sort((a, b) => b.totalEarnings - a.totalEarnings)
    .slice(0, 10)
})

type Tab = 'score' | 'streak' | 'earnings'
const activeTab = ref<Tab>('score')
</script>

<template>
  <div class="flex flex-col items-center p-base min-w-screen min-h-screen">
    <div v-if="status === 'pending'">
      Loading...
    </div>

    <div v-else-if="error">
      Error loading leaderboard: {{ error.message }}
      <button @click="() => refresh()">
        Retry
      </button>
    </div>

    <template v-else-if="leaderboard && leaderboard.length > 0">
      <div class="pb-third grid grid-cols-3 gap-base">
        <button
          :data-active="activeTab === 'score'"
          class="font-display text-xl"
          :class="{ underline: activeTab === 'score' }"
          @click="activeTab = 'score'"
        >
          Score
        </button>
        <button
          :data-active="activeTab === 'streak'"
          class="font-display text-xl"
          :class="{ underline: activeTab === 'streak' }"
          @click="activeTab = 'streak'"
        >
          Streak
        </button>
        <button
          :data-active="activeTab === 'earnings'"
          class="font-display text-xl"
          :class="{ underline: activeTab === 'earnings' }"
          @click="activeTab = 'earnings'"
        >
          Earnings
        </button>
      </div>

      <div
        v-if="activeTab === 'score'"
        class="min-w-[40%]"
      >
        <h1 class="font-display text-4xl">
          Highest Scores
        </h1>
        <div
          v-for="(player, index) in topByScore"
          :key="'score-' + player.playerId"
          class="grid grid-cols-2 gap-fourth"
        >
          <p class="font-display text-2xl">
            {{ index + 1 }}. {{ player.playerName || 'Anonymous' }}
          </p>
          <p class="font-display text-2xl flex justify-end">
            {{ player.score }}
          </p>
        </div>
      </div>

      <div
        v-else-if="activeTab === 'streak'"
        class="min-w-[40%]"
      >
        <h1 class="font-display text-4xl">
          Best Streaks
        </h1>
        <div
          v-for="(player, index) in topByStreak"
          :key="'streak-' + player.playerId"
          class="grid grid-cols-2 gap-fourth"
        >
          <p class="font-display text-2xl">
            {{ index + 1 }}. {{ player.playerName || 'Anonymous' }}
          </p>
          <p class="font-display text-2xl flex justify-end">
            {{ player.longestStreak }}
          </p>
        </div>
      </div>

      <div
        v-else-if="activeTab === 'earnings'"
        class="min-w-[40%]"
      >
        <h1 class="font-display text-4xl">
          Top Earnings
        </h1>
        <div
          v-for="(player, index) in topByEarnings"
          :key="'earnings-' + player.playerId"
          class="grid grid-cols-2 gap-fourth"
        >
          <p class="font-display text-2xl">
            {{ index + 1 }}. {{ player.playerName || 'Anonymous' }}
          </p>
          <p class="font-display text-2xl flex justify-end">
            {{ formatPrice(player.totalEarnings) }}
          </p>
        </div>
      </div>
    </template>

    <div v-else>
      No players on the leaderboard yet.
    </div>

    <p>
      <NuxtLink to="/">Back to Game</NuxtLink>
    </p>
  </div>
</template>

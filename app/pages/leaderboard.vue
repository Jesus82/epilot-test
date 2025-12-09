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

      <p>
        <NuxtLink
          class="font-display text-lg mb-second"
          to="/"
        >Back to Game</NuxtLink>
      </p>

      <div
        v-if="activeTab === 'score'"
        class="min-w-[40%]"
      >
        <h1 class="font-display text-4xl mb-half">
          Highest Scores
        </h1>
        <TransitionGroup
          name="t-stagger"
          appear
        >
          <div
            v-for="(player, index) in topByScore"
            :key="'score-' + player.playerId"
            class="grid grid-cols-[1fr_max-content] gap-base"
            :style="{ transitionDelay: `${index * 50}ms` }"
          >
            <p
              class="font-display"
              :class="index < 3 ? 'text-3xl' : 'text-2xl'"
            >
              {{ index + 1 }}. {{ player.playerName || 'Anonymous' }}
            </p>
            <p
              class="font-display flex justify-end"
              :class="index < 3 ? 'text-3xl' : 'text-2xl'"
            >
              {{ player.score }}
            </p>
          </div>
        </TransitionGroup>
      </div>

      <div
        v-else-if="activeTab === 'streak'"
        class="min-w-[40%]"
      >
        <h1 class="font-display text-4xl mb-half">
          Best Streaks
        </h1>
        <TransitionGroup
          name="t-stagger"
          appear
        >
          <div
            v-for="(player, index) in topByStreak"
            :key="'streak-' + player.playerId"
            class="grid grid-cols-[1fr_max-content] gap-base"
            :style="{ transitionDelay: `${index * 50}ms` }"
          >
            <p
              class="font-display"
              :class="index < 3 ? 'text-3xl' : 'text-2xl'"
            >
              {{ index + 1 }}. {{ player.playerName || 'Anonymous' }}
            </p>
            <p
              class="font-display flex justify-end"
              :class="index < 3 ? 'text-3xl' : 'text-2xl'"
            >
              {{ player.longestStreak }}
            </p>
          </div>
        </TransitionGroup>
      </div>

      <div
        v-else-if="activeTab === 'earnings'"
        class="min-w-[40%]"
      >
        <h1 class="font-display text-4xl mb-half">
          Top Earnings
        </h1>
        <TransitionGroup
          name="t-stagger"
          appear
        >
          <div
            v-for="(player, index) in topByEarnings"
            :key="'earnings-' + player.playerId"
            class="grid grid-cols-[1fr_max-content] gap-base"
            :style="{ transitionDelay: `${index * 50}ms` }"
          >
            <p
              class="font-display"
              :class="index < 3 ? 'text-3xl' : 'text-2xl'"
            >
              {{ index + 1 }}. {{ player.playerName || 'Anonymous' }}
            </p>
            <p
              class="font-display flex justify-end"
              :class="index < 3 ? 'text-3xl' : 'text-2xl'"
            >
              {{ formatPrice(player.totalEarnings) }}
            </p>
          </div>
        </TransitionGroup>
      </div>
    </template>

    <div v-else>
      No players on the leaderboard yet.
    </div>
  </div>
</template>

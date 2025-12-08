<script setup lang="ts">
import type { LeaderboardEntry } from '../../shared/types/api'

const { data: leaderboard, status, error, refresh } = await useFetch<LeaderboardEntry[]>('/api/leaderboard', {
  query: { limit: 20 },
})
</script>

<template>
  <div>
    <h1>Leaderboard</h1>

    <div v-if="status === 'pending'">
      Loading...
    </div>

    <div v-else-if="error">
      Error loading leaderboard: {{ error.message }}
      <button @click="refresh">
        Retry
      </button>
    </div>

    <div v-else-if="leaderboard && leaderboard.length > 0">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Earnings</th>
            <th>Wins</th>
            <th>Losses</th>
            <th>Win Rate</th>
            <th>Current Streak</th>
            <th>Longest Streak</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="player in leaderboard"
            :key="player.playerId"
          >
            <td>{{ player.rank }}</td>
            <td>{{ player.playerName || 'Anonymous' }}</td>
            <td>${{ player.totalEarnings.toLocaleString() }}</td>
            <td>{{ player.totalWins }}</td>
            <td>{{ player.totalLosses }}</td>
            <td>
              {{
                player.totalWins + player.totalLosses > 0
                  ? ((player.totalWins / (player.totalWins + player.totalLosses)) * 100).toFixed(1)
                  : 0
              }}%
            </td>
            <td>{{ player.currentStreak }}</td>
            <td>{{ player.longestStreak }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else>
      No players on the leaderboard yet.
    </div>

    <p>
      <NuxtLink to="/">Back to Game</NuxtLink>
    </p>
  </div>
</template>

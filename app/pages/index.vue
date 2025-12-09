<script setup lang="ts">
const { priceData, price, status, yDomain, setBid, clearBid, connect, disconnect } = useBtcPrice()

// Player identification
const { getPlayerId } = usePlayerId()

// Player API for persistence
const { fetchStats, onBidComplete } = usePlayerService()

// Game logic composable with bid completion callback
const {
  score,
  guess,
  isLocked,
  countdown,
  guessPrice,
  isWinning,
  currentStreak,
  longestStreak,
  totalWins,
  totalLosses,
  totalEarnings,
  potentialEarnings,
  lastBidResult,
  bidToPriceDifference,
  makeGuess,
  cleanup,
  loadStats,
} = useGameLogic(priceData, setBid, clearBid, onBidComplete)

// Player profile management (pass isLocked to prevent editing during active bid)
const {
  playerName,
  isEditingName,
  nameError,
  isLoading: isProfileLoading,
  setPlayerName,
  startEditing,
  cancelEditing,
  saveName,
} = usePlayerProfile({ isLocked })

// Player prompt state
const showNamePrompt = ref(true)
const isNewPlayer = ref(false)
const isPlayerChecked = ref(false)

// Load player stats on mount
onMounted(async () => {
  connect()

  const playerId = getPlayerId()
  if (playerId) {
    const stats = await fetchStats(playerId)
    if (stats) {
      if (stats.isNewPlayer || !stats.playerName) {
        // New player - show the input
        isNewPlayer.value = true
        isPlayerChecked.value = true
      }
      else {
        // Existing player with name - hide prompt and load stats
        showNamePrompt.value = false
        setPlayerName(stats.playerName)
        loadStats(stats)
      }
    }
  }
})

onUnmounted(() => {
  disconnect()
  cleanup()
})
</script>

<template>
  <main class="p-second">
    <PlayerNamePrompt
      v-model:show="showNamePrompt"
      :show-content="isPlayerChecked"
      :show-input="isNewPlayer"
      @saved="setPlayerName"
    />

    <PlayerHeader
      v-model:player-name="playerName"
      :score="score"
      :is-editing-name="isEditingName"
      :is-locked="isLocked"
      :is-api-loading="isProfileLoading"
      :name-error="nameError"
      @save="saveName"
      @cancel="cancelEditing"
      @start-edit="startEditing"
    />

    <ClientOnly fallback-tag="div">
      <BtcPriceChart />

      <div class="grid grid-cols-3 py-second">
        <BidStatus
          :countdown="countdown"
          :is-locked="isLocked"
          :guess-price="guessPrice"
          :current-price="price"
          :is-winning="isWinning"
          :guess="guess"
          :bid-to-price-difference="bidToPriceDifference"
          :y-min="yDomain.yMin"
          :y-max="yDomain.yMax"
        />
        <BidButtons
          :is-locked="isLocked"
          :is-connected="status === 'connected'"
          :guess="guess"
          @guess="makeGuess"
        />
        <PlayerStatsPanel
          :total-earnings="totalEarnings"
          :current-streak="currentStreak"
          :longest-streak="longestStreak"
          :total-wins="totalWins"
          :total-losses="totalLosses"
          :potential-earnings="potentialEarnings"
          :is-locked="isLocked"
          :last-bid-result="lastBidResult"
        />
      </div>
    </ClientOnly>
  </main>
</template>

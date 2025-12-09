<script setup lang="ts">
const { priceData, setBid, clearBid, connect, disconnect } = useBtcPrice()

// Player identification
const { getPlayerId } = usePlayerId()

// Player API for persistence
const { fetchStats, onBidComplete } = usePlayerService()

// Game logic composable with bid completion callback
const { isLocked, cleanup, loadStats, restoreBid } = useGameLogic(priceData, setBid, clearBid, onBidComplete)

// Player profile management
const { setPlayerName } = usePlayerProfile({ isLocked })

// Player prompt state
const showNamePrompt = ref(true)
const isNewPlayer = ref(false)
const isPlayerChecked = ref(false)

// Load player stats on mount
onMounted(async () => {
  connect()

  // Restore any active bid from localStorage
  restoreBid()

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

    <header>
      <PlayerHeader />
    </header>

    <ClientOnly fallback-tag="div">
      <BtcPriceChart />
    </ClientOnly>

    <div class="flex flex-col md:grid md:grid-cols-3 md:py-second gap-base">
      <BidStatus class="order-2 md:order-1 mb-base md:m-0" />
      <BidButtons class="order-1 md:order-2" />
      <PlayerStatsPanel class="order-3 md:order-3" />
    </div>
  </main>
</template>

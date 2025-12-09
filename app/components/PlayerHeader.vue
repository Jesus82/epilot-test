<script setup lang="ts">
const { score, isLocked, showResultFeedback, lastScoreChange } = useGameLogic()

const {
  playerName,
  isEditingName,
  nameError,
  isLoading: isApiLoading,
  startEditing,
  cancelEditing,
  saveName,
} = usePlayerProfile({ isLocked })

const handleStartEdit = () => {
  if (!isLocked.value) {
    startEditing()
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    handleStartEdit()
  }
}
</script>

<template>
  <nav class="flex flex-col md:flex-row justify-between items-center">
    <div class="flex items-center gap-half">
      <template v-if="!isEditingName && playerName">
        <h1
          class="font-display text-lg cursor-pointer hover:text-orange"
          :class="{ 'opacity-50 cursor-not-allowed': isLocked }"
          :title="isLocked ? 'Cannot edit while bid is locked' : 'Click to edit name'"
          :tabindex="isLocked ? -1 : 0"
          role="button"
          :aria-label="`Edit player name: ${playerName}`"
          :aria-disabled="isLocked"
          @click="handleStartEdit"
          @keydown="handleKeydown"
        >
          {{ playerName }}
        </h1>
      </template>
      <template v-else-if="isEditingName">
        <div class="flex flex-col">
          <PlayerNameInput
            v-model="playerName"
            :disabled="isApiLoading"
            :is-editing="true"
            @save="saveName"
            @cancel="cancelEditing"
          />
          <p
            v-if="nameError"
            data-testid="name-error"
            class="text-red text-sm mt-1"
          >
            {{ nameError }}
          </p>
        </div>
      </template>
    </div>

    <NuxtLink
      :to="{ name: 'leaderboard' }"
      class="font-display text-md order-3 md:order-2"
      :class="{ 'hidden md:block': isEditingName }"
    >
      Leaderboard
    </NuxtLink>

    <p
      class="font-display text-lg items-center gap-1 order-2 md:order-3"
      :class="{ 'hidden md:inline-flex': isEditingName }"
    >
      Score: {{ score }}
      <Transition name="t-score-change">
        <span
          v-if="showResultFeedback && lastScoreChange !== null"
          :key="lastScoreChange"
          data-testid="score-change-indicator"
          :data-status="lastScoreChange > 0 ? 'positive' : 'negative'"
          class="font-display text-sm font-bold"
          :class="lastScoreChange > 0 ? 'text-green' : 'text-red'"
          role="status"
          aria-live="polite"
          :aria-label="lastScoreChange > 0 ? 'Score increased by 1' : 'Score decreased by 1'"
        >
          {{ lastScoreChange > 0 ? '+1' : '-1' }}
        </span>
      </Transition>
    </p>
  </nav>
</template>

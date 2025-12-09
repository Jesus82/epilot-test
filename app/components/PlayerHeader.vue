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
</script>

<template>
  <nav class="flex justify-between items-center">
    <div class="flex items-center gap-half">
      <template v-if="!isEditingName && playerName">
        <span
          class="font-display text-lg cursor-pointer hover:text-orange"
          :class="{ 'opacity-50 cursor-not-allowed': isLocked }"
          :title="isLocked ? 'Cannot edit while bid is locked' : 'Click to edit name'"
          @click="handleStartEdit"
        >
          {{ playerName }}
        </span>
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
            class="text-red text-sm mt-1"
          >
            {{ nameError }}
          </p>
        </div>
      </template>
    </div>

    <NuxtLink
      :to="{ name: 'leaderboard' }"
      class="font-display text-md"
      :class="{ 'hidden md:block': isEditingName }"
    >
      Leaderboard
    </NuxtLink>

    <p
      class="font-display text-lg items-center gap-1"
      :class="{ 'hidden md:inline-flex': isEditingName }"
    >
      Score: {{ score }}
      <Transition name="t-score-change">
        <span
          v-if="showResultFeedback && lastScoreChange !== null"
          :key="lastScoreChange"
          data-testid="score-change-indicator"
          class="font-display text-sm font-bold"
          :class="lastScoreChange > 0 ? 'text-green' : 'text-red'"
        >
          {{ lastScoreChange > 0 ? '+1' : '-1' }}
        </span>
      </Transition>
    </p>
  </nav>
</template>

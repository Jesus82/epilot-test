<script setup lang="ts">
const { score, isLocked } = useGameLogic()

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
  <div class="flex justify-between items-center">
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

    <p class="font-display text-lg">
      Score: {{ score }}
    </p>
  </div>
</template>

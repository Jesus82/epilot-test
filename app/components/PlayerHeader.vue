<script setup lang="ts">
interface Props {
  playerName: string
  score: number
  isEditingName: boolean
  isLocked: boolean
  isApiLoading: boolean
  nameError: string | null
}

interface Emits {
  (e: 'update:playerName', value: string): void
  (e: 'update:isEditingName', value: boolean): void
  (e: 'save' | 'cancel' | 'startEdit'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localPlayerName = computed({
  get: () => props.playerName,
  set: (value: string) => emit('update:playerName', value),
})

const handleStartEdit = () => {
  if (!props.isLocked) {
    emit('startEdit')
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
            v-model="localPlayerName"
            :disabled="isApiLoading"
            :is-editing="true"
            @save="$emit('save')"
            @cancel="$emit('cancel')"
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

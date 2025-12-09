<script setup lang="ts">
interface Props {
  show: boolean
  showContent?: boolean
  showInput?: boolean
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'saved', playerName: string): void
}

withDefaults(defineProps<Props>(), {
  showContent: false,
  showInput: false,
})

const emit = defineEmits<Emits>()

const { getPlayerId } = usePlayerId()
const { updatePlayerName, isLoading, error: apiError } = usePlayerService()

const localName = ref('')
const nameError = ref<string | null>(null)

const handleSave = async () => {
  nameError.value = null
  const playerId = getPlayerId()
  if (playerId && localName.value.trim()) {
    const success = await updatePlayerName(playerId, localName.value.trim())
    if (success) {
      emit('update:show', false)
      emit('saved', localName.value.trim())
    }
    else {
      nameError.value = apiError.value
    }
  }
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="c-player-name-prompt"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-heading"
      style="position: fixed; inset: 0; background: #fff; z-index: 1000;"
    >
      <template v-if="showContent">
        <img
          src="/img/bt-logo.svg"
          class="c-player-name-prompt__logo"
          aria-hidden="true"
        >
        <h2
          id="welcome-heading"
          class="font-display text-2xl mb-half text-center max-w-[30ch]"
        >
          Welcome to the BTC Price Prediction Contest!
        </h2>
        <PlayerNameInput
          v-if="showInput"
          v-model="localName"
          :disabled="isLoading"
          :is-editing="true"
          :show-cancel="false"
          @save="handleSave"
        />
        <p
          v-if="nameError"
          data-testid="name-error"
          class="text-red text-sm mt-double text-center"
        >
          {{ nameError }}
        </p>
      </template>
    </div>
  </Transition>
</template>

<style scoped>
.c-player-name-prompt {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  padding: var(--spacing-base);
  background: var(--color-white);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.c-player-name-prompt__logo {
  width: var(--spacing-fourth);
  height: var(--spacing-fourth);
  margin-bottom: var(--spacing-base);
}
</style>

<script setup lang="ts">
interface Props {
  modelValue: string
  show: boolean
  showContent?: boolean
  showInput?: boolean
  loading?: boolean
  error?: string | null
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'save'): void
}

const props = withDefaults(defineProps<Props>(), {
  showContent: false,
  showInput: false,
  loading: false,
  error: null,
})

const emit = defineEmits<Emits>()

const localName = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const handleSave = () => {
  emit('save')
}
</script>

<template>
  <Transition name="fade">
    <div
      v-if="show"
      class="c-player-name-prompt"
    >
      <template v-if="showContent">
        <h2 class="font-display text-2xl mb-half text-center max-w-[30ch]">
          Welcome to the BTC Price Prediction Contest!
        </h2>
        <PlayerNameInput
          v-if="showInput"
          v-model="localName"
          :disabled="loading"
          :is-editing="true"
          @save="handleSave"
        />
        <p
          v-if="error"
          class="text-red text-sm mt-double text-center"
        >
          {{ error }}
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

.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-leave-to {
  opacity: 0;
}
</style>

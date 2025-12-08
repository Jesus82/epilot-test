<script setup lang="ts">
interface Props {
  modelValue: string
  show: boolean
  loading?: boolean
  error?: string | null
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'save'): void
}

const props = withDefaults(defineProps<Props>(), {
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
  <div
    v-if="show"
    class="c-player-name-prompt"
  >
    <h2 class="font-display text-2xl mb-half text-center max-w-[30ch]">
      Welcome to the BTC Price Prediction Contest!
    </h2>
    <PlayerNameInput
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
  </div>
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
</style>

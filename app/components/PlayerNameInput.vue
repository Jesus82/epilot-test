<script setup lang="ts">
interface Props {
  modelValue: string
  isEditing?: boolean
  disabled?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'save' | 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  isEditing: false,
  disabled: false,
})

const emit = defineEmits<Emits>()

const inputRef = ref<HTMLInputElement | null>(null)
const localName = ref(props.modelValue)

watch(
  () => props.modelValue,
  (newVal) => {
    localName.value = newVal
  },
)

watch(
  () => props.isEditing,
  (isEditing) => {
    if (isEditing) {
      nextTick(() => {
        inputRef.value?.focus()
        inputRef.value?.select()
      })
    }
  },
)

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  localName.value = target.value
  emit('update:modelValue', target.value)
}

const handleSave = () => {
  if (localName.value.trim()) {
    emit('save')
  }
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleSave()
  }
  else if (event.key === 'Escape') {
    emit('cancel')
  }
}
</script>

<template>
  <div class="player-name-input">
    <input
      ref="inputRef"
      :value="localName"
      type="text"
      placeholder="Enter your name"
      :disabled="disabled"
      maxlength="20"
      class="name-input"
      @input="handleInput"
      @keydown="handleKeydown"
    >
    <button
      :disabled="disabled || !localName.trim()"
      class="save-button"
      @click="handleSave"
    >
      Save
    </button>
  </div>
</template>

<style scoped>
.player-name-input {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.name-input {
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
  border: 1px solid var(--color-border, #3a3a3a);
  border-radius: 4px;
  background: var(--color-bg-secondary, #1a1a1a);
  color: var(--color-text, #fff);
  outline: none;
  transition: border-color 0.2s;
}

.name-input:focus {
  border-color: var(--color-primary, #f7931a);
}

.name-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.save-button {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  background: var(--color-primary, #f7931a);
  color: #000;
  cursor: pointer;
  transition: opacity 0.2s;
}

.save-button:hover:not(:disabled) {
  opacity: 0.9;
}

.save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

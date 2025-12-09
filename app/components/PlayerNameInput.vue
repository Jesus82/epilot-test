<script setup lang="ts">
interface Props {
  modelValue: string
  isEditing?: boolean
  disabled?: boolean
  showCancel?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'save' | 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  isEditing: false,
  disabled: false,
  showCancel: true,
})

const emit = defineEmits<Emits>()

const inputRef = ref<HTMLInputElement | null>(null)
const localName = ref(props.modelValue)
const originalName = ref(props.modelValue)

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
      originalName.value = props.modelValue
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

const hasChanged = computed(() => localName.value.trim() !== originalName.value.trim())

const handleSave = () => {
  if (localName.value.trim()) {
    emit('save')
  }
}

const handleCancel = () => {
  localName.value = originalName.value
  emit('update:modelValue', originalName.value)
  emit('cancel')
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
  <div class="c-player-name-input">
    <input
      ref="inputRef"
      :value="localName"
      type="text"
      placeholder="Enter your name"
      :disabled="disabled"
      maxlength="20"
      class="o-input"
      @input="handleInput"
      @keydown="handleKeydown"
    >
    <button
      :disabled="disabled || !localName.trim() || !hasChanged"
      class="o-button"
      data-button-variant="small"
      @click="handleSave"
    >
      Save
    </button>
    <button
      v-if="showCancel"
      :disabled="disabled"
      class="o-button"
      data-button-variant="small"
      data-button-color="alert"
      @click="handleCancel"
    >
      Cancel
    </button>
  </div>
</template>

<style scoped>
.c-player-name-input {
  display: flex;
  gap: var(--spacing-half);
  align-items: center;
}
</style>

<script setup lang="ts">
defineProps<{
  show: boolean
  won: boolean
  earnings: number
}>()

const { formatPrice } = useBtcPrice()
</script>

<template>
  <Transition name="result-feedback">
    <div
      v-if="show"
      data-testid="result-feedback-overlay"
      class="absolute inset-0 flex flex-col justify-center items-center z-10 result-feedback-bg rounded-lg"
    >
      <p
        data-testid="result-feedback-message"
        :data-status="won ? 'positive' : 'negative'"
        class="font-display text-2xl font-bold"
        :class="won ? 'text-green' : 'text-red'"
      >
        {{ won ? '🎉 You Won!' : '😔 You Lost' }}
      </p>
      <p
        data-testid="result-feedback-earnings"
        :data-status="won ? 'positive' : 'negative'"
        class="font-display text-xl"
        :class="won ? 'text-green' : 'text-red'"
      >
        {{ earnings >= 0 ? '+' : '' }}{{ formatPrice(earnings) }}
      </p>
    </div>
  </Transition>
</template>

<style scoped>
.result-feedback-enter-active {
  transition: all 0.3s ease-out;
}

.result-feedback-leave-active {
  transition: all 0.5s ease-in;
}

.result-feedback-enter-from {
  opacity: 0;
  transform: scale(0.8);
}

.result-feedback-leave-to {
  opacity: 0;
  transform: scale(1.1);
}

.result-feedback-bg {
  backdrop-filter: blur(4px);
}
</style>

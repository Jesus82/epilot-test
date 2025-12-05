<script setup lang="ts">
const props = defineProps<{
  bidPrice: number
  currentPrice: number
  isWinning: boolean
  yMin: number
  yMax: number
}>()

const symmetricRange = computed(() => {
  const distanceToMax = props.yMax - props.bidPrice
  const distanceToMin = props.bidPrice - props.yMin
  const maxDistance = Math.max(distanceToMax, distanceToMin)

  return {
    min: props.bidPrice - maxDistance,
    max: props.bidPrice + maxDistance,
    range: maxDistance * 2,
  }
})

const differenceFromBid = computed(() => props.currentPrice - props.bidPrice)

const currentPositionPercent = computed(() => {
  const { min, range } = symmetricRange.value
  return ((props.currentPrice - min) / range) * 100
})

const movePercent = computed(() => currentPositionPercent.value - 50)
</script>

<template>
  <div class="bid-progress-bar">
    <div
      class="bid-progress-bar__bid-line"
      :style="{ bottom: '50%' }"
    />

    <div
      v-if="differenceFromBid !== 0"
      class="bid-progress-bar__fill"
      :class="{
        'bid-progress-bar__fill--winning': isWinning,
        'bid-progress-bar__fill--losing': !isWinning,
      }"
      :style="{
        bottom: differenceFromBid > 0
          ? '50%'
          : `${currentPositionPercent}%`,
        height: `${Math.abs(movePercent)}%`,
      }"
    />
  </div>
</template>

<style scoped>
.bid-progress-bar {
  height: var(--spacing-fifth);
  position: relative;
  width: var(--spacing-base);
  background: linear-gradient(
    to top,
    rgba(239, 68, 68, 0.1),
    var(--color-gray-lightest) 50%,
    rgba(34, 197, 94, 0.1)
  );
  border-radius: 4px;
  overflow: hidden;
}

.bid-progress-bar__bid-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--color-gray-light);
  transform: translateY(50%);
  z-index: 2;
}

.bid-progress-bar__fill {
  position: absolute;
  left: 0;
  right: 0;
  transition: all 0.3s var(--ease-out-quad);
}

.bid-progress-bar__fill--winning {
  background: linear-gradient(to top, hsl(from var(--color-green) h s l / 0.4), var(--color-green));
}

.bid-progress-bar__fill--losing {
  background: linear-gradient(to bottom, hsl(from var(--color-red) h s l / 0.4), var(--color-red));
}
</style>

<script setup lang="ts">
const { formattedPrice, status, connect, disconnect } = useBtcPrice()

onMounted(() => connect())
onUnmounted(() => disconnect())
</script>

<template>
  <main>
    <h1>BTC Price</h1>
    <p>Status: {{ status }}</p>
    <p>{{ formattedPrice ?? 'Loading...' }}</p>
  </main>
</template>

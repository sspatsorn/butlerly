<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div class="app-alert" role="alert">
    <UIcon name="i-heroicons-exclamation-circle" class="app-alert__icon" />
    <p class="app-alert__text">{{ title }}</p>
  </div>
</template>

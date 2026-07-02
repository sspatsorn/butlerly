<script setup lang="ts">
defineProps<{
  title?: string
  subtitle?: string
  showBack?: boolean
  backTo?: string
}>()
</script>

<template>
  <header class="safe-top sticky top-0 z-20 -mx-4 px-4 pb-4 pt-2 backdrop-blur-md bg-white/70 border-b border-violet-100/80">
    <div class="flex items-center gap-3">
      <NuxtLink
        v-if="showBack"
        :to="backTo ?? '/'"
        class="flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-sm border border-violet-100 text-violet-600 shrink-0"
      >
        <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
      </NuxtLink>

      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xl shadow-lg shadow-violet-200/60 shrink-0">
          💁‍♀️
        </div>
        <div class="min-w-0">
          <h1 class="text-lg font-bold text-gray-900 truncate leading-tight">
            {{ title ?? 'Butlerly' }}
          </h1>
          <p v-if="subtitle" class="text-xs text-gray-500 truncate mt-0.5">
            {{ subtitle }}
          </p>
        </div>
      </div>

      <slot name="action" />
    </div>
  </header>
</template>

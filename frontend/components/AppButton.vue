<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'button' | 'submit'
    loading?: boolean
    disabled?: boolean
    block?: boolean
    size?: 'md' | 'lg'
  }>(),
  {
    type: 'button',
    size: 'lg',
  },
)
</script>

<template>
  <button
    :type="type"
    class="app-btn"
    :class="{
      'w-full': block,
      'app-btn--lg': size === 'lg',
    }"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="app-btn__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

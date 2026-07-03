<script setup lang="ts">
const model = defineModel<string>({ required: true })

withDefaults(
  defineProps<{
    type?: string
    placeholder?: string
    readonly?: boolean
    required?: boolean
    inputmode?: string
    muted?: boolean
  }>(),
  {
    type: 'text',
    muted: false,
  },
)
</script>

<template>
  <input
    v-model="model"
    class="app-input"
    :class="{ 'app-input--muted': muted || readonly }"
    :type="type"
    :placeholder="placeholder"
    :readonly="readonly"
    :required="required"
    :inputmode="inputmode"
  >
</template>

<template>
  <div v-if="message" class="lk-banner" :class="info ? 'info' : 'error'" role="alert">
    <q-icon :name="info ? 'info' : 'error'" size="22px" />
    <div class="col">{{ message }}</div>
    <slot />
  </div>
</template>

<script setup>
defineProps({ message: { type: String, default: '' }, info: { type: Boolean, default: false } })
</script>

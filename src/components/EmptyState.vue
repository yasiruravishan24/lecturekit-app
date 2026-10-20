<template>
  <div class="lk-empty">
    <div class="lk-empty-icon"><q-icon :name="icon" size="36px" /></div>
    <div class="lk-empty-text">{{ text }}</div>
    <slot />
  </div>
</template>

<script setup>
defineProps({ icon: { type: String, default: 'inbox' }, text: { type: String, required: true } })
</script>

<template><span class="lk-chip" :class="status.css">{{ status.text }}</span></template>

<script setup>
import { computed } from 'vue'
import { statusOf } from '../util/status'

const props = defineProps({ session: { type: Object, required: true } })
const status = computed(() => statusOf(props.session))
</script>

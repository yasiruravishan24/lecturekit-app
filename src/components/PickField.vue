<template>
  <div class="lk-pickwrap" @click="open">
    <q-field :model-value="selected ? selected.label : ''" outlined stack-label :label="label" :disable="disable" class="lk-pickfield">
      <template #control><div class="full-width ellipsis lk-pick-value">{{ selected ? selected.label : '' }}</div></template>
      <template #append><q-icon name="unfold_more" /></template>
    </q-field>
    <q-dialog v-model="shown" position="bottom">
      <q-card class="lk-sheet">
        <div class="lk-sheet-grip" />
        <div class="lk-sheet-title">{{ label }}</div>
        <q-list>
          <q-item v-for="o in options" :key="o.value" clickable v-close-popup :active="o.value === modelValue" active-class="lk-active" @click="$emit('update:modelValue', o.value)">
            <q-item-section>{{ o.label }}</q-item-section>
            <q-item-section v-if="o.value === modelValue" side><q-icon name="check" color="primary" /></q-item-section>
          </q-item>
          <div v-if="!options.length" class="lk-meta q-pa-md">Nothing to choose from yet.</div>
        </q-list>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

// A drop-down for a phone: tap the field, pick from a sheet that slides up from the bottom (nothing hides the fields around it).
const props = defineProps({ modelValue: { default: null }, options: { type: Array, default: () => [] }, label: { type: String, required: true }, disable: Boolean })
defineEmits(['update:modelValue'])
const shown = ref(false)
const selected = computed(() => props.options.find((o) => o.value === props.modelValue) || null)
const open = () => { if (!props.disable) shown.value = true }
</script>

<style scoped>
.lk-pickwrap, .lk-pickfield { cursor: pointer; }
.lk-pick-value { min-height: 24px; }
</style>

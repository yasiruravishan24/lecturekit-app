<template>
  <q-layout view="hHh lpR fFf">
    <q-page-container>
      <q-page class="lk-auth">
        <div class="lk-ambient" aria-hidden="true"><span /><span /><span /></div>
        <q-btn round flat class="lk-theme-btn" :icon="isDark ? 'light_mode' : 'dark_mode'" :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'" @click="ui.toggleDark()" />
        <div class="lk-auth-wrap">
          <div class="lk-halo" aria-hidden="true" />
          <q-card flat bordered class="lk-auth-card lk-card">
            <q-card-section class="q-pb-none">
              <div class="lk-logo text-primary">
                <span class="lk-logo-badge"><q-icon name="school" size="26px" /></span>
                <span style="font-size: 22px; font-weight: 500; letter-spacing: -0.01em">Lecture Assistant</span>
              </div>
            </q-card-section>
            <q-card-section><router-view /></q-card-section>
          </q-card>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { useUiStore } from '../stores/ui'

const $q = useQuasar()
const ui = useUiStore()
const isDark = computed(() => $q.dark.isActive)
</script>

<style scoped>
.lk-auth-card :deep(.q-card__section) { padding: 20px; }
.lk-auth-card :deep(.q-card__section.q-pb-none) { padding-bottom: 0; }
</style>

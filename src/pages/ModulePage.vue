<template>
  <q-page class="lk-page">
    <template v-if="module">
      <div class="lk-meta">{{ module.course.name }}</div>
      <div class="lk-section-title q-mb-md">{{ module.name }}</div>
      <q-card flat class="lk-card">
        <q-list separator v-if="sessions.length">
          <q-item v-for="s in sessions" :key="s.id" clickable :to="`/sessions/${s.id}`">
            <q-item-section avatar><q-icon :name="kindOf(s).icon" color="primary" /></q-item-section>
            <q-item-section><q-item-label>{{ s.title }}</q-item-label><q-item-label caption>{{ formatDate(s.created_at) }}</q-item-label></q-item-section>
            <q-item-section side><status-chip :session="s" /></q-item-section>
          </q-item>
        </q-list>
        <div v-else class="text-center q-pa-lg lk-meta">No lectures yet. Record the first one.</div>
      </q-card>
      <q-page-sticky position="bottom-right" :offset="[18, 18]"><q-btn fab color="primary" icon="center_focus_strong" aria-label="Record a lecture" :to="{ path: '/capture', query: { module: module.id } }" /></q-page-sticky>
    </template>
    <div v-else-if="library.loaded" class="lk-card q-pa-lg text-center">This module was not found.</div>
    <q-inner-loading :showing="library.loading && !library.loaded" />
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import StatusChip from '../components/StatusChip.vue'
import { useLibraryStore } from '../stores/library'
import { formatDate } from '../util/format'
import { kindOf } from '../util/status'

const props = defineProps({ id: { type: String, required: true } })
const library = useLibraryStore()
const module = computed(() => library.module(props.id))
const sessions = computed(() => (module.value ? [...module.value.sessions].sort((a, b) => b.id - a.id) : []))
</script>

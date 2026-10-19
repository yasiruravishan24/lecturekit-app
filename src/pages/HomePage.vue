<template>
  <q-page class="lk-page">
    <div v-if="error" class="lk-error" role="alert">{{ error }}</div>

    <div v-if="library.loaded && !library.courses.length" class="lk-card lk-empty">
      <q-icon name="folder_copy" size="44px" class="lk-dim" />
      <div class="lk-section-title q-mt-sm">No courses yet</div>
      <div class="lk-meta q-mb-md">Add a course, then a module, then record your first lecture.</div>
      <q-btn unelevated color="primary" no-caps icon="add" label="Add a course" @click="addCourse" />
    </div>

    <q-card v-for="c in library.courses" :key="c.id" flat class="lk-card q-mb-md">
      <q-item clickable @click="toggle(c)" class="lk-course">
        <q-item-section avatar><q-icon name="folder" color="primary" size="30px" /></q-item-section>
        <q-item-section>
          <q-item-label class="lk-section-title">{{ c.name }}</q-item-label>
          <q-item-label caption>{{ plural(c.modules.length, 'module') }} · {{ plural(sessionCount(c), 'session') }}</q-item-label>
        </q-item-section>
        <q-item-section side><q-icon :name="isOpen(c) ? 'expand_less' : 'expand_more'" /></q-item-section>
      </q-item>
      <template v-if="isOpen(c)">
        <q-separator />
        <q-item v-for="m in c.modules" :key="m.id" clickable :to="`/modules/${m.id}`">
          <q-item-section>{{ m.name }}</q-item-section>
          <q-item-section side><span class="lk-count">{{ m.sessions.length }}</span></q-item-section>
        </q-item>
        <q-item v-if="!c.modules.length" clickable @click="addModule(c)">
          <q-item-section class="text-primary"><span><q-icon name="add" size="18px" /> Add a module</span></q-item-section>
        </q-item>
        <q-item v-else clickable @click="addModule(c)"><q-item-section class="text-primary lk-meta"><span><q-icon name="add" size="16px" /> Add a module</span></q-item-section></q-item>
      </template>
    </q-card>

    <template v-if="recent.length">
      <div class="lk-label q-mt-lg q-mb-sm">Recent sessions</div>
      <q-card flat class="lk-card">
        <q-list separator>
          <q-item v-for="s in recent" :key="s.id" clickable :to="`/sessions/${s.id}`">
            <q-item-section avatar><q-icon :name="kindOf(s).icon" color="primary" /></q-item-section>
            <q-item-section>
              <q-item-label>{{ s.title }}</q-item-label>
              <q-item-label caption>{{ s.module_name }}</q-item-label>
            </q-item-section>
            <q-item-section side><status-chip :session="s" /></q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </template>

    <q-page-sticky position="bottom-right" :offset="[18, 18]">
      <q-btn fab color="primary" icon="mic" aria-label="Record a lecture" to="/capture" />
    </q-page-sticky>
    <q-inner-loading :showing="library.loading && !library.loaded" />
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useLibraryStore } from '../stores/library'
import StatusChip from '../components/StatusChip.vue'
import { friendly } from '../util/errors'
import { plural } from '../util/format'
import { kindOf } from '../util/status'

const $q = useQuasar()
const library = useLibraryStore()
const error = ref('')
const open = ref({})
const isOpen = (c) => (c.id in open.value ? open.value[c.id] : library.courses[0] === c)
const toggle = (c) => { open.value = { ...open.value, [c.id]: !isOpen(c) } }
const sessionCount = (c) => c.modules.reduce((n, m) => n + m.sessions.length, 0)
const recent = computed(() => [...library.allSessions].sort((a, b) => b.id - a.id).slice(0, 5))

function ask(title, label) {
  return new Promise((resolve) => $q.dialog({ title, prompt: { model: '', label, outlined: true, isValid: (v) => v.trim().length > 0 && v.length <= 120 }, cancel: true, persistent: true })
    .onOk((v) => resolve(v.trim())).onCancel(() => resolve(null)))
}
async function addCourse() {
  const name = await ask('New course', 'Course name')
  if (name) try { await library.addCourse(name) } catch (e) { error.value = friendly(e) }
}
async function addModule(c) {
  const name = await ask(`New module in ${c.name}`, 'Module name')
  if (name) try { await library.addModule(c.id, name); open.value = { ...open.value, [c.id]: true } } catch (e) { error.value = friendly(e) }
}
defineExpose({ addCourse })
</script>

<style scoped>
.lk-empty { text-align: center; padding: 28px 16px; }
.lk-count { background: var(--lk-tint); color: var(--lk-link); border-radius: 999px; padding: 0 10px; font-size: 13px; }
</style>

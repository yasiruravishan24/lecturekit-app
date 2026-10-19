<template>
  <div class="lk-rich">
    <template v-for="(b, i) in blocks" :key="i">
      <pre v-if="b.type === 'code'" class="lk-codeblock"><span v-if="b.lang" class="lk-code-lang">{{ b.lang }}</span><code>{{ b.text }}</code></pre>
      <p v-else class="lk-rich-p"><template v-for="(p, j) in b.parts" :key="j"><code v-if="p.code" class="lk-inline-code">{{ p.text }}</code><template v-else>{{ p.text }}</template></template></p>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'

// Text with code in it: ```fenced blocks``` become code blocks, `backticks` become inline code. Nothing is inserted as HTML.
const props = defineProps({ text: { type: String, default: '' }, legacy: Boolean })

function inline(s) {
  return s.split(/(`[^`\n]+`)/).filter(Boolean).map((x) => (x.length > 2 && x.startsWith('`') && x.endsWith('`') ? { code: true, text: x.slice(1, -1) } : { code: false, text: x }))
}

const blocks = computed(() => {
  const text = props.text || ''
  const out = []
  const re = /```([\w+-]*)[ \t]*\r?\n?([\s\S]*?)```/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: 'text', parts: inline(text.slice(last, m.index).trim()) })
    out.push({ type: 'code', lang: m[1], text: m[2].replace(/\s+$/, '') })
    last = re.lastIndex
  }
  if (last < text.length && text.slice(last).trim()) out.push({ type: 'text', parts: inline(text.slice(last).trim()) })
  // quizzes made before code blocks existed: the code follows the question mark on the same line
  if (props.legacy && out.length === 1 && out[0].type === 'text' && !out[0].parts.some((p) => p.code)) {
    const m2 = text.match(/^([^?]*\?)\s+(\S[\s\S]*)$/)
    if (m2 && /[=():]/.test(m2[2]) && /\b(print|if|for|while|def|return|import)\b|==|\w+\(/.test(m2[2])) {
      return [{ type: 'text', parts: [{ code: false, text: m2[1] }] }, { type: 'code', lang: '', text: m2[2] }]
    }
  }
  return out.length ? out : [{ type: 'text', parts: [{ code: false, text }] }]
})
</script>

<style scoped>
.lk-rich-p { margin: 0 0 10px; line-height: 1.55; white-space: pre-line; }
.lk-rich-p:last-child { margin-bottom: 0; }
.lk-codeblock { position: relative; margin: 0 0 12px; padding: 14px 16px; border-radius: 10px; overflow-x: auto; background: #1e2633; color: #e6edf7; font: 13.5px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; tab-size: 4; white-space: pre-wrap; word-break: break-word; }
.lk-codeblock:last-child { margin-bottom: 0; }
.lk-code-lang { position: absolute; top: 6px; right: 10px; font: 11px/1 sans-serif; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.55; }
.lk-inline-code { font: 0.92em ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--lk-surface-2); border: 1px solid var(--lk-border); border-radius: 5px; padding: 0 5px; }
</style>

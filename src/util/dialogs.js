import { Dialog } from 'quasar'

// Ask for a name (course, module, lecture title); resolves with the trimmed text, or null when canceled.
export function askName({ title, label, value = '', max = 120, ok = 'Save' }) {
  return new Promise((resolve) => {
    Dialog.create({
      title,
      prompt: { model: value, type: 'text', outlined: true, label, maxlength: max, isValid: (v) => v.trim().length > 0 },
      cancel: { flat: true, label: 'Cancel', color: 'primary' },
      ok: { unelevated: true, label: ok, color: 'primary' },
      persistent: true,
    }).onOk((v) => resolve(v.trim())).onCancel(() => resolve(null)).onDismiss(() => resolve(null))
  })
}

export function confirmDelete({ title, message, ok = 'Delete' }) {
  return new Promise((resolve) => {
    Dialog.create({
      title,
      message,
      cancel: { flat: true, label: 'Cancel', color: 'primary' },
      ok: { unelevated: true, label: ok, color: 'negative' },
      persistent: true,
    }).onOk(() => resolve(true)).onCancel(() => resolve(false)).onDismiss(() => resolve(false))
  })
}

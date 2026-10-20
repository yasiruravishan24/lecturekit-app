// Reading files of the phone as Blobs, and picking slides.
import { Capacitor } from '@capacitor/core'
import { FilePicker } from '@capawesome/capacitor-file-picker'
import { isNative } from '../util/platform'

export const SLIDE_TYPES = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

// File types the server accepts (the same lists as the server and the web app)
export const RECORDING_TYPES = ['.mp4', '.mov', '.m4a', '.mp3', '.wav', '.webm', '.mkv', '.aac', '.ogg']
export const SLIDE_EXTENSIONS = ['.pdf', '.pptx', '.ppt', '.pps', '.ppsx', '.odp', '.docx', '.doc', '.odt', '.rtf']
export const extOf = (name) => { const i = String(name).lastIndexOf('.'); return i < 0 ? '' : String(name).slice(i).toLowerCase() }

// a part or a slide file -> Blob. { path } is a file of the phone; { url } is a blob address (browser); { blob } is already one.
const MIME = { '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.aac': 'audio/aac', '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.pdf': 'application/pdf' }
const base64ToBlob = (b64, type) => {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: type || 'application/octet-stream' })
}

// one file of the phone: first through the web view's file address (no copy), else read by the Filesystem plugin
async function readNative(path) {
  const uri = String(path).startsWith('file://') ? path : `file://${path}`
  try {
    const res = await fetch(Capacitor.convertFileSrc(uri))
    if (res.ok) return await res.blob()
  } catch { /* try the plugin */ }
  const { Filesystem } = await import('@capacitor/filesystem')
  const r = await Filesystem.readFile({ path: uri })
  return typeof r.data === 'string' ? base64ToBlob(r.data, MIME[extOf(path)]) : r.data
}

export async function readBlob(item) {
  if (item.blob) return item.blob
  if (!item.path) { const res = await fetch(item.url); if (!res.ok) throw new Error('The file is not on this phone any more'); return res.blob() }
  try {
    return await readNative(item.path)
  } catch (first) {
    // the app was installed again: the address of its storage changed, but the part is still in the same folder inside it
    if (!isNative() || item.sessionId == null) throw first
    try {
      const base = String(item.path).split('/').pop()
      const { Directory, Filesystem } = await import('@capacitor/filesystem')
      const found = await Filesystem.getUri({ path: `lecturekit/s${item.sessionId}/${base}`, directory: Directory.Documents })
      return await readNative(found.uri)
    } catch (second) {
      throw new Error(`The file could not be read (${(second && second.message) || (first && first.message) || 'unknown'})`)
    }
  }
}

// the Files picker (native) or a file dialog (browser). Returns [{ name, size, path?, blob? }]
export const pickSlides = () => pickFiles({ types: SLIDE_TYPES, accept: '.pdf,.ppt,.pptx,.doc,.docx' })
export const pickRecordings = () => pickFiles({ types: ['audio/*', 'video/*'], accept: RECORDING_TYPES.join(',') })

async function pickFiles({ types, accept }) {
  if (isNative()) {
    const r = await FilePicker.pickFiles({ types, limit: 0 })
    return r.files.map((f) => ({ name: f.name, size: f.size, path: f.path }))
  }
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', multiple: true, accept })
    input.onchange = () => resolve([...input.files].map((f) => ({ name: f.name, size: f.size, blob: f })))
    input.click()
  })
}

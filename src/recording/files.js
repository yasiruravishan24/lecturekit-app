// Reading files of the phone as Blobs, and picking slides.
import { Capacitor } from '@capacitor/core'
import { FilePicker } from '@capawesome/capacitor-file-picker'
import { isNative } from '../util/platform'

export const SLIDE_TYPES = ['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

// a part or a slide file -> Blob. { path } is a file of the phone; { url } is a blob address (browser); { blob } is already one.
export async function readBlob(item) {
  if (item.blob) return item.blob
  const url = item.path ? Capacitor.convertFileSrc(item.path.startsWith('file://') ? item.path : `file://${item.path}`) : item.url
  const res = await fetch(url)
  if (!res.ok) throw new Error('The file is not on this phone any more')
  return res.blob()
}

// File types the server accepts (the same lists as the server and the web app)
export const RECORDING_TYPES = ['.mp4', '.mov', '.m4a', '.mp3', '.wav', '.webm', '.mkv', '.aac', '.ogg']
export const SLIDE_EXTENSIONS = ['.pdf', '.pptx', '.ppt', '.pps', '.ppsx', '.odp', '.docx', '.doc', '.odt', '.rtf']
export const extOf = (name) => { const i = String(name).lastIndexOf('.'); return i < 0 ? '' : String(name).slice(i).toLowerCase() }

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

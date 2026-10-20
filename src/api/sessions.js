import { http, data } from './client'

export const startProcessing = (id) => data(http.post(`/sessions/${id}/process`))
export const retry = (id) => data(http.post(`/sessions/${id}/retry`))
export const getJob = (id) => data(http.get(`/jobs/${id}`))
export const getNotes = (id) => data(http.get(`/sessions/${id}/notes`))
export const getDeeper = (id) => data(http.get(`/sessions/${id}/deeper`))
export const startDeeper = (id) => data(http.post(`/sessions/${id}/deeper`))
export const getReplay = (id) => data(http.get(`/sessions/${id}/replay`))

// a recording made in parts, sent while the lecture runs (the same contract as the browser extension)
export const openLive = (id) => data(http.post(`/sessions/${id}/live`))
export const liveStatus = (id, total) => data(http.get(`/sessions/${id}/live`, { params: { total } }))
export function uploadChunk(id, index, blob, name) {
  const form = new FormData()
  form.append('chunk', blob, name)
  return data(http.post(`/sessions/${id}/live/chunks`, form, { params: { index } }))
}
export function finishLive(id, total, slides = []) {
  const form = new FormData()
  slides.forEach((s) => form.append('slides', s.blob, s.name))
  return data(http.post(`/sessions/${id}/live/finish`, form, { params: { total } }))
}

// one whole recording file (the fallback when parts cannot be used), with slides
export function uploadWhole(id, recording, slides = [], onProgress) {
  const form = new FormData()
  form.append('recording', recording.blob, recording.name)
  slides.forEach((s) => form.append('slides', s.blob, s.name))
  return data(http.post(`/sessions/${id}/upload`, form, {
    onUploadProgress: (e) => onProgress && e.total && onProgress(Math.round((e.loaded / e.total) * 100)),
  }))
}
export const exportMarkdown = (id) => http.get(`/sessions/${id}/export.md`, { responseType: 'blob' }).then((r) => r.data)
export const exportPdf = (id) => http.get(`/sessions/${id}/export.pdf`, { responseType: 'blob' }).then((r) => r.data)
export const makeReplay = (id) => data(http.post(`/sessions/${id}/replay`))
export const listShots = (id) => data(http.get(`/sessions/${id}/shots`))

// recordings made earlier: one lecture in one or more files (the server joins them in this order), with optional slides. Each is { name, blob }
export function uploadFiles(id, recordings, slides = [], onProgress) {
  const form = new FormData()
  recordings.forEach((r) => form.append('recording', r.blob, r.name))
  slides.forEach((s) => form.append('slides', s.blob, s.name))
  return data(http.post(`/sessions/${id}/upload`, form, {
    onUploadProgress: (e) => onProgress && e.total && onProgress(Math.round((e.loaded / e.total) * 100)),
  }))
}

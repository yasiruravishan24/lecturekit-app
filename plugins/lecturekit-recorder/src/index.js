import { registerPlugin } from '@capacitor/core'

// Records the lecture in parts. On the iPhone it is native (ios/Sources/LectureRecorderPlugin); in a browser it falls back to MediaRecorder,
// so the screens can be developed and tested without a phone.
//
//   start({ chunkSeconds, overlap, folder })  -> { folder }
//   pause() / resume() / stop() -> stop returns { seconds, parts: [{ index, path, seconds }], folder }
//   status() -> { state: idle|recording|paused|interrupted, seconds, parts }
//   checkPermission() / requestPermission() -> { status: granted|denied|prompt }
//   freeSpace() -> { bytes }
// events: 'chunk' { index, path, url, seconds } (a finished part), 'level' { db, seconds }, 'state' { state, canResume? }, 'error' { message }
export const LectureRecorder = registerPlugin('LectureRecorder', {
  web: () => import('./web.js').then((m) => new m.LectureRecorderWeb()),
})

// the browser version, used directly for the camera mode (the native recorder is sound only)
export { LectureRecorderWeb } from './web.js'

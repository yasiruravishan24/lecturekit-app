# Lecture Assistant: iPhone app

Records a physical lecture with the phone's microphone, in 5-minute parts that are sent to the Lecture Assistant server while the
lecture runs, and shows the notes, quiz and "Learn more" it makes. Built with **Quasar (Vue 3) + Capacitor**; the recording is a small
native Swift plugin (`plugins/lecturekit-recorder`) so it keeps going with the screen locked.

## Run

```
npm install && (cd src-capacitor && npm install)
npm run dev                     # in a browser (fake or real microphone), talks to the local Docker server through a forward
npm test                        # unit tests: part schedule and upload queue
NODE_TLS_REJECT_UNAUTHORIZED=0 npx playwright test      # the app in a browser against the local server (docker compose up -d first)
./scripts/ios-sim.sh            # build and start in the iPhone Simulator
./scripts/ios-sim.sh selftest   # same, and the native recorder tests itself for 50 s (result: Documents/spike-result.json in the app)
```

On your iPhone: open `src-capacitor/ios/App/App.xcodeproj` in Xcode, choose your phone, pick your Apple ID under *Signing & Capabilities*, press Run.
With a free Apple ID the app stops opening after about 7 days: build it again the day before you need it.

## The server address

The phone needs a real HTTPS address (`https://localhost:8443` is only this Mac). For testing use a tunnel (ngrok or Cloudflare) and type the address
under **Server** on the log-in screen, or build it in: `LK_SERVER=https://your.tunnel npx quasar build -m capacitor -T ios`.
The server allows the app's origin `capacitor://localhost` (`MOBILE_ORIGIN`).

## How the recording works

`plugins/lecturekit-recorder` (Swift, AVAudioEngine) writes AAC `.m4a` parts (mono, 16 kHz, 32 kbps, about 14 MB an hour). Part k covers lecture time
`[k*300-5, (k+1)*300]` seconds, so two parts run together for 5 seconds around every boundary (the same contract as the browser extension).
The clock is recorded time (pause stops it). Finished parts go into a queue saved on the phone (`src/recording/queue.js`) and are sent one at a time with
retries; Stop sends the rest, checks with the server that no part is missing, and asks for the notes. In a browser the plugin falls back to `MediaRecorder`.

Needs in the iOS project (already set): `NSMicrophoneUsageDescription` and `UIBackgroundModes = audio` in `Info.plist`.

## Live updates

The app keeps one WebSocket to `/api/ws` (see `lecturekit-server/server/events.py`): lists, job progress and notifications update by themselves, and what is
done on the website or the extension appears here without a refresh (and the other way round). The socket works while the app is open; alerts with the app
closed would need Apple push notifications (not built).

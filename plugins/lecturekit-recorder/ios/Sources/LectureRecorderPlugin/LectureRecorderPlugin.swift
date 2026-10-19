import Foundation
import Capacitor
import AVFoundation

/// Records the lecture with the phone's microphone, in the background, and cuts it into parts (see ChunkSchedule.swift).
/// Every part is a complete, playable AAC .m4a file (mono, 16 kHz, 32 kbps: about 14 MB an hour). The web view only starts and stops it and
/// hears about finished parts, sound levels and interruptions through events; the timing is done here, so it keeps going with the screen locked.
@objc(LectureRecorderPlugin)
public class LectureRecorderPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LectureRecorderPlugin"
    public let jsName = "LectureRecorder"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "checkPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermission", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "freeSpace", returnType: CAPPluginReturnPromise)
    ]

    private final class Writer {
        let index: Int
        let url: URL
        var file: AVAudioFile?
        var frames: AVAudioFramePosition = 0
        init(index: Int, url: URL, file: AVAudioFile) { self.index = index; self.url = url; self.file = file }
    }

    private let engine = AVAudioEngine()
    private let queue = DispatchQueue(label: "lecturekit.recorder")
    private var timer: DispatchSourceTimer?
    private var writers: [Int: Writer] = [:]
    private var converter: AVAudioConverter?
    private let target = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: 16000, channels: 1, interleaved: false)!

    private var running = false
    private var paused = false              // by the person
    private var interrupted = false         // by a call, an alarm, Siri ...
    private var recorded = 0.0              // recorded seconds (the clock stops while paused or interrupted)
    private var lastTick = CFAbsoluteTimeGetCurrent()
    private var length = 300.0
    private var overlap = 5.0
    private var folder = URL(fileURLWithPath: NSTemporaryDirectory())
    private var finished: [[String: Any]] = []
    private var level: Float = -80
    private var keepsFrom = 0               // parts whose index is below this are not opened (a recording continued after a restart)

    // MARK: permission

    @objc func checkPermission(_ call: CAPPluginCall) {
        call.resolve(["status": permissionStatus()])
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        let done: (Bool) -> Void = { granted in call.resolve(["status": granted ? "granted" : "denied"]) }
        if #available(iOS 17.0, *) {
            AVAudioApplication.requestRecordPermission(completionHandler: done)
        } else {
            AVAudioSession.sharedInstance().requestRecordPermission(done)
        }
    }

    private func permissionStatus() -> String {
        if #available(iOS 17.0, *) {
            switch AVAudioApplication.shared.recordPermission {
            case .granted: return "granted"
            case .denied: return "denied"
            default: return "prompt"
            }
        }
        switch AVAudioSession.sharedInstance().recordPermission {
        case .granted: return "granted"
        case .denied: return "denied"
        default: return "prompt"
        }
    }

    // MARK: start, pause, resume, stop

    @objc func start(_ call: CAPPluginCall) {
        if running { return call.reject("A recording is already running") }
        length = call.getDouble("chunkSeconds") ?? 300
        overlap = call.getDouble("overlap") ?? 5
        let name = call.getString("folder") ?? "recording"
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        folder = documents.appendingPathComponent("lecturekit", isDirectory: true).appendingPathComponent(name, isDirectory: true)
        do {
            try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .default, options: [.allowBluetooth, .defaultToSpeaker, .mixWithOthers])
            try session.setActive(true)
            let input = engine.inputNode
            let format = input.outputFormat(forBus: 0)
            guard format.sampleRate > 0 else { return call.reject("The microphone is not available") }
            converter = AVAudioConverter(from: format, to: target)
            input.removeTap(onBus: 0)
            input.installTap(onBus: 0, bufferSize: 4096, format: format) { [weak self] buffer, _ in self?.heard(buffer) }
            engine.prepare()
            try engine.start()
        } catch {
            return call.reject("Could not start recording: \(error.localizedDescription)")
        }
        queue.sync {
            writers = [:]
            finished = []
            recorded = 0
            paused = false
            interrupted = false
            lastTick = CFAbsoluteTimeGetCurrent()
            running = true
            self.openAndClose()                                   // part 0 starts now
        }
        startTimer()
        NotificationCenter.default.addObserver(self, selector: #selector(interruption(_:)), name: AVAudioSession.interruptionNotification, object: nil)
        notifyListeners("state", data: ["state": "recording"])
        call.resolve(["folder": folder.path])
    }

    @objc func pause(_ call: CAPPluginCall) {
        queue.sync { tick(); paused = true }
        notifyListeners("state", data: ["state": "paused"])
        call.resolve()
    }

    @objc func resume(_ call: CAPPluginCall) {
        if interrupted {                                          // after a call: take the microphone back first
            do {
                try AVAudioSession.sharedInstance().setActive(true)
                if !engine.isRunning { try engine.start() }
            } catch {
                return call.reject("Could not continue recording: \(error.localizedDescription)")
            }
        }
        queue.sync { paused = false; interrupted = false; lastTick = CFAbsoluteTimeGetCurrent() }
        notifyListeners("state", data: ["state": "recording"])
        call.resolve()
    }

    @objc func stop(_ call: CAPPluginCall) {
        guard running else { return call.resolve(["seconds": 0, "parts": []]) }
        timer?.cancel()
        timer = nil
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        NotificationCenter.default.removeObserver(self, name: AVAudioSession.interruptionNotification, object: nil)
        var seconds = 0.0
        var parts: [[String: Any]] = []
        queue.sync {
            tick()
            seconds = recorded
            for index in writers.keys.sorted() { closeWriter(index) }
            running = false
            parts = finished
        }
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        notifyListeners("state", data: ["state": "stopped"])
        call.resolve(["seconds": seconds, "parts": parts, "folder": folder.path])
    }

    @objc func status(_ call: CAPPluginCall) {
        var state = "idle"
        var seconds = 0.0
        queue.sync {
            if running { state = interrupted ? "interrupted" : (paused ? "paused" : "recording"); seconds = recorded }
        }
        call.resolve(["state": state, "seconds": seconds, "folder": folder.path, "parts": finished])
    }

    @objc func freeSpace(_ call: CAPPluginCall) {
        let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let values = try? documents.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
        call.resolve(["bytes": values?.volumeAvailableCapacityForImportantUsage ?? 0])
    }

    // MARK: the clock and the parts (all on `queue`)

    private func startTimer() {
        let t = DispatchSource.makeTimerSource(queue: queue)
        t.schedule(deadline: .now() + 0.2, repeating: 0.2)
        t.setEventHandler { [weak self] in
            guard let self = self, self.running else { return }
            self.tick()
            self.openAndClose()
            self.notifyListeners("level", data: ["db": Double(self.level), "seconds": self.recorded])
        }
        t.resume()
        timer = t
    }

    private func tick() {
        let now = CFAbsoluteTimeGetCurrent()
        if !paused && !interrupted { recorded += now - lastTick }
        lastTick = now
    }

    private func openAndClose() {
        let want = Set(ChunkSchedule.active(at: recorded, length: length, overlap: overlap))
        for index in want where writers[index] == nil && !closedBefore(index) { openWriter(index) }
        for index in writers.keys where !want.contains(index) { closeWriter(index) }
    }

    private func closedBefore(_ index: Int) -> Bool {
        return finished.contains { ($0["index"] as? Int) == index }
    }

    private func openWriter(_ index: Int) {
        let url = folder.appendingPathComponent(String(format: "chunk_%05d.m4a", index))
        try? FileManager.default.removeItem(at: url)
        let settings: [String: Any] = [
            AVFormatIDKey: kAudioFormatMPEG4AAC,
            AVSampleRateKey: 16000,
            AVNumberOfChannelsKey: 1,
            AVEncoderBitRateKey: 32000
        ]
        do {
            let file = try AVAudioFile(forWriting: url, settings: settings, commonFormat: .pcmFormatFloat32, interleaved: false)
            writers[index] = Writer(index: index, url: url, file: file)
        } catch {
            notifyListeners("error", data: ["message": "Could not open part \(index + 1): \(error.localizedDescription)"])
        }
    }

    private func closeWriter(_ index: Int) {
        guard let w = writers.removeValue(forKey: index) else { return }
        let seconds = Double(w.frames) / 16000
        w.file = nil                                              // closing the file writes the end of the .m4a: it is playable from now on
        let part: [String: Any] = ["index": index, "path": w.url.path, "seconds": seconds]
        finished.append(part)
        notifyListeners("chunk", data: part)
    }

    // MARK: sound

    private func heard(_ buffer: AVAudioPCMBuffer) {
        guard let converter = converter else { return }
        let ratio = target.sampleRate / buffer.format.sampleRate
        guard let out = AVAudioPCMBuffer(pcmFormat: target, frameCapacity: AVAudioFrameCount(Double(buffer.frameLength) * ratio) + 32) else { return }
        var fed = false
        var error: NSError?
        converter.convert(to: out, error: &error) { _, status in
            if fed { status.pointee = .noDataNow; return nil }
            fed = true
            status.pointee = .haveData
            return buffer
        }
        guard error == nil, out.frameLength > 0, let samples = out.floatChannelData?[0] else { return }
        var sum: Float = 0
        for i in 0..<Int(out.frameLength) { sum += samples[i] * samples[i] }
        let rms = (sum / Float(out.frameLength)).squareRoot()
        queue.async { [weak self] in
            guard let self = self, self.running else { return }
            self.level = rms > 0 ? max(-80, 20 * log10(rms)) : -80
            if self.paused || self.interrupted { return }
            for w in self.writers.values {
                do { try w.file?.write(from: out); w.frames += AVAudioFramePosition(out.frameLength) } catch {
                    self.notifyListeners("error", data: ["message": "Could not save the sound: \(error.localizedDescription)"])
                }
            }
        }
    }

    // MARK: interruptions (a call, an alarm, Siri)

    @objc private func interruption(_ note: Notification) {
        guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt, let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        if type == .began {
            queue.sync { tick(); interrupted = true }
            notifyListeners("state", data: ["state": "interrupted", "seconds": recorded])
        } else {
            let optionsRaw = note.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
            let shouldResume = AVAudioSession.InterruptionOptions(rawValue: optionsRaw).contains(.shouldResume)
            if shouldResume {
                do {
                    try AVAudioSession.sharedInstance().setActive(true)
                    if !engine.isRunning { try engine.start() }
                    queue.sync { interrupted = false; lastTick = CFAbsoluteTimeGetCurrent() }
                    notifyListeners("state", data: ["state": "recording"])
                    return
                } catch { /* the person presses Resume */ }
            }
            notifyListeners("state", data: ["state": "interrupted", "canResume": true, "seconds": recorded])
        }
    }
}

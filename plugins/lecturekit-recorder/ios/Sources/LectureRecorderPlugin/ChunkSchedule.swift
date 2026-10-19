import Foundation

/// When each part of a recording runs. Part k covers lecture time [max(0, k*length - overlap), (k+1)*length], so two parts run together for
/// `overlap` seconds around every boundary. Time is RECORDED time: a pause stops the clock. The same rules as lib/chunker.js of the extension
/// and src/recording/chunker.js of the app (the web view cannot do this itself: its timers stop when the screen is locked).
public enum ChunkSchedule {
    public static func start(_ k: Int, length: Double, overlap: Double) -> Double {
        return max(0, Double(k) * length - overlap)
    }

    public static func end(_ k: Int, length: Double) -> Double {
        return Double(k + 1) * length
    }

    public static func active(at t: Double, length: Double, overlap: Double) -> [Int] {
        let base = Int(floor(t / length))
        var out: [Int] = []
        for k in [base, base + 1] where k >= 0 {
            if start(k, length: length, overlap: overlap) <= t && t < end(k, length: length) { out.append(k) }
        }
        return out
    }
}

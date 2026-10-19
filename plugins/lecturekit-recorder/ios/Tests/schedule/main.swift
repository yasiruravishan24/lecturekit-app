import Foundation
func check(_ cond: Bool, _ msg: String) { if !cond { print("FAIL: \(msg)"); exit(1) } }
check(ChunkSchedule.start(0, length: 300, overlap: 5) == 0, "start 0")
check(ChunkSchedule.start(1, length: 300, overlap: 5) == 295, "start 1")
check(ChunkSchedule.end(2, length: 300) == 900, "end 2")
check(ChunkSchedule.active(at: 0, length: 300, overlap: 5) == [0], "t=0")
check(ChunkSchedule.active(at: 294.9, length: 300, overlap: 5) == [0], "t=294.9")
check(ChunkSchedule.active(at: 295, length: 300, overlap: 5) == [0, 1], "t=295")
check(ChunkSchedule.active(at: 300, length: 300, overlap: 5) == [1], "t=300")
check(ChunkSchedule.active(at: 595, length: 300, overlap: 5) == [1, 2], "t=595")
check(ChunkSchedule.active(at: 900, length: 300, overlap: 5) == [3], "t=900")
check(ChunkSchedule.active(at: 14, length: 20, overlap: 5) == [0], "short 14")
check(ChunkSchedule.active(at: 15, length: 20, overlap: 5) == [0, 1], "short 15")
print("schedule ok")

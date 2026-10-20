import test from 'node:test'
import assert from 'node:assert/strict'
import { rotationFor, snapAngle } from '../../src/recording/cameraPipeline.js'

test('the way the phone is held is rounded to a quarter turn', () => {
  assert.equal(snapAngle(0), 0); assert.equal(snapAngle(10), 0); assert.equal(snapAngle(44), 0)
  assert.equal(snapAngle(50), 90); assert.equal(snapAngle(100), 90)
  assert.equal(snapAngle(-80), -90); assert.equal(snapAngle(-170), 180); assert.equal(snapAngle(175), 180)
})

test('a portrait picture is turned when the phone is on its side, and left alone when the shape fits', () => {
  assert.equal(rotationFor(0, false), 0)             // upright, portrait picture
  assert.equal(rotationFor(180, false), 180)         // upside down
  assert.equal(rotationFor(90, false), 90)           // turned clockwise: turn the picture clockwise
  assert.equal(rotationFor(-90, false), -90)
  assert.equal(rotationFor(90, true), 0)             // the picture is already landscape
  assert.equal(rotationFor(0, true), 90)             // a landscape picture for a phone held upright
})

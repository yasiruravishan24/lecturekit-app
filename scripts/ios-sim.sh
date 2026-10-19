#!/bin/sh
# Builds the app for the iOS Simulator and (optionally) runs the native recording self test there.
#   ./scripts/ios-sim.sh            build, install and start in the Simulator
#   ./scripts/ios-sim.sh selftest   same, with LK_SELFTEST=1: it records 50 s by itself and writes spike-result.json
set -e
cd "$(dirname "$0")/.."
DEVICE="${SIM_DEVICE:-iPhone 17 Pro}"
BUNDLE="app.lectureassistant.mobile"
[ "$1" = "selftest" ] && export LK_SELFTEST=1
npx quasar build -m capacitor -T ios --skip-pkg >/tmp/lk-qbuild.log 2>&1 || true      # builds the web part and syncs the iOS project (signing fails: not needed here)
xcodebuild -project src-capacitor/ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator \
  -destination "platform=iOS Simulator,name=$DEVICE" -derivedDataPath dist/sim CODE_SIGNING_ALLOWED=NO build 2>&1 | tail -5
xcrun simctl boot "$DEVICE" 2>/dev/null || true
xcrun simctl bootstatus "$DEVICE" -b >/dev/null
xcrun simctl privacy "$DEVICE" grant microphone "$BUNDLE" || true
xcrun simctl install "$DEVICE" dist/sim/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch "$DEVICE" "$BUNDLE"

# iOS Extensions Manual Testing Guide

## Overview

The iOS extensions (Widget, Control Center, Watch App) are native Swift components that cannot be automated with JavaScript tests. They must be tested manually on device or simulator.

**Deep Link:** All integrations route through `sircharge://record/voice`

---

## 1. Lock Screen Widget (iOS 16+)

### Setup
1. Build and install the app: `npx expo run:ios`
2. On device/simulator, long-press on Lock Screen
3. Tap "Customize" → select the Lock Screen
4. Tap "Add Widgets"
5. Search for "SirCharge" or "Voice Note"

### Test Cases

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Widget appears in picker | Search "SirCharge" in widget gallery | VoiceNoteWidget shows with mic icon |
| Circular widget displays | Add accessoryCircular widget | Shows mic icon on lock screen |
| Rectangular widget displays | Add accessoryRectangular widget | Shows "Record Note" with note count |
| Inline widget displays | Add accessoryInline widget | Shows "X voice notes" text |
| Widget tap opens app | Tap any widget variant | App opens to chat with recording started |

### Widget Families Supported
- `.accessoryCircular` - Circular mic icon (lock screen)
- `.accessoryRectangular` - "Record Note" with stats (lock screen)
- `.accessoryInline` - Single line text (lock screen)
- `.systemSmall` - 2x2 home screen widget
- `.systemMedium` - 2x4 home screen widget with recent notes

---

## 2. Home Screen Widget (iOS 14+)

### Setup
1. Long-press on Home Screen
2. Tap "+" in top-left corner
3. Search for "SirCharge"
4. Choose Small or Medium size
5. Tap "Add Widget"

### Test Cases

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Small widget displays | Add systemSmall widget | Shows mic button with "Voice Note" label |
| Medium widget displays | Add systemMedium widget | Shows mic button + recent notes list |
| Small widget tap | Tap mic button on small widget | App opens with recording started |
| Medium widget record | Tap mic button on medium widget | App opens with recording started |
| Recent notes display | Create voice notes, check widget | Shows up to 3 recent note previews |
| Note count updates | Create notes, wait 15 min | Widget shows updated count |

---

## 3. Control Center (iOS 18+ Only)

### Setup
1. Open Settings → Control Center
2. Scroll to "More Controls"
3. Find "SirCharge" section
4. Tap "+" on "Voice Note" control
5. Open Control Center (swipe from top-right)

### Test Cases

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Control appears in settings | Check Control Center settings | "Voice Note" control available |
| Control displays in CC | Open Control Center | Mic icon with "Record Note" label |
| Control tap opens app | Tap control in Control Center | App opens with recording started |
| Control works from lock | Tap control while phone locked | Prompts for unlock, then opens app |

### Requirements
- **iOS 18.0+ required** for Control Center widgets
- Device must be running iOS 18 beta or later
- Simulator: Use iOS 18+ simulator image

---

## 4. Apple Watch App (watchOS 9+)

### Setup (Simulator)
1. Open Xcode → Window → Devices and Simulators
2. Add a Watch simulator paired with iPhone simulator
3. Build Watch target: Select "SirChargeWatch Watch App" scheme
4. Run on Watch simulator

### Setup (Physical Device)
1. Pair Apple Watch with iPhone
2. Install app on iPhone
3. Open Watch app on iPhone
4. Find SirCharge and tap "Install"

### Test Cases

| Test | Steps | Expected Result |
|------|-------|-----------------|
| App launches | Open SirCharge on Watch | Shows main recording interface |
| Record button displays | Check main view | Large mic button visible |
| Record tap (iPhone nearby) | Tap record with iPhone reachable | iPhone starts recording, Watch shows status |
| Record tap (iPhone away) | Tap record with iPhone unreachable | Watch records locally |
| Recording indicator | Start recording | Pulsing animation visible |
| Stop recording | Tap stop button | Recording ends, saved |

### Watch Connectivity Test
```
iPhone reachable: Recording happens on iPhone (better mic quality)
iPhone unreachable: Recording happens on Watch (syncs later)
```

---

## 5. Deep Link Testing

### Test the deep link directly:

**Simulator:**
```bash
xcrun simctl openurl booted "sircharge://record/voice"
```

**Physical Device:**
Open Safari and navigate to: `sircharge://record/voice`

### Expected Behavior
1. App opens (or comes to foreground)
2. Navigates to Chat screen
3. Voice recording starts automatically

---

## 6. Build Verification

### Verify all extension targets build:

```bash
cd /Users/lwang2/Documents/GitHub/ios/personal/PersonalAIApp/ios

# Build main app
xcodebuild -workspace SirCharge.xcworkspace -scheme SirCharge -destination 'platform=iOS Simulator,name=iPhone 16 Pro' build

# Verify extensions are embedded
ls -la ~/Library/Developer/Xcode/DerivedData/SirCharge-*/Build/Products/Debug-iphonesimulator/SirCharge.app/PlugIns/
# Should show:
# - VoiceNoteWidgetExtension.appex
# - VoiceNoteControlExtension.appex
```

### Verify Watch app builds:
```bash
xcodebuild -workspace SirCharge.xcworkspace -scheme "SirChargeWatch Watch App" -destination 'platform=watchOS Simulator,name=Apple Watch Series 9 (45mm)' build
```

---

## 7. Common Issues

### Widget not appearing in picker
- Ensure app was built with Widget extension
- Check `PlugIns/VoiceNoteWidgetExtension.appex` exists in app bundle
- Restart SpringBoard: `killall SpringBoard` (simulator)

### Control Center control not showing (iOS 18)
- Verify iOS version is 18.0+
- Check `PlugIns/VoiceNoteControlExtension.appex` exists
- Control Center extensions require iOS 18

### Watch app not installing
- Verify Watch is paired and unlocked
- Check Watch has sufficient storage
- Try restarting both devices

### Deep link not working
- Verify URL scheme `sircharge` is registered in Info.plist
- Check `CFBundleURLSchemes` contains `sircharge`
- Test with: `xcrun simctl openurl booted "sircharge://record/voice"`

---

## 8. Checklist Summary

### Before Release
- [ ] Lock Screen widget (circular) adds and taps correctly
- [ ] Lock Screen widget (rectangular) shows note count
- [ ] Home Screen small widget works
- [ ] Home Screen medium widget shows recent notes
- [ ] Control Center control appears (iOS 18 only)
- [ ] Control Center tap opens app
- [ ] Watch app installs on paired watch
- [ ] Watch recording works (iPhone nearby)
- [ ] Watch recording works (iPhone away)
- [ ] Deep link `sircharge://record/voice` works
- [ ] All extensions embedded in app bundle

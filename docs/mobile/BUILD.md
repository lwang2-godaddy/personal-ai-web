# Build Guide

Instructions for building the PersonalAI mobile app for iOS and Android.

## Prerequisites

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 20+ | JavaScript runtime |
| npm | 10+ | Package manager |
| Xcode | 16+ | iOS development |
| Android Studio | Hedgehog+ | Android development |
| CocoaPods | 1.14+ | iOS dependencies |
| JDK | 17 | Android builds |

### Expo CLI

```bash
# Install Expo CLI globally
npm install -g expo-cli

# Or use npx (recommended)
npx expo --version
```

---

## Initial Setup

### 1. Clone and Install

```bash
# Navigate to the mobile app
cd PersonalAIApp

# Install dependencies (use legacy-peer-deps for React Native)
npm install --legacy-peer-deps
```

### 2. Environment Variables

Create `.env` file in project root:

```bash
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id

# OpenAI
OPENAI_API_KEY=sk-your_openai_key

# Pinecone
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=personal-ai-data
PINECONE_ENVIRONMENT=us-east-1-aws
```

### 3. Firebase Configuration Files

**iOS:** Place `GoogleService-Info.plist` in `ios/PersonalAIApp/`

**Android:** Place `google-services.json` in `android/app/`

---

## iOS Build

### Development Build

```bash
# Install CocoaPods dependencies
cd ios && pod install && cd ..

# Start Metro bundler
npx expo start

# Run on iOS Simulator
npx expo run:ios

# Run on specific simulator
npx expo run:ios --device "iPhone 15 Pro"

# Run on physical device (requires Apple Developer account)
npx expo run:ios --device
```

### Xcode Configuration

1. Open `ios/PersonalAIApp.xcworkspace` in Xcode
2. Select your team in Signing & Capabilities
3. Update bundle identifier if needed
4. Enable required capabilities:
   - HealthKit
   - Background Modes (Location updates, Background fetch)
   - Push Notifications

### Production Build (Archive)

```bash
# Using Expo (EAS Build)
npx eas build --platform ios

# Or manually in Xcode:
# 1. Select "Any iOS Device" as target
# 2. Product → Archive
# 3. Distribute App → App Store Connect
```

### Required iOS Permissions (Info.plist)

```xml
<!-- Location -->
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>PersonalAI tracks your location to remember places you visit.</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>PersonalAI needs your location to remember places you visit.</string>

<!-- Health -->
<key>NSHealthShareUsageDescription</key>
<string>PersonalAI reads health data to provide personalized insights.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>PersonalAI may write workout data to track your exercise.</string>

<!-- Microphone -->
<key>NSMicrophoneUsageDescription</key>
<string>PersonalAI uses the microphone to record voice notes.</string>

<!-- Camera -->
<key>NSCameraUsageDescription</key>
<string>PersonalAI uses the camera to capture photos.</string>

<!-- Photo Library -->
<key>NSPhotoLibraryUsageDescription</key>
<string>PersonalAI accesses photos to add to your memories.</string>

<!-- Motion -->
<key>NSMotionUsageDescription</key>
<string>PersonalAI uses motion to detect activity type.</string>

<!-- Background Modes -->
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
  <string>remote-notification</string>
</array>
```

---

## Android Build

### Development Build

```bash
# Start Metro bundler
npx expo start

# Run on Android Emulator
npx expo run:android

# Run on physical device (USB debugging enabled)
npx expo run:android --device
```

### Android Studio Configuration

1. Open `android/` folder in Android Studio
2. Sync Gradle files
3. Update `android/app/build.gradle`:

```groovy
android {
    compileSdkVersion 34

    defaultConfig {
        applicationId "com.personalai.app"
        minSdkVersion 24
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }

    signingConfigs {
        release {
            storeFile file('release.keystore')
            storePassword System.getenv('KEYSTORE_PASSWORD')
            keyAlias System.getenv('KEY_ALIAS')
            keyPassword System.getenv('KEY_PASSWORD')
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Production Build (APK/AAB)

```bash
# Using Expo (EAS Build)
npx eas build --platform android

# Or manually:
cd android

# Build APK
./gradlew assembleRelease

# Build AAB (for Play Store)
./gradlew bundleRelease
```

### Required Android Permissions (AndroidManifest.xml)

```xml
<!-- Internet -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Location -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- Health/Fitness -->
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" />
<uses-permission android:name="android.permission.BODY_SENSORS" />

<!-- Audio -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- Camera & Storage -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

<!-- Background -->
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

---

## EAS Build (Recommended)

### Setup EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Initialize EAS in project
eas init
```

### Configure eas.json

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "buildConfiguration": "Release"
      },
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-play-key.json"
      }
    }
  }
}
```

### Build Commands

```bash
# Development build (with Expo Dev Client)
eas build --profile development --platform ios
eas build --profile development --platform android

# Preview build (internal testing)
eas build --profile preview --platform all

# Production build
eas build --profile production --platform ios
eas build --profile production --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## Troubleshooting

### iOS Issues

**"Pod install failed"**
```bash
# Clear CocoaPods cache
cd ios
pod deintegrate
pod cache clean --all
pod install

# If still failing, delete Pods folder
rm -rf Pods Podfile.lock
pod install
```

**"Code signing error"**
- Open Xcode
- Select project → Signing & Capabilities
- Choose your development team
- Enable "Automatically manage signing"

**"HealthKit capability missing"**
- Open Xcode
- Select target → Signing & Capabilities
- Click "+ Capability" → Add "HealthKit"

### Android Issues

**"SDK location not found"**
```bash
# Create local.properties in android/
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
```

**"Gradle sync failed"**
```bash
cd android
./gradlew clean
./gradlew --stop
cd ..
npx expo run:android
```

**"Google Play Services error"**
- Ensure `google-services.json` is in `android/app/`
- Verify SHA-1 fingerprint in Firebase Console

### Metro Bundler Issues

```bash
# Clear Metro cache (Expo)
npx expo start --clear

# Clear all caches
rm -rf node_modules
rm -rf /tmp/metro-*
npm install --legacy-peer-deps
npx expo start --clear
```

### Build Fails with Native Module Errors

```bash
# Regenerate native projects
npx expo prebuild --clean

# Then rebuild
npx expo run:ios  # or android
```

---

## Environment-Specific Builds

### Development vs Production

```typescript
// Use __DEV__ flag for environment detection
if (__DEV__) {
  // Development-only code
  console.log('Running in development mode');
}

// Or use environment variables
const API_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.production.com'
  : 'https://api.staging.com';
```

### Multiple Environments

Create multiple `.env` files:

```
.env.development
.env.staging
.env.production
```

Load with app.config.js:

```javascript
// app.config.js
import 'dotenv/config';

export default {
  name: 'PersonalAI',
  slug: 'personal-ai',
  extra: {
    apiUrl: process.env.API_URL,
    environment: process.env.NODE_ENV,
  },
};
```

---

## Release Checklist

### Pre-Release

- [ ] Update version in `app.json` / `package.json`
- [ ] Update changelog
- [ ] Run all tests
- [ ] Test on physical devices (iOS + Android)
- [ ] Verify all permissions work correctly
- [ ] Test offline functionality
- [ ] Check crash reporting integration
- [ ] Review analytics events

### iOS Release

- [ ] Archive build in Xcode
- [ ] Upload to App Store Connect
- [ ] Fill in App Store metadata
- [ ] Add screenshots for all device sizes
- [ ] Submit for review

### Android Release

- [ ] Build signed AAB
- [ ] Upload to Google Play Console
- [ ] Fill in store listing
- [ ] Add screenshots
- [ ] Complete content rating questionnaire
- [ ] Roll out to production

---

## Related Documentation

- [Architecture](./ARCHITECTURE.md) - System design
- [Firebase Functions](./FIREBASE_FUNCTIONS.md) - Cloud Functions deployment
- [Services](./SERVICES.md) - Service configuration

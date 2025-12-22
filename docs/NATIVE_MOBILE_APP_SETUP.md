# Native Mobile App Setup Guide

This guide walks you through setting up the native mobile app with Apple HealthKit and Android Health Connect integration.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Export & Setup](#project-export--setup)
3. [iOS Setup (Apple HealthKit)](#ios-setup-apple-healthkit)
4. [Android Setup (Health Connect)](#android-setup-health-connect)
5. [Testing on Devices](#testing-on-devices)
6. [Building for Production](#building-for-production)
7. [App Store Submission](#app-store-submission)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Platform | Requirements |
|----------|-------------|
| **iOS Development** | macOS computer, Xcode 15+, Apple Developer Account ($99/year) |
| **Android Development** | Android Studio (any OS), Google Play Developer Account ($25 one-time) |

### Required Accounts

- **Apple Developer Program** ($99/year) - Required for HealthKit and App Store
  - Sign up at: https://developer.apple.com/programs/
  
- **Google Play Console** ($25 one-time) - Required for Play Store
  - Sign up at: https://play.google.com/console/signup

---

## Project Export & Setup

### Step 1: Export to GitHub

1. In Lovable, click **GitHub** in the top menu
2. Click **Connect to GitHub** and authorize the Lovable GitHub App
3. Click **Create Repository** to generate a new repo with your project code

### Step 2: Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Add Native Platforms

```bash
# Add iOS platform
npx cap add ios

# Add Android platform  
npx cap add android
```

### Step 5: Build and Sync

```bash
# Build the web app
npm run build

# Sync to native platforms
npx cap sync
```

---

## iOS Setup (Apple HealthKit)

### Step 1: Open in Xcode

```bash
npx cap open ios
```

### Step 2: Configure Signing

1. In Xcode, select your project in the navigator
2. Select your app target
3. Go to **Signing & Capabilities** tab
4. Check **Automatically manage signing**
5. Select your **Team** (your Apple Developer account)
6. Enter a unique **Bundle Identifier** (e.g., `com.yourcompany.everfitstridecloud`)

### Step 3: Add HealthKit Capability

1. In **Signing & Capabilities** tab, click **+ Capability**
2. Search for and add **HealthKit**
3. Check these options:
   - ✅ Clinical Health Records (optional)
   - ✅ Background Delivery (optional, for background sync)

### Step 4: Configure Info.plist

Add these keys to `ios/App/App/Info.plist`:

```xml
<key>NSHealthShareUsageDescription</key>
<string>This app needs access to your health data to share your fitness progress with your trainer.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>This app needs permission to save workout data to Apple Health.</string>
```

### Step 5: Add HealthKit Entitlements

Create or update `ios/App/App/App.entitlements`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.developer.healthkit</key>
    <true/>
    <key>com.apple.developer.healthkit.access</key>
    <array/>
    <key>com.apple.developer.healthkit.background-delivery</key>
    <true/>
</dict>
</plist>
```

### Step 6: Install HealthKit Plugin (if not already)

The project should already have the HealthKit plugin. If not:

```bash
npm install @nicholasquinn/capacitor-healthkit
npx cap sync ios
```

---

## Android Setup (Health Connect)

### Step 1: Open in Android Studio

```bash
npx cap open android
```

### Step 2: Configure Health Connect Permissions

Update `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    
    <!-- Health Connect Permissions -->
    <uses-permission android:name="android.permission.health.READ_HEART_RATE"/>
    <uses-permission android:name="android.permission.health.READ_STEPS"/>
    <uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED"/>
    <uses-permission android:name="android.permission.health.READ_TOTAL_CALORIES_BURNED"/>
    <uses-permission android:name="android.permission.health.READ_EXERCISE"/>
    <uses-permission android:name="android.permission.health.READ_DISTANCE"/>
    
    <application ...>
        
        <!-- Health Connect Intent Filter -->
        <activity
            android:name=".MainActivity"
            ...>
            
            <intent-filter>
                <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE"/>
            </intent-filter>
        </activity>
        
        <!-- Declare Health Connect permissions rationale activity -->
        <activity-alias
            android:name="ViewPermissionUsageActivity"
            android:exported="true"
            android:targetActivity=".MainActivity"
            android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
            <intent-filter>
                <action android:name="android.intent.action.VIEW_PERMISSION_USAGE"/>
                <category android:name="android.intent.category.HEALTH_PERMISSIONS"/>
            </intent-filter>
        </activity-alias>
        
    </application>
</manifest>
```

### Step 3: Update build.gradle

In `android/app/build.gradle`, ensure minimum SDK is 26+:

```gradle
android {
    defaultConfig {
        minSdkVersion 26
        targetSdkVersion 34
    }
}
```

### Step 4: Install Health Connect on Device

Health Connect must be installed on the Android device:

1. Open Google Play Store on device
2. Search for "Health Connect by Google"
3. Install the app
4. Open Health Connect and complete initial setup

### Step 5: Install Health Connect Plugin (if not already)

```bash
npm install @nicholasquinn/capacitor-healthconnect
npx cap sync android
```

---

## Testing on Devices

### iOS Testing

#### Option A: Physical Device (Recommended for HealthKit)

1. Connect your iPhone via USB
2. In Xcode, select your device from the device dropdown
3. Click **Run** (▶️)
4. On first run, go to Settings > General > VPN & Device Management and trust your developer certificate

**Note:** HealthKit only works on physical devices, not the iOS Simulator.

#### Option B: Simulator (Limited)

HealthKit has limited functionality in the Simulator. You can add sample data via:
1. Open the Health app in Simulator
2. Add data manually for testing

### Android Testing

#### Option A: Physical Device

1. Enable **Developer Options** on your Android device:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
2. Enable **USB Debugging** in Developer Options
3. Connect device via USB
4. In Android Studio, select your device and click **Run**

#### Option B: Emulator

1. In Android Studio, open **Device Manager**
2. Create a virtual device with API 28+
3. Install Health Connect APK in the emulator
4. Run the app

---

## Building for Production

### iOS Production Build

1. In Xcode, select **Product > Archive**
2. Once complete, click **Distribute App**
3. Choose **App Store Connect** for App Store submission
4. Follow the prompts to upload

### Android Production Build

1. In Android Studio, select **Build > Generate Signed Bundle/APK**
2. Choose **Android App Bundle**
3. Create or select your keystore
4. Build the release bundle

---

## App Store Submission

### Apple App Store

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new app with your Bundle ID
3. Fill in app information, screenshots, and description
4. Upload your build from Xcode
5. Submit for review

**Important HealthKit Requirements:**
- Must explain why you need each health data type
- Must have a privacy policy
- HealthKit usage must be clearly documented
- Apple reviews HealthKit apps more thoroughly

### Google Play Store

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app
3. Complete the app content questionnaire
4. Upload your AAB (Android App Bundle)
5. Submit for review

**Important Health Connect Requirements:**
- Must complete Health Connect declaration form
- Must explain data usage in store listing
- Must have a privacy policy

---

## Troubleshooting

### Common iOS Issues

#### "HealthKit is not available"

- **Cause:** Testing on Simulator or device without HealthKit
- **Fix:** Use a physical iPhone with Health app installed

#### "Signing error"

- **Cause:** Missing Apple Developer certificate
- **Fix:** Ensure you're enrolled in Apple Developer Program and signed in to Xcode

#### "HealthKit capability not found"

- **Cause:** Missing entitlements
- **Fix:** Add HealthKit capability in Xcode Signing & Capabilities

### Common Android Issues

#### "Health Connect not installed"

- **Cause:** Health Connect app missing on device
- **Fix:** Install "Health Connect by Google" from Play Store

#### "Permission denied"

- **Cause:** User didn't grant permissions or permissions revoked
- **Fix:** Check Health Connect app for granted permissions

#### "minSdkVersion error"

- **Cause:** SDK version too low
- **Fix:** Set minSdkVersion to 26 or higher in build.gradle

### Syncing Issues

#### "Data not syncing"

1. Check if user granted all required permissions
2. Verify internet connection
3. Check Lovable Cloud backend logs for errors
4. Ensure device time is correct

---

## Development Workflow

### Hot Reload Setup

The `capacitor.config.ts` is pre-configured for hot reload:

```typescript
server: {
  url: "https://YOUR-PROJECT.lovableproject.com?forceHideBadge=true",
  cleartext: true
}
```

This allows you to see changes instantly on the device while developing.

### Syncing Changes

After making code changes in Lovable:

1. Changes automatically push to GitHub
2. On your local machine, pull the changes:
   ```bash
   git pull
   npm run build
   npx cap sync
   ```
3. Run the app again in Xcode/Android Studio

---

## Health Data Types Reference

| Data Type | Apple HealthKit | Android Health Connect |
|-----------|-----------------|------------------------|
| Heart Rate | `HKQuantityTypeIdentifierHeartRate` | `HeartRateRecord` |
| Steps | `HKQuantityTypeIdentifierStepCount` | `StepsRecord` |
| Calories | `HKQuantityTypeIdentifierActiveEnergyBurned` | `ActiveCaloriesBurnedRecord` |
| Workouts | `HKWorkoutType` | `ExerciseSessionRecord` |
| Distance | `HKQuantityTypeIdentifierDistanceWalkingRunning` | `DistanceRecord` |
| Active Minutes | `HKQuantityTypeIdentifierAppleExerciseTime` | `ExerciseSessionRecord` (duration) |

---

## Security Considerations

1. **Data Privacy:** All health data is encrypted in transit and at rest
2. **User Consent:** Users must explicitly grant permission for each data type
3. **Data Retention:** Consider implementing data retention policies
4. **Trainer Access:** Trainers can only see data for their assigned clients
5. **Revocation:** Users can revoke access at any time via Health app settings

---

## Support

For additional help:

- **Capacitor Docs:** https://capacitorjs.com/docs
- **HealthKit Docs:** https://developer.apple.com/documentation/healthkit
- **Health Connect Docs:** https://developer.android.com/health-and-fitness/guides/health-connect
- **Lovable Docs:** https://docs.lovable.dev

---

## Checklist

### Before First Build

- [ ] Exported project to GitHub
- [ ] Cloned repository locally
- [ ] Ran `npm install`
- [ ] Added iOS/Android platforms with `npx cap add`
- [ ] Built and synced with `npm run build && npx cap sync`

### iOS Checklist

- [ ] Enrolled in Apple Developer Program
- [ ] Configured signing in Xcode
- [ ] Added HealthKit capability
- [ ] Updated Info.plist with usage descriptions
- [ ] Tested on physical iPhone

### Android Checklist

- [ ] Installed Android Studio
- [ ] Updated AndroidManifest.xml with Health Connect permissions
- [ ] Set minSdkVersion to 26+
- [ ] Installed Health Connect on test device
- [ ] Tested on physical Android device or emulator

### Before App Store Submission

- [ ] Created App Store Connect / Play Console accounts
- [ ] Prepared app screenshots and descriptions
- [ ] Created privacy policy
- [ ] Completed health data usage declarations
- [ ] Tested all health sync functionality

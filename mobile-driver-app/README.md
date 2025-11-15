# Ordak Driver Mobile App

**Professional delivery management for iOS and Android**

The Ordak Driver mobile app is a cross-platform React Native application that enables delivery drivers to manage their routes, navigate to delivery locations, capture proof of delivery, and provide real-time tracking updates.

## Features

- 🔐 **Secure Authentication** - JWT-based authentication with token refresh
- 📋 **Route Management** - View assigned delivery runs and stops
- 🗺️ **Turn-by-Turn Navigation** - Powered by Mapbox Navigation SDK
- 📍 **Real-Time Tracking** - Background location tracking with server sync
- ✍️ **Proof of Delivery** - Signature capture and photo documentation
- 📱 **Offline Support** - Work seamlessly with poor connectivity
- 🔔 **Push Notifications** - Real-time updates for new assignments
- 📊 **Delivery History** - Track completed deliveries and performance

## Technology Stack

- **Framework**: React Native 0.76.5
- **Language**: TypeScript
- **Navigation**: React Navigation 6.x
- **State Management**: Zustand
- **Maps & Navigation**: Mapbox Maps SDK, Mapbox Navigation SDK
- **Location Services**: React Native Geolocation, Background Geolocation
- **API Client**: Axios with interceptors
- **Storage**: AsyncStorage
- **Image Handling**: React Native Image Picker
- **Signature Capture**: React Native Signature Canvas

## Prerequisites

- Node.js 18+ and npm/yarn
- React Native development environment set up:
  - For iOS: Xcode 14+, CocoaPods
  - For Android: Android Studio, JDK 11+
- Mapbox account with access token
- Backend API server running (see main repository README)

## Installation

### 1. Clone and Navigate

```bash
cd mobile-driver-app
npm install
```

### 2. Configure Environment

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Update the following values:

```env
API_BASE_URL=https://your-api.com/api/v1
MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

### 3. iOS Setup

```bash
cd ios
pod install
cd ..
```

**Configure Info.plist:**

Copy `ios/Info.plist.example` to `ios/OrdakDriver/Info.plist` and update:
- `MBXAccessToken` with your Mapbox token
- App bundle identifier
- Team ID for code signing

### 4. Android Setup

**Configure Gradle:**

1. Copy `android/app/build.gradle.example` to `android/app/build.gradle`
2. Create `android/gradle.properties` and add:

```properties
MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

**Generate Signing Key (for release builds):**

```bash
keytool -genkeypair -v -storetype PKCS12 -keystore ordak-driver-release.keystore -alias ordak-driver -keyalg RSA -keysize 2048 -validity 10000
```

Store the keystore file securely and add to `android/gradle.properties`:

```properties
ORDAK_UPLOAD_STORE_FILE=ordak-driver-release.keystore
ORDAK_UPLOAD_KEY_ALIAS=ordak-driver
ORDAK_UPLOAD_STORE_PASSWORD=***
ORDAK_UPLOAD_KEY_PASSWORD=***
```

## Running the App

### Development

**iOS:**
```bash
npm run ios
# or
npx react-native run-ios --device "iPhone 15"
```

**Android:**
```bash
npm run android
# or
npx react-native run-android
```

### Production Builds

**iOS:**
1. Open `ios/OrdakDriver.xcworkspace` in Xcode
2. Select Product > Archive
3. Upload to App Store Connect

**Android:**
```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

## Project Structure

```
mobile-driver-app/
├── src/
│   ├── screens/           # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── RunDetailsScreen.tsx
│   │   ├── NavigationScreen.tsx
│   │   └── ProofOfDeliveryScreen.tsx
│   ├── components/        # Reusable UI components
│   ├── navigation/        # Navigation configuration
│   ├── services/          # API and business logic
│   │   ├── api.ts        # API client with auth
│   │   ├── auth.service.ts
│   │   ├── runs.service.ts
│   │   ├── orders.service.ts
│   │   └── location.service.ts
│   ├── store/            # State management (Zustand)
│   │   ├── auth.store.ts
│   │   └── runs.store.ts
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Helper functions
│   └── assets/           # Images, fonts, etc.
├── ios/                  # iOS native code
├── android/              # Android native code
└── App.tsx              # App entry point
```

## API Integration

The app connects to the OrdakDelivery backend API. See `src/services/` for API endpoints:

- **Authentication**: `/auth/driver/login`, `/auth/profile`
- **Runs**: `/runs/my-runs`, `/runs/:id/start`, `/runs/:id/complete`
- **Orders**: `/orders/:id`, `/orders/:id/signature`, `/orders/:id/photos`
- **Tracking**: `/tracking/location`

## App Store Submission

### iOS App Store

**Requirements:**
- [ ] Apple Developer Account ($99/year)
- [ ] App Store Connect listing created
- [ ] Privacy Policy URL
- [ ] Support URL
- [ ] App screenshots (6.5", 5.5" displays)
- [ ] App icon (1024x1024px)

**Important Info.plist Keys:**
- `NSLocationAlwaysAndWhenInUseUsageDescription` - Required for background tracking
- `NSCameraUsageDescription` - For proof of delivery photos
- `UIBackgroundModes` - Include `location` for background tracking

**Review Guidelines:**
- Ensure app works without crashing
- Provide test account credentials to Apple
- Clear privacy policy explaining location data usage
- Demonstrate delivery workflow in review notes

### Google Play Store

**Requirements:**
- [ ] Google Play Developer Account ($25 one-time)
- [ ] Play Console listing created
- [ ] Privacy Policy URL
- [ ] App screenshots (phone and tablet)
- [ ] Feature graphic (1024x500px)
- [ ] App icon (512x512px)

**AndroidManifest.xml Permissions:**
- `ACCESS_FINE_LOCATION` - GPS tracking
- `ACCESS_BACKGROUND_LOCATION` - Background tracking (Android 10+)
- `CAMERA` - Proof of delivery photos
- `FOREGROUND_SERVICE_LOCATION` - Required for Android 14+

**Data Safety Section:**
- Location data (precise) - Collected, shared with server
- Personal info (name, email) - Collected for authentication
- Photos - Collected for proof of delivery

## App Store Descriptions

### Short Description (80 chars)
```
Professional delivery management with navigation and proof of delivery
```

### Full Description

```
Ordak Driver is the essential companion app for delivery professionals using the OrdakDelivery platform.

KEY FEATURES:

🗺️ Smart Navigation
• Turn-by-turn directions powered by Mapbox
• Optimized route sequencing
• Real-time traffic updates
• Multiple stop support

📋 Delivery Management
• View all assigned delivery runs
• Track progress in real-time
• Time window management
• Special delivery instructions

✍️ Proof of Delivery
• Digital signature capture
• Photo documentation
• Delivery notes
• Recipient confirmation

📍 Real-Time Tracking
• Background GPS tracking
• Automatic location updates
• ETA calculations
• Customer notifications

📊 Performance Insights
• Delivery history
• Completion statistics
• Route efficiency

REQUIREMENTS:
• Active Ordak Driver account
• Internet connection for real-time updates
• Location services enabled
• Camera access for proof of delivery

Built for professional drivers who demand reliability, efficiency, and ease of use.
```

### Keywords (iOS - 100 chars)
```
delivery,driver,route,navigation,tracking,logistics,courier,dispatch,proof,signature
```

## Screenshots Requirements

### iOS App Store

**iPhone 6.5" Display (1284 x 2778px):**
1. Login screen
2. Dashboard with active delivery
3. Route details with map
4. Turn-by-turn navigation
5. Proof of delivery screen

**iPhone 5.5" Display (1242 x 2208px):**
Same screenshots resized

### Google Play Store

**Phone (1080 x 1920px minimum):**
1-8 screenshots showing key features

**7" Tablet (1024 x 600px):**
1-8 screenshots (optional but recommended)

## Privacy Policy

You must provide a privacy policy covering:

- Location data collection and usage
- Personal information handling
- Data sharing with backend server
- Third-party services (Mapbox)
- Data retention and deletion

Example privacy policy template: See `PRIVACY_POLICY_TEMPLATE.md`

## Testing Checklist

Before submission:

- [ ] Test login/logout flow
- [ ] Verify all screens render correctly
- [ ] Test navigation with live GPS
- [ ] Capture signature and photos
- [ ] Verify background location tracking
- [ ] Test offline/poor connectivity scenarios
- [ ] Check push notifications
- [ ] Verify API error handling
- [ ] Test on multiple device sizes
- [ ] Ensure no crashes or ANRs

## Troubleshooting

### Mapbox Token Issues

If maps don't load:
1. Verify `MAPBOX_ACCESS_TOKEN` in `.env`
2. Check token permissions include Maps SDK and Navigation SDK
3. Ensure token is public (starts with `pk.`)

### Location Not Updating

1. Check permissions granted in Settings
2. Verify background location permission (iOS: Always, Android: All the time)
3. Check `locationService.ts` configuration

### Build Failures

**iOS:**
```bash
cd ios && pod deintegrate && pod install
```

**Android:**
```bash
cd android && ./gradlew clean
```

## Support

For issues related to:
- **App functionality**: Open issue in repository
- **Backend API**: See main repository
- **Mapbox**: https://docs.mapbox.com/

## License

Proprietary software © 2024 Bannoscakes. All rights reserved.

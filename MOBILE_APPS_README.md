# Ordak Driver Mobile Apps

This document provides an overview of the mobile driver applications for iOS and Android.

## Overview

The Ordak Driver mobile app is a professional cross-platform React Native application that enables delivery drivers to:
- View and manage assigned delivery routes
- Navigate to delivery locations with turn-by-turn directions
- Track deliveries in real-time with background GPS
- Capture proof of delivery (signatures and photos)
- Update delivery statuses and communicate with dispatch

## Location

```
/mobile-driver-app/
```

## Technology Stack

- **Framework**: React Native 0.76.5
- **Language**: TypeScript
- **Navigation**: React Navigation 6.x
- **State Management**: Zustand
- **Maps**: Mapbox Maps SDK & Navigation SDK
- **Location**: React Native Geolocation + Background Geolocation
- **API**: Axios with JWT authentication

## Key Features Implemented

### ✅ Authentication & Security
- JWT-based authentication with token refresh
- Secure API client with interceptors
- Encrypted credential storage

### ✅ Route Management
- Dashboard with today's deliveries
- Detailed route views with stop sequencing
- Delivery time windows
- Vehicle and driver information

### ✅ Turn-by-Turn Navigation
- Mapbox-powered navigation
- Real-time GPS tracking
- Interactive map with markers
- Route visualization
- Customer contact integration

### ✅ Proof of Delivery
- Digital signature capture
- Photo documentation
- Delivery notes
- Recipient name collection
- Failed delivery management

### ✅ Real-Time Tracking
- Foreground location tracking (5-second intervals)
- Background location tracking (30-second intervals)
- Automatic server synchronization
- Battery-efficient implementation

### ✅ Offline Support
- AsyncStorage for local data caching
- Graceful offline mode handling
- Automatic sync when reconnected

### ✅ iOS & Android Ready
- Native configurations for both platforms
- App Store submission guidelines included
- Google Play Store setup documented
- All required permissions configured

## Documentation

Comprehensive documentation is included:

| Document | Description |
|----------|-------------|
| **README.md** | Complete app overview and setup |
| **DEVELOPMENT_SETUP.md** | Step-by-step development environment setup |
| **APP_STORE_SUBMISSION_GUIDE.md** | Complete guide for Apple and Google submission |
| **APP_ASSETS_GUIDE.md** | Icon, screenshot, and marketing asset requirements |
| **PRIVACY_POLICY_TEMPLATE.md** | Privacy policy template for app stores |

## Quick Start

### Prerequisites
- Node.js 18+
- For iOS: macOS, Xcode 14+, CocoaPods
- For Android: JDK 11+, Android Studio
- Mapbox account with access token

### Installation

```bash
cd mobile-driver-app
npm install

# iOS
cd ios && pod install && cd ..

# Configure .env
cp .env.example .env
# Add your MAPBOX_ACCESS_TOKEN and API_BASE_URL
```

### Running

```bash
# iOS
npm run ios

# Android
npm run android
```

## Project Structure

```
mobile-driver-app/
├── src/
│   ├── screens/              # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── RunDetailsScreen.tsx
│   │   ├── NavigationScreen.tsx
│   │   └── ProofOfDeliveryScreen.tsx
│   ├── components/           # Reusable UI components
│   ├── navigation/           # Navigation configuration
│   ├── services/            # API and business logic
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   ├── runs.service.ts
│   │   ├── orders.service.ts
│   │   └── location.service.ts
│   ├── store/               # State management (Zustand)
│   ├── types/               # TypeScript definitions
│   └── utils/               # Helper functions
├── ios/                     # iOS native code
├── android/                 # Android native code
├── .env.example             # Environment template
├── App.tsx                  # App entry point
└── package.json             # Dependencies
```

## API Integration

The mobile app integrates with the OrdakDelivery backend:

- **Authentication**: `/auth/driver/login`, `/auth/profile`
- **Runs**: `/runs/my-runs`, `/runs/:id/start`, `/runs/:id/complete`
- **Orders**: `/orders/:id`, update status, upload proof
- **Tracking**: `/tracking/location` for real-time GPS updates

## App Store Status

### iOS App Store
- ✅ App configuration complete
- ✅ Info.plist with all permissions
- ✅ Mapbox SDK integrated
- ✅ Submission guide created
- ⏳ Pending: Generate app icons
- ⏳ Pending: Create screenshots
- ⏳ Pending: Submit for review

### Google Play Store
- ✅ Android configuration complete
- ✅ AndroidManifest with permissions
- ✅ Gradle build configuration
- ✅ Signing setup documented
- ⏳ Pending: Generate app icons
- ⏳ Pending: Create screenshots
- ⏳ Pending: Submit for review

## Best Practices Implemented

### Security
- ✅ JWT authentication with refresh tokens
- ✅ Secure credential storage
- ✅ HTTPS API communication
- ✅ Input validation
- ✅ Permission handling

### Performance
- ✅ Optimized location tracking
- ✅ Efficient background services
- ✅ Image compression for uploads
- ✅ Lazy loading components
- ✅ Memoization for expensive renders

### User Experience
- ✅ Intuitive navigation
- ✅ Clear visual feedback
- ✅ Loading states
- ✅ Error handling
- ✅ Offline mode support

### Code Quality
- ✅ TypeScript for type safety
- ✅ ESLint for code quality
- ✅ Prettier for formatting
- ✅ Consistent code structure
- ✅ Comprehensive error handling

## Screenshots Preview

The app includes these key screens:

1. **Login Screen** - Secure authentication with email/password
2. **Dashboard** - Today's runs, active deliveries, quick actions
3. **Run Details** - Stop list, progress tracking, route info
4. **Navigation** - Map view with turn-by-turn directions
5. **Proof of Delivery** - Signature capture, photos, notes

## Deployment Checklist

### Before Submitting

- [ ] Test on physical iOS device
- [ ] Test on physical Android device
- [ ] Verify all permissions work
- [ ] Test background location tracking
- [ ] Test offline mode
- [ ] Capture professional screenshots
- [ ] Create app icons (all sizes)
- [ ] Write privacy policy
- [ ] Create test account for reviewers
- [ ] Complete app store listings
- [ ] Set up analytics (optional)
- [ ] Configure crash reporting (optional)

### iOS Specific
- [ ] Configure signing certificates
- [ ] Set up App Store Connect listing
- [ ] Generate all icon sizes
- [ ] Create 6.7", 6.5", and 5.5" screenshots
- [ ] Write App Store description
- [ ] Submit for review

### Android Specific
- [ ] Generate release keystore
- [ ] Create Play Console listing
- [ ] Generate adaptive icons
- [ ] Create phone and tablet screenshots
- [ ] Design feature graphic (1024x500px)
- [ ] Complete Data Safety section
- [ ] Submit for review

## Next Steps

1. **Complete app assets** - Icons and screenshots
2. **Create privacy policy** - Based on template
3. **Set up developer accounts** - Apple ($99/yr), Google ($25 one-time)
4. **Test thoroughly** - All features on real devices
5. **Submit to stores** - Follow submission guides
6. **Monitor feedback** - Respond to reviews
7. **Plan updates** - Regular improvements

## Support & Maintenance

### Ongoing Tasks
- Monitor crash reports
- Respond to user reviews
- Update for new OS versions
- Add requested features
- Fix bugs promptly

### Useful Resources
- React Native Docs: https://reactnative.dev/
- Mapbox SDK: https://docs.mapbox.com/
- App Store Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Play Store Policies: https://play.google.com/about/developer-content-policy/

## License

Proprietary software © 2024 Bannoscakes. All rights reserved.

---

For detailed setup and development instructions, see `/mobile-driver-app/README.md`

For app store submission help, see `/mobile-driver-app/APP_STORE_SUBMISSION_GUIDE.md`

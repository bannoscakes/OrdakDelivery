# Ordak Driver Development Setup Guide

Complete guide for setting up the development environment for the Ordak Driver mobile app.

## Prerequisites

### Required Software

1. **Node.js and npm**
   - Version: 18.x or higher
   - Download: https://nodejs.org/
   - Verify: `node --version && npm --version`

2. **Git**
   - Download: https://git-scm.com/
   - Verify: `git --version`

3. **Code Editor**
   - Recommended: Visual Studio Code
   - Download: https://code.visualstudio.com/

### For iOS Development

1. **macOS**
   - Required for iOS development
   - Version: macOS 12.0 or later

2. **Xcode**
   - Version: 14.0 or later
   - Install from Mac App Store
   - Verify: `xcodebuild -version`

3. **CocoaPods**
   ```bash
   sudo gem install cocoapods
   pod --version
   ```

4. **Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```

### For Android Development

1. **Java Development Kit (JDK)**
   - Version: JDK 11 (recommended)
   - Download: https://adoptium.net/
   - Verify: `java --version`

2. **Android Studio**
   - Download: https://developer.android.com/studio
   - Install Android SDK
   - Set up Android emulator

3. **Environment Variables**

   Add to `.bash_profile`, `.zshrc`, or `.bashrc`:

   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```

   Reload: `source ~/.zshrc`

## Project Setup

### 1. Clone Repository

```bash
git clone https://github.com/bannoscakes/OrdakDelivery.git
cd OrdakDelivery/mobile-driver-app
```

### 2. Install Dependencies

```bash
npm install
```

This will install all React Native dependencies listed in `package.json`.

### 3. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Update values in `.env`:

```env
# API Configuration
API_BASE_URL=http://localhost:3000/api/v1  # or your backend URL
API_TIMEOUT=30000

# Mapbox Configuration
MAPBOX_ACCESS_TOKEN=pk.ey...  # Your Mapbox public token
MAPBOX_STYLE_URL=mapbox://styles/mapbox/streets-v12

# App Configuration
APP_NAME=Ordak Driver
ENVIRONMENT=development

# Location Services
LOCATION_UPDATE_INTERVAL=5000
BACKGROUND_LOCATION_INTERVAL=30000
```

**Get Mapbox Token:**
1. Sign up at https://account.mapbox.com/
2. Go to Access Tokens
3. Create new token with these scopes:
   - ✓ Maps SDK for Mobile
   - ✓ Directions API
   - ✓ Navigation SDK
4. Copy public token (starts with `pk.`)

### 4. iOS Setup

```bash
cd ios
pod install
cd ..
```

**Configure Info.plist:**

1. Navigate to `ios/OrdakDriver/Info.plist`
2. Update the following keys:
   - `MBXAccessToken` - Your Mapbox token
   - `CFBundleDisplayName` - "Ordak Driver"
   - `CFBundleIdentifier` - Your bundle ID

**Signing:**

1. Open `ios/OrdakDriver.xcworkspace` in Xcode
2. Select OrdakDriver target
3. Go to "Signing & Capabilities"
4. Select your Team
5. Xcode will automatically manage signing

### 5. Android Setup

**Update gradle.properties:**

Create `android/gradle.properties`:

```properties
# Mapbox
MAPBOX_ACCESS_TOKEN=your_token_here

# App Signing (for development)
android.useAndroidX=true
android.enableJetifier=true

# Gradle optimization
org.gradle.jvmargs=-Xmx2048m -XX:MaxPermSize=512m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8
org.gradle.parallel=true
org.gradle.configureondemand=true
org.gradle.daemon=true
```

**Generate Debug Keystore** (if not exists):

```bash
keytool -genkey -v -keystore android/app/debug.keystore -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -storepass android -keypass android
```

## Running the App

### Start Metro Bundler

In one terminal:

```bash
npm start
```

This starts the Metro bundler that bundles JavaScript code.

### Run on iOS

**Simulator:**

```bash
npm run ios
# or specify simulator
npx react-native run-ios --simulator="iPhone 15 Pro"
```

**Physical Device:**

1. Connect iPhone via USB
2. Trust computer on device
3. Run:
   ```bash
   npx react-native run-ios --device "Your iPhone Name"
   ```

### Run on Android

**Emulator:**

1. Start Android emulator from Android Studio
2. Run:
   ```bash
   npm run android
   ```

**Physical Device:**

1. Enable Developer Mode on Android device
2. Enable USB Debugging
3. Connect via USB
4. Verify: `adb devices`
5. Run:
   ```bash
   npm run android
   ```

## Development Workflow

### Hot Reloading

- **iOS**: Cmd + D in simulator > Enable Fast Refresh
- **Android**: Cmd + M in emulator > Enable Fast Refresh

Changes to code will automatically reload.

### Debugging

**React Native Debugger:**

1. Install: https://github.com/jhen0409/react-native-debugger
2. Open debugger (port 8081)
3. In app: Cmd/Ctrl + D > Debug

**Chrome DevTools:**

1. In app: Cmd/Ctrl + D > Debug
2. Opens Chrome with debugger

**Console Logs:**

```bash
# iOS
npx react-native log-ios

# Android
npx react-native log-android
```

### Inspecting Elements

**In-app:**
- Cmd/Ctrl + D > Toggle Inspector

### Redux DevTools (if using Redux)

Connect React Native Debugger with Redux DevTools for state inspection.

## Common Development Tasks

### Add New Dependency

```bash
npm install package-name
cd ios && pod install && cd ..  # if has native code
```

### Clear Cache

```bash
# Clear Metro cache
npm start --reset-cache

# Clear all caches
rm -rf node_modules
rm -rf ios/Pods
npm install
cd ios && pod install
```

### Reset Simulator/Emulator

**iOS:**
```bash
xcrun simctl erase all
```

**Android:**
```bash
adb shell pm clear com.ordakdriver
```

## Code Quality

### Linting

```bash
npm run lint
```

Fix automatically:
```bash
npm run lint -- --fix
```

### Type Checking

```bash
npm run type-check
```

### Formatting

```bash
npm run format
```

### Pre-commit Hooks (Optional)

Install Husky:

```bash
npm install --save-dev husky
npx husky install
npx husky add .git/hooks/pre-commit "npm run lint && npm run type-check"
```

## Testing

### Unit Tests

```bash
npm test
```

Watch mode:
```bash
npm test -- --watch
```

### E2E Tests (if configured)

```bash
# Detox example
npm run e2e:ios
npm run e2e:android
```

## Troubleshooting

### Metro Bundler Issues

```bash
# Kill existing Metro processes
lsof -ti:8081 | xargs kill -9

# Restart
npm start --reset-cache
```

### iOS Build Failures

```bash
cd ios
rm -rf Pods Podfile.lock
pod cache clean --all
pod deintegrate
pod install
cd ..
```

### Android Build Failures

```bash
cd android
./gradlew clean
cd ..
```

### CocoaPods Issues

```bash
sudo gem install cocoapods
pod repo update
cd ios
pod install
```

### Module Not Found

```bash
rm -rf node_modules package-lock.json
npm install
```

### Mapbox Not Loading

1. Verify `MAPBOX_ACCESS_TOKEN` in `.env`
2. Restart Metro bundler
3. Clear app cache and rebuild
4. Check token permissions on Mapbox dashboard

### Location Not Working

**iOS:**
- Check Info.plist has location usage descriptions
- Verify location permission in Settings

**Android:**
- Check AndroidManifest.xml has location permissions
- Grant location permission in Settings
- For Android 10+, select "Allow all the time" for background

## Project Structure

```
mobile-driver-app/
├── android/              # Android native code
├── ios/                  # iOS native code
├── src/
│   ├── screens/         # Screen components
│   ├── components/      # Reusable components
│   ├── navigation/      # Navigation setup
│   ├── services/        # API and business logic
│   ├── store/           # State management
│   ├── types/           # TypeScript types
│   ├── utils/           # Helper functions
│   └── assets/          # Images, fonts
├── .env                 # Environment variables
├── App.tsx              # App entry point
├── package.json         # Dependencies
└── tsconfig.json        # TypeScript config
```

## Backend Setup

The mobile app requires the OrdakDelivery backend to be running.

### Local Backend

```bash
cd ../  # Back to root directory
npm install
npm run dev
```

Backend should run on http://localhost:3000

Update `.env` in mobile app:
```env
API_BASE_URL=http://localhost:3000/api/v1
```

**Note**: On physical devices, use your computer's IP instead of localhost:
```env
API_BASE_URL=http://192.168.1.100:3000/api/v1
```

## Useful VS Code Extensions

- **ES7+ React/Redux/React-Native snippets** - Code snippets
- **React Native Tools** - Debugging and IntelliSense
- **ESLint** - Linting
- **Prettier** - Code formatting
- **GitLens** - Git integration
- **Auto Rename Tag** - HTML/JSX tag renaming
- **Path Intellisense** - Path autocomplete

## Resources

- **React Native Docs**: https://reactnative.dev/docs/getting-started
- **React Navigation**: https://reactnavigation.org/docs/getting-started
- **Mapbox SDK**: https://docs.mapbox.com/ios/maps/guides/
- **TypeScript**: https://www.typescriptlang.org/docs/

## Getting Help

- Check existing issues: https://github.com/bannoscakes/OrdakDelivery/issues
- Stack Overflow: Tag with `react-native`
- React Native Community: https://reactnative.dev/community/overview

## Next Steps

1. **Run the app**: Follow "Running the App" section
2. **Explore code**: Start with `App.tsx` and navigation
3. **Make changes**: Try modifying a screen
4. **Test features**: Login, view runs, test navigation
5. **Read docs**: Review main README.md for features

Happy coding! 🚀

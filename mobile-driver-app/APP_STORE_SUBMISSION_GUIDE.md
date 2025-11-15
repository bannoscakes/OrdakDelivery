# App Store Submission Guide

Complete guide for submitting Ordak Driver to Apple App Store and Google Play Store.

## Apple App Store Submission

### Prerequisites

1. **Apple Developer Account** ($99/year)
   - Enroll at: https://developer.apple.com/programs/enroll/
   - Wait for approval (can take 24-48 hours)

2. **App Store Connect Access**
   - Login to: https://appstoreconnect.apple.com/
   - Accept agreements

3. **Development Environment**
   - macOS with Xcode 14+
   - Valid provisioning profile and certificates

### Step 1: Configure App in Xcode

1. Open `ios/OrdakDriver.xcworkspace` in Xcode
2. Select OrdakDriver target
3. Go to "Signing & Capabilities"
4. Set Team to your Apple Developer Team
5. Update Bundle Identifier: `com.bannoscakes.ordakdriver`
6. Enable capabilities:
   - Background Modes (Location updates)
   - Push Notifications (optional)

### Step 2: Create App Store Connect Listing

1. Go to App Store Connect > My Apps
2. Click "+" > New App
3. Fill in details:
   - **Platform**: iOS
   - **Name**: Ordak Driver
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: Select from dropdown
   - **SKU**: `ordak-driver-ios`

### Step 3: Prepare App Information

**App Information:**
- **Category**: Business
- **Secondary Category**: Navigation (optional)
- **Content Rights**: No
- **Age Rating**: 4+ (No objectionable content)

**Privacy Policy URL:**
```
https://your-domain.com/privacy-policy
```

**Support URL:**
```
https://your-domain.com/support
```

### Step 4: Prepare Screenshots

Required screenshot sizes:

**iPhone 6.7" Display (1290 x 2796px):**
- 3-10 screenshots
- Recommended: 5 screenshots showing key features

**iPhone 6.5" Display (1284 x 2778px):**
- Same set as 6.7" (can be resized)

**iPhone 5.5" Display (1242 x 2208px):**
- Same set (required for older devices)

**Recommended Screenshots:**
1. Dashboard with active delivery (hero shot)
2. Turn-by-turn navigation with map
3. Route details showing stops
4. Proof of delivery with signature
5. Delivery history/stats

**Tools:**
- Screenshots.pro (automatic resizing)
- Figma (design screenshots)
- Xcode Simulator + CMD+S

### Step 5: Prepare App Preview (Optional)

- 15-30 second video demo
- Shows app in action
- No audio required
- Same sizes as screenshots

### Step 6: Set App Icon

Create app icon in all required sizes:

**iOS Icon Sizes:**
- 1024x1024px (App Store)
- 180x180px (iPhone @3x)
- 120x120px (iPhone @2x)
- 87x87px (iPad Pro @3x)
- 80x80px (iPad @2x)
- 76x76px (iPad)
- 60x60px (iPhone)
- 58x58px (Settings @2x)
- 40x40px (Spotlight)
- 29x29px (Settings)
- 20x20px (Notification)

**Tool**: Use Asset Catalog Creator or https://appicon.co/

### Step 7: Build and Archive

1. In Xcode, select "Any iOS Device (arm64)"
2. Product > Archive
3. Wait for build to complete
4. In Organizer, select archive
5. Click "Distribute App"
6. Choose "App Store Connect"
7. Upload build

### Step 8: Complete Listing

**App Description:**
```
Ordak Driver is the essential companion app for delivery professionals using the OrdakDelivery platform.

KEY FEATURES:
• Turn-by-turn navigation powered by Mapbox
• Real-time delivery tracking
• Digital proof of delivery with signature capture
• Optimized route management
• Delivery history and performance metrics

Built for professional drivers who demand reliability and efficiency.
```

**Keywords (100 chars max):**
```
delivery,driver,route,navigation,tracking,logistics,courier,dispatch,proof,signature
```

**Promotional Text (170 chars):**
```
Navigate smarter, deliver faster. Professional delivery management with turn-by-turn navigation, real-time tracking, and digital proof of delivery.
```

**What's New (4000 chars):**
```
Welcome to Ordak Driver 1.0!

This is our initial release with all the essential features delivery professionals need:

🗺️ Smart Navigation
• Turn-by-turn directions
• Real-time traffic updates
• Multi-stop optimization

📋 Delivery Management
• View assigned routes
• Track delivery progress
• Manage time windows

✍️ Proof of Delivery
• Digital signature capture
• Photo documentation
• Delivery notes

Thank you for choosing Ordak Driver!
```

### Step 9: Complete App Privacy

**Data Collection:**

| Data Type | Purpose | Linked to User | Used for Tracking |
|-----------|---------|----------------|-------------------|
| Precise Location | App Functionality | Yes | No |
| Name | Account Creation | Yes | No |
| Email Address | Account Creation | Yes | No |
| Phone Number | Account Creation | Yes | No |
| Photos | App Functionality | Yes | No |

**Privacy Practices:**
- Data is used to provide the service
- Data is not sold to third parties
- Data may be shared with Mapbox for navigation
- Users can request data deletion

### Step 10: Submit for Review

1. Select build version
2. Add version information
3. Set release options (Manual or Automatic)
4. Export compliance: No encryption
5. Advertising identifier: Not used
6. Content rights: No

**Review Notes:**
```
Test Account:
Email: driver.test@ordakdelivery.com
Password: TestDriver123!

IMPORTANT TESTING NOTES:

1. This app requires an active delivery run assignment to demonstrate full functionality.
2. We have created a test account with a pre-assigned delivery route.
3. To test navigation: Tap "Dashboard" > Select the active delivery > Tap "Start Delivery Run"
4. The app will request location permissions - these are essential for the navigation feature.
5. Background location is used to track deliveries even when the app is minimized.

Feel free to contact support@ordakdelivery.com for any questions.
```

6. Submit for Review

### Step 11: Review Process

- **Initial Review**: 24-48 hours
- **Status**: Check App Store Connect
- **Common Rejections**:
  - Missing/unclear privacy policy
  - Crash on launch
  - Broken features
  - Missing functionality explanation
  - Test account doesn't work

---

## Google Play Store Submission

### Prerequisites

1. **Google Play Developer Account** ($25 one-time)
   - Create at: https://play.google.com/console/signup
   - Pay registration fee

2. **Development Environment**
   - Android Studio installed
   - Signing key generated

### Step 1: Generate Signed Bundle

```bash
cd android
./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

### Step 2: Create App in Play Console

1. Go to: https://play.google.com/console/
2. Click "Create app"
3. Fill details:
   - **App name**: Ordak Driver
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free
4. Accept declarations
5. Create app

### Step 3: Set Up App Content

**App access:**
- All functionality is available without restrictions
- Provide test login credentials

**Ads:**
- No, this app does not contain ads

**Content rating:**
- Complete questionnaire
- Expected rating: Everyone

**Target audience:**
- Age: 18+
- Appeals to children: No

**News app:**
- No

**COVID-19 contact tracing:**
- No

**Data safety:**

| Data Type | Collection | Sharing | Purpose |
|-----------|------------|---------|---------|
| Precise location | Yes | Yes | App functionality, Analytics |
| Name | Yes | No | Account management |
| Email | Yes | No | Account management |
| Phone number | Yes | No | Account management |
| Photos | Yes | No | App functionality |

**Privacy Policy URL:**
```
https://your-domain.com/privacy-policy
```

### Step 4: Prepare Store Listing

**App details:**
- **Short description** (80 chars):
```
Professional delivery management with navigation and proof of delivery
```

- **Full description** (4000 chars):
```
Ordak Driver is the essential companion app for delivery professionals using the OrdakDelivery platform.

🗺️ SMART NAVIGATION
Navigate efficiently with turn-by-turn directions powered by Mapbox. Get real-time traffic updates and optimized routes for multiple stops.

📋 DELIVERY MANAGEMENT
• View all assigned delivery runs
• Track progress in real-time
• Manage delivery time windows
• Access special delivery instructions
• Multi-stop route optimization

✍️ PROOF OF DELIVERY
Capture comprehensive proof of delivery with:
• Digital signature pad
• Photo documentation
• Delivery notes
• Recipient confirmation

📍 REAL-TIME TRACKING
• Background GPS tracking for accurate ETAs
• Automatic location updates to dispatch
• Customer notification triggers
• Battery-efficient location services

📊 PERFORMANCE INSIGHTS
• Complete delivery history
• Completion statistics
• Route efficiency metrics
• Performance tracking

🔐 SECURE & RELIABLE
• Enterprise-grade security
• Encrypted data transmission
• Secure authentication
• Privacy-focused design

REQUIREMENTS:
• Active Ordak Driver account
• Internet connection for real-time updates
• Location services enabled
• Camera access for proof of delivery photos

Built for professional drivers who demand reliability, efficiency, and ease of use. Ordak Driver helps you deliver more, faster, and with complete accuracy.

Download now and transform your delivery workflow!
```

**App icon:**
- 512 x 512px PNG
- 32-bit PNG with alpha
- Max 1024KB

**Feature graphic:**
- 1024 x 500px JPG or PNG
- Showcases app on Play Store

**Phone screenshots:**
- 2-8 screenshots
- 16:9 or 9:16 aspect ratio
- Minimum: 320px
- Maximum: 3840px

**7-inch tablet screenshots (optional):**
- Same requirements
- Shows tablet-optimized UI

**10-inch tablet screenshots (optional):**
- Same requirements

### Step 5: Set Up Release

**Internal testing (optional):**
- Upload AAB
- Add test email addresses
- Test before production

**Closed testing (optional):**
- Create testing track
- Add testers
- Gather feedback

**Production:**
1. Go to "Production" > "Create new release"
2. Upload AAB file
3. Set release name: `1.0.0`
4. Write release notes:

```
Welcome to Ordak Driver 1.0!

This is our initial release featuring:
✓ Turn-by-turn navigation with Mapbox
✓ Real-time delivery tracking
✓ Digital proof of delivery
✓ Route optimization
✓ Delivery history

Thank you for choosing Ordak Driver!
```

5. Review release summary
6. Click "Save" then "Review release"

### Step 6: Submit for Review

**Review checklist:**
- [ ] App content complete
- [ ] Store listing complete
- [ ] Pricing & distribution set
- [ ] Release created
- [ ] All warnings resolved

**Countries/regions:**
- Select target countries (or all)

**Test instructions:**
```
Test Credentials:
Email: driver.test@ordakdelivery.com
Password: TestDriver123!

Testing Notes:
1. Login with test account
2. Navigate to Dashboard
3. Select active delivery run
4. Start delivery to test navigation
5. Complete delivery with signature/photo
6. Location permissions are required for core functionality

Support: support@ordakdelivery.com
```

**Send for review**

### Step 7: Review Process

- **Review time**: 1-7 days (usually 2-3 days)
- **Track status**: Play Console > Dashboard
- **Common rejections**:
  - Privacy policy issues
  - Inappropriate content
  - Broken functionality
  - Misleading description
  - Missing permissions explanation

---

## Post-Approval Checklist

After both apps are approved:

- [ ] Verify apps appear in stores
- [ ] Test download and installation
- [ ] Monitor crash reports
- [ ] Respond to user reviews
- [ ] Track analytics
- [ ] Plan updates

## App Store Optimization (ASO)

**Monitor:**
- Keyword rankings
- Download trends
- Conversion rate
- User ratings
- Review sentiment

**Optimize:**
- Update keywords based on performance
- A/B test screenshots
- Refresh description
- Respond to reviews
- Regular updates

## Compliance

**GDPR (Europe):**
- Privacy policy with data rights
- Data deletion capability
- Consent for data processing

**CCPA (California):**
- Privacy policy disclosure
- Do not sell option

**Other regulations:**
- Check local requirements
- Update policies as needed

## Support

For submission issues:
- **Apple**: https://developer.apple.com/contact/
- **Google**: https://support.google.com/googleplay/android-developer/

## Version Updates

For subsequent updates:
1. Increment version in `package.json`
2. Update iOS version in Xcode
3. Update Android versionCode and versionName
4. Build and upload new version
5. Add "What's New" notes
6. Submit for review

---

**Good luck with your submission! 🚀**

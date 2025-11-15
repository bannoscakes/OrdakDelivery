# App Assets Guide

Complete guide for creating app icons, screenshots, and marketing assets for the Ordak Driver mobile app.

## App Icon Requirements

### iOS App Store

**Icon Sizes Required:**

| Size | Usage | Pixels |
|------|-------|--------|
| 1024x1024 | App Store | 1024x1024px |
| 180x180 | iPhone @3x | 180x180px |
| 120x120 | iPhone @2x | 120x120px |
| 167x167 | iPad Pro @2x | 167x167px |
| 152x152 | iPad @2x | 152x152px |
| 76x76 | iPad | 76x76px |
| 60x60 | iPhone | 60x60px |
| 40x40 | Spotlight @2x | 40x40px |
| 29x29 | Settings | 29x29px |
| 20x20 | Notification | 20x20px |

**Requirements:**
- Format: PNG (no transparency)
- Color space: sRGB or P3
- No alpha channel
- No rounded corners (iOS adds them automatically)

### Android (Google Play)

**Icon Sizes Required:**

| Size | Usage | Pixels |
|------|-------|--------|
| 512x512 | Play Store | 512x512px |
| 192x192 | xxxhdpi | 192x192px |
| 144x144 | xxhdpi | 144x144px |
| 96x96 | xhdpi | 96x96px |
| 72x72 | hdpi | 72x72px |
| 48x48 | mdpi | 48x48px |

**Requirements:**
- Format: PNG with transparency (for adaptive icons)
- 32-bit PNG with alpha
- Max file size: 1024KB

**Adaptive Icon:**
- Foreground layer: 108x108dp (with 18dp safe zone)
- Background layer: 108x108dp
- Maskable area: 66x66dp circle in center

### Icon Design Guidelines

**Recommended Design:**

```
┌─────────────────┐
│    🚚          │  ← Delivery truck icon
│                 │
│   ORDAK         │  ← App name (optional)
│                 │
└─────────────────┘
```

**Design Principles:**
- **Simple**: Recognizable at small sizes
- **Distinctive**: Stands out in app grid
- **Relevant**: Represents delivery/logistics
- **Consistent**: Matches brand colors

**Color Scheme:**
- Primary: #2196F3 (Blue - Navigation)
- Secondary: #4CAF50 (Green - Delivery success)
- Accent: #FF9800 (Orange - Active delivery)

**Design Tools:**
- Adobe Illustrator / Photoshop
- Figma: https://figma.com
- Sketch
- Free tool: https://appicon.co/ (auto-generates all sizes)

## Screenshots

### iOS App Store

**Required Sizes:**

| Display | Resolution | Aspect Ratio |
|---------|-----------|--------------|
| 6.7" (iPhone 14 Pro Max) | 1290 x 2796px | 19.5:9 |
| 6.5" (iPhone 11 Pro Max) | 1242 x 2688px | 19.5:9 |
| 5.5" (iPhone 8 Plus) | 1242 x 2208px | 16:9 |

**Requirements:**
- Format: PNG or JPEG
- Color space: sRGB or P3
- Number: 1-10 screenshots (recommended: 5-6)
- First 2-3 are most important (shown in search)

**Recommended Screenshots:**

1. **Hero Shot - Active Delivery**
   - Dashboard with active delivery card
   - Shows delivery count, progress
   - Call-to-action visible

2. **Turn-by-Turn Navigation**
   - Map view with route
   - Current location marker
   - Delivery stops marked
   - Bottom card showing customer info

3. **Route Details**
   - List of delivery stops
   - Progress indicator
   - Customer addresses
   - Time windows

4. **Proof of Delivery**
   - Signature capture interface
   - Photo upload option
   - Professional, clean UI

5. **Delivery History**
   - Completed deliveries
   - Performance stats
   - Professional dashboard

### Android (Google Play)

**Required Sizes:**

| Type | Minimum | Maximum | Aspect Ratio |
|------|---------|---------|--------------|
| Phone | 320px | 3840px | 16:9 or 9:16 |
| 7" Tablet | 320px | 3840px | 16:9 or 9:16 |
| 10" Tablet | 1024px | 3840px | 16:9 or 9:16 |

**Recommended Resolution:**
- Phone: 1080 x 1920px (portrait)
- Tablet 7": 1200 x 1920px
- Tablet 10": 1600 x 2560px

**Requirements:**
- Format: PNG or JPEG
- Number: 2-8 screenshots (recommended: 5-6)
- Same screenshots as iOS (resized if needed)

### Screenshot Design Tips

**Best Practices:**

1. **Show Real Content**
   - Use realistic delivery data
   - Actual map with routes
   - Professional appearance

2. **Add Context**
   - Feature titles above screenshots
   - Short benefit descriptions
   - Call-to-action text

3. **Consistent Style**
   - Same device frame (optional)
   - Consistent background
   - Branded elements

4. **Highlight Features**
   - Arrows pointing to key features
   - Annotations explaining benefits
   - Visual hierarchy

**Example Layout:**

```
┌─────────────────────────┐
│  Navigate with Ease    │ ← Feature title
├─────────────────────────┤
│                         │
│   [App Screenshot]      │ ← Actual screenshot
│                         │
├─────────────────────────┤
│ Turn-by-turn directions │ ← Benefit description
│ powered by Mapbox       │
└─────────────────────────┘
```

**Tools:**
- **Screenshot Capture**: Xcode Simulator, Android Studio
- **Design**: Figma templates, Sketch, Photoshop
- **Auto-generation**: https://www.appscreenshots.io/
- **Device Frames**: https://www.screely.com/

## Feature Graphic (Android)

**Size**: 1024 x 500px

**Requirements:**
- Format: PNG or JPEG
- Max file size: 1024KB
- No transparency

**Purpose:**
- Displayed at top of Play Store listing
- First impression for users
- Should showcase app's value

**Design Example:**

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  [Truck Icon]  ORDAK DRIVER                     │
│                                                  │
│  Professional Delivery Management               │
│                                                  │
│  ✓ Turn-by-Turn     ✓ Real-Time      ✓ Proof  │
│    Navigation         Tracking         of Delivery│
│                                                  │
└──────────────────────────────────────────────────┘
```

## Promo Video (Optional)

### iOS App Store

**Requirements:**
- Duration: 15-30 seconds
- Format: .mov, .m4v, or .mp4
- Resolution: Same as screenshot sizes
- Codec: H.264

**Content Ideas:**
1. Quick app walkthrough
2. Key features demonstration
3. Login → View Routes → Navigate → Deliver
4. Professional, engaging

### Google Play Store

Similar requirements, uploaded separately from screenshots.

## Marketing Assets

### Social Media

**Profile Picture (Square):**
- Size: 400 x 400px
- Just the app icon or logo

**Cover/Banner:**
- Facebook: 820 x 312px
- Twitter: 1500 x 500px
- LinkedIn: 1128 x 191px

**Post Images:**
- Instagram: 1080 x 1080px (square), 1080 x 1350px (portrait)
- Facebook: 1200 x 630px
- Twitter: 1200 x 675px

### Website

**Hero Image:**
- Size: 1920 x 1080px
- Shows app in use with real device mockup

**App Store Badges:**

**iOS:**
```html
<a href="[App Store URL]">
  <img src="app-store-badge.svg" alt="Download on App Store">
</a>
```
Download: https://developer.apple.com/app-store/marketing/guidelines/

**Android:**
```html
<a href="[Play Store URL]">
  <img src="google-play-badge.png" alt="Get it on Google Play">
</a>
```
Download: https://play.google.com/intl/en_us/badges/

## Asset Organization

Recommended folder structure:

```
assets/
├── app-icons/
│   ├── ios/
│   │   ├── AppIcon.appiconset/
│   │   └── source.png (1024x1024)
│   └── android/
│       ├── mipmap-xxxhdpi/
│       ├── mipmap-xxhdpi/
│       ├── mipmap-xhdpi/
│       └── mipmap-hdpi/
├── screenshots/
│   ├── ios/
│   │   ├── 6.7-inch/
│   │   ├── 6.5-inch/
│   │   └── 5.5-inch/
│   └── android/
│       ├── phone/
│       ├── 7-inch-tablet/
│       └── 10-inch-tablet/
├── feature-graphic/
│   └── google-play-feature.png
├── promo-video/
│   ├── ios-preview.mp4
│   └── android-promo.mp4
└── marketing/
    ├── social-media/
    └── website/
```

## Generating Assets

### Automated Tools

**Icon Generation:**
```bash
# Using appicon.co
1. Upload 1024x1024 master icon
2. Select iOS and Android
3. Download zip
4. Extract to project
```

**Screenshot Generation:**
```bash
# Using Fastlane (advanced)
gem install fastlane
fastlane snapshot
```

### Manual Process

**iOS Icons:**
1. Create 1024x1024 PNG
2. Use Xcode Asset Catalog
3. Drag to AppIcon set
4. Xcode generates all sizes

**Android Icons:**
1. Right-click `res` in Android Studio
2. New > Image Asset
3. Upload source icon
4. Generates all densities

**Screenshots:**
1. Run app in simulator/emulator
2. Navigate to each screen
3. Cmd+S (iOS) or Screenshot button (Android)
4. Crop and resize as needed

## Quality Checklist

Before submission:

**App Icon:**
- [ ] High resolution (1024x1024 for iOS, 512x512 for Android)
- [ ] No transparency (iOS)
- [ ] Looks good at small sizes
- [ ] Matches brand guidelines
- [ ] All required sizes generated

**Screenshots:**
- [ ] Show real, attractive content
- [ ] All required sizes provided
- [ ] No placeholder text ("Lorem ipsum")
- [ ] High quality (not blurry)
- [ ] Consistent across all screenshots
- [ ] Feature annotations are clear
- [ ] Text is readable

**Feature Graphic (Android):**
- [ ] Exactly 1024 x 500px
- [ ] Showcases app value
- [ ] Professional design
- [ ] No typos

**Video (if applicable):**
- [ ] Under 30 seconds
- [ ] Shows key features
- [ ] Professional quality
- [ ] Correct resolution

## Design Resources

**Free Tools:**
- **Figma**: https://figma.com (collaborative design)
- **GIMP**: https://gimp.org (Photoshop alternative)
- **Inkscape**: https://inkscape.org (vector graphics)
- **Canva**: https://canva.com (templates)

**Icon Resources:**
- **Material Icons**: https://fonts.google.com/icons
- **Iconmonstr**: https://iconmonstr.com/
- **Flaticon**: https://flaticon.com/

**Mockup Tools:**
- **Mockuphone**: https://mockuphone.com/
- **Smartmockups**: https://smartmockups.com/
- **Previewed**: https://previewed.app/

**Screenshot Templates:**
- **App Mockup**: https://app-mockup.com/
- **Screely**: https://screely.com/
- **PlaceIt**: https://placeit.net/

## Brand Guidelines

**Logo Usage:**
- Don't stretch or distort
- Maintain minimum clear space
- Use approved color variations only

**Colors:**
- Primary: #2196F3 (Blue)
- Secondary: #4CAF50 (Green)
- Accent: #FF9800 (Orange)
- Error: #F44336 (Red)
- Background: #F5F5F5 (Light Gray)

**Typography:**
- iOS: San Francisco (system font)
- Android: Roboto (system font)
- Marketing: [Your Brand Font]

## Version Updates

When updating app:

**Icons:**
- Generally don't change (brand recognition)
- Major redesigns only

**Screenshots:**
- Update for major UI changes
- Add new features
- Keep fresh and relevant
- Update at least yearly

**Descriptions:**
- Update "What's New"
- Highlight new features
- Keep version-specific

## Legal Considerations

**Trademarks:**
- Don't use Apple/Google logos incorrectly
- Don't imply official endorsement
- Use "Download on" not "Available on" for App Store

**Copyright:**
- Own all images or have rights
- Don't use stock photos that show other apps
- Credit photographers if required

**Privacy:**
- Don't show real customer data in screenshots
- Use mock/test data only
- Blur sensitive information

---

**Need help with assets?** Consider hiring a designer or using services like Fiverr, Upwork, or 99designs for professional app icon and screenshot design.

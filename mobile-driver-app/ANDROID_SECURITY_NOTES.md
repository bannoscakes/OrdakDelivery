# Android Security and Storage Best Practices

This document explains the security improvements implemented for the Ordak Driver Android app.

## Network Security Configuration

### Implementation

We've implemented a strict network security configuration to prevent cleartext (HTTP) traffic in production while allowing it for local development.

**File:** `android/app/src/main/res/xml/network_security_config.xml`

### Key Features

1. **HTTPS by Default**: All production traffic must use HTTPS
2. **Local Development Support**: Cleartext allowed only for:
   - `localhost`
   - `127.0.0.1`
   - `10.0.2.2` (Android emulator host)
   - `10.0.3.2` (Genymotion emulator)

### Configuration

The network security config is referenced in `AndroidManifest.xml`:

```xml
android:networkSecurityConfig="@xml/network_security_config"
```

### Development on Physical Devices

If testing on a physical device with your development machine:

1. Find your development machine's IP address
2. Uncomment and update this line in `network_security_config.xml`:
   ```xml
   <domain includeSubdomains="true">192.168.1.100</domain>
   ```
3. Replace `192.168.1.100` with your machine's IP

### Production Deployment

For production builds:
1. Ensure `API_BASE_URL` in `.env` uses HTTPS
2. Optionally remove the `domain-config` section from `network_security_config.xml`
3. All API endpoints must use HTTPS

## Scoped Storage (Android 10+)

### Overview

Android 10+ enforces scoped storage to improve user privacy and security. We've updated the app to use scoped storage APIs.

### Changes Made

#### 1. Limited Legacy Permissions

Storage permissions are now limited to Android 9 and below:

```xml
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="28" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="28" />
```

#### 2. Request Legacy Storage (Transition)

For Android 10 (API 29) only, we enable legacy storage during transition:

```xml
android:requestLegacyExternalStorage="true"
```

**Note**: This will be removed once fully migrated to scoped storage.

### Using Scoped Storage in the App

The app currently uses scoped storage for photos through `react-native-image-picker`, which automatically handles storage correctly:

#### Camera Photos (Proof of Delivery)

```typescript
// src/services/orders.service.ts
const result = await launchCamera({
  mediaType: 'photo',
  quality: 0.8,
  saveToPhotos: false, // Don't save to gallery
});
```

Photos are:
1. Captured to app-specific directory
2. Uploaded to server immediately
3. No external storage permissions needed

#### File Storage Locations

**App-Specific Storage** (no permissions needed):
- Internal: `/data/data/com.ordakdriver/files/`
- External: `/storage/emulated/0/Android/data/com.ordakdriver/files/`

**Use these for:**
- Temporary photo storage
- Cached data
- App-specific files

### Migration Checklist

Current status:

- ✅ Camera photos use app-specific storage
- ✅ Signature images stored as base64 (no file storage)
- ✅ API uploads use temporary files
- ✅ No external storage access needed
- ⏳ Remove `requestLegacyExternalStorage` after testing on Android 11+

### Testing

Test on different Android versions:

**Android 9 and below:**
- Storage permissions will be requested
- Legacy storage access works

**Android 10 (API 29):**
- Legacy storage enabled via `requestLegacyExternalStorage`
- Scoped storage APIs work

**Android 11+ (API 30+):**
- Full scoped storage enforcement
- No legacy storage permissions granted
- App-specific directories work without permissions

## Dependency Security Updates

### Critical Vulnerabilities Fixed

#### 1. Axios Updated (1.7.9 → 1.13.2)

**Vulnerabilities Fixed:**
- HIGH: Denial of Service (DoS)
- HIGH: Server-Side Request Forgery (SSRF)

**Action Taken:**
- Updated to `axios@1.13.2` (latest stable)
- No breaking changes in API client

#### 2. React Query Migrated

**Old:** `react-query@3.39.3` (deprecated)
**New:** `@tanstack/react-query@5.62.8`

**Note:** React Query is included as a dependency but not currently used in the codebase. State management is handled by Zustand. Consider removing if not needed for future features.

### Verification

After installing dependencies:

```bash
cd mobile-driver-app
npm install
npm audit
```

Should show 0 vulnerabilities.

## Security Best Practices

### API Security

1. **Always use HTTPS in production**
   ```env
   API_BASE_URL=https://api.ordakdelivery.com/api/v1
   ```

2. **Store tokens securely**
   - Use `@react-native-async-storage/async-storage` (encrypted on device)
   - Never log tokens
   - Implement token refresh

3. **Validate server certificates**
   - Network security config enforces system certificates
   - Don't allow self-signed certs in production

### Permission Best Practices

1. **Request permissions at runtime**
   - Location, Camera permissions requested when needed
   - Explain why permission is needed

2. **Handle permission denials gracefully**
   - Show helpful messages
   - Provide app settings link

3. **Minimize permissions**
   - Only request what's absolutely necessary
   - Review permissions regularly

### Data Privacy

1. **Photo Handling**
   - Photos not saved to gallery by default
   - Upload and delete immediately
   - Don't store customer photos longer than needed

2. **Location Data**
   - Only track during active deliveries
   - Stop background tracking when run completes
   - Clear location history after delivery

3. **Customer Information**
   - Don't log customer names, addresses, phone numbers
   - Encrypt sensitive data at rest
   - Follow GDPR/privacy regulations

## App Store Compliance

### Google Play Requirements

✅ **Target API Level 34** (Android 14)
- App targets latest Android version
- All security features enabled

✅ **Data Safety Section**
- Location data collected and shared (for tracking)
- Personal info collected (name, email)
- Photos collected (proof of delivery)
- Proper disclosure in Play Console

✅ **Background Location Justification**
- Clear permission dialog
- Only during active deliveries
- User can see tracking status

### Testing Checklist

Before submission:

- [ ] Test on Android 11+ (scoped storage)
- [ ] Verify HTTPS-only in production build
- [ ] Test location permissions flow
- [ ] Test camera/photo capture
- [ ] Verify no storage permission requests on Android 11+
- [ ] Check `npm audit` shows 0 vulnerabilities
- [ ] Test offline mode
- [ ] Verify background location tracking

## Resources

- [Android Network Security Config](https://developer.android.com/privacy-and-security/security-config)
- [Scoped Storage Guide](https://developer.android.com/training/data-storage#scoped-storage)
- [Android 11 Storage Updates](https://developer.android.com/about/versions/11/privacy/storage)
- [Google Play Security Guidelines](https://support.google.com/googleplay/android-developer/answer/9888077)

## Support

For security concerns or questions:
- Review Android security documentation
- Check React Native security best practices
- Open issue in repository for app-specific questions

---

**Last Updated**: 2024-11-15
**Android Target SDK**: 34 (Android 14)
**Minimum SDK**: 21 (Android 5.0)

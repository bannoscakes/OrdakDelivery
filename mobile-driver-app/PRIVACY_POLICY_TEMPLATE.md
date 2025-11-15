# Privacy Policy for Ordak Driver Mobile App

**Last Updated: [DATE]**

## Introduction

Bannoscakes ("we," "our," or "us") operates the Ordak Driver mobile application (the "App"). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application for delivery management services.

Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.

## Information We Collect

### Personal Information

We collect personal information that you voluntarily provide when you register for the App, including:

- **Account Information**: Name, email address, phone number
- **Authentication**: Login credentials (encrypted)
- **Profile Information**: Driver license number, employment information
- **Contact Preferences**: Communication preferences

### Location Information

The App collects precise location data to provide core functionality:

- **Foreground Location**: When you're actively using the App for navigation
- **Background Location**: When the App is running in the background during active deliveries
- **Purpose**:
  - Turn-by-turn navigation
  - Real-time tracking for dispatch and customers
  - Route optimization
  - Delivery verification
  - Performance analytics

**You can disable location services at any time**, but this will prevent the App from functioning properly.

### Delivery Information

- **Proof of Delivery**: Digital signatures, photos, delivery notes
- **Delivery History**: Completed deliveries, timestamps, locations
- **Customer Information**: Names, addresses (view-only for deliveries)

### Device Information

- **Device Identifiers**: Device model, operating system, unique device identifiers
- **App Usage**: Pages viewed, features used, time spent
- **Performance Data**: Crash reports, error logs

### Camera and Photos

- **Purpose**: Capture proof of delivery photos
- **Storage**: Photos are uploaded to our secure servers
- **Deletion**: Can be deleted upon request

## How We Use Your Information

We use collected information for:

1. **Providing Services**
   - Delivery route management
   - Turn-by-turn navigation
   - Real-time tracking
   - Proof of delivery collection

2. **Communication**
   - Delivery assignments
   - System notifications
   - Support and customer service
   - App updates

3. **Analytics and Improvement**
   - App performance optimization
   - Feature development
   - Bug fixes
   - User experience enhancement

4. **Legal Compliance**
   - Responding to legal requests
   - Enforcing our terms
   - Protecting rights and safety

## Data Sharing and Disclosure

### Third-Party Service Providers

We share data with trusted third-party service providers:

| Service | Purpose | Data Shared |
|---------|---------|-------------|
| **Mapbox** | Navigation and mapping | Location data, route information |
| **Cloud Storage** | Data storage and backup | All app data (encrypted) |
| **Analytics** | App performance monitoring | Usage data, device information |
| **Push Notifications** | Delivery notifications | Device tokens |

### Business Transfers

If we're involved in a merger, acquisition, or sale of assets, your information may be transferred. We will provide notice before your information is transferred.

### Legal Requirements

We may disclose your information if required by law or in response to valid legal requests.

### With Your Consent

We may share information for other purposes with your explicit consent.

## Data Security

We implement appropriate technical and organizational security measures:

- **Encryption**: Data encrypted in transit (TLS/SSL) and at rest
- **Authentication**: Secure JWT-based authentication
- **Access Controls**: Role-based access to data
- **Regular Audits**: Security assessments and updates
- **Secure Storage**: Industry-standard cloud infrastructure

**However, no method of transmission or storage is 100% secure.** We cannot guarantee absolute security.

## Data Retention

We retain your information for as long as necessary to:

- Provide our services
- Comply with legal obligations
- Resolve disputes
- Enforce agreements

**Retention Periods:**
- **Account Data**: Duration of employment + 3 years
- **Location Data**: 90 days (aggregated data kept longer for analytics)
- **Delivery Records**: 7 years (legal requirement)
- **Photos**: 1 year from delivery date

## Your Privacy Rights

Depending on your location, you may have the following rights:

### Access and Portability
- Request a copy of your personal data
- Receive data in a structured, machine-readable format

### Correction
- Update or correct inaccurate information
- Access settings in the App to update your profile

### Deletion
- Request deletion of your personal data
- Note: Some data may be retained for legal compliance

### Objection
- Object to certain data processing activities
- Withdraw consent at any time

### Restriction
- Request restriction of processing in certain circumstances

**To exercise these rights**, contact us at: privacy@ordakdelivery.com

## California Privacy Rights (CCPA)

If you're a California resident, you have additional rights:

- **Right to Know**: What personal information we collect, use, and share
- **Right to Delete**: Request deletion of personal information
- **Right to Opt-Out**: Opt-out of sale of personal information (we do not sell data)
- **Non-Discrimination**: Not be discriminated against for exercising rights

## European Privacy Rights (GDPR)

If you're in the European Economic Area (EEA), you have rights under GDPR:

- **Legal Basis**: We process data based on contract, consent, and legitimate interests
- **Data Controller**: Bannoscakes is the data controller
- **Data Protection Officer**: privacy@ordakdelivery.com
- **Supervisory Authority**: Right to lodge complaint with local data protection authority

## Children's Privacy

The App is not intended for children under 18. We do not knowingly collect information from children. If we learn we have collected information from a child, we will delete it immediately.

## Location Services

### iOS
You can control location permissions:
- Settings > Privacy > Location Services > Ordak Driver
- Choose: Never, While Using, or Always

### Android
You can control location permissions:
- Settings > Apps > Ordak Driver > Permissions > Location
- Choose: Allow all the time, While using the app, or Deny

**Note**: "Allow all the time" / "Always" is required for background tracking during active deliveries.

## International Data Transfers

Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for such transfers.

## Push Notifications

You can disable push notifications:
- **iOS**: Settings > Notifications > Ordak Driver
- **Android**: Settings > Apps > Ordak Driver > Notifications

## Cookies and Tracking

The App uses local storage (AsyncStorage) for:
- Authentication tokens
- User preferences
- Offline data caching

We do not use cookies for tracking or advertising.

## Third-Party Links

The App may contain links to third-party services (e.g., map applications). We are not responsible for their privacy practices. Please review their privacy policies.

## Changes to Privacy Policy

We may update this privacy policy periodically. We will notify you of material changes via:
- In-app notification
- Email notification
- Update to "Last Updated" date

Your continued use after changes constitutes acceptance.

## Data Breach Notification

In the event of a data breach affecting your personal information, we will notify you and relevant authorities as required by law.

## Contact Us

For questions, concerns, or requests regarding this privacy policy:

**Email**: privacy@ordakdelivery.com
**Mail**:
Bannoscakes
[Your Address]
[City, State ZIP]
[Country]

**Support**: support@ordakdelivery.com

## Consent

By using the Ordak Driver App, you consent to this privacy policy and our collection and use of information as described.

---

**Effective Date**: [DATE]
**Company**: Bannoscakes
**App**: Ordak Driver

## Appendix: Technical Details

### Location Data Processing

**Collection Frequency:**
- **Active Navigation**: Every 5 seconds
- **Background Tracking**: Every 30 seconds
- **Accuracy**: High accuracy GPS (10-meter radius)

**Data Transmitted:**
- Latitude, longitude
- Timestamp
- Accuracy
- Speed and heading
- Associated delivery run ID

**Server Retention:**
- Raw location points: 90 days
- Aggregated route data: Indefinitely (anonymized)

### Encryption Standards

- **In Transit**: TLS 1.3
- **At Rest**: AES-256
- **Authentication**: JWT with RS256 signing
- **Token Expiry**: 24 hours (refresh tokens: 30 days)

---

**This is a template. Consult with a legal professional to ensure compliance with all applicable laws and regulations in your jurisdiction.**

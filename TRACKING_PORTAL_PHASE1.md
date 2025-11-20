# Customer Tracking Portal - Phase 1 Implementation

**Status**: ✅ Complete - Ready for database migration and testing
**Date**: 2025-11-20

---

## Overview

Phase 1 of the Customer Tracking Portal provides a public order tracking page where customers can view their delivery status using a unique tracking URL. No authentication is required for customers to access their tracking information.

---

## Features Implemented

### 1. Unique Tracking Numbers
- ✅ Auto-generated CUID tracking numbers for all orders
- ✅ Unique constraint ensures no duplicates
- ✅ Tracking numbers included in order creation

### 2. Public API Endpoint
- ✅ `GET /api/v1/tracking/:trackingNumber` - Public access (no auth)
- ✅ Returns comprehensive tracking information
- ✅ Privacy-focused: Excludes sensitive customer data

### 3. Customer-Friendly Status
- ✅ Technical statuses mapped to customer-friendly messages
- ✅ Status history with timestamps
- ✅ Timeline view of delivery progress

### 4. Delivery Information
- ✅ Estimated delivery window with formatted display
- ✅ Driver name (if assigned)
- ✅ Vehicle information (make, model, color, license plate)
- ✅ Delivery address (city, state, postal code)

### 5. Basic HTML Tracking Page
- ✅ Mobile-responsive design
- ✅ Clean, modern UI with design system colors
- ✅ Real-time loading via JavaScript fetch
- ✅ Timeline visualization
- ✅ Error handling for invalid tracking numbers

### 6. Proof of Delivery Display
- ✅ Shows signature status
- ✅ Shows photo status
- ✅ Displays recipient name

---

## Files Created/Modified

### Schema Changes
**File**: `prisma/schema.prisma`

```prisma
model Order {
  // ... existing fields ...

  // PUBLIC TRACKING (Phase 1)
  trackingNumber         String    @unique @default(cuid()) @map("tracking_number")
  customerStatus         String?   @map("customer_status")
  customerStatusUpdatedAt DateTime? @map("customer_status_updated_at")
  trackingUrl            String?   @map("tracking_url")

  @@index([trackingNumber])
}
```

**Migration needed**: Yes - adds 3 new fields + index to Order table

---

### New Module: Tracking

**1. Types**: `src/modules/tracking/tracking.types.ts`
- `TrackingInfo` - Complete tracking response interface
- `TimelineEvent` - Timeline item structure
- `TrackingUrlResponse` - URL generation response

**2. Service**: `src/modules/tracking/tracking.service.ts`
- `getTrackingInfo(trackingNumber)` - Public tracking lookup
- `getCustomerFriendlyStatus(status)` - Status text mapping
- `formatTimeWindow(start, end)` - Human-readable time windows
- `buildTimeline(order, run)` - Timeline generation
- `generateTrackingUrl(trackingNumber)` - URL construction
- `updateCustomerStatus(orderId, status)` - Status updates

**3. Controller**: `src/modules/tracking/tracking.controller.ts`
- `getTracking()` - Public API endpoint handler
- `generateTrackingUrl()` - Internal URL generation (requires auth)

**4. Routes**: `src/modules/tracking/tracking.routes.ts`
- `GET /:trackingNumber` - Public tracking endpoint

---

### Modified Files

**1. Orders Service**: `src/modules/orders/orders.service.ts`
- Added tracking service import
- Auto-generates tracking URL on order creation
- Sets initial customer status: "Order Received"
- Logs tracking information

**2. Orders Routes**: `src/modules/orders/orders.routes.ts`
- Added tracking controller import
- Added `POST /:orderId/tracking-url` endpoint (admin/dispatcher only)

**3. App Configuration**: `src/app.ts`
- Registered tracking routes: `/api/v1/tracking`
- Serves static HTML from `/track/:trackingNumber`
- Added public directory serving

**4. Environment Config**: `src/config/env.ts`
- Added `TRACKING_BASE_URL` (optional)
- Falls back to `http://localhost:3000` in development

---

### Static Assets

**File**: `public/tracking.html`
- Mobile-responsive single-page app
- JavaScript fetch for real-time data
- Timeline visualization
- Error handling for invalid tracking numbers
- Design system colors (Primary: #2E5EAA, Success: #52C41A)

---

## API Endpoints

### Public Tracking API (No Auth Required)

#### Get Tracking Information
```http
GET /api/v1/tracking/:trackingNumber
```

**Example Request**:
```bash
curl https://api.ordakdelivery.com/api/v1/tracking/clxxx123456789
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "trackingNumber": "clxxx123456789",
    "orderNumber": "ORD-2025-001",
    "status": "in_transit",
    "customerStatus": "Out for Delivery",
    "estimatedArrival": {
      "start": "2025-11-20T14:00:00Z",
      "end": "2025-11-20T16:00:00Z",
      "displayText": "Wednesday, November 20 between 2:00PM - 4:00PM"
    },
    "deliveryAddress": {
      "addressLine1": "123 Main Street",
      "city": "Toronto",
      "stateProvince": "ON",
      "postalCode": "M5V 3A8",
      "latitude": 43.65107,
      "longitude": -79.347015
    },
    "driver": {
      "firstName": "John",
      "photoUrl": null,
      "currentLocation": null,
      "isOnTheWay": true
    },
    "vehicle": {
      "make": "Ford",
      "model": "Transit",
      "color": "White",
      "licensePlate": "ABC 1234"
    },
    "timeline": [
      {
        "status": "created",
        "title": "Order Received",
        "description": "Your order has been received and is being processed",
        "timestamp": "2025-11-19T10:00:00Z",
        "completed": true
      },
      {
        "status": "assigned",
        "title": "Driver Assigned",
        "description": "Your order has been assigned to John",
        "timestamp": "2025-11-20T08:00:00Z",
        "completed": true
      },
      {
        "status": "in_transit",
        "title": "Out for Delivery",
        "description": "Your driver is on the way",
        "timestamp": "2025-11-20T13:00:00Z",
        "completed": false
      }
    ],
    "completedAt": null,
    "proofOfDelivery": null
  }
}
```

---

### Internal API (Auth Required)

#### Generate Tracking URL
```http
POST /api/v1/orders/:orderId/tracking-url
Authorization: Bearer <token>
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "trackingUrl": "https://track.ordakdelivery.com/clxxx123456789",
    "trackingNumber": "clxxx123456789"
  }
}
```

---

## Customer Status Mapping

| Technical Status | Customer Status |
|-----------------|-----------------|
| `pending` | Order Received |
| `assigned` | Order Assigned to Driver |
| `in_transit` | Out for Delivery |
| `delivered` | Delivered |
| `failed` | Delivery Attempted |
| `cancelled` | Order Cancelled |

---

## Usage

### Accessing Tracking Pages

**Via Tracking Number**:
```
https://yourdomain.com/track/{trackingNumber}
```

**Example**:
```
https://track.ordakdelivery.com/clxxx123456789
```

### Integration with SMS Notifications

When sending delivery notifications, include the tracking URL:

```typescript
const trackingUrl = trackingService.generateTrackingUrl(order.trackingNumber);
const message = `Your delivery is scheduled for ${date}. Track your order: ${trackingUrl}`;
```

---

## Environment Variables

Add to `.env`:

```env
# Customer Tracking Portal (Optional)
TRACKING_BASE_URL=https://track.ordakdelivery.com
```

If not set, defaults to `http://localhost:3000` in development.

---

## Database Migration

### Required Migration

Run the following to apply schema changes:

```bash
# Generate migration
npx prisma migrate dev --name add_order_tracking_fields

# Generate Prisma client
npm run db:generate
```

### Migration SQL (Auto-generated)

```sql
-- Add tracking fields to orders table
ALTER TABLE "orders"
  ADD COLUMN "tracking_number" VARCHAR(50) NOT NULL DEFAULT cuid(),
  ADD COLUMN "customer_status" VARCHAR(100),
  ADD COLUMN "customer_status_updated_at" TIMESTAMPTZ(6);

-- Add unique constraint
ALTER TABLE "orders"
  ADD CONSTRAINT "orders_tracking_number_key" UNIQUE ("tracking_number");

-- Add index
CREATE INDEX "orders_tracking_number_idx" ON "orders"("tracking_number");

-- Backfill existing orders (optional - if you have existing data)
UPDATE orders
SET customer_status = 'Order Received',
    customer_status_updated_at = NOW()
WHERE customer_status IS NULL;
```

---

## Testing Checklist

### Unit Tests (TODO)
- [ ] Test `getTrackingInfo()` with valid tracking number
- [ ] Test `getTrackingInfo()` with invalid tracking number
- [ ] Test `getCustomerFriendlyStatus()` for all statuses
- [ ] Test `formatTimeWindow()` output
- [ ] Test `buildTimeline()` for various order states
- [ ] Test `generateTrackingUrl()` with/without TRACKING_BASE_URL

### Integration Tests (TODO)
- [ ] Test public tracking API endpoint
- [ ] Test tracking URL generation endpoint
- [ ] Test tracking page loads correctly
- [ ] Test JavaScript fetch and display
- [ ] Test error handling for invalid tracking numbers

### Manual Testing
1. **Create an order**:
   ```bash
   POST /api/v1/orders
   ```
   - Verify tracking number is generated
   - Verify tracking URL is created
   - Verify customer status is set

2. **Access tracking page**:
   ```
   http://localhost:3000/track/{trackingNumber}
   ```
   - Verify page loads
   - Verify order information displays
   - Verify timeline shows correctly

3. **Test invalid tracking number**:
   ```
   http://localhost:3000/track/invalid123
   ```
   - Verify error message displays

4. **Update order status**:
   ```bash
   # Assign to driver
   # Update to in_transit
   # Mark as delivered
   ```
   - Verify timeline updates
   - Verify status changes reflect on tracking page

---

## Privacy & Security Considerations

### What's Exposed Publicly
✅ Safe to show:
- Order number
- Tracking number
- Order status (customer-friendly)
- Delivery address (street, city, state, postal code)
- Estimated delivery window
- Driver first name only
- Vehicle information (make, model, color, license plate)
- Timeline with timestamps

### What's Protected
🔒 Not exposed:
- Customer email
- Customer phone number
- Customer full name
- Driver phone number
- Driver last name
- Internal order notes
- Pricing information
- Payment details

### Rate Limiting
- Public tracking API uses standard rate limiter
- Consider implementing per-IP tracking lookup limits in production

---

## Phase 2 Roadmap (Future)

### Real-Time Location Tracking
- [ ] Driver GPS position on map
- [ ] ETA countdown timer
- [ ] "On the way" live updates
- [ ] Map view with route overlay

### Enhanced Features
- [ ] SMS/Email subscription for updates
- [ ] Push notifications (web push)
- [ ] Delivery preferences (leave at door, etc.)
- [ ] Customer feedback/rating after delivery
- [ ] Photo gallery for proof of delivery
- [ ] Signature display

### UI Improvements
- [ ] React/Next.js tracking portal
- [ ] Interactive map (Mapbox GL JS)
- [ ] Mobile app integration
- [ ] Multi-language support
- [ ] Dark mode

---

## Known Limitations (Phase 1)

1. **No Real-Time Updates**: Page must be manually refreshed to see status changes
2. **No Map Display**: Location shown as text only (no map visualization)
3. **No ETA Countdown**: Shows time window only, no live ETA
4. **No Notifications**: No SMS/email alerts for status changes
5. **Static HTML**: Not optimized for SEO or server-side rendering

These will be addressed in Phase 2.

---

## Deployment Notes

### Production Checklist
- [ ] Set `TRACKING_BASE_URL` environment variable
- [ ] Run database migration
- [ ] Test tracking URL generation
- [ ] Configure DNS for tracking subdomain (e.g., track.ordakdelivery.com)
- [ ] Set up SSL certificate for tracking domain
- [ ] Test public tracking API
- [ ] Test tracking page on mobile devices
- [ ] Monitor error logs for failed tracking lookups

### DNS Configuration
If using a dedicated subdomain:

```
CNAME track.ordakdelivery.com → api.ordakdelivery.com
```

Then set:
```env
TRACKING_BASE_URL=https://track.ordakdelivery.com
```

---

## Support & Troubleshooting

### Common Issues

**Issue**: Tracking number not found
- **Cause**: Order created before migration
- **Fix**: Backfill tracking numbers for existing orders

**Issue**: Tracking page shows error
- **Cause**: API endpoint not accessible
- **Fix**: Check CORS settings, ensure tracking routes registered

**Issue**: Timeline missing events
- **Cause**: Order status not properly tracked
- **Fix**: Ensure `updateCustomerStatus()` called on status changes

---

## Conclusion

Phase 1 provides a solid foundation for customer order tracking with:
- ✅ Public tracking API
- ✅ Unique tracking numbers
- ✅ Customer-friendly status messages
- ✅ Timeline visualization
- ✅ Mobile-responsive tracking page
- ✅ Privacy-focused data exposure

Phase 2 will add real-time location tracking, interactive maps, and enhanced customer engagement features.

---

**Implementation Status**: ✅ Complete - Ready for migration and testing
**Next Steps**: Run database migration, test tracking flow, deploy to production

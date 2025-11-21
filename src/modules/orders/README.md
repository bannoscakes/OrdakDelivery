# Orders API

Complete order management API with automatic geocoding, customer management, and routing integration.

## Features

- Create orders from Shopify webhooks or manual entry
- Automatic address geocoding with PostGIS
- Customer management (find-or-create pattern)
- Order status lifecycle management
- Filtering and pagination
- Integration with delivery runs
- Time window support for deliveries

## API Endpoints

All endpoints require authentication. Some endpoints require Admin or Dispatcher roles.

### POST /api/v1/orders
Create a new order with automatic geocoding.

**Access**: Admin, Dispatcher

**Request:**
```json
{
  "orderNumber": "ORD-20231218-001",
  "type": "DELIVERY",
  "customer": {
    "email": "customer@example.com",
    "phone": "+1234567890",
    "firstName": "John",
    "lastName": "Doe"
  },
  "address": {
    "line1": "123 Main St",
    "line2": "Apt 4",
    "city": "Toronto",
    "province": "ON",
    "postalCode": "M5V 3A8",
    "country": "CA"
  },
  "scheduledDate": "2023-12-20T00:00:00Z",
  "timeWindowStart": "2023-12-20T09:00:00Z",
  "timeWindowEnd": "2023-12-20T17:00:00Z",
  "items": [
    {
      "name": "Product A",
      "quantity": 2,
      "sku": "PROD-A-001"
    }
  ],
  "notes": "Delivery notes",
  "specialInstructions": "Ring doorbell twice"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "orderNumber": "ORD-20231218-001",
    "type": "DELIVERY",
    "status": "PENDING",
    "customer": {
      "id": "clyy...",
      "email": "customer@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "addressLine1": "123 Main St",
    "city": "Toronto",
    "geocoded": true,
    "scheduledDate": "2023-12-20T00:00:00.000Z",
    "items": [...],
    "createdAt": "2023-12-18T10:00:00.000Z"
  }
}
```

### GET /api/v1/orders
List orders with filtering and pagination.

**Access**: All authenticated users

**Query Parameters:**
- `status` - Filter by OrderStatus (PENDING, CONFIRMED, ASSIGNED, IN_PROGRESS, DELIVERED, FAILED, CANCELLED)
- `type` - Filter by OrderType (DELIVERY, PICKUP)
- `scheduledAfter` - ISO date string (e.g., "2023-12-01T00:00:00Z")
- `scheduledBefore` - ISO date string
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Example:**
```
GET /api/v1/orders?status=PENDING&scheduledAfter=2023-12-20T00:00:00Z&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "orderNumber": "ORD-20231218-001",
      "status": "PENDING",
      "customer": {...},
      "scheduledDate": "2023-12-20T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

### GET /api/v1/orders/unassigned
Get unassigned orders ready for route optimization.

**Access**: All authenticated users

**Query Parameters:**
- `date` (required) - ISO date string for the scheduled date

**Example:**
```
GET /api/v1/orders/unassigned?date=2023-12-20T00:00:00Z
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "orderNumber": "ORD-20231218-001",
      "status": "PENDING",
      "geocoded": true,
      "assignedRunId": null,
      "timeWindowStart": "2023-12-20T09:00:00Z",
      "customer": {...}
    }
  ]
}
```

### GET /api/v1/orders/:id
Get a single order by ID.

**Access**: All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "orderNumber": "ORD-20231218-001",
    "status": "PENDING",
    "customer": {...},
    "assignedRun": {
      "id": "clzzz...",
      "name": "Route 1",
      "driver": {...},
      "vehicle": {...}
    },
    "items": [...],
    "createdAt": "2023-12-18T10:00:00.000Z"
  }
}
```

### PUT /api/v1/orders/:id
Update an order.

**Access**: Admin, Dispatcher

**Request:**
```json
{
  "status": "CONFIRMED",
  "scheduledDate": "2023-12-21T00:00:00Z",
  "timeWindowStart": "2023-12-21T10:00:00Z",
  "timeWindowEnd": "2023-12-21T16:00:00Z",
  "notes": "Updated notes",
  "specialInstructions": "New instructions"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "status": "CONFIRMED",
    "scheduledDate": "2023-12-21T00:00:00.000Z",
    ...
  }
}
```

### DELETE /api/v1/orders/:id
Delete an order.

**Access**: Admin, Dispatcher

**Response:**
```
HTTP 204 No Content
```

### POST /api/v1/orders/:id/proof-of-delivery
Submit proof of delivery with signature, photos, and notes.

**Access**: Driver (for their assigned orders), Admin, Dispatcher (for any order)

**Request:**
```json
{
  "signatureUrl": "https://storage.example.com/signatures/abc123.png",
  "photoUrls": [
    "https://storage.example.com/photos/photo1.jpg",
    "https://storage.example.com/photos/photo2.jpg"
  ],
  "deliveryNotes": "Delivered to front desk",
  "recipientName": "John Smith"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "orderNumber": "ORD-20231218-001",
    "status": "DELIVERED",
    "deliveredAt": "2023-12-20T14:30:00.000Z",
    "signatureUrl": "https://storage.example.com/signatures/abc123.png",
    "photoUrls": [
      "https://storage.example.com/photos/photo1.jpg",
      "https://storage.example.com/photos/photo2.jpg"
    ],
    "deliveryNotes": "Delivered to front desk",
    ...
  }
}
```

### POST /api/v1/orders/:id/delivered
Mark order as delivered without proof of delivery.

**Access**: Driver (for their assigned orders), Admin, Dispatcher (for any order)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "orderNumber": "ORD-20231218-001",
    "status": "DELIVERED",
    "deliveredAt": "2023-12-20T14:30:00.000Z",
    ...
  }
}
```

### POST /api/v1/orders/:id/failed
Mark order as failed with failure reason.

**Access**: Driver (for their assigned orders), Admin, Dispatcher (for any order)

**Request:**
```json
{
  "failureReason": "Customer not home, will retry tomorrow"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "orderNumber": "ORD-20231218-001",
    "status": "FAILED",
    "deliveryNotes": "Customer not home, will retry tomorrow",
    ...
  }
}
```

## Order Status Lifecycle

```
PENDING → CONFIRMED → ASSIGNED → IN_PROGRESS → DELIVERED
   ↓          ↓           ↓            ↓
CANCELLED  CANCELLED  CANCELLED    FAILED
```

### Status Descriptions

- **PENDING**: Order created, awaiting confirmation
- **CONFIRMED**: Order confirmed, ready for assignment
- **ASSIGNED**: Order assigned to a delivery run
- **IN_PROGRESS**: Driver has started the delivery
- **DELIVERED**: Order successfully delivered with proof
- **FAILED**: Delivery attempt failed (customer not home, address issue, etc.)
- **CANCELLED**: Order cancelled by customer or admin

## Order Types

- **DELIVERY**: Order requires delivery to customer address
- **PICKUP**: Customer will pick up order (future feature)

## Automatic Geocoding

When an order is created:
1. Address is concatenated into full address string
2. Geocoding service (Mapbox or Pelias) geocodes the address
3. Result is stored as PostGIS Point geometry
4. `geocoded` flag is set to true/false
5. Only geocoded orders can be assigned to delivery runs

## Customer Management

Orders use a **find-or-create** pattern for customers:
- If customer email exists, update their info
- If customer email doesn't exist, create new customer
- Temporary email generated for customers without email

## Integration with Delivery Runs

Orders can be assigned to delivery runs:
- `assignedRunId` - ID of the delivery run
- `sequenceInRun` - Order position in the route (1, 2, 3...)
- `estimatedArrival` - ETA calculated by route optimization
- Only unassigned, geocoded orders can be added to runs

## Time Windows

Orders support delivery time windows:
- `timeWindowStart` - Earliest acceptable delivery time
- `timeWindowEnd` - Latest acceptable delivery time
- Used by route optimization to respect customer preferences
- Both fields are optional

## Order Items

Items are stored as JSON array:
```json
[
  {
    "name": "Product Name",
    "quantity": 2,
    "sku": "PROD-001",
    "price": 29.99
  }
]
```

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

**Common Status Codes:**
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Order not found
- `500` - Internal server error

## Proof of Delivery (POD)

Proof of delivery allows drivers to confirm successful deliveries with supporting evidence.

### POD Data Fields

- **signatureUrl**: URL to customer signature image (PNG, JPG)
- **photoUrls**: Array of URLs to delivery photos (package at door, etc.)
- **deliveryNotes**: Free-text notes from driver ("Delivered to front desk")
- **recipientName**: Name of person who received the delivery (optional)
- **deliveredAt**: Timestamp of delivery (auto-set)

### POD Submission Flow

1. **Driver completes delivery** in mobile app
2. **Capture signature** (if required) - draws on screen, saves as image
3. **Take photos** (optional) - photo of package at delivery location
4. **Add notes** (optional) - special instructions or delivery details
5. **Submit POD** via `POST /orders/:id/proof-of-delivery`
6. **Order status** automatically changes to DELIVERED
7. **Customer notification** sent (if configured)

### POD without Evidence

For deliveries that don't require proof (e.g., contactless), use:
- `POST /orders/:id/delivered` - Mark as delivered without POD data

### Failed Deliveries

For unsuccessful delivery attempts, use:
- `POST /orders/:id/failed` - Mark as failed with reason
- Order status changes to FAILED
- Dispatcher can reschedule or reassign

### Storage Integration

The API accepts URLs for signatures and photos. Storage handling options:

1. **Client-side upload**: Mobile app uploads to S3/Cloud Storage, passes URLs to API
2. **API upload**: Future enhancement - accept base64 images, API handles upload
3. **Signed URLs**: Use pre-signed URLs for secure direct uploads

### Driver Permissions

Drivers can only submit POD for orders in their assigned delivery runs:
- **Mobile app** authenticates as Driver role
- **API validates** order is in driver's active run
- **Admin/Dispatcher** can submit POD for any order (override)

### POD Retrieval

POD data is included in order details:
```typescript
const response = await fetch(`/api/v1/orders/${orderId}`);
const { data } = await response.json();

console.log('Signature:', data.signatureUrl);
console.log('Photos:', data.photoUrls);
console.log('Notes:', data.deliveryNotes);
console.log('Delivered at:', data.deliveredAt);
```

### Use Cases

- **Legal proof**: Signature confirms delivery for high-value items
- **Quality assurance**: Photos verify correct delivery location
- **Customer service**: Notes explain delivery details
- **Dispute resolution**: Evidence for delivery confirmation

## Shopify Integration

Shopify orders are automatically created via webhooks. See `shopify.routes.ts` for webhook endpoints.

## Code Examples

### Creating an order (JavaScript/TypeScript)
```typescript
const response = await fetch('/api/v1/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    orderNumber: 'ORD-20231218-001',
    type: 'DELIVERY',
    customer: {
      email: 'customer@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
    address: {
      line1: '123 Main St',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M5V 3A8',
    },
    scheduledDate: '2023-12-20T00:00:00Z',
    items: [
      { name: 'Product A', quantity: 2 }
    ],
  }),
});

const { data } = await response.json();
console.log('Order created:', data.id);
```

### Listing orders with filters
```typescript
const params = new URLSearchParams({
  status: 'PENDING',
  scheduledAfter: '2023-12-20T00:00:00Z',
  page: '1',
  limit: '20',
});

const response = await fetch(`/api/v1/orders?${params}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});

const { data, pagination } = await response.json();
console.log(`Found ${pagination.total} orders`);
```

## Testing

### Manual Testing
Use tools like Postman, Insomnia, or curl to test endpoints.

### Example curl commands

Create order:
```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "TEST-001",
    "type": "DELIVERY",
    "customer": {
      "email": "test@example.com",
      "firstName": "Test",
      "lastName": "User"
    },
    "address": {
      "line1": "123 Main St",
      "city": "Toronto",
      "province": "ON",
      "postalCode": "M5V 3A8"
    },
    "scheduledDate": "2023-12-20T00:00:00Z",
    "items": [{"name": "Test Product", "quantity": 1}]
  }'
```

List orders:
```bash
curl http://localhost:3000/api/v1/orders?status=PENDING \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Performance Considerations

- Orders table has indexes on: status, scheduledDate, customerId, assignedRunId, geocoded
- Pagination is enforced (max 100 items per page)
- Geocoding uses caching to avoid redundant API calls
- PostGIS spatial indexes enable fast geographic queries

## Related Modules

- **Customers** - Customer data management
- **Delivery Runs** - Route planning and assignment
- **Geocoding** - Address geocoding service
- **Shopify** - Webhook integration for order import

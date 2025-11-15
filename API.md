# OrdakDelivery API Documentation

Base URL: `http://localhost:3000/api/v1`

## Authentication

All API endpoints require JWT authentication via Bearer token, except:
- Health check endpoint (`/health`)
- Shopify webhooks (authenticated via HMAC signature)

Include the JWT token in the Authorization header:
```http
Authorization: Bearer <your-jwt-token>
```

---

## Error Responses

All errors follow a consistent format:

### Common Error Codes

#### 400 Bad Request
Invalid input data or validation errors.

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Validation Error",
  "errors": [
    {
      "path": "body.email",
      "message": "Invalid email"
    }
  ]
}
```

#### 401 Unauthorized
Missing or invalid authentication token.

```json
{
  "status": "error",
  "statusCode": 401,
  "message": "Unauthorized - Invalid or missing token"
}
```

#### 404 Not Found
Resource not found.

```json
{
  "status": "error",
  "statusCode": 404,
  "message": "Order not found"
}
```

#### 409 Conflict
Resource conflict (e.g., duplicate email).

```json
{
  "status": "error",
  "statusCode": 409,
  "message": "Driver with this email already exists"
}
```

#### 429 Too Many Requests
Rate limit exceeded.

```json
{
  "status": "error",
  "statusCode": 429,
  "message": "Too many requests, please try again later"
}
```

#### 500 Internal Server Error
Server error. In development mode, includes error details.

```json
{
  "status": "error",
  "statusCode": 500,
  "message": "Internal Server Error",
  "stack": "Error: ... (development only)"
}
```

---

## Orders

### Create Order

```http
POST /api/v1/orders
Content-Type: application/json

{
  "orderNumber": "ORD-001",
  "type": "DELIVERY", // or "PICKUP"
  "customer": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "address": {
    "line1": "123 Main St",
    "line2": "Apt 4B",
    "city": "Toronto",
    "province": "ON",
    "postalCode": "M5V 3A8",
    "country": "CA"
  },
  "scheduledDate": "2024-01-20T00:00:00Z",
  "timeWindowStart": "2024-01-20T09:00:00Z",
  "timeWindowEnd": "2024-01-20T17:00:00Z",
  "items": [
    {
      "sku": "ITEM-001",
      "name": "Product 1",
      "quantity": 2,
      "price": "19.99"
    }
  ],
  "notes": "Please call upon arrival",
  "specialInstructions": "Leave at door if no answer"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "...",
    "orderNumber": "ORD-001",
    "geocoded": true,
    ...
  }
}
```

### List Orders

```http
GET /api/v1/orders?status=PENDING&page=1&limit=20
```

**Query Parameters:**
- `status` - Filter by status (PENDING, CONFIRMED, ASSIGNED, IN_PROGRESS, DELIVERED, FAILED, CANCELLED)
- `type` - Filter by type (DELIVERY, PICKUP)
- `scheduledAfter` - ISO date
- `scheduledBefore` - ISO date
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

### Get Order

```http
GET /api/v1/orders/:id
```

### Update Order

```http
PUT /api/v1/orders/:id
Content-Type: application/json

{
  "status": "CONFIRMED",
  "notes": "Updated notes"
}
```

### Delete Order

```http
DELETE /api/v1/orders/:id
```

**Response:** `204 No Content`

### Get Unassigned Orders

```http
GET /api/v1/orders/unassigned?date=2024-01-20
```

Returns orders ready for routing on the specified date.

---

## Geocoding

### Forward Geocode

Convert address to coordinates.

```http
POST /api/v1/geocoding/forward
Content-Type: application/json

{
  "address": "123 Main St, Toronto, ON M5V 3A8",
  "country": "CA"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "coordinates": {
      "latitude": 43.6426,
      "longitude": -79.3871
    },
    "formattedAddress": "123 Main Street, Toronto, Ontario M5V 3A8, Canada",
    "cached": false
  }
}
```

### Reverse Geocode

Convert coordinates to address.

```http
POST /api/v1/geocoding/reverse
Content-Type: application/json

{
  "latitude": 43.6426,
  "longitude": -79.3871
}
```

---

## Drivers

### Create Driver

```http
POST /api/v1/drivers
Content-Type: application/json

{
  "email": "driver@example.com",
  "firstName": "John",
  "lastName": "Driver",
  "phone": "+14165551234",
  "licenseNumber": "D1234567",
  "startTime": "08:00",
  "endTime": "17:00",
  "traccarDeviceId": "device123"
}
```

### List Drivers

```http
GET /api/v1/drivers?status=ACTIVE&page=1&limit=20
```

**Query Parameters:**
- `status` - Filter by status (ACTIVE, INACTIVE, ON_LEAVE)
- `page`, `limit` - Pagination

### Get Driver

```http
GET /api/v1/drivers/:id
```

### Update Driver

```http
PUT /api/v1/drivers/:id
Content-Type: application/json

{
  "status": "INACTIVE",
  "startTime": "09:00"
}
```

### Delete Driver

```http
DELETE /api/v1/drivers/:id
```

Cannot delete drivers with active delivery runs.

### Get Available Drivers

```http
GET /api/v1/drivers/available?date=2024-01-20
```

Returns drivers not assigned to a run on the specified date.

---

## Vehicles

### Create Vehicle

```http
POST /api/v1/vehicles
Content-Type: application/json

{
  "licensePlate": "ABC-1234",
  "make": "Ford",
  "model": "Transit",
  "year": 2022,
  "type": "VAN",
  "maxWeight": 1000,
  "maxVolume": 15,
  "maxStops": 30,
  "traccarDeviceId": "vehicle123"
}
```

**Vehicle Types:** CAR, VAN, TRUCK, BIKE, MOTORCYCLE

### List Vehicles

```http
GET /api/v1/vehicles?type=VAN&isActive=true&page=1&limit=20
```

### Get Vehicle

```http
GET /api/v1/vehicles/:id
```

### Update Vehicle

```http
PUT /api/v1/vehicles/:id
Content-Type: application/json

{
  "isActive": false,
  "maxStops": 25
}
```

### Delete Vehicle

```http
DELETE /api/v1/vehicles/:id
```

Cannot delete vehicles with active delivery runs.

### Get Available Vehicles

```http
GET /api/v1/vehicles/available?date=2024-01-20
```

---

## Delivery Runs

### Create Delivery Run

```http
POST /api/v1/runs
Content-Type: application/json

{
  "name": "Downtown Route - Jan 20",
  "scheduledDate": "2024-01-20T00:00:00Z",
  "driverId": "driver-uuid",
  "vehicleId": "vehicle-uuid",
  "orderIds": ["order-uuid-1", "order-uuid-2"]
}
```

### List Delivery Runs

```http
GET /api/v1/runs?status=PLANNED&driverId=xyz&page=1
```

**Query Parameters:**
- `status` - Filter by status (DRAFT, PLANNED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED)
- `driverId` - Filter by driver
- `scheduledAfter`, `scheduledBefore` - Date filters
- `page`, `limit` - Pagination

### Get Delivery Run

```http
GET /api/v1/runs/:id
```

Returns run with driver, vehicle, and all assigned orders in sequence.

### Update Delivery Run

```http
PUT /api/v1/runs/:id
Content-Type: application/json

{
  "name": "Updated Route Name",
  "status": "ASSIGNED",
  "driverId": "new-driver-uuid"
}
```

### Delete Delivery Run

```http
DELETE /api/v1/runs/:id
```

Unassigns all orders from the run before deletion.

### Assign Orders to Run

```http
POST /api/v1/runs/:id/assign
Content-Type: application/json

{
  "orderIds": ["order-uuid-1", "order-uuid-2", "order-uuid-3"]
}
```

Updates order status to ASSIGNED.

### Unassign Orders from Run

```http
POST /api/v1/runs/:id/unassign
Content-Type: application/json

{
  "orderIds": ["order-uuid-1"]
}
```

### Optimize Delivery Run

**Most Important Endpoint - Uses Mapbox Optimization API**

```http
POST /api/v1/runs/:id/optimize
Content-Type: application/json

{
  "startLocation": [-79.3871, 43.6426],
  "endLocation": [-79.3871, 43.6426]
}
```

**What it does:**
1. Extracts locations from assigned orders (PostGIS)
2. Calls Mapbox Optimization API v2
3. Applies solution: updates order sequence and ETAs
4. Stores route geometry (GeoJSON)
5. Updates run status to PLANNED
6. Returns optimization summary

**Response:**
```json
{
  "success": true,
  "data": {
    "code": "ok",
    "summary": {
      "distance": 12543.5,
      "duration": 1847,
      "service": 900,
      "violations": []
    },
    "routes": [{
      "vehicle_id": "vehicle_1",
      "distance": 12543.5,
      "duration": 1847,
      "geometry": { "type": "LineString", "coordinates": [...] },
      "steps": [...]
    }],
    "unassigned": []
  }
}
```

### Start Delivery Run

```http
POST /api/v1/runs/:id/start
```

Updates status to IN_PROGRESS, sets start time, marks orders as IN_PROGRESS.

### Complete Delivery Run

```http
POST /api/v1/runs/:id/complete
```

Updates status to COMPLETED, sets end time.

---

## Webhooks

### Shopify Order Webhook

```http
POST /api/v1/webhooks/shopify
X-Shopify-Topic: orders/create
X-Shopify-Shop-Domain: your-shop.myshopify.com
X-Shopify-Hmac-Sha256: signature

{
  // Shopify order payload
}
```

**Supported Topics:**
- `orders/create` - Imports order, creates customer, geocodes address
- `orders/updated` - Updates existing order
- `orders/cancelled` - Marks order as CANCELLED

HMAC signature is verified automatically.

---

## Error Responses

All errors follow this format:

```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Error message here",
  "errors": [
    {
      "path": "field.name",
      "message": "Validation error"
    }
  ]
}
```

**Common Status Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid webhook signature)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `500` - Internal Server Error

---

## Data Models

### Order Status Flow

```
PENDING → CONFIRMED → ASSIGNED → IN_PROGRESS → DELIVERED
                                              ↘ FAILED
                                              ↘ CANCELLED
```

### Run Status Flow

```
DRAFT → PLANNED → ASSIGNED → IN_PROGRESS → COMPLETED
                                         ↘ CANCELLED
```

---

## Complete Workflow Example

### 1. Create or Import Orders

```bash
# Via API
POST /api/v1/orders

# Or via Shopify webhook (automatic)
```

### 2. Create Delivery Run

```bash
POST /api/v1/runs
{
  "name": "Morning Route",
  "scheduledDate": "2024-01-20",
  "driverId": "...",
  "vehicleId": "..."
}
```

### 3. Assign Orders

```bash
POST /api/v1/runs/{runId}/assign
{
  "orderIds": ["order1", "order2", "order3"]
}
```

### 4. Optimize Route

```bash
POST /api/v1/runs/{runId}/optimize
{
  "startLocation": [-79.3871, 43.6426],
  "endLocation": [-79.3871, 43.6426]
}
```

This uses Mapbox to calculate the optimal sequence.

### 5. Start Run

```bash
POST /api/v1/runs/{runId}/start
```

### 6. Complete Run

```bash
POST /api/v1/runs/{runId}/complete
```

---

## Rate Limits

Currently no rate limiting implemented.

## Pagination

All list endpoints support pagination:
- Default: 20 items per page
- Max: 100 items per page
- Response includes `pagination` object with total count and pages

---

For more details, see:
- [SETUP.md](./SETUP.md) - Installation guide
- [GETTING_STARTED.md](./GETTING_STARTED.md) - Tutorial with examples
- [README.md](./README.md) - Project overview

# Drivers API

Complete driver management API with availability tracking, scheduling, and delivery run assignment.

## Features

- Driver profile management (CRUD operations)
- Driver status management (ACTIVE, INACTIVE, ON_LEAVE)
- Working hours configuration
- Availability tracking for run assignment
- Delivery run history
- Filtering and pagination

## API Endpoints

All endpoints require authentication. Admin and Dispatcher roles can manage drivers, all users can view drivers.

### POST /api/v1/drivers
Create a new driver.

**Access**: Admin, Dispatcher

**Request:**
```json
{
  "email": "john@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "licenseNumber": "D1234567",
  "status": "ACTIVE",
  "startTime": "08:00",
  "endTime": "17:00",
  "traccarDeviceId": "device123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "licenseNumber": "D1234567",
    "status": "ACTIVE",
    "startTime": "08:00",
    "endTime": "17:00",
    "traccarDeviceId": "device123",
    "createdAt": "2023-12-18T10:00:00.000Z"
  }
}
```

### GET /api/v1/drivers
List all drivers with filtering and pagination.

**Access**: All authenticated users

**Query Parameters:**
- `status` - Filter by DriverStatus (ACTIVE, INACTIVE, ON_LEAVE)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Example:**
```
GET /api/v1/drivers?status=ACTIVE&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "status": "ACTIVE",
      "phone": "+1234567890"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

### GET /api/v1/drivers/available
Get available drivers for a specific date.

**Access**: All authenticated users

**Query Parameters:**
- `date` (required) - ISO date string for the scheduled date

**Example:**
```
GET /api/v1/drivers/available?date=2023-12-20T00:00:00Z
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "status": "ACTIVE",
      "startTime": "08:00",
      "endTime": "17:00"
    }
  ]
}
```

### GET /api/v1/drivers/:id
Get a single driver by ID.

**Access**: All authenticated users

**Query Parameters:**
- `includeRuns` (optional) - Include delivery runs (true/false)

**Example:**
```
GET /api/v1/drivers/clxxx?includeRuns=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "licenseNumber": "D1234567",
    "status": "ACTIVE",
    "startTime": "08:00",
    "endTime": "17:00",
    "deliveryRuns": [
      {
        "id": "run1",
        "name": "Route 1",
        "status": "IN_PROGRESS",
        "scheduledDate": "2023-12-20T00:00:00.000Z"
      }
    ]
  }
}
```

### PUT /api/v1/drivers/:id
Update a driver.

**Access**: Admin, Dispatcher

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "status": "ON_LEAVE",
  "startTime": "09:00",
  "endTime": "18:00"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "status": "ON_LEAVE",
    "startTime": "09:00",
    "endTime": "18:00",
    ...
  }
}
```

### DELETE /api/v1/drivers/:id
Delete a driver.

**Access**: Admin, Dispatcher

**Response:**
```
HTTP 204 No Content
```

## Driver Status

- **ACTIVE**: Driver is available for assignments
- **INACTIVE**: Driver is not available (off-duty, terminated)
- **ON_LEAVE**: Driver is temporarily unavailable (vacation, sick leave)

## Working Hours

Drivers can have configured working hours:
- `startTime` - Start of shift (HH:mm format, e.g., "08:00")
- `endTime` - End of shift (HH:mm format, e.g., "17:00")

These are used for:
- Availability calculations
- Route optimization constraints
- Preventing over-scheduling

## Availability Tracking

The `/available` endpoint returns drivers who:
1. Have status = ACTIVE
2. Don't have a delivery run on the specified date
3. Are within their working hours

## Traccar Integration

Optional GPS tracking device integration:
- `traccarDeviceId` - ID of GPS device in Traccar system
- Used for real-time location tracking during deliveries
- Required for live map updates

## Delivery Run History

When `includeRuns=true` query parameter is used, the response includes:
- All delivery runs assigned to the driver
- Run status and scheduled dates
- Useful for:
  - Performance tracking
  - Schedule visualization
  - Historical analytics

## License Number

`licenseNumber` field stores driver's license information:
- Required for compliance and insurance
- Not exposed to non-admin users
- Validated on creation

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
- `404` - Driver not found
- `500` - Internal server error

## Code Examples

### Creating a driver
```typescript
const response = await fetch('/api/v1/drivers', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'john@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    licenseNumber: 'D1234567',
    status: 'ACTIVE',
    startTime: '08:00',
    endTime: '17:00',
  }),
});

const { data } = await response.json();
console.log('Driver created:', data.id);
```

### Getting available drivers
```typescript
const date = '2023-12-20T00:00:00Z';
const response = await fetch(`/api/v1/drivers/available?date=${date}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});

const { data } = await response.json();
console.log(`${data.length} drivers available`);
```

### Updating driver status
```typescript
const driverId = 'clxxx...';
const response = await fetch(`/api/v1/drivers/${driverId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    status: 'ON_LEAVE',
  }),
});

const { data } = await response.json();
console.log('Driver status updated:', data.status);
```

## Performance Considerations

- Drivers table has indexes on: email, status
- Pagination enforced (max 100 items per page)
- Availability queries check run assignments efficiently
- Delivery run inclusion adds JOIN overhead

## Integration Points

- **Delivery Runs** - Driver assignment and routing
- **Vehicles** - Driver-vehicle pairing for runs
- **Traccar** - Real-time GPS tracking
- **Authentication** - User-driver relationship
- **Real-time Tracking** - Location updates during delivery

## Related Modules

- **Vehicles** - Fleet management
- **Delivery Runs** - Route planning and execution
- **Tracking** - Real-time location tracking
- **Authentication** - User roles and permissions

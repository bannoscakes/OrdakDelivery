# Vehicles API

Complete vehicle fleet management API with availability tracking, capacity constraints, and delivery run assignment.

## Features

- Vehicle fleet management (CRUD operations)
- Vehicle types (CAR, VAN, TRUCK, BIKE, MOTORCYCLE)
- Capacity constraints (weight, volume, max stops)
- Active/inactive status tracking
- Availability tracking for run assignment
- Delivery run history
- Filtering and pagination

## API Endpoints

All endpoints require authentication. Admin and Dispatcher roles can manage vehicles, all users can view vehicles.

### POST /api/v1/vehicles
Create a new vehicle.

**Access**: Admin, Dispatcher

**Request:**
```json
{
  "licensePlate": "ABC123",
  "make": "Ford",
  "model": "Transit",
  "year": 2023,
  "type": "VAN",
  "maxWeight": 1500.0,
  "maxVolume": 10.5,
  "maxStops": 50,
  "traccarDeviceId": "vehicle123",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "licensePlate": "ABC123",
    "make": "Ford",
    "model": "Transit",
    "year": 2023,
    "type": "VAN",
    "maxWeight": 1500.0,
    "maxVolume": 10.5,
    "maxStops": 50,
    "traccarDeviceId": "vehicle123",
    "isActive": true,
    "createdAt": "2023-12-18T10:00:00.000Z"
  }
}
```

### GET /api/v1/vehicles
List all vehicles with filtering and pagination.

**Access**: All authenticated users

**Query Parameters:**
- `type` - Filter by VehicleType (CAR, VAN, TRUCK, BIKE, MOTORCYCLE)
- `isActive` - Filter by active status (true/false)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Example:**
```
GET /api/v1/vehicles?type=VAN&isActive=true&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "licensePlate": "ABC123",
      "make": "Ford",
      "model": "Transit",
      "year": 2023,
      "type": "VAN",
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "totalPages": 1
  }
}
```

### GET /api/v1/vehicles/available
Get available vehicles for a specific date.

**Access**: All authenticated users

**Query Parameters:**
- `date` (required) - ISO date string for the scheduled date

**Example:**
```
GET /api/v1/vehicles/available?date=2023-12-20T00:00:00Z
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clxxx...",
      "licensePlate": "ABC123",
      "make": "Ford",
      "model": "Transit",
      "type": "VAN",
      "maxWeight": 1500.0,
      "maxVolume": 10.5,
      "maxStops": 50,
      "isActive": true
    }
  ]
}
```

### GET /api/v1/vehicles/:id
Get a single vehicle by ID.

**Access**: All authenticated users

**Query Parameters:**
- `includeRuns` (optional) - Include delivery runs (true/false)

**Example:**
```
GET /api/v1/vehicles/clxxx?includeRuns=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "licensePlate": "ABC123",
    "make": "Ford",
    "model": "Transit",
    "year": 2023,
    "type": "VAN",
    "maxWeight": 1500.0,
    "maxVolume": 10.5,
    "maxStops": 50,
    "traccarDeviceId": "vehicle123",
    "isActive": true,
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

### PUT /api/v1/vehicles/:id
Update a vehicle.

**Access**: Admin, Dispatcher

**Request:**
```json
{
  "licensePlate": "ABC124",
  "isActive": false,
  "maxStops": 60
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clxxx...",
    "licensePlate": "ABC124",
    "isActive": false,
    "maxStops": 60,
    ...
  }
}
```

### DELETE /api/v1/vehicles/:id
Delete a vehicle.

**Access**: Admin, Dispatcher

**Response:**
```
HTTP 204 No Content
```

## Vehicle Types

- **CAR**: Standard passenger car
- **VAN**: Cargo van or delivery van
- **TRUCK**: Box truck or larger commercial vehicle
- **BIKE**: Bicycle for urban deliveries
- **MOTORCYCLE**: Motorcycle or scooter

## Capacity Constraints

Vehicles can have three types of capacity constraints:

### Weight Capacity
- `maxWeight` - Maximum cargo weight in kilograms
- Used by route optimization to prevent overloading
- Example: Van with 1500kg capacity

### Volume Capacity
- `maxVolume` - Maximum cargo volume in cubic meters
- Used for bulky items that may not be heavy
- Example: Van with 10.5m³ capacity

### Stop Capacity
- `maxStops` - Maximum number of delivery stops per run
- Limits route length based on vehicle capabilities
- Example: Bike limited to 15 stops, truck can handle 50+

**Optimization Behavior:**
- Route optimization respects all capacity constraints
- Orders are distributed across multiple runs if needed
- Vehicles with higher capacity get priority for large runs

## Active/Inactive Status

- **isActive: true** - Vehicle available for assignments
- **isActive: false** - Vehicle out of service (maintenance, decommissioned)

Inactive vehicles:
- Don't appear in availability queries
- Can't be assigned to new runs
- Existing run assignments remain valid

## Availability Tracking

The `/available` endpoint returns vehicles that:
1. Have `isActive = true`
2. Don't have a delivery run on the specified date
3. Are not under maintenance

## Traccar Integration

Optional GPS tracking device integration:
- `traccarDeviceId` - ID of GPS device in Traccar system
- Used for real-time location tracking during deliveries
- Enables live map updates and route monitoring

## Delivery Run History

When `includeRuns=true` query parameter is used, the response includes:
- All delivery runs assigned to the vehicle
- Run status and scheduled dates
- Useful for:
  - Utilization tracking
  - Maintenance scheduling
  - Fleet analytics

## License Plate Validation

- `licensePlate` must be unique across all vehicles
- Format not enforced (varies by jurisdiction)
- Used for identification and compliance

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
- `400` - Bad request (validation error, duplicate license plate)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Vehicle not found
- `500` - Internal server error

## Code Examples

### Creating a vehicle
```typescript
const response = await fetch('/api/v1/vehicles', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    licensePlate: 'ABC123',
    make: 'Ford',
    model: 'Transit',
    year: 2023,
    type: 'VAN',
    maxWeight: 1500.0,
    maxVolume: 10.5,
    maxStops: 50,
    isActive: true,
  }),
});

const { data } = await response.json();
console.log('Vehicle created:', data.id);
```

### Getting available vehicles
```typescript
const date = '2023-12-20T00:00:00Z';
const response = await fetch(`/api/v1/vehicles/available?date=${date}`, {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});

const { data } = await response.json();
console.log(`${data.length} vehicles available`);
```

### Updating vehicle status
```typescript
const vehicleId = 'clxxx...';
const response = await fetch(`/api/v1/vehicles/${vehicleId}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    isActive: false, // Take out of service
  }),
});

const { data } = await response.json();
console.log('Vehicle status updated:', data.isActive);
```

### Filtering vehicles by type
```typescript
const response = await fetch('/api/v1/vehicles?type=VAN&isActive=true', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});

const { data } = await response.json();
console.log('Active vans:', data.length);
```

## Fleet Management Best Practices

1. **Regular Maintenance**: Mark vehicles inactive during maintenance
2. **Capacity Planning**: Set realistic capacity constraints based on vehicle specs
3. **Type Classification**: Use appropriate vehicle types for route optimization
4. **Utilization Tracking**: Use delivery run history to identify underutilized vehicles
5. **GPS Tracking**: Integrate Traccar for all vehicles for real-time visibility

## Performance Considerations

- Vehicles table has indexes on: licensePlate, type, isActive
- Pagination enforced (max 100 items per page)
- Availability queries check run assignments efficiently
- Delivery run inclusion adds JOIN overhead

## Integration Points

- **Delivery Runs** - Vehicle assignment and routing
- **Drivers** - Driver-vehicle pairing for runs
- **Route Optimization** - Capacity constraint enforcement
- **Traccar** - Real-time GPS tracking
- **Analytics** - Fleet utilization reporting

## Related Modules

- **Drivers** - Driver management
- **Delivery Runs** - Route planning and execution
- **Tracking** - Real-time location tracking
- **Authentication** - User roles and permissions

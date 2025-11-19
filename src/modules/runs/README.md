# Delivery Runs API

Complete delivery run management API with route optimization, driver assignment, and real-time tracking.

## Features

- Create and manage delivery runs
- Assign/unassign orders to runs
- Route optimization using Mapbox Optimization API
- Driver and vehicle assignment
- Run lifecycle management (DRAFT → PLANNED → IN_PROGRESS → COMPLETED)
- Real-time status updates
- Statistics tracking (total stops, completed stops)

## API Endpoints

All endpoints require authentication. Admin and Dispatcher roles can manage runs, Drivers can start/complete their assigned runs.

### POST /api/v1/runs
Create a new delivery run.

**Access**: Admin, Dispatcher

**Request:**
```json
{
  "name": "Route 1 - Downtown",
  "scheduledDate": "2023-12-20T00:00:00Z",
  "driverId": "clxxx...",
  "vehicleId": "clyy...",
  "orderIds": ["order1", "order2", "order3"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clzzz...",
    "name": "Route 1 - Downtown",
    "status": "DRAFT",
    "scheduledDate": "2023-12-20T00:00:00.000Z",
    "driverId": "clxxx...",
    "vehicleId": "clyy...",
    "totalStops": 3,
    "completedStops": 0,
    "createdAt": "2023-12-18T10:00:00.000Z"
  }
}
```

### GET /api/v1/runs
List delivery runs with filtering and pagination.

**Access**: All authenticated users

**Query Parameters:**
- `status` - Filter by RunStatus (DRAFT, PLANNED, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED)
- `driverId` - Filter by driver ID
- `scheduledAfter` - ISO date string
- `scheduledBefore` - ISO date string
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Example:**
```
GET /api/v1/runs?status=IN_PROGRESS&driverId=clxxx&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "clzzz...",
      "name": "Route 1 - Downtown",
      "status": "IN_PROGRESS",
      "scheduledDate": "2023-12-20T00:00:00.000Z",
      "driver": {
        "id": "clxxx...",
        "firstName": "John",
        "lastName": "Doe"
      },
      "vehicle": {
        "id": "clyy...",
        "licensePlate": "ABC123"
      },
      "totalStops": 10,
      "completedStops": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "totalPages": 1
  }
}
```

### GET /api/v1/runs/:id
Get a single delivery run by ID with all orders.

**Access**: All authenticated users

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clzzz...",
    "name": "Route 1 - Downtown",
    "status": "IN_PROGRESS",
    "scheduledDate": "2023-12-20T00:00:00.000Z",
    "startTime": "2023-12-20T08:30:00.000Z",
    "driver": {...},
    "vehicle": {...},
    "orders": [
      {
        "id": "order1",
        "orderNumber": "ORD-001",
        "sequenceInRun": 1,
        "status": "DELIVERED",
        "customer": {...},
        "estimatedArrival": "2023-12-20T09:00:00.000Z"
      },
      {
        "id": "order2",
        "orderNumber": "ORD-002",
        "sequenceInRun": 2,
        "status": "IN_PROGRESS",
        "estimatedArrival": "2023-12-20T09:30:00.000Z"
      }
    ],
    "routeGeometry": {...},
    "totalDistance": 15000,
    "totalDuration": 3600,
    "totalStops": 10,
    "completedStops": 1
  }
}
```

### PUT /api/v1/runs/:id
Update a delivery run.

**Access**: Admin, Dispatcher

**Request:**
```json
{
  "name": "Route 1 - Updated",
  "status": "PLANNED",
  "driverId": "clxxx...",
  "vehicleId": "clyy...",
  "startTime": "2023-12-20T08:00:00Z",
  "endTime": "2023-12-20T17:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clzzz...",
    "name": "Route 1 - Updated",
    "status": "PLANNED",
    ...
  }
}
```

### DELETE /api/v1/runs/:id
Delete a delivery run.

**Access**: Admin, Dispatcher

**Response:**
```
HTTP 204 No Content
```

### POST /api/v1/runs/:id/assign
Assign orders to a delivery run.

**Access**: Admin, Dispatcher

**Request:**
```json
{
  "orderIds": ["order1", "order2", "order3"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Orders assigned successfully"
}
```

### POST /api/v1/runs/:id/unassign
Remove orders from a delivery run.

**Access**: Admin, Dispatcher

**Request:**
```json
{
  "orderIds": ["order1", "order2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Orders unassigned successfully"
}
```

### POST /api/v1/runs/:id/optimize
Optimize the route using Mapbox Optimization API.

**Access**: Admin, Dispatcher

**Request:**
```json
{
  "startLocation": [-79.3832, 43.6532],
  "endLocation": [-79.3832, 43.6532]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "optimizedRoute": [...],
    "totalDistance": 15000,
    "totalDuration": 3600,
    "orderedStops": [
      {
        "orderId": "order2",
        "sequence": 1,
        "arrivalTime": "2023-12-20T09:00:00Z"
      },
      {
        "orderId": "order1",
        "sequence": 2,
        "arrivalTime": "2023-12-20T09:30:00Z"
      }
    ]
  }
}
```

### POST /api/v1/runs/:id/start
Start a delivery run (sets status to IN_PROGRESS).

**Access**: Driver (own runs), Admin, Dispatcher (any run)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clzzz...",
    "status": "IN_PROGRESS",
    "startTime": "2023-12-20T08:30:00.000Z",
    ...
  }
}
```

### POST /api/v1/runs/:id/complete
Complete a delivery run (sets status to COMPLETED).

**Access**: Driver (own runs), Admin, Dispatcher (any run)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "clzzz...",
    "status": "COMPLETED",
    "endTime": "2023-12-20T16:00:00.000Z",
    "completedStops": 10,
    ...
  }
}
```

## Run Status Lifecycle

```
DRAFT → PLANNED → ASSIGNED → IN_PROGRESS → COMPLETED
  ↓        ↓          ↓            ↓
CANCELLED CANCELLED CANCELLED CANCELLED
```

### Status Descriptions

- **DRAFT**: Run created, not yet planned
- **PLANNED**: Route optimized, ready for assignment
- **ASSIGNED**: Driver and vehicle assigned
- **IN_PROGRESS**: Driver started the run
- **COMPLETED**: All deliveries completed
- **CANCELLED**: Run cancelled

## Route Optimization

The `/optimize` endpoint uses the Mapbox Optimization API to:
1. Calculate optimal stop sequence considering time windows
2. Minimize total travel time and distance
3. Generate turn-by-turn directions
4. Calculate ETAs for each stop
5. Store optimized route geometry as GeoJSON

**Optimization Considerations:**
- Order time windows are respected
- Vehicle capacity constraints (if configured)
- Driver working hours
- Traffic patterns (if enabled)

## Driver Assignment

Runs can be assigned to drivers in two ways:

1. **At creation**: Include `driverId` in POST /runs request
2. **Update later**: Use PUT /runs/:id to assign driver

**Driver Permissions:**
- Drivers can only start/complete their own assigned runs
- Drivers can view all runs but only interact with assigned ones
- Admin/Dispatcher can manage all runs

## Vehicle Assignment

Vehicles track:
- License plate and type (CAR, VAN, TRUCK)
- Capacity constraints (maxWeight, maxVolume, maxStops)
- Active/inactive status

Route optimization considers vehicle constraints.

## Statistics Tracking

Each run tracks:
- `totalStops` - Total number of orders in run
- `completedStops` - Number of delivered orders
- `totalDistance` - Route distance in meters
- `totalDuration` - Route duration in seconds

Statistics auto-update as orders are delivered.

## Route Geometry

Optimized routes store GeoJSON LineString geometry from Mapbox:
```json
{
  "type": "LineString",
  "coordinates": [
    [-79.3832, 43.6532],
    [-79.3835, 43.6540],
    ...
  ]
}
```

Used for:
- Map visualization
- Driver navigation
- Progress tracking
- Analytics

## Integration Points

- **Orders Module**: Assign orders to runs, update delivery status
- **Drivers Module**: Driver assignment and tracking
- **Vehicles Module**: Vehicle assignment and capacity
- **Geocoding**: Address geocoding for route optimization
- **Mapbox API**: Route optimization and navigation
- **Real-time Tracking**: Location updates during run

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
- `404` - Run not found
- `500` - Internal server error

## Code Examples

### Creating a run with orders
```typescript
const response = await fetch('/api/v1/runs', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Route 1 - Downtown',
    scheduledDate: '2023-12-20T00:00:00Z',
    driverId: 'clxxx...',
    vehicleId: 'clyy...',
    orderIds: ['order1', 'order2', 'order3'],
  }),
});

const { data } = await response.json();
console.log('Run created:', data.id);
```

### Optimizing a route
```typescript
const runId = 'clzzz...';
const response = await fetch(`/api/v1/runs/${runId}/optimize`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    startLocation: [-79.3832, 43.6532], // [longitude, latitude]
    endLocation: [-79.3832, 43.6532],
  }),
});

const { data } = await response.json();
console.log(`Optimized route: ${data.totalDistance}m in ${data.totalDuration}s`);
```

### Starting a run (Driver)
```typescript
const runId = 'clzzz...';
const response = await fetch(`/api/v1/runs/${runId}/start`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${driverAccessToken}`,
  },
});

const { data } = await response.json();
console.log('Run started at:', data.startTime);
```

## Performance Considerations

- Runs table has indexes on: status, scheduledDate, driverId
- Route optimization is async for large runs (10+ stops)
- Pagination enforced (max 100 items per page)
- Route geometry stored as JSON for fast retrieval

## Related Modules

- **Orders** - Order management and delivery
- **Drivers** - Driver profiles and scheduling
- **Vehicles** - Fleet management
- **Mapbox Services** - Route optimization and geocoding
- **Tracking** - Real-time location tracking

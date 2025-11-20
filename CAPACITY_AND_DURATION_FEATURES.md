# Vehicle Capacity Constraints + Service Duration Features

## Overview
Implemented comprehensive vehicle capacity validation and configurable service duration for route optimization. These features ensure realistic route planning by respecting vehicle weight/volume limits and accounting for time spent at each delivery stop.

**Status:** ✅ COMPLETE (BUILD MODE)
**Date:** 2025-11-20
**Related PRs:** TBD

---

## Table of Contents
1. [Part 1: Vehicle Capacity Validation](#part-1-vehicle-capacity-validation)
2. [Part 2: Service Duration in Optimization](#part-2-service-duration-in-optimization)
3. [Part 3: Configuration](#part-3-configuration)
4. [Implementation Details](#implementation-details)
5. [Usage Examples](#usage-examples)
6. [Testing Checklist](#testing-checklist)

---

## Part 1: Vehicle Capacity Validation

### Features Implemented

#### 1. **Capacity Checking on Order Assignment**
When creating a run or adding orders to an existing run:
- Calculates total weight (kg) of all orders
- Calculates total packages/volume of all orders
- Compares against vehicle `capacityKg` and `capacityCubicM`
- Throws descriptive error if capacity exceeded

**Error Messages:**
```
Orders exceed vehicle weight capacity (150.50 kg / 100.00 kg)
Orders exceed vehicle capacity (25 packages / ~2.50 m³)
```

#### 2. **New Public Method: `validateRunCapacity()`**
```typescript
async validateRunCapacity(runId: string): Promise<boolean>
```

**Purpose:** Validate if all orders in a run fit within the assigned vehicle's capacity

**Returns:**
- `true` - Capacity is valid
- `false` - Capacity is exceeded

**Throws:**
- `AppError(404)` - Run not found
- `AppError(400)` - Run has no assigned vehicle

**Behavior:**
- Logs warnings when capacity is exceeded
- Checks both weight capacity and cubic capacity
- Uses package count as proxy for cubic capacity (0.1 m³ per package)

#### 3. **Private Helper Methods**

**`calculateRunCapacity()`**
```typescript
private calculateRunCapacity(orders: Array<{ weightKg: any; packageCount: number }>)
```
- Sums total weight from all orders
- Sums total package count from all orders
- Returns `{ totalWeightKg: number, totalPackages: number }`

**`checkCapacityForOrders()`**
```typescript
private async checkCapacityForOrders(
  runId: string,
  orderIds: string[]
): Promise<{ valid: boolean; error?: string }>
```
- Validates capacity BEFORE assigning orders
- Checks combined capacity of existing + new orders
- Returns validation result with descriptive error message

#### 4. **Enhanced Order Assignment**
Updated `assignOrders()` method:
- **Before:** Directly assigns orders to run
- **After:** Validates capacity first, then assigns
- Only checks capacity if vehicle is assigned to run
- Throws `AppError(400)` with descriptive message if capacity exceeded

#### 5. **Enhanced Run Creation**
Updated `createRun()` method:
- Validates capacity when orders are assigned during creation
- Properly propagates `AppError` exceptions
- Ensures capacity validation happens before database commit

---

## Part 2: Service Duration in Optimization

### Features Implemented

#### 1. **Dynamic Service Duration by Order Type**
Each stop in the route now includes a service duration representing:
- Parking time
- Unloading time
- Delivery/pickup time
- Customer interaction time

**Default Values:**
- `delivery` orders: **300 seconds (5 minutes)**
- `pickup` orders: **180 seconds (3 minutes)** - typically faster

#### 2. **Updated Mapbox Optimization Payload**

**Services (Stops):**
```typescript
{
  id: order.id,
  location: [lon, lat],
  service_duration: 300,        // ✅ Time spent at stop (seconds)
  delivery: [order.weightKg],   // ✅ Capacity consumed by this order
  time_windows: [[start, end]], // Optional time constraints
  priority: 1                   // Optional priority
}
```

**Vehicles:**
```typescript
{
  vehicle_id: 'vehicle_1',
  start_location: [lon, lat],
  end_location: [lon, lat],     // Optional
  capacity: [capacityKg]        // ✅ Weight capacity constraint
}
```

#### 3. **Enhanced Order Location Extraction**
Updated `extractOrderLocations()` method:
- Gets service duration based on order type using `getServiceDuration()`
- Includes `weightKg` for capacity constraints
- Includes `packageCount` for future volume-based constraints
- Maintains support for time windows

**Example output:**
```typescript
{
  id: "order-123",
  location: [-79.3832, 43.6532],
  serviceDuration: 300,           // 5 min for delivery
  weightKg: 15.5,                 // 15.5 kg order
  packageCount: 2,                // 2 packages
  timeWindow: [1700000000, 1700007200] // Optional
}
```

#### 4. **Enhanced Optimization Request Builder**
Updated `buildOptimizationRequest()` in MapboxOptimizationService:
- Accepts `vehicleCapacityKg` parameter
- Maps vehicle capacity to Mapbox format: `capacity: [kg]`
- Maps order weights to Mapbox format: `delivery: [kg]`
- Sets default service duration (300s) if not provided
- Includes comprehensive JSDoc comments

#### 5. **Optimization Logging**
Enhanced logging in `optimizeRun()`:
```typescript
logger.info('Starting route optimization', {
  runId: 'run-123',
  stops: 15,
  vehicleCapacityKg: 500
});

logger.info('Route optimization completed', {
  runId: 'run-123',
  distance: 25400,      // meters
  duration: 3600,       // seconds (includes driving + service time)
  service: 4500         // ✅ Total service time at stops
});
```

---

## Part 3: Configuration

### Service Duration Configuration

**File:** `src/constants/time.ts`

#### 1. **Constants**
```typescript
export const DEFAULT_SERVICE_DURATION_SECONDS = 300; // 5 minutes

export const SERVICE_DURATION_BY_TYPE: Record<OrderType, number> = {
  delivery: 300, // 5 minutes for deliveries
  pickup: 180,   // 3 minutes for pickups
};
```

#### 2. **Helper Function**
```typescript
export function getServiceDuration(
  orderType: OrderType | null | undefined
): number
```

**Behavior:**
- Returns type-specific duration if order type is provided
- Returns `DEFAULT_SERVICE_DURATION_SECONDS` if type is null/undefined
- Handles all edge cases safely

**Usage:**
```typescript
import { getServiceDuration } from '@/constants/time';

const duration = getServiceDuration(order.type);
// delivery → 300 seconds
// pickup → 180 seconds
// null → 300 seconds (default)
```

#### 3. **Customization Guide**

**To change service durations:**
```typescript
// In src/constants/time.ts
export const SERVICE_DURATION_BY_TYPE: Record<OrderType, number> = {
  delivery: 360, // 6 minutes for deliveries
  pickup: 240,   // 4 minutes for pickups
};
```

**To add per-order custom durations (future enhancement):**
```typescript
// Add to Order model:
serviceDurationSeconds?: number

// Update extractOrderLocations():
serviceDuration: order.serviceDurationSeconds || getServiceDuration(order.type)
```

---

## Implementation Details

### Files Modified

| File | Changes | Lines Changed |
|------|---------|---------------|
| `src/constants/time.ts` | Added service duration config | +26 |
| `src/modules/runs/runs.service.ts` | Added capacity validation, updated optimization | +182 |
| `src/services/mapbox/optimization.service.ts` | Updated request builder with capacity/duration | +21 |

### Database Schema Dependencies

**Order Model:**
```prisma
weightKg         Decimal?   // Weight in kilograms
packageCount     Int        // Number of packages
type             OrderType? // delivery or pickup
```

**Vehicle Model:**
```prisma
capacityKg       Decimal?  // Weight capacity in kg
capacityCubicM   Decimal?  // Volume capacity in cubic meters
```

**DeliveryRun Model:**
```prisma
vehicleId        String?   // Foreign key to Vehicle
```

---

## Usage Examples

### Example 1: Create Run with Capacity Validation

```typescript
// POST /api/v1/runs
{
  "name": "Morning Deliveries",
  "scheduledDate": "2025-11-21",
  "vehicleId": "vehicle-van-001",
  "driverId": "driver-john",
  "orderIds": ["order-1", "order-2", "order-3"]
}
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "id": "run-123",
    "runNumber": "RUN-20251121-001",
    "totalOrders": 3,
    "vehicle": {
      "capacityKg": 500,
      "capacityCubicM": 10
    }
  }
}
```

**Error Response (Capacity Exceeded):**
```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Orders exceed vehicle weight capacity (550.00 kg / 500.00 kg)"
}
```

### Example 2: Assign Orders to Existing Run

```typescript
// POST /api/v1/runs/:id/orders/assign
{
  "orderIds": ["order-4", "order-5"]
}
```

**Capacity Check:**
- Existing orders: 300 kg, 15 packages
- New orders: 150 kg, 8 packages
- Total: 450 kg, 23 packages
- Vehicle capacity: 500 kg, 15 m³
- Result: ✅ Passes weight, ❌ Fails volume (23 * 0.1 = 2.3 m³ > 1.5 m³)

**Error:**
```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Orders exceed vehicle capacity (23 packages / ~2.30 m³)"
}
```

### Example 3: Optimize Run with Capacity Constraints

```typescript
// POST /api/v1/runs/:id/optimize
{
  "startLocation": [-79.3832, 43.6532],
  "endLocation": [-79.3832, 43.6532]
}
```

**Optimization Request to Mapbox:**
```json
{
  "vehicles": [
    {
      "vehicle_id": "vehicle_1",
      "start_location": [-79.3832, 43.6532],
      "end_location": [-79.3832, 43.6532],
      "capacity": [500]
    }
  ],
  "services": [
    {
      "id": "order-1",
      "location": [-79.3900, 43.6500],
      "service_duration": 300,
      "delivery": [25.5]
    },
    {
      "id": "order-2",
      "location": [-79.4000, 43.6600],
      "service_duration": 180,
      "delivery": [15.0]
    }
  ],
  "options": {
    "geometry_format": "geojson"
  }
}
```

**Optimization Response:**
```json
{
  "code": "Ok",
  "summary": {
    "distance": 25400,
    "duration": 3600,
    "service": 480,
    "cost": 29
  },
  "routes": [
    {
      "distance": 25400,
      "duration": 3600,
      "service": 480,
      "steps": [...]
    }
  ]
}
```

**Key Insights:**
- `duration: 3600` = Driving time (3120s) + Service time (480s)
- `service: 480` = Total time at stops (300s + 180s)
- Mapbox respects capacity: Won't assign more than 500 kg to this vehicle

### Example 4: Validate Run Capacity

```typescript
// GET /api/v1/runs/:id/validate-capacity
const isValid = await runsService.validateRunCapacity('run-123');

if (!isValid) {
  // Capacity exceeded - check logs for details
  // Consider reassigning orders or using larger vehicle
}
```

---

## Testing Checklist

### Unit Tests (When Database Connected)

- [ ] **calculateRunCapacity()**
  - [ ] Calculates correct weight sum
  - [ ] Calculates correct package count
  - [ ] Handles null/undefined weights
  - [ ] Handles Decimal types correctly

- [ ] **validateRunCapacity()**
  - [ ] Returns true when capacity is valid
  - [ ] Returns false when weight exceeds capacity
  - [ ] Returns false when volume exceeds capacity
  - [ ] Throws 404 for non-existent run
  - [ ] Throws 400 for run without vehicle
  - [ ] Logs warnings on capacity exceeded

- [ ] **checkCapacityForOrders()**
  - [ ] Validates combined capacity (existing + new orders)
  - [ ] Returns descriptive error messages
  - [ ] Handles runs without vehicles
  - [ ] Correctly calculates cubic capacity estimate

- [ ] **assignOrders()**
  - [ ] Validates capacity before assignment
  - [ ] Throws AppError on capacity exceeded
  - [ ] Skips capacity check when no vehicle assigned
  - [ ] Updates order status to 'assigned'
  - [ ] Updates run totalOrders count

- [ ] **createRun()**
  - [ ] Validates capacity when orders provided
  - [ ] Creates run without orders successfully
  - [ ] Propagates capacity errors correctly
  - [ ] Creates run with orders when capacity valid

- [ ] **extractOrderLocations()**
  - [ ] Gets correct service duration for delivery orders
  - [ ] Gets correct service duration for pickup orders
  - [ ] Uses default duration for null order type
  - [ ] Includes weightKg in output
  - [ ] Includes packageCount in output
  - [ ] Throws error for non-geocoded orders

- [ ] **optimizeRun()**
  - [ ] Passes vehicle capacity to Mapbox
  - [ ] Passes order weights to Mapbox
  - [ ] Passes service durations to Mapbox
  - [ ] Logs capacity in optimization start message
  - [ ] Logs service time in optimization complete message

- [ ] **getServiceDuration()**
  - [ ] Returns 300 for 'delivery' type
  - [ ] Returns 180 for 'pickup' type
  - [ ] Returns 300 for null type
  - [ ] Returns 300 for undefined type

### Integration Tests

- [ ] **Create run with valid capacity**
  - [ ] Total weight < vehicle capacity
  - [ ] Total packages fit in vehicle volume
  - [ ] Orders assigned successfully

- [ ] **Create run with exceeded capacity**
  - [ ] Total weight > vehicle capacity
  - [ ] Returns 400 error with descriptive message
  - [ ] Orders not assigned

- [ ] **Assign orders to run (valid)**
  - [ ] Existing + new orders < capacity
  - [ ] Orders assigned successfully
  - [ ] Run totalOrders updated

- [ ] **Assign orders to run (invalid)**
  - [ ] Existing + new orders > capacity
  - [ ] Returns 400 error
  - [ ] Orders remain unassigned

- [ ] **Optimize run with capacity constraints**
  - [ ] Mapbox receives correct capacity
  - [ ] Mapbox receives correct delivery sizes
  - [ ] Mapbox receives correct service durations
  - [ ] Optimization respects constraints
  - [ ] Solution applied to database

- [ ] **Edge cases**
  - [ ] Run without vehicle (capacity check skipped)
  - [ ] Vehicle without capacity fields (treated as unlimited)
  - [ ] Orders without weight (treated as 0 kg)
  - [ ] Orders without type (uses default duration)

### Manual Testing Scenarios

#### Scenario 1: Small Van - Capacity Exceeded
```
Vehicle: Small Van (100 kg, 2 m³)
Orders:
  - Order 1: 40 kg, 2 packages
  - Order 2: 35 kg, 1 package
  - Order 3: 30 kg, 1 package
Total: 105 kg, 4 packages (0.4 m³)
Result: ❌ Weight exceeded
```

#### Scenario 2: Large Truck - All Valid
```
Vehicle: Large Truck (1000 kg, 20 m³)
Orders:
  - Order 1: 150 kg, 10 packages (delivery, 5 min)
  - Order 2: 200 kg, 15 packages (delivery, 5 min)
  - Order 3: 100 kg, 5 packages (pickup, 3 min)
Total: 450 kg, 30 packages (3 m³)
Service Time: 13 minutes
Result: ✅ All constraints met
```

#### Scenario 3: Run Without Vehicle
```
Vehicle: None
Orders: Any
Result: ✅ No capacity validation (allowed for planning)
```

#### Scenario 4: Optimization with Time Windows
```
Vehicle: Van (500 kg)
Orders:
  - Order 1: 8:00-10:00, 50 kg, 5 min service
  - Order 2: 10:00-12:00, 75 kg, 5 min service
  - Order 3: 12:00-14:00, 60 kg, 3 min pickup
Result: ✅ Optimized route respects time windows + capacity
```

---

## Benefits

### 1. **Realistic Route Planning**
- Routes account for actual time spent at each stop
- Different service times for deliveries vs pickups
- More accurate ETA calculations

### 2. **Capacity Management**
- Prevents overloading vehicles
- Reduces failed deliveries due to space constraints
- Improves driver safety and compliance

### 3. **Better Optimization**
- Mapbox considers vehicle weight limits
- Automatically balances load across multiple vehicles (future)
- Respects both time and capacity constraints

### 4. **Flexibility**
- Easy to customize service durations per order type
- Can extend to per-order custom durations
- Supports multiple capacity dimensions (weight, volume)

### 5. **Error Prevention**
- Catches capacity issues before dispatch
- Clear error messages for operators
- Validation at multiple points (create, assign, optimize)

---

## Future Enhancements

### 1. **Volume-Based Capacity**
Currently using package count * 0.1 m³ as proxy for volume. Could enhance:
```prisma
// Add to Order model
volumeCubicM  Decimal?  @db.Decimal(10, 3)
```

Then use actual cubic volume in capacity calculations.

### 2. **Per-Order Service Duration**
Allow specifying custom service duration per order:
```prisma
// Add to Order model
serviceDurationSeconds  Int?  @default(300)
```

### 3. **Multi-Dimensional Capacity**
Support multiple capacity constraints:
```typescript
capacity: [weightKg, volumeCubicM, palletCount]
delivery: [orderWeightKg, orderVolumeCubicM, orderPalletCount]
```

### 4. **Capacity Utilization Metrics**
Add to DeliveryRun model:
```prisma
capacityUtilizationPercent  Decimal?  @db.Decimal(5, 2)
```

Calculate and display capacity usage:
```
Current Load: 450 kg / 500 kg (90% utilized)
```

### 5. **Capacity-Based Run Splitting**
Automatically split runs when capacity exceeded:
```typescript
async splitRunByCapacity(runId: string): Promise<DeliveryRun[]>
```

### 6. **Multi-Vehicle Optimization**
Pass multiple vehicles to Mapbox:
```typescript
vehicles: [
  { vehicle_id: 'van-1', capacity: [500] },
  { vehicle_id: 'truck-1', capacity: [1000] }
]
```

---

## API Impact

### New Endpoints (Recommended)

```typescript
// Validate run capacity
GET /api/v1/runs/:id/validate-capacity
Response: { valid: boolean, errors?: string[] }

// Get capacity utilization
GET /api/v1/runs/:id/capacity
Response: {
  totalWeightKg: 450,
  vehicleCapacityKg: 500,
  utilizationPercent: 90,
  totalPackages: 25,
  estimatedCubicM: 2.5
}
```

### Modified Endpoints

```typescript
// POST /api/v1/runs - Now validates capacity
// POST /api/v1/runs/:id/orders/assign - Now validates capacity
// POST /api/v1/runs/:id/optimize - Now includes capacity constraints

// All return 400 with descriptive errors if capacity exceeded
```

---

## Troubleshooting

### Issue: "Orders exceed vehicle weight capacity"

**Cause:** Total order weight exceeds vehicle's `capacityKg`

**Solutions:**
1. Remove some orders from the run
2. Assign a larger vehicle
3. Split into multiple runs

### Issue: "Orders exceed vehicle capacity (packages / m³)"

**Cause:** Estimated cubic volume exceeds vehicle's `capacityCubicM`

**Note:** Currently using package count * 0.1 m³ as estimate

**Solutions:**
1. Reduce number of orders
2. Use vehicle with larger cubic capacity
3. Wait for actual volumeCubicM field implementation

### Issue: "Run has no assigned vehicle"

**Cause:** Calling `validateRunCapacity()` on run without vehicle

**Solutions:**
1. Assign a vehicle to the run first
2. Capacity validation is skipped if no vehicle assigned

### Issue: Service duration not applied in optimization

**Cause:** Order type is null/undefined

**Check:**
1. Ensure orders have `type` field set (delivery/pickup)
2. Check logs - default duration (300s) is used for null types

### Issue: Mapbox returns "unassigned" orders

**Possible Causes:**
1. Capacity constraints too tight
2. Time windows impossible to meet
3. Service duration makes schedule infeasible

**Solutions:**
1. Increase vehicle capacity
2. Relax time windows
3. Reduce service duration
4. Split into multiple runs

---

## Summary Statistics

| Metric | Value |
|--------|-------|
| **Files Modified** | 3 |
| **Lines Added** | 229 |
| **New Methods** | 4 (3 public, 1 helper) |
| **Enhanced Methods** | 4 |
| **Configuration Constants** | 2 |
| **Default Service Duration** | 300 seconds (5 min) |
| **Pickup Duration** | 180 seconds (3 min) |
| **Capacity Dimensions** | 2 (weight, estimated volume) |

---

**End of Capacity and Duration Features Documentation**

This feature is complete in BUILD MODE and ready for database testing.

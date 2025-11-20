# Vehicle Capacity + Service Duration Implementation Summary

## ✅ IMPLEMENTATION COMPLETE (BUILD MODE)

**Date:** 2025-11-20
**Status:** Ready for testing when database is connected

---

## What Was Implemented

### PART 1: Vehicle Capacity Validation ✅

#### 1. **Public Method: `validateRunCapacity(runId: string)`**
- Validates if all orders in a run fit within vehicle capacity
- Returns `true` if valid, `false` if exceeded
- Checks both weight capacity (kg) and estimated volume (cubic meters)
- Logs warnings when capacity is exceeded

#### 2. **Private Method: `calculateRunCapacity(orders)`**
- Sums total weight from all orders
- Sums total package count
- Returns `{ totalWeightKg, totalPackages }`

#### 3. **Private Method: `checkCapacityForOrders(runId, orderIds)`**
- Validates capacity BEFORE assigning orders
- Checks combined capacity of existing + new orders
- Returns validation result with descriptive error message

#### 4. **Enhanced: `assignOrders(runId, orderIds)`**
- **Before:** Directly assigns orders
- **After:** Validates capacity first, then assigns
- Throws descriptive error if capacity exceeded
- Only checks if vehicle is assigned

#### 5. **Enhanced: `createRun(input)`**
- Validates capacity when orders are assigned during creation
- Properly propagates `AppError` exceptions

**Example Error Messages:**
```
Orders exceed vehicle weight capacity (150.50 kg / 100.00 kg)
Orders exceed vehicle capacity (25 packages / ~2.50 m³)
```

---

### PART 2: Service Duration in Optimization ✅

#### 1. **Service Duration Configuration**
Added to `src/constants/time.ts`:
```typescript
export const SERVICE_DURATION_BY_TYPE: Record<OrderType, number> = {
  delivery: 300, // 5 minutes
  pickup: 180,   // 3 minutes
};

export function getServiceDuration(orderType: OrderType | null | undefined): number
```

#### 2. **Enhanced: `extractOrderLocations(orders)`**
- Gets service duration based on order type
- Includes `weightKg` for capacity constraints
- Includes `packageCount` for volume estimates
- Returns stops with all optimization parameters

**Output Format:**
```typescript
{
  id: "order-123",
  location: [-79.3832, 43.6532],
  serviceDuration: 300,     // 5 min for delivery
  weightKg: 15.5,
  packageCount: 2,
  timeWindow: [start, end]  // Optional
}
```

#### 3. **Enhanced: `optimizeRun(runId, startLocation, endLocation)`**
- Extracts vehicle capacity from assigned vehicle
- Passes capacity to Mapbox optimization
- Logs capacity in optimization messages

#### 4. **Enhanced: `buildOptimizationRequest()` in MapboxOptimizationService**
- Accepts `vehicleCapacityKg` parameter
- Maps capacity to Mapbox format: `capacity: [kg]`
- Maps order weights to Mapbox format: `delivery: [kg]`
- Sets service duration for each stop
- Includes comprehensive JSDoc comments

**Mapbox Payload Example:**
```json
{
  "vehicles": [{
    "vehicle_id": "vehicle_1",
    "start_location": [-79.3832, 43.6532],
    "capacity": [500]
  }],
  "services": [{
    "id": "order-1",
    "location": [-79.3900, 43.6500],
    "service_duration": 300,
    "delivery": [25.5]
  }]
}
```

---

### PART 3: Configuration ✅

**File:** `src/constants/time.ts`

- `DEFAULT_SERVICE_DURATION_SECONDS = 300` (5 minutes)
- `SERVICE_DURATION_BY_TYPE` - Configurable by order type
- `getServiceDuration()` - Helper function with null safety

**Easy to customize:**
```typescript
export const SERVICE_DURATION_BY_TYPE: Record<OrderType, number> = {
  delivery: 360, // Change to 6 minutes
  pickup: 240,   // Change to 4 minutes
};
```

---

## Files Modified

| File | Changes | Description |
|------|---------|-------------|
| `src/constants/time.ts` | +26 lines | Service duration configuration |
| `src/modules/runs/runs.service.ts` | +182 lines | Capacity validation + optimization enhancements |
| `src/services/mapbox/optimization.service.ts` | +21 lines | Capacity/duration in Mapbox payload |

**Total:** 3 files, 229 lines added

---

## Key Features

### 1. **Automatic Capacity Validation**
- ✅ Checks capacity when creating runs with orders
- ✅ Checks capacity when assigning orders to runs
- ✅ Descriptive error messages with actual vs. allowed values
- ✅ Skips validation if no vehicle assigned (allows planning)

### 2. **Realistic Service Times**
- ✅ Different durations for delivery (5 min) vs pickup (3 min)
- ✅ Automatically applied during optimization
- ✅ Easy to customize per order type
- ✅ Safe handling of null/undefined order types

### 3. **Mapbox Integration**
- ✅ Vehicle capacity passed to optimization API
- ✅ Order weights passed as "delivery" sizes
- ✅ Service duration passed for each stop
- ✅ Optimization respects all constraints

### 4. **Comprehensive Logging**
```typescript
logger.info('Starting route optimization', {
  runId: 'run-123',
  stops: 15,
  vehicleCapacityKg: 500
});

logger.info('Route optimization completed', {
  runId: 'run-123',
  distance: 25400,      // meters
  duration: 3600,       // seconds (drive + service)
  service: 4500         // seconds at stops
});
```

---

## Usage Examples

### Example 1: Create Run with Capacity Check

**Request:**
```typescript
POST /api/v1/runs
{
  "name": "Morning Deliveries",
  "scheduledDate": "2025-11-21",
  "vehicleId": "vehicle-van-001",
  "orderIds": ["order-1", "order-2", "order-3"]
}
```

**Success:** Run created with orders assigned

**Error (if capacity exceeded):**
```json
{
  "statusCode": 400,
  "message": "Orders exceed vehicle weight capacity (550.00 kg / 500.00 kg)"
}
```

### Example 2: Assign Orders to Run

**Request:**
```typescript
POST /api/v1/runs/:id/orders/assign
{
  "orderIds": ["order-4", "order-5"]
}
```

**Validation:**
- Checks existing orders + new orders
- Compares against vehicle capacity
- Throws error if exceeded

### Example 3: Optimize Run

**Request:**
```typescript
POST /api/v1/runs/:id/optimize
{
  "startLocation": [-79.3832, 43.6532]
}
```

**Mapbox Receives:**
- Vehicle capacity: `[500]` kg
- Order 1 delivery size: `[25.5]` kg, service time: `300` seconds
- Order 2 delivery size: `[15.0]` kg, service time: `180` seconds (pickup)

**Mapbox Response:**
- Optimized route respecting capacity
- Total duration includes drive time + service time
- Service time separately reported

---

## Benefits

### 1. **Safety & Compliance**
- Prevents vehicle overloading
- Reduces accidents and vehicle damage
- Ensures legal compliance with weight limits

### 2. **Accurate Planning**
- Realistic ETAs that include stop time
- Better customer communication
- Improved on-time performance

### 3. **Cost Optimization**
- Maximize vehicle utilization without exceeding capacity
- Reduce wasted trips
- Better resource allocation

### 4. **Error Prevention**
- Catch issues before dispatch
- Clear feedback to operators
- Validation at multiple points

### 5. **Flexibility**
- Works with or without vehicle assignment
- Customizable service durations
- Supports future enhancements

---

## Future Enhancements

### 1. **Actual Volume Tracking**
Add `volumeCubicM` field to Order model:
```prisma
volumeCubicM  Decimal?  @db.Decimal(10, 3)
```

### 2. **Per-Order Custom Duration**
Add `serviceDurationSeconds` field to Order model:
```prisma
serviceDurationSeconds  Int?  @default(300)
```

### 3. **Multi-Dimensional Capacity**
Support weight + volume + pallet constraints:
```typescript
capacity: [weightKg, volumeCubicM, palletCount]
delivery: [orderWeight, orderVolume, orderPallets]
```

### 4. **Capacity Utilization Reporting**
```typescript
GET /api/v1/runs/:id/capacity
{
  "totalWeightKg": 450,
  "vehicleCapacityKg": 500,
  "utilizationPercent": 90,
  "status": "optimal" // or "underutilized" or "overloaded"
}
```

### 5. **Automatic Run Splitting**
```typescript
async splitRunByCapacity(runId: string): Promise<DeliveryRun[]>
```

### 6. **Multi-Vehicle Optimization**
Pass multiple vehicles to Mapbox for load balancing:
```typescript
vehicles: [
  { vehicle_id: 'van-1', capacity: [500] },
  { vehicle_id: 'truck-1', capacity: [1000] }
]
```

---

## Testing Checklist

When database is connected, test:

### Unit Tests
- [ ] `calculateRunCapacity()` - Weight and package sums
- [ ] `validateRunCapacity()` - Valid/invalid capacity
- [ ] `checkCapacityForOrders()` - Combined capacity checks
- [ ] `assignOrders()` - Capacity validation before assignment
- [ ] `createRun()` - Capacity validation during creation
- [ ] `extractOrderLocations()` - Service duration by type
- [ ] `getServiceDuration()` - All order types + null handling

### Integration Tests
- [ ] Create run with valid capacity
- [ ] Create run with exceeded capacity (should fail)
- [ ] Assign orders with valid capacity
- [ ] Assign orders with exceeded capacity (should fail)
- [ ] Optimize run with capacity constraints
- [ ] Run without vehicle (capacity check skipped)
- [ ] Orders without weight (treated as 0 kg)
- [ ] Orders without type (uses default duration)

### Manual Testing Scenarios
- [ ] Small van with heavy orders (capacity exceeded)
- [ ] Large truck with light orders (all valid)
- [ ] Mixed delivery and pickup orders (different durations)
- [ ] Run with time windows + capacity constraints

---

## API Changes

### Modified Endpoints

**POST /api/v1/runs**
- Now validates capacity if orders + vehicle provided
- Returns 400 with descriptive error if exceeded

**POST /api/v1/runs/:id/orders/assign**
- Now validates capacity before assignment
- Returns 400 with descriptive error if exceeded

**POST /api/v1/runs/:id/optimize**
- Now passes vehicle capacity to Mapbox
- Now passes order weights and service durations
- Optimization respects capacity constraints

### Recommended New Endpoints

**GET /api/v1/runs/:id/validate-capacity**
```json
{
  "success": true,
  "data": {
    "valid": false,
    "errors": ["Weight capacity exceeded: 550 kg / 500 kg"]
  }
}
```

**GET /api/v1/runs/:id/capacity**
```json
{
  "success": true,
  "data": {
    "totalWeightKg": 450.50,
    "vehicleCapacityKg": 500.00,
    "utilizationPercent": 90.1,
    "totalPackages": 25,
    "estimatedCubicM": 2.5
  }
}
```

---

## Configuration

### Changing Service Durations

Edit `src/constants/time.ts`:

```typescript
export const SERVICE_DURATION_BY_TYPE: Record<OrderType, number> = {
  delivery: 360, // 6 minutes
  pickup: 240,   // 4 minutes
};
```

### Using Cubic Volume Instead of Package Count

Currently: `estimatedCubicM = packageCount * 0.1`

**To improve:**
1. Add `volumeCubicM` field to Order model
2. Update `calculateRunCapacity()` to use actual volume
3. Update capacity check to compare actual volumes

---

## Troubleshooting

### "Orders exceed vehicle weight capacity"
- **Cause:** Total order weight > vehicle capacity
- **Fix:** Remove orders, use larger vehicle, or split run

### "Orders exceed vehicle capacity (packages / m³)"
- **Cause:** Estimated volume > vehicle cubic capacity
- **Fix:** Reduce orders or use vehicle with more volume

### "Run has no assigned vehicle"
- **Cause:** Called `validateRunCapacity()` on run without vehicle
- **Fix:** Assign vehicle first, or skip validation

### Mapbox returns "unassigned" orders
- **Cause:** Capacity/time constraints too tight
- **Fix:** Increase capacity, relax time windows, or split run

---

## Summary

**✅ All requested features implemented:**

1. ✅ Vehicle capacity validation on run creation
2. ✅ Vehicle capacity validation on order assignment
3. ✅ Public `validateRunCapacity()` method
4. ✅ Service duration by order type (delivery: 5 min, pickup: 3 min)
5. ✅ Service duration in Mapbox optimization payload
6. ✅ Vehicle capacity in Mapbox optimization payload
7. ✅ Order weights in Mapbox optimization payload
8. ✅ Configurable service duration constants
9. ✅ Helper function for getting service duration
10. ✅ Comprehensive documentation

**Ready for:**
- Database connection and testing
- API endpoint testing
- Integration with mobile app
- Production deployment (after testing)

---

**End of Implementation Summary**

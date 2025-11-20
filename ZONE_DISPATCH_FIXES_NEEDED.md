# Zone Dispatch System - Critical Fixes Needed

**Status**: Schema applied, but services need fixes before production use
**Priority**: HIGH - Runtime errors and race conditions exist

---

## 1. SMS Service - Config Access (FIXED ✅)

**File**: `src/modules/notifications/sms.service.ts`
**Lines**: 30-34, 74-79

**Issue**: Accessing `config.twilio.enabled` but env exports flat structure (`config.TWILIO_ENABLED`)

**Status**: ✅ FIXED - Updated to use flat config structure

---

## 2. Dispatch Service - Coordinate Validation (TODO ❌)

**File**: `src/modules/dispatch/dispatch.service.ts`
**Lines**: 68-71

**Issue**: Using falsy check `!order.latitude || !order.longitude` rejects valid 0 coordinates

**Current Code**:
```typescript
if (!order.latitude || !order.longitude) {
  logger.warn('Order missing coordinates, skipping', { orderId: order.id });
  outOfBoundsOrderIds.push(order.id);
  continue;
}
```

**Fix Needed**:
```typescript
if (order.latitude == null || order.longitude == null) {
  logger.warn('Order missing coordinates, skipping', { orderId: order.id });
  outOfBoundsOrderIds.push(order.id);
  continue;
}
```

---

## 3. Dispatch Service - Unused cutoffTime Parameter (TODO ❌)

**File**: `src/modules/dispatch/dispatch.service.ts`
**Lines**: 45-47

**Issue**: `cutoffTime` parameter not used in query logic

**Options**:
1. Remove parameter entirely
2. Wire into Prisma query (requires scheduledTime field on Order)

**Recommended**: Remove parameter until scheduledTime field exists

---

## 4. Dispatch Service - Zone Assignment Race Condition (TODO ❌)

**File**: `src/modules/dispatch/dispatch.service.ts`
**Lines**: 113-117

**Issue**: Concurrent auto-assignments can overwrite zones

**Current Code**:
```typescript
await prisma.order.updateMany({
  where: { id: { in: orderIds } },
  data: { zoneId },
});
```

**Fix Needed**:
```typescript
const { count } = await prisma.order.updateMany({
  where: {
    id: { in: orderIds },
    zoneId: null  // Only assign if not already assigned
  },
  data: { zoneId },
});

// Handle skipped orders
if (count < orderIds.length) {
  logger.warn('Some orders already assigned to zones', {
    requested: orderIds.length,
    assigned: count,
  });
}
```

---

## 5. Dispatch Service - Driver/Vehicle Assignment Race Condition (TODO ❌)

**File**: `src/modules/dispatch/dispatch.service.ts`
**Lines**: 455-469

**Issue**: Race condition on driver/vehicle availability check

**Current**: Pre-check in application code (not transactional)

**Fix Needed**: Add DB-level unique constraints

**Schema Changes Required**:
```prisma
model DeliveryRun {
  // ... existing fields

  @@unique([scheduledDate, driverId], map: "unique_driver_per_date")
  @@unique([scheduledDate, vehicleId], map: "unique_vehicle_per_date")
}
```

**Code Update**:
```typescript
try {
  const updatedRun = await prisma.deliveryRun.update({
    where: { id: runId },
    data: {
      driverId,
      vehicleId,
      canFinalize: true,
    },
  });
} catch (error) {
  if (error.code === 'P2002') {
    throw createAppError(
      400,
      'Driver or vehicle already assigned to another run on this date'
    );
  }
  throw error;
}
```

---

## 6. Dispatch Service - Missing Capacity Validation (TODO ❌)

**File**: `src/modules/dispatch/dispatch.service.ts`
**Lines**: 426-492

**Issue**: `assignDriverAndVehicle()` doesn't validate capacity

**Documentation**: Says "validates capacity" but doesn't

**Fix Needed**:
```typescript
async assignDriverAndVehicle(
  runId: string,
  driverId: string,
  vehicleId: string
): Promise<DeliveryRun> {
  // ... existing checks ...

  // Check capacity
  const capacityValid = await runsService.validateRunCapacity(runId);
  if (!capacityValid) {
    throw createAppError(
      400,
      `Orders in run ${run.runNumber} exceed vehicle ${vehicle.name} capacity`
    );
  }

  // ... rest of method
}
```

---

## 7. Dispatch Service - SMS Not Actually Sent (TODO ❌)

**File**: `src/modules/dispatch/dispatch.service.ts`
**Lines**: 619, 629-637

**Issue**: Reports SMS as sent but only has TODO comment

**Current Code**:
```typescript
// TODO: Send SMS notifications (will be implemented in SMS service)
const customersSmsed = finalizedRun.orders.length;

return {
  customersSmsed,
  driverNotified: false, // TODO: Implement driver notification
};
```

**Fix Needed**:
```typescript
// Send SMS to all customers
let customersSmsed = 0;
for (const order of finalizedRun.orders) {
  if (!order.customer?.phone) continue;

  try {
    await smsService.sendDeliveryNotification({
      orderId: order.id,
      customerPhone: order.customer.phone,
      customerName: order.customer.firstName,
      deliveryDate: run.scheduledDate,
      timeWindow: {
        start: order.estimatedArrivalStart || new Date(),
        end: order.estimatedArrivalEnd || new Date(),
      },
    });
    customersSmsed++;
  } catch (error) {
    logger.warn('Failed to send SMS', { orderId: order.id, error });
  }
}

// Send driver notification
let driverNotified = false;
if (run.driver?.phone) {
  try {
    await smsService.sendRunAssignmentNotification({
      runId: run.id,
      driverPhone: run.driver.phone,
      driverName: `${run.driver.firstName} ${run.driver.lastName}`,
      scheduledDate: run.scheduledDate,
      orderCount: finalizedRun.orders.length,
      estimatedDuration: finalizedRun.estimatedDurationMinutes * 60,
      firstStopAddress: finalizedRun.orders[0]?.deliveryAddress.line1 || '',
    });
    driverNotified = true;
  } catch (error) {
    logger.warn('Failed to send driver notification', { runId, error });
  }
}

return {
  customersSmsed,
  driverNotified,
};
```

---

## 8. Fleet Service - Wrong Field Names (TODO ❌)

**File**: `src/modules/fleet/fleet.service.ts`
**Lines**: 148-149, 160-161, 233-234, 457-458

**Issue**: References `run.totalDuration` and `run.totalDistance` which don't exist

**Schema Fields Are**:
- `run.estimatedDurationMinutes` (Int)
- `run.totalDistanceKm` (Decimal)

**Fix All Occurrences**:
```typescript
// OLD
totalDuration: run.totalDuration ?? 0,
totalDistance: run.totalDistance ?? 0,

// NEW
totalDuration: run.estimatedDurationMinutes ?? 0,  // Already in minutes
totalDistance: run.totalDistanceKm?.toNumber() ?? 0,  // Decimal to number
```

---

## 9. SMS Service - Type Safety Lost (TODO ❌)

**File**: `src/modules/notifications/sms.service.ts`
**Lines**: 60-71

**Issue**: Casting `input.type` to `any` defeats type safety

**Current Code**:
```typescript
const notification = await prisma.smsNotification.create({
  data: {
    type: input.type as any,  // ❌ Type safety lost
    // ...
  },
});
```

**Fix Needed**:
```typescript
import { SmsNotificationType } from '@prisma/client';

// Validate type at runtime
if (!Object.values(SmsNotificationType).includes(input.type as SmsNotificationType)) {
  throw createAppError(400, `Invalid SMS type: ${input.type}`);
}

const notification = await prisma.smsNotification.create({
  data: {
    type: input.type as SmsNotificationType,  // ✅ Type-safe
    // ...
  },
});
```

---

## 10. Schema - Unique Constraints Missing (TODO ❌)

**File**: `prisma/schema.prisma`
**Model**: `DeliveryRun`

**Issue**: No constraints prevent double-booking drivers/vehicles

**Fix Needed**: Add unique constraints (see #5 above)

---

## Priority Matrix

| Issue | Priority | Impact | Effort |
|-------|----------|--------|--------|
| #1 SMS Config | ✅ FIXED | HIGH (boot failure) | LOW |
| #2 Coordinate Check | HIGH | MEDIUM (rejects 0,0) | LOW |
| #3 cutoffTime | LOW | LOW (unused param) | LOW |
| #4 Zone Assignment Race | HIGH | HIGH (data corruption) | MEDIUM |
| #5 Assignment Race | CRITICAL | HIGH (double-booking) | MEDIUM |
| #6 Capacity Validation | MEDIUM | MEDIUM (missing feature) | LOW |
| #7 SMS Not Sent | CRITICAL | HIGH (broken feature) | HIGH |
| #8 Fleet Field Names | CRITICAL | HIGH (runtime error) | LOW |
| #9 SMS Type Safety | MEDIUM | MEDIUM (type safety) | LOW |
| #10 Unique Constraints | CRITICAL | HIGH (prevents race) | MEDIUM |

---

## Recommended Fix Order

1. ✅ **SMS Config** (Fixed)
2. **Fleet Field Names** (#8) - Prevents runtime errors
3. **Unique Constraints** (#10) - Prevents data corruption
4. **Assignment Race** (#5) - Uses constraints from #10
5. **Zone Assignment Race** (#4) - Prevents data corruption
6. **SMS Actually Send** (#7) - Makes feature work
7. **SMS Type Safety** (#9) - Improves safety
8. **Coordinate Check** (#2) - Edge case fix
9. **Capacity Validation** (#6) - Feature completion
10. **cutoffTime Param** (#3) - Cleanup

---

## Testing Checklist After Fixes

### Unit Tests
- [ ] Coordinate validation with 0 values
- [ ] Zone assignment race condition
- [ ] Driver/vehicle assignment race condition
- [ ] Capacity validation in assignment
- [ ] SMS sending and counting
- [ ] Fleet field name access

### Integration Tests
- [ ] Concurrent zone assignments
- [ ] Concurrent driver assignments
- [ ] Full finalize workflow with SMS
- [ ] Error handling for each race condition

### Manual Tests
- [ ] Apply schema changes (`npx prisma migrate dev`)
- [ ] Test full dispatch workflow
- [ ] Verify SMS sent (check Twilio dashboard)
- [ ] Test concurrent assignments

---

## Migration Strategy

1. **Apply Schema**:
   ```bash
   npx prisma migrate dev --name add_zone_dispatch_system
   npx prisma generate
   ```

2. **Apply Code Fixes**: Fix issues #2-#9 in order

3. **Test**: Run integration tests

4. **Deploy**: After all tests pass

---

## Notes

- **Backward Compatibility**: `zoneId` made nullable in both Order and DeliveryRun
- **Seed Data**: Needs update to handle nullable zoneId
- **Documentation**: Update to reflect nullable fields and race condition fixes

---

**End of Fix List**

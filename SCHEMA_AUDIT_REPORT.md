# COMPREHENSIVE SCHEMA MISMATCH AUDIT REPORT

**Date:** 2025-11-20
**Status:** Documentation Only - No Fixes Applied
**Scope:** All services and controllers with Prisma interactions

---

## Executive Summary

This audit identifies **critical schema mismatches** across all services and controllers in the OrdakDelivery codebase. The issues fall into several categories:

1. **Field name mismatches** - Using fields that don't exist in the Prisma schema
2. **Missing enum imports/usage** - Referencing enums that don't exist or using wrong case
3. **Wrong field types** - Type mismatches between code and schema
4. **Missing models** - Using Prisma client path that imports from wrong location
5. **Structural issues** - Missing required relationships and fields

**Impact:** Many of these services will fail at runtime when called. Orders, Drivers, and Vehicles services are currently non-functional.

---

## 1. ORDERS SERVICE (`src/modules/orders/orders.service.ts`)

### ❌ CRITICAL ISSUES

#### **Lines 4, 48, 76, 262**: Using non-existent `OrderType` enum
```typescript
// WRONG (current code)
import { Order, OrderType, OrderStatus, Prisma } from '@prisma/client';

// SCHEMA REALITY
// OrderType enum does NOT exist in schema
```

**Schema has**: NO OrderType enum defined
**Recommended fix**: Remove OrderType import and field usage, or add enum to schema

#### **Lines 46-65**: Using non-existent Order fields
```typescript
// WRONG (current code - lines 46-65)
const order = await prisma.order.create({
  data: {
    orderNumber: input.orderNumber,
    type: input.type,                    // ❌ Field 'type' does not exist
    status: OrderStatus.PENDING,
    customerId: customer.id,
    addressLine1: input.address.line1,   // ❌ Field 'addressLine1' does not exist
    addressLine2: input.address.line2,   // ❌ Field 'addressLine2' does not exist
    city: input.address.city,            // ❌ Field 'city' does not exist
    province: input.address.province,    // ❌ Field 'province' does not exist
    postalCode: input.address.postalCode,// ❌ Field 'postalCode' does not exist
    country: input.address.country,      // ❌ Field 'country' does not exist
    geocoded: geocoded,                  // ❌ Field 'geocoded' does not exist
    geocodedAt: geocoded ? new Date() : null, // ❌ Field 'geocodedAt' does not exist
    scheduledDate: input.scheduledDate,
    timeWindowStart: input.timeWindowStart,  // ❌ Field should be 'deliveryWindowStart'
    timeWindowEnd: input.timeWindowEnd,      // ❌ Field should be 'deliveryWindowEnd'
    items: input.items,                  // ❌ Field 'items' does not exist
    notes: input.notes,
    specialInstructions: input.specialInstructions,
  },
});
```

**Schema has** (Order model):
- `deliveryAddressId` (REQUIRED, UUID foreign key to Address)
- `deliveryWindowStart` (Time field, not timeWindowStart)
- `deliveryWindowEnd` (Time field, not timeWindowEnd)
- `externalSource` (REQUIRED, VarChar)
- NO individual address fields (line1, city, province, etc.)
- NO `type` field
- NO `geocoded` boolean field
- NO `geocodedAt` field
- NO `items` field

**Recommended fix**:
1. Create Address record first with `deliveryAddressId`
2. Use `deliveryWindowStart/End` instead of `timeWindowStart/End`
3. Add `externalSource` field (e.g., 'manual', 'api')
4. Remove `type`, `geocoded`, `geocodedAt`, individual address fields, and `items`

#### **Lines 264-267**: Using non-existent Order fields
```typescript
// WRONG (lines 264-267)
status: OrderStatus.DELIVERED,
deliveredAt: new Date(),              // ❌ Field does not exist
signatureUrl: data.signatureUrl,      // ❌ Field does not exist
photoUrls: data.photoUrls,            // ❌ Field does not exist
deliveryNotes: data.deliveryNotes,    // ❌ Field does not exist
```

**Schema has**:
- `actualDeliveryTime` (not deliveredAt)
- NO `signatureUrl`, `photoUrls`, `deliveryNotes` fields

**Recommended fix**: Use `actualDeliveryTime` and create separate ProofOfDelivery record

---

## 2. ORDERS CONTROLLER (`src/modules/orders/orders.controller.ts`)

### ❌ ISSUES

#### **Lines 5, 11, 64, 120**: Using non-existent `OrderType` enum
```typescript
// WRONG
import { OrderType, OrderStatus } from '@prisma/client';
type: z.nativeEnum(OrderType),
```

**Recommended fix**: Remove all OrderType references

---

## 3. SHOPIFY SERVICE (`src/modules/orders/shopify.service.ts`)

### ❌ CRITICAL ISSUES

#### **Lines 4, 75-76, 124**: Using non-existent `OrderType` enum
```typescript
// WRONG
import { OrderType, OrderStatus, Prisma } from '@prisma/client';
const orderType: OrderType =
  deliveryType?.toLowerCase() === 'pickup' ? OrderType.PICKUP : OrderType.DELIVERY;
```

**Recommended fix**: Remove OrderType usage entirely

#### **Lines 60, 122**: Using non-existent field `shopifyOrderId`
```typescript
// WRONG
where: { shopifyOrderId: String(shopifyOrder.id) },
```

**Schema has**: `externalId` and `externalSource` (not shopifyOrderId)
**Recommended fix**: Use `externalId` with `externalSource: 'shopify'`

#### **Lines 121-142**: Using non-existent Order fields
```typescript
// WRONG
shopifyOrderId: String(shopifyOrder.id),  // ❌ Field does not exist
shopifyOrderName: shopifyOrder.name,      // ❌ Field does not exist
type: orderType,                          // ❌ Field does not exist
addressLine1: address.address1,           // ❌ Field does not exist
city: address.city,                       // ❌ Field does not exist
geocoded: geocoded,                       // ❌ Field does not exist
timeWindowStart: timeWindowStart,         // ❌ Should be deliveryWindowStart
items: shopifyOrder.line_items,           // ❌ Field does not exist
```

**Schema requires**:
- `deliveryAddressId` (create Address first)
- `externalSource` (e.g., 'shopify')
- `deliveryWindowStart/End` (not timeWindowStart/End)

---

## 4. RUNS SERVICE (`src/modules/runs/runs.service.ts`)

### ✅ STATUS: **MOSTLY CORRECT**

The runs service appears to have been recently fixed. Minor issue:

#### **Lines 252, 286, 305, 347**: Using uppercase role values
```typescript
// POTENTIALLY WRONG (if role comparison fails)
if (userContext.role === 'DRIVER') {
```

**Schema has**: UserRole enum with lowercase values: `admin`, `dispatcher`, `driver`
**Note**: This depends on how `req.user.role` is set. If JWT stores uppercase, this is fine.

---

## 5. RUNS CONTROLLER (`src/modules/runs/runs.controller.ts`)

### ✅ STATUS: **CORRECT**

No schema mismatches detected.

---

## 6. DRIVERS SERVICE (`src/modules/drivers/drivers.service.ts`)

### ❌ CRITICAL ISSUES

#### **Lines 41-61**: Using non-existent Driver fields
```typescript
// WRONG
const existing = await prisma.driver.findUnique({
  where: { email: input.email },  // ❌ Field 'email' does not exist
});

const driver = await prisma.driver.create({
  data: {
    email: input.email,           // ❌ Field 'email' does not exist
    firstName: input.firstName,   // ❌ Field 'firstName' does not exist
    lastName: input.lastName,     // ❌ Field 'lastName' does not exist
    phone: input.phone,           // ❌ Field 'phone' does not exist
    licenseNumber: input.licenseNumber,  // ❌ Should be 'driverLicense'
    startTime: input.startTime,          // ❌ Field does not exist
    endTime: input.endTime,              // ❌ Field does not exist
    traccarDeviceId: input.traccarDeviceId,  // ❌ Field does not exist
    status: DriverStatus.ACTIVE,  // ❌ ACTIVE doesn't exist in enum!
  },
});
```

**Schema has** (Driver model):
- `userId` (REQUIRED, UUID foreign key to User)
- `driverLicense` (not licenseNumber)
- `licenseExpiry` (REQUIRED, Date)
- `vehicleId` (optional, UUID)
- NO `email`, `firstName`, `lastName`, `phone` (these are in User model!)
- NO `startTime`, `endTime` fields
- NO `traccarDeviceId` field

**DriverStatus enum has**: `offline`, `available`, `on_delivery`, `on_break` (NO `ACTIVE`!)

**Recommended fix**:
1. Create User record first with email, firstName, lastName, phone
2. Use `userId` to link Driver to User
3. Use `driverLicense` not `licenseNumber`
4. Add required `licenseExpiry` field
5. Use `available` status instead of `ACTIVE`

---

## 7. VEHICLES SERVICE (`src/modules/vehicles/vehicles.service.ts`)

### ❌ CRITICAL ISSUES

#### **Lines 4, 14, 25, 54**: Using non-existent `VehicleType` enum
```typescript
// WRONG
import { Vehicle, VehicleType, Prisma } from '@prisma/client';
type: VehicleType;
```

**Schema reality**: VehicleType enum does NOT exist
**Recommended fix**: Remove VehicleType or add it to schema

#### **Lines 48-60**: Using non-existent Vehicle fields
```typescript
// WRONG
const vehicle = await prisma.vehicle.create({
  data: {
    licensePlate: input.licensePlate,  // ✅ CORRECT
    make: input.make,                  // ✅ CORRECT
    model: input.model,                // ✅ CORRECT
    year: input.year,                  // ✅ CORRECT
    type: input.type,                  // ❌ Field 'type' does not exist
    maxWeight: input.maxWeight,        // ❌ Should be 'capacityKg'
    maxVolume: input.maxVolume,        // ❌ Should be 'capacityCubicM'
    maxStops: input.maxStops,          // ❌ Field does not exist
    traccarDeviceId: input.traccarDeviceId,  // ❌ Field does not exist
    isActive: true,                    // ❌ Should be 'status: active'
  },
});
```

**Schema has** (Vehicle model):
- `capacityKg` (not maxWeight)
- `capacityCubicM` (not maxVolume)
- `status` (enum: active, maintenance, retired)
- NO `type`, `maxStops`, `traccarDeviceId`, `isActive` fields

**Recommended fix**:
1. Remove `type`, `maxStops`, `traccarDeviceId`
2. Use `capacityKg` instead of `maxWeight`
3. Use `capacityCubicM` instead of `maxVolume`
4. Use `status: 'active'` instead of `isActive: true`

---

## 8. GEOCODING SERVICE (`src/modules/geocoding/geocoding.service.ts`)

### ✅ STATUS: **CORRECT**

No schema mismatches detected.

---

## 9. AUTH & USER SERVICES

### ⚠️ MINOR ISSUES

#### **Import Path Issues**
```typescript
// WRONG (users.service.ts, auth.service.ts, auth.middleware.ts)
import { prisma } from '../../lib/prisma';
```

**Recommended fix**: Use `import prisma from '@config/database';`

#### **Wrong Role Case** (auth.service.ts, auth.middleware.ts)
```typescript
// POTENTIALLY WRONG
role: 'DRIVER',
requireRole('ADMIN', 'DISPATCHER');
```

**Schema has**: UserRole with lowercase: `admin`, `dispatcher`, `driver`
**Recommended fix**: Use lowercase values

---

## SUMMARY OF ISSUES BY CATEGORY

### 1. ❌ Missing Enums (Add to Schema or Remove from Code)
- **OrderType** - Used in orders.service, orders.controller, shopify.service
- **VehicleType** - Used in vehicles.service, vehicles.controller

### 2. ❌ Wrong Enum Values
- **DriverStatus.ACTIVE** - This value doesn't exist!
  - Schema has: `offline`, `available`, `on_delivery`, `on_break`
- **UserRole**: Code uses uppercase `'ADMIN'`, `'DISPATCHER'`, `'DRIVER'`
  - Schema has: `admin`, `dispatcher`, `driver` (lowercase)

### 3. ❌ Order Model - Complete Field Mismatch

**Missing from schema but used in code:**
- `type`, `addressLine1`, `addressLine2`, `city`, `province`, `postalCode`, `country`
- `geocoded`, `geocodedAt`, `timeWindowStart`, `timeWindowEnd`, `items`
- `shopifyOrderId`, `shopifyOrderName`, `deliveredAt`
- `signatureUrl`, `photoUrls`, `deliveryNotes`

**In schema but not used:**
- `deliveryAddressId` (REQUIRED!)
- `externalId`, `externalSource` (REQUIRED!)
- `deliveryWindowStart`, `deliveryWindowEnd`
- `actualDeliveryTime`, `failureReason`, `failurePhotos`

### 4. ❌ Driver Model - Complete Field Mismatch

**Missing from schema but used in code:**
- `email`, `firstName`, `lastName`, `phone`
- `licenseNumber`, `startTime`, `endTime`, `traccarDeviceId`

**In schema but not used:**
- `userId` (REQUIRED!)
- `driverLicense`, `licenseExpiry` (REQUIRED!)

### 5. ❌ Vehicle Model - Field Mismatches

**Missing from schema but used in code:**
- `type`, `maxWeight`, `maxVolume`, `maxStops`, `traccarDeviceId`, `isActive`

**In schema but not used:**
- `capacityKg`, `capacityCubicM`, `status`, `fuelType`

---

## PRIORITY FIXES

### 🔴 CRITICAL (Application Breaking)
1. **Order model restructure** - Need to create Address records, use deliveryAddressId
2. **Driver model restructure** - Need to create User records first, link via userId
3. **Remove OrderType and VehicleType** - Or add to schema
4. **Fix DriverStatus.ACTIVE** - Use correct enum value (`available`)

### 🟠 HIGH (Likely Causing Runtime Errors)
1. Fix all enum case mismatches (uppercase → lowercase)
2. Fix Vehicle model field names (maxWeight → capacityKg, etc.)
3. Fix Order field names (timeWindowStart → deliveryWindowStart, etc.)
4. Fix import paths for prisma client

### 🟡 MEDIUM (Data Integrity)
1. Use externalId/externalSource instead of shopifyOrderId
2. Create ProofOfDelivery records instead of inline fields
3. Use actualDeliveryTime instead of deliveredAt

---

## FILES REQUIRING CHANGES

### ❌ Must Fix (Application Breaking)
1. `src/modules/orders/orders.service.ts` - 15+ field mismatches
2. `src/modules/orders/shopify.service.ts` - 15+ field mismatches
3. `src/modules/drivers/drivers.service.ts` - Complete restructure needed
4. `src/modules/vehicles/vehicles.service.ts` - 8+ field mismatches

### ⚠️ Should Fix (TypeScript Errors)
5. `src/modules/orders/orders.controller.ts` - OrderType usage
6. `src/modules/vehicles/vehicles.controller.ts` - VehicleType usage
7. `src/modules/auth/auth.service.ts` - Import path, role case
8. `src/middleware/auth.middleware.ts` - Import path, role case

### ✅ Already Correct
- `src/modules/runs/runs.service.ts` - Recently fixed ✅
- `src/modules/runs/runs.controller.ts` - Correct ✅
- `src/modules/geocoding/geocoding.service.ts` - Correct ✅

---

## RECOMMENDED APPROACH

### Phase 1: Add Missing Enums to Schema
```prisma
enum OrderType {
  delivery
  pickup
}

enum VehicleType {
  car
  van
  truck
  bike
  motorcycle
}
```

### Phase 2: Fix Orders Service
1. Refactor to create Address records first
2. Link orders via `deliveryAddressId`
3. Use `externalSource` = 'manual' or 'shopify'
4. Fix all field names to match schema
5. Create ProofOfDelivery records for POD data

### Phase 3: Fix Drivers Service
1. Refactor to create User records first
2. Link drivers via `userId`
3. Fix `licenseNumber` → `driverLicense`
4. Add required `licenseExpiry` field
5. Use `available` status instead of `ACTIVE`

### Phase 4: Fix Vehicles Service
1. Fix field names (maxWeight → capacityKg, etc.)
2. Use `status` enum instead of `isActive` boolean
3. Remove non-existent fields

### Phase 5: Fix Enum Cases
1. Update all UserRole comparisons to lowercase
2. Update DriverStatus usage
3. Update DeliveryRunStatus usage

---

**End of Audit Report**

**Next Steps**: Create separate PRs for each service to fix these issues systematically.

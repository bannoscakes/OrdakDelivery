# Orders Service Schema Fixes - Complete Summary

## Overview
Fixed **15+ field mismatches** in the Orders Service to align with the Prisma schema.

---

## CRITICAL FIX #1: Address Relation (9 fields removed, 1 added)

### ❌ BEFORE: Inline Address Fields on Order
```typescript
// Order model had these inline fields (WRONG):
addressLine1: string
addressLine2?: string
city: string
province: string
postalCode: string
country: string
latitude?: number
longitude?: number
location?: PostGIS
geocoded: boolean
geocodedAt?: Date
```

### ✅ AFTER: Foreign Key Relation
```typescript
// Order model has (CORRECT):
deliveryAddressId: string  // REQUIRED foreign key to Address model

// Address model has all the fields:
model Address {
  line1: string
  line2?: string
  city: string
  stateProvince?: string  // Note: renamed from province
  postalCode: string
  country: string
  latitude?: number
  longitude?: number
  location?: PostGIS
  geocodedAt?: Date
}
```

### Implementation Changes

**createOrder() method:**
```typescript
// OLD (WRONG):
const order = await prisma.order.create({
  data: {
    addressLine1: input.address.line1,  // ❌ Field doesn't exist
    city: input.address.city,           // ❌ Field doesn't exist
    province: input.address.province,   // ❌ Field doesn't exist
    // ... more inline fields
  }
});

// NEW (CORRECT):
const order = await prisma.$transaction(async (tx) => {
  // 1. Create Address first
  const address = await tx.address.create({
    data: {
      customerId: customer.id,
      line1: input.address.line1,
      line2: input.address.line2,
      city: input.address.city,
      stateProvince: input.address.stateProvince,  // ✅ Correct field name
      postalCode: input.address.postalCode,
      country: input.address.country || 'US',
      ...(geocoded && locationWKT ? {
        location: Prisma.sql`ST_GeomFromText(${locationWKT}, 4326)`,
        geocodedAt: new Date(),
      } : {}),
    },
  });

  // 2. Create Order with deliveryAddressId
  return tx.order.create({
    data: {
      deliveryAddressId: address.id,  // ✅ Use relation
      // ... other order fields
    },
    include: {
      deliveryAddress: true,  // ✅ Include related address
    },
  });
});
```

---

## FIX #2: Time Window Field Names (2 fields)

### ❌ BEFORE:
```typescript
timeWindowStart?: Date
timeWindowEnd?: Date
```

### ✅ AFTER:
```typescript
deliveryWindowStart?: Date
deliveryWindowEnd?: Date
```

### Changes:
- `CreateOrderInput` interface updated
- `UpdateOrderInput` interface updated
- All service methods updated
- Controller validation schemas need updating

---

## FIX #3: Enum Values (3 occurrences)

### ❌ BEFORE: Uppercase
```typescript
OrderStatus.PENDING
OrderStatus.DELIVERED
OrderStatus.FAILED
```

### ✅ AFTER: Lowercase
```typescript
OrderStatus.pending
OrderStatus.delivered
OrderStatus.failed
```

**Why:** Prisma generates lowercase enum values from the schema.

### Affected Methods:
- `createOrder()` - line 48
- `getUnassignedOrders()` - line 205
- `submitProofOfDelivery()` - line 262
- `markAsDelivered()` - line 313
- `markAsFailed()` - line 357

---

## FIX #4: Proof of Delivery Fields

### ❌ BEFORE: Inline POD Fields on Order
```typescript
// Order model (WRONG):
signatureUrl?: string
photoUrls?: string[]
deliveryNotes?: string
deliveredAt?: Date
```

### ✅ AFTER: Separate ProofOfDelivery Model
```typescript
// ProofOfDelivery model (CORRECT):
model ProofOfDelivery {
  id: string
  orderId: string
  runId?: string
  driverId: string
  recipientName?: string
  recipientRelationship?: string
  signatureUrl?: string
  photos: string[]  // Array, not photoUrls
  notes?: string    // Not deliveryNotes
  deliveredAt: Date
  location?: PostGIS
}
```

### Implementation Changes:

**submitProofOfDelivery() method:**
```typescript
// OLD (WRONG):
const order = await prisma.order.update({
  where: { id },
  data: {
    status: OrderStatus.DELIVERED,
    deliveredAt: new Date(),          // ❌ Order doesn't have this field
    signatureUrl: data.signatureUrl,  // ❌ Order doesn't have this field
    photoUrls: data.photoUrls,        // ❌ Order doesn't have this field
    deliveryNotes: data.deliveryNotes,// ❌ Order doesn't have this field
  },
});

// NEW (CORRECT):
const updatedOrder = await prisma.$transaction(async (tx) => {
  // 1. Create ProofOfDelivery record
  await tx.proofOfDelivery.create({
    data: {
      orderId: id,
      runId: order.assignedRunId,
      driverId: driverId,
      recipientName: data.recipientName,
      recipientRelationship: data.recipientRelationship,
      signatureUrl: data.signatureUrl,
      photos: data.photos || [],  // ✅ Correct field name
      notes: data.notes,          // ✅ Correct field name
      deliveredAt: new Date(),
    },
  });

  // 2. Update order status
  return tx.order.update({
    where: { id },
    data: {
      status: OrderStatus.delivered,
      actualDeliveryTime: new Date(),  // ✅ Order has this field
    },
  });
});
```

---

## FIX #5: Missing externalSource Field

### ❌ BEFORE:
```typescript
// Not set when creating orders via API
```

### ✅ AFTER:
```typescript
externalSource: input.externalSource || 'manual'  // Required field
```

**Why:** Schema requires `externalSource` (no default, no optional). Must be set to 'manual' for API-created orders, or Shopify/other sources for integrated orders.

---

## FIX #6: Include Statements (All methods)

### ❌ BEFORE:
```typescript
include: {
  customer: true,
  // ❌ Missing deliveryAddress
}
```

### ✅ AFTER:
```typescript
include: {
  customer: true,
  deliveryAddress: true,  // ✅ Include address relation
  proofOfDelivery: true,  // ✅ Include POD records
}
```

**Updated in:**
- `getOrderById()`
- `listOrders()`
- `updateOrder()`
- `getUnassignedOrders()`
- All POD methods

---

## FIX #7: Items Field Issue

### Problem:
Order model in schema **does NOT have an `items` field**, but service tries to use it.

### ❌ BEFORE:
```typescript
items: input.items as unknown as Prisma.InputJsonValue  // ❌ Field doesn't exist
```

### ✅ AFTER (Temporary Solution):
```typescript
// Store items in externalMetadata as JSON
externalMetadata: {
  items: input.items,
} as Prisma.InputJsonValue
```

### 📝 NOTE:
Consider adding `items` field to Order schema:
```prisma
model Order {
  // ...
  items Json? @db.JsonB
}
```

Or create separate `OrderItem` table for proper relational data.

---

## FIX #8: actualDeliveryTime vs deliveredAt

### ❌ BEFORE:
```typescript
deliveredAt: new Date()  // ❌ Order doesn't have this field
```

### ✅ AFTER:
```typescript
actualDeliveryTime: new Date()  // ✅ Correct field name
```

**Updated in:**
- `submitProofOfDelivery()`
- `markAsDelivered()`

---

## FIX #9: getUnassignedOrders Geocoding Check

### ❌ BEFORE:
```typescript
where: {
  geocoded: true,  // ❌ Order doesn't have geocoded field
}
```

### ✅ AFTER:
```typescript
where: {
  deliveryAddress: {
    geocodedAt: {
      not: null,  // ✅ Check if address is geocoded
    },
  },
}
```

---

## Complete List of Changes

### orders.types.ts
1. ✅ Added `AddressInput` interface
2. ✅ Updated `CreateOrderInput`:
   - Changed `timeWindowStart` → `deliveryWindowStart`
   - Changed `timeWindowEnd` → `deliveryWindowEnd`
   - Added `externalId`, `externalSource`
   - Added weight, dimensions, package count, financial fields
3. ✅ Updated `UpdateOrderInput`:
   - Changed `timeWindowStart` → `deliveryWindowStart`
   - Changed `timeWindowEnd` → `deliveryWindowEnd`
   - Added more fields from schema
4. ✅ Added `ProofOfDeliveryInput` interface

### orders.service.ts
1. ✅ `createOrder()`:
   - Uses transaction for atomicity
   - Creates Address record first
   - Links Order via `deliveryAddressId`
   - Sets `externalSource` to 'manual'
   - Uses lowercase enum: `OrderStatus.pending`
   - Stores items in `externalMetadata`
   - Includes `deliveryAddress` in response

2. ✅ `getOrderById()`:
   - Includes `deliveryAddress` relation
   - Includes `proofOfDelivery` relation

3. ✅ `listOrders()`:
   - Includes `deliveryAddress` relation
   - Added `customerId` and `assignedRunId` filters

4. ✅ `updateOrder()`:
   - Includes `deliveryAddress` relation

5. ✅ `getUnassignedOrders()`:
   - Uses `OrderStatus.pending` (lowercase)
   - Checks `deliveryAddress.geocodedAt` instead of order.geocoded
   - Includes `deliveryAddress` relation
   - Orders by `deliveryWindowStart` (renamed)

6. ✅ `submitProofOfDelivery()`:
   - Creates `ProofOfDelivery` record in transaction
   - Uses `OrderStatus.delivered` (lowercase)
   - Uses `actualDeliveryTime` field
   - Includes POD in response

7. ✅ `markAsDelivered()`:
   - Uses `OrderStatus.delivered` (lowercase)
   - Uses `actualDeliveryTime` field
   - Includes `deliveryAddress` relation

8. ✅ `markAsFailed()`:
   - Uses `OrderStatus.failed` (lowercase)
   - Uses `failureReason` field (schema has this)
   - Includes `deliveryAddress` relation

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **Fields Removed from Order** | 11 (address fields + geocoded) |
| **Fields Added to Order** | 1 (deliveryAddressId) |
| **Field Renames** | 2 (timeWindow → deliveryWindow) |
| **Enum Fixes** | 5 occurrences |
| **POD Fields Moved** | 4 (to ProofOfDelivery model) |
| **Methods Using Transactions** | 2 (createOrder, submitProofOfDelivery) |
| **Include Statements Fixed** | 8 methods |
| **Total Line Changes** | 200+ |

---

## Testing Checklist

Once database is connected, test:

- [ ] Create order with address (verify Address record created)
- [ ] Get order by ID (verify deliveryAddress included)
- [ ] List orders (verify deliveryAddress included)
- [ ] Update order with new time windows
- [ ] Get unassigned orders (verify geocoded addresses only)
- [ ] Submit proof of delivery (verify ProofOfDelivery record created)
- [ ] Mark as delivered (verify actualDeliveryTime set)
- [ ] Mark as failed (verify failureReason set)
- [ ] Verify lowercase enum values work
- [ ] Verify transaction atomicity (Address + Order created together)

---

## Next Steps

1. **Replace old files** with .FIXED versions:
   ```bash
   mv orders.types.FIXED.ts orders.types.ts
   mv orders.service.FIXED.ts orders.service.ts
   ```

2. **Update orders.controller.ts** (validation schemas need updating for new field names)

3. **Consider schema updates**:
   - Add `items` field to Order model (or create OrderItems table)
   - Make Customer.email unique if needed for upsert logic

4. **Update Shopify integration** (shopify.service.ts) to use same patterns

5. **Create PR** for review

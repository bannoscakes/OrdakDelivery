# Shopify Service Schema Fixes - Complete Summary

## Overview
Fixed **10+ critical schema mismatches** in the Shopify Service to align with corrected Orders Service and Prisma schema. Added outbound two-way sync methods for Shopify integration.

---

## CRITICAL FIX #1: externalId/externalSource Pattern

### ❌ BEFORE: shopifyOrderId Field
```typescript
// Used non-existent shopifyOrderId field
const existing = await prisma.order.findUnique({
  where: { shopifyOrderId: String(shopifyOrder.id) }  // ❌ Field doesn't exist
});

await prisma.order.create({
  data: {
    shopifyOrderId: String(shopifyOrder.id),  // ❌ Field doesn't exist
    shopifyOrderName: shopifyOrder.name,      // ❌ Field doesn't exist
  }
});
```

### ✅ AFTER: Standard externalId/externalSource
```typescript
// Use standard external reference pattern
const existing = await prisma.order.findFirst({
  where: {
    externalId: String(shopifyOrder.id),  // ✅ Standard field
    externalSource: 'shopify',            // ✅ Standard field
  }
});

await prisma.order.create({
  data: {
    externalId: String(shopifyOrder.id),
    externalSource: 'shopify',
    externalMetadata: {
      // Store Shopify-specific data here
      shopifyOrderName: shopifyOrder.name,
      financialStatus: shopifyOrder.financial_status,
      fulfillmentStatus: shopifyOrder.fulfillment_status,
      items: shopifyOrder.line_items,
    },
  }
});
```

**Benefits:**
- Works with any external source (Shopify, WooCommerce, custom API, etc.)
- Follows standard pattern across all orders
- Shopify-specific data stored in externalMetadata JSON field

---

## FIX #2: Field Name Alignment (Match Orders Service)

### Time Window Fields
❌ `timeWindowStart` → ✅ `deliveryWindowStart`
❌ `timeWindowEnd` → ✅ `deliveryWindowEnd`

### Address Fields
❌ Inline address fields → ✅ `deliveryAddressId` (foreign key)
❌ `province` → ✅ `stateProvince`

### Items Storage
❌ `items: shopifyOrder.line_items` → ✅ Store in `externalMetadata.items`

---

## FIX #3: Transaction-Based Creation (Match Orders Service)

### ❌ BEFORE: Sequential Operations
```typescript
// Create customer
const customer = await prisma.customer.upsert({ ... });

// Geocode address (external I/O)
const { locationWKT } = await geocodeAddressToWKT(...);  // Inside transaction!

// Create order (no Address record, no transaction)
const order = await prisma.order.create({
  data: {
    customerId: customer.id,
    addressLine1: ...,  // ❌ Inline fields
    city: ...,
    // ... more inline fields
  }
});
```

### ✅ AFTER: Transaction with Address Creation
```typescript
// 1. Geocode OUTSIDE transaction
let locationWKT = null;
try {
  const result = await geocodeAddressToWKT(...);
  locationWKT = result.locationWKT;
} catch (error) {
  // Continue without geocoding
}

// 2. Use transaction for atomicity
const order = await prisma.$transaction(async (tx) => {
  // Create/update customer
  const customer = await tx.customer.create({ ... });

  // Create Address record
  const address = await tx.address.create({ ... });

  // Update with geometry
  await tx.$executeRaw`UPDATE addresses SET location = ...`;

  // Create Order with deliveryAddressId
  return tx.order.create({
    data: {
      deliveryAddressId: address.id,  // ✅ Relation
    }
  });
});
```

---

## FIX #4: Enum Values (Lowercase)

### ❌ BEFORE: Uppercase
```typescript
status: OrderStatus.PENDING
status: OrderStatus.CANCELLED
```

### ✅ AFTER: Lowercase
```typescript
status: OrderStatus.pending
status: OrderStatus.cancelled
```

---

## FIX #5: Customer Upsert Logic

### ❌ BEFORE: undefined in where clause
```typescript
const customer = await tx.customer.upsert({
  where: {
    email: shopifyOrder.customer?.email || `shopify_${id}@temp.local`  // Always has value
  }
});
```

### ✅ AFTER: Proper find → update/create
```typescript
const customerEmail =
  shopifyOrder.customer?.email ||
  shopifyOrder.email ||
  `shopify_${shopifyOrder.id}@temp.local`;

const existing = await tx.customer.findUnique({
  where: { email: customerEmail }
});

if (existing) {
  customer = await tx.customer.update({ ... });
} else {
  customer = await tx.customer.create({
    data: {
      externalId: String(shopifyOrder.customer.id),  // NEW
      externalSource: 'shopify',                     // NEW
      // ... other fields
    }
  });
}
```

---

## FIX #6: Geocoding Performance

### ❌ BEFORE: Inside Transaction
```typescript
await prisma.$transaction(async (tx) => {
  // External API call holds DB lock
  const { locationWKT } = await geocodeAddressToWKT(...);  // ❌ Slow!

  await tx.order.create({ ... });
});
```

### ✅ AFTER: Outside Transaction
```typescript
// Geocode before transaction
let locationWKT = null;
try {
  const result = await geocodeAddressToWKT(...);
  locationWKT = result.locationWKT;
} catch (error) {
  logger.warn('Geocoding failed, continuing without location');
}

// Fast transaction - only DB operations
await prisma.$transaction(async (tx) => {
  // Use pre-computed locationWKT
});
```

---

## FIX #7: PostGIS Geometry Insertion

### ✅ Use $executeRaw for Geometry
```typescript
// Create address without geometry
const address = await tx.address.create({ data: { ... } });

// Update with geometry using raw query
await tx.$executeRaw`
  UPDATE addresses
  SET location = ST_GeomFromText(${locationWKT}, 4326)
  WHERE id = ${address.id}::uuid
`;
```

---

## FIX #8: PII in Error Logs

### ❌ BEFORE: Full Object Logging
```typescript
logger.error('Failed to process Shopify order', {
  shopifyOrder,  // ❌ Contains customer email, phone, address
  error
});
```

### ✅ AFTER: Safe Logging
```typescript
logger.error('Failed to process Shopify order', {
  shopifyOrderId: shopifyOrder.id,           // ✅ Safe identifier
  shopifyOrderName: shopifyOrder.name,       // ✅ Safe identifier
  errorMessage: error.message,               // ✅ Error details
  errorStack: error.stack,                   // ✅ Stack trace
  // ❌ REMOVED: customer data, addresses, line items
});
```

---

## NEW FEATURE: Outbound Shopify Methods (Two-Way Sync)

### 1. Update Shopify Order Status
```typescript
async updateShopifyOrderStatus(orderId: string, status: OrderStatus): Promise<void>
```

**When to call:** Order status changes in our system
**What it does:** Updates Shopify order with internal status
**Implementation:** TODO - Use Shopify REST API

---

### 2. Fulfill Shopify Order
```typescript
async fulfillShopifyOrder(
  orderId: string,
  trackingUrl?: string,
  trackingNumber?: string
): Promise<void>
```

**When to call:** Order is delivered
**What it does:** Creates Shopify Fulfillment with tracking
**Implementation:** TODO - Use Shopify Fulfillment API

**Example:**
```typescript
// When driver completes delivery
await shopifyService.fulfillShopifyOrder(
  order.id,
  'https://track.example.com/ABC123',
  'ABC123'
);
```

---

### 3. Add Tracking to Shopify Order
```typescript
async addTrackingToShopifyOrder(
  orderId: string,
  trackingUrl: string,
  trackingNumber?: string
): Promise<void>
```

**When to call:** Tracking URL becomes available
**What it does:** Updates Shopify fulfillment with tracking info
**Implementation:** TODO - Use Shopify Fulfillment API

---

### 4. Upload POD to Shopify
```typescript
async uploadPODToShopify(
  orderId: string,
  photoUrls: string[],
  signature?: string
): Promise<void>
```

**When to call:** Proof of delivery is submitted
**What it does:** Attaches POD photos/signature to Shopify order
**Implementation:** TODO - Use Shopify Metafields or File API

**Options:**
- Option 1: Add note to order with photo URLs
- Option 2: Use Shopify Metafields to attach files
- Option 3: Use Shopify Admin API file attachments

---

## Complete Change Summary

### Webhook Handlers (Inbound)

#### handleOrderCreated()
- ✅ Uses `externalId` and `externalSource` instead of `shopifyOrderId`
- ✅ Geocoding moved outside transaction
- ✅ Transaction-based Customer + Address + Order creation
- ✅ Creates Address record with `deliveryAddressId` relation
- ✅ Uses `deliveryWindowStart/End` (renamed from `timeWindow`)
- ✅ Uses lowercase enum: `OrderStatus.pending`
- ✅ Stores Shopify data in `externalMetadata`
- ✅ Uses `$executeRaw` for PostGIS geometry
- ✅ Removes PII from error logs
- ✅ Includes `deliveryAddress` in response

#### handleOrderUpdated()
- ✅ Uses `externalId` + `externalSource` for lookup
- ✅ Updates `externalMetadata` instead of inline fields
- ✅ Includes `deliveryAddress` in response
- ✅ Removes PII from error logs

#### handleOrderCancelled()
- ✅ Uses `externalId` + `externalSource` for lookup
- ✅ Uses lowercase enum: `OrderStatus.cancelled`
- ✅ Removes PII from error logs

### Outbound Methods (New)

- ✅ `updateShopifyOrderStatus()` - Update order status in Shopify
- ✅ `fulfillShopifyOrder()` - Mark order as fulfilled with tracking
- ✅ `addTrackingToShopifyOrder()` - Add tracking information
- ✅ `uploadPODToShopify()` - Upload proof of delivery

All outbound methods:
- Check if order is from Shopify before making API calls
- Log intent (actual implementation is TODO placeholder)
- Don't throw errors (non-critical sync)
- Remove PII from logs

---

## Files Changed

| File | Changes | Description |
|------|---------|-------------|
| `shopify.service.ts` | Complete rewrite | Fixed schema alignment, added outbound methods |

---

## Implementation Status

### ✅ Complete (Schema Alignment)
- externalId/externalSource pattern
- Transaction-based creation
- Address relation (deliveryAddressId)
- Field name corrections
- Enum value fixes
- PII removal from logs
- Geocoding performance

### 🚧 TODO (Shopify API Integration)
- Implement Shopify REST API client
- `updateShopifyOrderStatus()` - Call Shopify API
- `fulfillShopifyOrder()` - Create Shopify Fulfillment
- `addTrackingToShopifyOrder()` - Update fulfillment tracking
- `uploadPODToShopify()` - Upload files to Shopify
- Add Shopify API credentials to environment config
- Add Shopify API error handling
- Add retry logic for failed API calls
- Add webhook signature verification (already in middleware)

---

## Testing Checklist (When DB Connected)

### Inbound (Webhooks)
- [ ] Receive Shopify order created webhook
- [ ] Verify Customer created/updated
- [ ] Verify Address created with geocoding
- [ ] Verify Order created with deliveryAddressId
- [ ] Verify externalId and externalSource set correctly
- [ ] Verify externalMetadata contains Shopify data
- [ ] Test order update webhook
- [ ] Test order cancellation webhook
- [ ] Test duplicate order handling

### Outbound (Two-Way Sync)
- [ ] Call updateShopifyOrderStatus() (verify logs)
- [ ] Call fulfillShopifyOrder() (verify logs)
- [ ] Call addTrackingToShopifyOrder() (verify logs)
- [ ] Call uploadPODToShopify() (verify logs)
- [ ] Implement actual Shopify API calls
- [ ] Test end-to-end fulfillment flow

---

## Migration Notes

### Existing Shopify Orders
If you have existing orders with `shopifyOrderId` field, you'll need to migrate:

```sql
-- Copy shopifyOrderId to externalId, set externalSource
UPDATE orders
SET
  external_id = shopify_order_id,
  external_source = 'shopify'
WHERE shopify_order_id IS NOT NULL;

-- Then drop the old column (after verifying migration)
-- ALTER TABLE orders DROP COLUMN shopify_order_id;
-- ALTER TABLE orders DROP COLUMN shopify_order_name;
```

### Finding Shopify Orders
Before:
```typescript
await prisma.order.findUnique({
  where: { shopifyOrderId: id }
});
```

After:
```typescript
await prisma.order.findFirst({
  where: {
    externalId: id,
    externalSource: 'shopify'
  }
});
```

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **Schema Fixes** | 10+ |
| **Field Renames** | 2 (deliveryWindow) |
| **Enum Fixes** | 2 occurrences |
| **Pattern Changes** | 1 (externalId/Source) |
| **New Outbound Methods** | 4 |
| **PII Removals** | 3 error logs |
| **Total Line Changes** | 400+ |

---

**End of Shopify Service Fixes Documentation**

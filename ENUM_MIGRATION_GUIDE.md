# Migration Guide: Add OrderType and VehicleType Enums

**Date:** 2025-11-20
**PR:** #TBD
**Branch:** pr/add-missing-enums

---

## Overview

This migration adds two missing enums to the schema that are already referenced in the codebase:
1. **OrderType** enum (delivery, pickup)
2. **VehicleType** enum (car, van, truck, bike, motorcycle)

Additionally, adds corresponding `type` fields to:
- `Order` model
- `Vehicle` model

## Schema Changes

### New Enums

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

### New Fields

**Order model:**
```prisma
type                  OrderType?
```

**Vehicle model:**
```prisma
type                  VehicleType?  @map("vehicle_type")
```

---

## SQL Migration

Run this SQL after merging to add the enums and columns:

```sql
-- Create OrderType enum
CREATE TYPE "OrderType" AS ENUM ('delivery', 'pickup');

-- Create VehicleType enum
CREATE TYPE "VehicleType" AS ENUM ('car', 'van', 'truck', 'bike', 'motorcycle');

-- Add type column to orders table
ALTER TABLE "orders"
ADD COLUMN "type" "OrderType";

-- Add vehicle_type column to vehicles table
ALTER TABLE "vehicles"
ADD COLUMN "vehicle_type" "VehicleType";

-- Create index on order type (optional, for performance)
CREATE INDEX "idx_orders_type" ON "orders"("type");

-- Create index on vehicle type (optional, for performance)
CREATE INDEX "idx_vehicles_type" ON "vehicles"("vehicle_type");
```

**Or use Prisma migrate:**

```bash
# After merging and setting DATABASE_URL
npm run db:migrate -- --name add_order_and_vehicle_type_enums
```

---

## Data Migration (Optional)

If you have existing data and want to set default types:

```sql
-- Set default order type to 'delivery' for existing orders
UPDATE "orders"
SET "type" = 'delivery'
WHERE "type" IS NULL;

-- Set default vehicle type based on capacity
UPDATE "vehicles"
SET "vehicle_type" = CASE
  WHEN capacity_kg <= 500 THEN 'bike'
  WHEN capacity_kg <= 1000 THEN 'car'
  WHEN capacity_kg <= 3000 THEN 'van'
  ELSE 'truck'
END
WHERE "vehicle_type" IS NULL AND capacity_kg IS NOT NULL;

-- Or set all to 'van' if unsure
UPDATE "vehicles"
SET "vehicle_type" = 'van'
WHERE "vehicle_type" IS NULL;
```

---

## Rollback

If you need to rollback:

```sql
-- Remove columns
ALTER TABLE "orders" DROP COLUMN "type";
ALTER TABLE "vehicles" DROP COLUMN "vehicle_type";

-- Drop enums
DROP TYPE "OrderType";
DROP TYPE "VehicleType";
```

---

## Code Impact

### Files Already Using These Enums

These files import the enums from `@prisma/client` and will now work correctly:

**OrderType:**
- `src/modules/orders/orders.service.ts`
- `src/modules/orders/orders.controller.ts`
- `src/modules/orders/orders.types.ts`
- `src/modules/orders/shopify.service.ts`
- `prisma/seed.ts`

**VehicleType:**
- `src/modules/vehicles/vehicles.service.ts`
- `src/modules/vehicles/vehicles.controller.ts`
- `prisma/seed.ts`

### Breaking Changes

**None.** Both fields are optional (nullable), so:
- Existing orders can have `type = null`
- Existing vehicles can have `type = null`
- New code can start using the enums immediately

---

## Testing After Migration

1. **Verify enum creation:**
   ```sql
   SELECT enumlabel FROM pg_enum WHERE enumtypid = 'OrderType'::regtype;
   SELECT enumlabel FROM pg_enum WHERE enumtypid = 'VehicleType'::regtype;
   ```

2. **Test creating order with type:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/orders \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "orderNumber": "TEST-001",
       "type": "delivery",
       ...
     }'
   ```

3. **Test creating vehicle with type:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/vehicles \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "licensePlate": "ABC123",
       "type": "van",
       ...
     }'
   ```

4. **Run TypeScript type check:**
   ```bash
   npm run type-check
   ```

---

## Next Steps

After merging this PR, the following services can be fixed to properly use the enums:
1. Orders service - use `type` field in create/update operations
2. Shopify service - properly set `type` based on delivery/pickup
3. Vehicles service - use `type` field in create/update operations

See `SCHEMA_AUDIT_REPORT.md` for detailed list of remaining schema mismatches.

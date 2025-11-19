# OrdakDelivery Database Schema Design

## Overview
Complete database schema for the OrdakDelivery standalone delivery management system.

---

## Core Entities

### 1. USERS
**Purpose**: Authentication and authorization for all system users (admins, dispatchers, drivers)

```sql
users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             VARCHAR(255) NOT NULL UNIQUE,
  password_hash     VARCHAR(255) NOT NULL,
  role              VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'dispatcher', 'driver')),
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  phone             VARCHAR(20),
  is_active         BOOLEAN DEFAULT true,
  email_verified    BOOLEAN DEFAULT false,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
)

INDEXES:
  - idx_users_email (email)
  - idx_users_role (role)
  - idx_users_is_active (is_active)
```

---

### 2. DRIVERS
**Purpose**: Driver-specific information and status

```sql
drivers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_license      VARCHAR(50) NOT NULL UNIQUE,
  license_expiry      DATE NOT NULL,
  vehicle_id          UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  status              VARCHAR(50) NOT NULL DEFAULT 'offline'
                      CHECK (status IN ('offline', 'available', 'on_delivery', 'on_break')),
  current_location    GEOGRAPHY(POINT, 4326),
  last_location_update TIMESTAMPTZ,
  rating              DECIMAL(3,2) DEFAULT 5.00,
  total_deliveries    INTEGER DEFAULT 0,
  emergency_contact_name   VARCHAR(100),
  emergency_contact_phone  VARCHAR(20),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
)

INDEXES:
  - idx_drivers_user_id (user_id)
  - idx_drivers_status (status)
  - idx_drivers_vehicle_id (vehicle_id)
  - idx_drivers_current_location (current_location) USING GIST
```

---

### 3. VEHICLES
**Purpose**: Vehicle fleet management

```sql
vehicles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_plate     VARCHAR(20) NOT NULL UNIQUE,
  make              VARCHAR(50) NOT NULL,
  model             VARCHAR(50) NOT NULL,
  year              INTEGER NOT NULL,
  vin               VARCHAR(17) UNIQUE,
  color             VARCHAR(30),
  capacity_kg       DECIMAL(10,2),
  capacity_cubic_m  DECIMAL(10,2),
  fuel_type         VARCHAR(30) CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'hybrid')),
  status            VARCHAR(50) DEFAULT 'active'
                    CHECK (status IN ('active', 'maintenance', 'retired')),
  insurance_expiry  DATE,
  registration_expiry DATE,
  last_service_date DATE,
  next_service_date DATE,
  odometer_km       INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
)

INDEXES:
  - idx_vehicles_license_plate (license_plate)
  - idx_vehicles_status (status)
```

---

### 4. CUSTOMERS
**Purpose**: Customer information (recipients of deliveries)

```sql
customers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id       VARCHAR(255),  -- ID from external system (e.g., Shopify customer ID)
  external_source   VARCHAR(50),   -- e.g., 'shopify', 'manual', 'api'
  email             VARCHAR(255),
  phone             VARCHAR(20),
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  company           VARCHAR(255),
  notes             TEXT,
  total_orders      INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
)

INDEXES:
  - idx_customers_email (email)
  - idx_customers_phone (phone)
  - idx_customers_external_id (external_id, external_source)
```

---

### 5. ADDRESSES
**Purpose**: Delivery addresses with geocoding

```sql
addresses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  label             VARCHAR(50),  -- e.g., 'home', 'work', 'warehouse'
  line1             VARCHAR(255) NOT NULL,
  line2             VARCHAR(255),
  city              VARCHAR(100) NOT NULL,
  state_province    VARCHAR(100),
  postal_code       VARCHAR(20) NOT NULL,
  country           VARCHAR(2) DEFAULT 'US',  -- ISO 3166-1 alpha-2
  latitude          DECIMAL(10,8),
  longitude         DECIMAL(11,8),
  location          GEOGRAPHY(POINT, 4326),  -- PostGIS geography type
  geocoded_at       TIMESTAMPTZ,
  delivery_instructions TEXT,
  is_default        BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
)

INDEXES:
  - idx_addresses_customer_id (customer_id)
  - idx_addresses_location (location) USING GIST
  - idx_addresses_postal_code (postal_code)
```

---

### 6. ORDERS
**Purpose**: Delivery orders received from external systems

```sql
orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number      VARCHAR(100) NOT NULL UNIQUE,
  external_id       VARCHAR(255),  -- ID from external system
  external_source   VARCHAR(50) NOT NULL,  -- 'shopify', 'ordak_go', 'manual', 'api'
  external_metadata JSONB,  -- Store any external system data

  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  delivery_address_id UUID NOT NULL REFERENCES addresses(id),

  status            VARCHAR(50) NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                      'pending',           -- Waiting to be assigned
                      'assigned',          -- Assigned to a run
                      'in_transit',        -- Driver is on the way
                      'delivered',         -- Successfully delivered
                      'failed',            -- Delivery failed
                      'cancelled'          -- Order cancelled
                    )),

  priority          INTEGER DEFAULT 0,  -- Higher = more urgent

  -- Scheduling
  scheduled_date    DATE,
  delivery_window_start TIME,
  delivery_window_end TIME,
  estimated_delivery_time TIMESTAMPTZ,
  actual_delivery_time TIMESTAMPTZ,

  -- Package details
  weight_kg         DECIMAL(10,2),
  dimensions_cm     VARCHAR(50),  -- e.g., "30x20x15"
  package_count     INTEGER DEFAULT 1,
  special_instructions TEXT,
  requires_signature BOOLEAN DEFAULT false,
  fragile           BOOLEAN DEFAULT false,

  -- Financial
  subtotal          DECIMAL(10,2),
  delivery_fee      DECIMAL(10,2),
  tax               DECIMAL(10,2),
  total             DECIMAL(10,2),
  currency          VARCHAR(3) DEFAULT 'USD',

  -- Tracking
  failure_reason    TEXT,
  failure_photos    TEXT[],  -- Array of S3/Supabase storage URLs
  notes             TEXT,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
)

INDEXES:
  - idx_orders_order_number (order_number)
  - idx_orders_external_id (external_id, external_source)
  - idx_orders_customer_id (customer_id)
  - idx_orders_status (status)
  - idx_orders_scheduled_date (scheduled_date)
  - idx_orders_created_at (created_at DESC)
```

---

### 7. DELIVERY_RUNS
**Purpose**: Groups of orders assigned to a driver for a route

```sql
delivery_runs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_number        VARCHAR(100) NOT NULL UNIQUE,
  driver_id         UUID REFERENCES drivers(id) ON DELETE SET NULL,
  vehicle_id        UUID REFERENCES vehicles(id) ON DELETE SET NULL,

  status            VARCHAR(50) NOT NULL DEFAULT 'draft'
                    CHECK (status IN (
                      'draft',             -- Being created/planned
                      'assigned',          -- Assigned to driver, not started
                      'in_progress',       -- Driver has started
                      'completed',         -- All deliveries done
                      'cancelled'          -- Run cancelled
                    )),

  -- Scheduling
  scheduled_date    DATE NOT NULL,
  start_time        TIME,
  estimated_end_time TIME,
  actual_start_time TIMESTAMPTZ,
  actual_end_time   TIMESTAMPTZ,

  -- Route optimization
  optimized_route   JSONB,  -- Store optimized route order and details
  total_distance_km DECIMAL(10,2),
  estimated_duration_minutes INTEGER,

  -- Starting location (usually depot/warehouse)
  start_address_id  UUID REFERENCES addresses(id),
  start_location    GEOGRAPHY(POINT, 4326),

  -- Stats
  total_orders      INTEGER DEFAULT 0,
  delivered_orders  INTEGER DEFAULT 0,
  failed_orders     INTEGER DEFAULT 0,

  -- Notes
  notes             TEXT,
  dispatcher_notes  TEXT,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
)

INDEXES:
  - idx_delivery_runs_run_number (run_number)
  - idx_delivery_runs_driver_id (driver_id)
  - idx_delivery_runs_status (status)
  - idx_delivery_runs_scheduled_date (scheduled_date)
```

---

### 8. RUN_ORDERS
**Purpose**: Junction table linking orders to delivery runs with sequence

```sql
run_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id            UUID NOT NULL REFERENCES delivery_runs(id) ON DELETE CASCADE,
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sequence          INTEGER NOT NULL,  -- Order in the route (1, 2, 3, ...)
  status            VARCHAR(50) DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_transit', 'delivered', 'failed', 'skipped')),
  arrival_time      TIMESTAMPTZ,
  departure_time    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(run_id, order_id),
  UNIQUE(run_id, sequence)
)

INDEXES:
  - idx_run_orders_run_id (run_id)
  - idx_run_orders_order_id (order_id)
  - idx_run_orders_sequence (run_id, sequence)
```

---

### 9. PROOF_OF_DELIVERY
**Purpose**: Signatures, photos, and delivery confirmation

```sql
proof_of_delivery (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  run_id            UUID REFERENCES delivery_runs(id) ON DELETE SET NULL,
  driver_id         UUID NOT NULL REFERENCES drivers(id),

  -- Recipient information
  recipient_name    VARCHAR(255),
  recipient_relationship VARCHAR(100),  -- e.g., 'customer', 'neighbor', 'reception'

  -- Proof media
  signature_url     TEXT,  -- S3/Supabase storage URL
  photos            TEXT[],  -- Array of photo URLs

  -- Delivery details
  delivered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location          GEOGRAPHY(POINT, 4326),  -- Where it was delivered
  notes             TEXT,

  created_at        TIMESTAMPTZ DEFAULT NOW()
)

INDEXES:
  - idx_pod_order_id (order_id)
  - idx_pod_driver_id (driver_id)
  - idx_pod_delivered_at (delivered_at DESC)
```

---

### 10. LOCATION_TRACKING
**Purpose**: Real-time driver location tracking history

```sql
location_tracking (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  run_id            UUID REFERENCES delivery_runs(id) ON DELETE SET NULL,

  location          GEOGRAPHY(POINT, 4326) NOT NULL,
  latitude          DECIMAL(10,8) NOT NULL,
  longitude         DECIMAL(11,8) NOT NULL,
  accuracy_meters   DECIMAL(10,2),

  speed_kmh         DECIMAL(10,2),
  heading_degrees   DECIMAL(5,2),
  altitude_meters   DECIMAL(10,2),

  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
)

-- Partition this table by month for performance
PARTITION BY RANGE (recorded_at);

INDEXES:
  - idx_location_tracking_driver_id (driver_id, recorded_at DESC)
  - idx_location_tracking_run_id (run_id, recorded_at DESC)
  - idx_location_tracking_location (location) USING GIST
```

---

### 11. DRIVER_SESSIONS
**Purpose**: Track when drivers are on duty

```sql
driver_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id        UUID REFERENCES vehicles(id) ON DELETE SET NULL,

  start_time        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time          TIMESTAMPTZ,

  start_location    GEOGRAPHY(POINT, 4326),
  end_location      GEOGRAPHY(POINT, 4326),

  total_distance_km DECIMAL(10,2),
  total_deliveries  INTEGER DEFAULT 0,

  created_at        TIMESTAMPTZ DEFAULT NOW()
)

INDEXES:
  - idx_driver_sessions_driver_id (driver_id, start_time DESC)
  - idx_driver_sessions_active (driver_id) WHERE end_time IS NULL
```

---

### 12. NOTIFICATIONS
**Purpose**: In-app notifications for users

```sql
notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              VARCHAR(50) NOT NULL,  -- 'order_assigned', 'delivery_completed', etc.
  title             VARCHAR(255) NOT NULL,
  message           TEXT NOT NULL,
  data              JSONB,  -- Additional structured data
  read              BOOLEAN DEFAULT false,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)

INDEXES:
  - idx_notifications_user_id (user_id, created_at DESC)
  - idx_notifications_unread (user_id) WHERE read = false
```

---

### 13. AUDIT_LOGS
**Purpose**: Track all important actions in the system

```sql
audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type       VARCHAR(50) NOT NULL,  -- 'order', 'run', 'driver', etc.
  entity_id         UUID NOT NULL,
  action            VARCHAR(50) NOT NULL,  -- 'create', 'update', 'delete', 'assign', etc.
  changes           JSONB,  -- Store before/after values
  ip_address        INET,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
)

PARTITION BY RANGE (created_at);

INDEXES:
  - idx_audit_logs_entity (entity_type, entity_id, created_at DESC)
  - idx_audit_logs_user_id (user_id, created_at DESC)
```

---

## Database Functions & Triggers

### Auto-update timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... (apply to all relevant tables)
```

### Auto-generate order numbers

```sql
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                        LPAD(NEXTVAL('order_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE order_number_seq;

CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();
```

### Auto-generate run numbers

```sql
CREATE OR REPLACE FUNCTION generate_run_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.run_number IS NULL THEN
    NEW.run_number := 'RUN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                      LPAD(NEXTVAL('run_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE run_number_seq;

CREATE TRIGGER generate_run_number_trigger
  BEFORE INSERT ON delivery_runs
  FOR EACH ROW EXECUTE FUNCTION generate_run_number();
```

### Update driver location in drivers table

```sql
CREATE OR REPLACE FUNCTION update_driver_location()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE drivers
  SET
    current_location = NEW.location,
    last_location_update = NEW.recorded_at
  WHERE id = NEW.driver_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_location_trigger
  AFTER INSERT ON location_tracking
  FOR EACH ROW EXECUTE FUNCTION update_driver_location();
```

### Update run statistics

```sql
CREATE OR REPLACE FUNCTION update_run_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE delivery_runs
  SET
    total_orders = (SELECT COUNT(*) FROM run_orders WHERE run_id = NEW.run_id),
    delivered_orders = (SELECT COUNT(*) FROM run_orders
                        WHERE run_id = NEW.run_id AND status = 'delivered'),
    failed_orders = (SELECT COUNT(*) FROM run_orders
                     WHERE run_id = NEW.run_id AND status = 'failed')
  WHERE id = NEW.run_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_run_stats_trigger
  AFTER INSERT OR UPDATE ON run_orders
  FOR EACH ROW EXECUTE FUNCTION update_run_stats();
```

---

## Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ... (enable for all tables)

-- Admin users can see everything
CREATE POLICY admin_all ON users FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Drivers can only see their own data
CREATE POLICY drivers_own_data ON drivers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR
         EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'dispatcher')));

-- Drivers can only see their assigned runs
CREATE POLICY drivers_own_runs ON delivery_runs FOR SELECT TO authenticated
  USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()) OR
         EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'dispatcher')));

-- ... (create appropriate policies for each table)
```

---

## Indexes Summary

Critical indexes for performance:

1. **Geography/Location indexes** (GIST):
   - drivers.current_location
   - addresses.location
   - location_tracking.location

2. **Foreign key indexes**:
   - All FK columns automatically indexed

3. **Query performance indexes**:
   - orders.status, scheduled_date, created_at
   - delivery_runs.status, scheduled_date
   - drivers.status
   - location_tracking(driver_id, recorded_at)

4. **Unique constraints**:
   - users.email
   - drivers.driver_license
   - vehicles.license_plate
   - orders.order_number
   - delivery_runs.run_number

---

## Data Volume Estimates & Partitioning Strategy

### Expected Growth
- **Orders**: ~1,000-10,000 per day
- **Location Tracking**: ~1,000,000 records per day (100 drivers × 10,000 locations)
- **Audit Logs**: ~10,000 per day

### Partitioning Strategy
1. **location_tracking**: Partition by month
2. **audit_logs**: Partition by month
3. **orders**: Consider partitioning by scheduled_date after 1M records

---

## Storage Considerations

### File Storage (Supabase Storage / S3)
- **Proof of Delivery Photos**: ~2-5 MB each
- **Signatures**: ~50-100 KB each
- **Bucket structure**:
  - `proof-of-delivery/{order_id}/signature.png`
  - `proof-of-delivery/{order_id}/photo-1.jpg`
  - `proof-of-delivery/{order_id}/photo-2.jpg`

---

## Next Steps

Once approved, I will:
1. Create SQL migration files for Supabase
2. Create Prisma schema with full TypeScript types
3. Implement all API endpoints
4. Add authentication & authorization
5. Set up real-time subscriptions
6. Create comprehensive API documentation

**Ready for your review and approval!**

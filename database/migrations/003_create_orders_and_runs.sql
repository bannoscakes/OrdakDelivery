-- Migration: 003_create_orders_and_runs.sql
-- Description: Create orders, delivery runs, and related tables
-- Created: 2024-11-18

-- =====================================================
-- ORDERS TABLE
-- Purpose: Delivery orders received from external systems
-- =====================================================
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(100) NOT NULL UNIQUE,
  external_id VARCHAR(255),
  external_source VARCHAR(50) NOT NULL,
  external_metadata JSONB,

  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  delivery_address_id UUID NOT NULL REFERENCES addresses(id),

  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'assigned',
      'in_transit',
      'delivered',
      'failed',
      'cancelled'
    )),

  priority INTEGER DEFAULT 0 NOT NULL,

  -- Scheduling
  scheduled_date DATE,
  delivery_window_start TIME,
  delivery_window_end TIME,
  estimated_delivery_time TIMESTAMPTZ,
  actual_delivery_time TIMESTAMPTZ,

  -- Package details
  weight_kg DECIMAL(10,2),
  dimensions_cm VARCHAR(50),
  package_count INTEGER DEFAULT 1 NOT NULL,
  special_instructions TEXT,
  requires_signature BOOLEAN DEFAULT false NOT NULL,
  fragile BOOLEAN DEFAULT false NOT NULL,

  -- Financial
  subtotal DECIMAL(10,2),
  delivery_fee DECIMAL(10,2),
  tax DECIMAL(10,2),
  total DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD' NOT NULL,

  -- Tracking
  failure_reason TEXT,
  failure_photos TEXT[],
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_external_id ON orders(external_id, external_source);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_scheduled_date ON orders(scheduled_date);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

COMMENT ON TABLE orders IS 'Delivery orders from external systems';
COMMENT ON COLUMN orders.status IS 'Order status: pending (unassigned), assigned (in a run), in_transit (driver en route), delivered (completed), failed (delivery failed), cancelled';
COMMENT ON COLUMN orders.external_source IS 'Source system: shopify, ordak_go, manual, api';
COMMENT ON COLUMN orders.priority IS 'Higher number = more urgent';

-- Sequence for auto-generating order numbers
CREATE SEQUENCE order_number_seq START 1;

-- =====================================================
-- DELIVERY_RUNS TABLE
-- Purpose: Groups of orders assigned to a driver for a route
-- =====================================================
CREATE TABLE delivery_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_number VARCHAR(100) NOT NULL UNIQUE,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,

  status VARCHAR(50) NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',
      'assigned',
      'in_progress',
      'completed',
      'cancelled'
    )),

  -- Scheduling
  scheduled_date DATE NOT NULL,
  start_time TIME,
  estimated_end_time TIME,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,

  -- Route optimization
  optimized_route JSONB,
  total_distance_km DECIMAL(10,2),
  estimated_duration_minutes INTEGER,

  -- Starting location
  start_address_id UUID REFERENCES addresses(id),
  start_location GEOGRAPHY(POINT, 4326),

  -- Statistics
  total_orders INTEGER DEFAULT 0 NOT NULL,
  delivered_orders INTEGER DEFAULT 0 NOT NULL,
  failed_orders INTEGER DEFAULT 0 NOT NULL,

  -- Notes
  notes TEXT,
  dispatcher_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_delivery_runs_run_number ON delivery_runs(run_number);
CREATE INDEX idx_delivery_runs_driver_id ON delivery_runs(driver_id);
CREATE INDEX idx_delivery_runs_status ON delivery_runs(status);
CREATE INDEX idx_delivery_runs_scheduled_date ON delivery_runs(scheduled_date);

COMMENT ON TABLE delivery_runs IS 'Delivery routes assigned to drivers';
COMMENT ON COLUMN delivery_runs.status IS 'Run status: draft (being planned), assigned (driver assigned), in_progress (active), completed (all deliveries done), cancelled';
COMMENT ON COLUMN delivery_runs.optimized_route IS 'JSON array of optimized waypoints and directions';

-- Sequence for auto-generating run numbers
CREATE SEQUENCE run_number_seq START 1;

-- =====================================================
-- RUN_ORDERS TABLE
-- Purpose: Junction table linking orders to delivery runs
-- =====================================================
CREATE TABLE run_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES delivery_runs(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'in_transit', 'delivered', 'failed', 'skipped')),
  arrival_time TIMESTAMPTZ,
  departure_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  UNIQUE(run_id, order_id),
  UNIQUE(run_id, sequence)
);

CREATE INDEX idx_run_orders_run_id ON run_orders(run_id);
CREATE INDEX idx_run_orders_order_id ON run_orders(order_id);
CREATE INDEX idx_run_orders_sequence ON run_orders(run_id, sequence);

COMMENT ON TABLE run_orders IS 'Links orders to runs with delivery sequence';
COMMENT ON COLUMN run_orders.sequence IS 'Order position in route (1, 2, 3, ...)';

-- =====================================================
-- PROOF_OF_DELIVERY TABLE
-- Purpose: Signatures, photos, and delivery confirmation
-- =====================================================
CREATE TABLE proof_of_delivery (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  run_id UUID REFERENCES delivery_runs(id) ON DELETE SET NULL,
  driver_id UUID NOT NULL REFERENCES drivers(id),

  -- Recipient information
  recipient_name VARCHAR(255),
  recipient_relationship VARCHAR(100),

  -- Proof media (stored as Supabase Storage URLs)
  signature_url TEXT,
  photos TEXT[],

  -- Delivery details
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  location GEOGRAPHY(POINT, 4326),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_pod_order_id ON proof_of_delivery(order_id);
CREATE INDEX idx_pod_driver_id ON proof_of_delivery(driver_id);
CREATE INDEX idx_pod_delivered_at ON proof_of_delivery(delivered_at DESC);

COMMENT ON TABLE proof_of_delivery IS 'Delivery confirmation with signatures and photos';
COMMENT ON COLUMN proof_of_delivery.recipient_relationship IS 'e.g., customer, neighbor, reception, authorized person';

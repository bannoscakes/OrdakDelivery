-- Migration: 002_create_core_tables.sql
-- Description: Create core tables for users, drivers, vehicles, customers, and addresses
-- Created: 2024-11-18

-- =====================================================
-- USERS TABLE
-- Purpose: Authentication and authorization for all system users
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'dispatcher', 'driver')),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true NOT NULL,
  email_verified BOOLEAN DEFAULT false NOT NULL,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active) WHERE is_active = true;

COMMENT ON TABLE users IS 'System users including admins, dispatchers, and drivers';
COMMENT ON COLUMN users.role IS 'User role: admin (full access), dispatcher (manage runs), driver (mobile app)';
COMMENT ON COLUMN users.is_active IS 'Whether the user account is active';

-- =====================================================
-- VEHICLES TABLE
-- Purpose: Vehicle fleet management
-- =====================================================
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  license_plate VARCHAR(20) NOT NULL UNIQUE,
  make VARCHAR(50) NOT NULL,
  model VARCHAR(50) NOT NULL,
  year INTEGER NOT NULL,
  vin VARCHAR(17) UNIQUE,
  color VARCHAR(30),
  capacity_kg DECIMAL(10,2),
  capacity_cubic_m DECIMAL(10,2),
  fuel_type VARCHAR(30) CHECK (fuel_type IN ('gasoline', 'diesel', 'electric', 'hybrid')),
  status VARCHAR(50) DEFAULT 'active' NOT NULL
    CHECK (status IN ('active', 'maintenance', 'retired')),
  insurance_expiry DATE,
  registration_expiry DATE,
  last_service_date DATE,
  next_service_date DATE,
  odometer_km INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_vehicles_status ON vehicles(status) WHERE status = 'active';

COMMENT ON TABLE vehicles IS 'Vehicle fleet with maintenance and capacity information';
COMMENT ON COLUMN vehicles.status IS 'Vehicle status: active (in use), maintenance (being serviced), retired (no longer in use)';

-- =====================================================
-- DRIVERS TABLE
-- Purpose: Driver-specific information and current status
-- =====================================================
CREATE TABLE drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  driver_license VARCHAR(50) NOT NULL UNIQUE,
  license_expiry DATE NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'offline'
    CHECK (status IN ('offline', 'available', 'on_delivery', 'on_break')),
  current_location GEOGRAPHY(POINT, 4326),
  last_location_update TIMESTAMPTZ,
  rating DECIMAL(3,2) DEFAULT 5.00,
  total_deliveries INTEGER DEFAULT 0 NOT NULL,
  emergency_contact_name VARCHAR(100),
  emergency_contact_phone VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_drivers_user_id ON drivers(user_id);
CREATE INDEX idx_drivers_status ON drivers(status);
CREATE INDEX idx_drivers_vehicle_id ON drivers(vehicle_id);
CREATE INDEX idx_drivers_current_location ON drivers USING GIST(current_location);

COMMENT ON TABLE drivers IS 'Driver profiles with license info and real-time status';
COMMENT ON COLUMN drivers.status IS 'Driver status: offline (not on duty), available (ready for assignments), on_delivery (actively delivering), on_break (temporarily unavailable)';
COMMENT ON COLUMN drivers.current_location IS 'Last known GPS location (PostGIS geography type)';

-- =====================================================
-- CUSTOMERS TABLE
-- Purpose: Customer information for delivery recipients
-- =====================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_id VARCHAR(255),
  external_source VARCHAR(50),
  email VARCHAR(255),
  phone VARCHAR(20),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company VARCHAR(255),
  notes TEXT,
  total_orders INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_external_id ON customers(external_id, external_source);
CREATE INDEX idx_customers_name ON customers USING gin((first_name || ' ' || last_name) gin_trgm_ops);

COMMENT ON TABLE customers IS 'Delivery recipients with contact information';
COMMENT ON COLUMN customers.external_id IS 'Customer ID from external system (e.g., Shopify customer ID)';
COMMENT ON COLUMN customers.external_source IS 'Source system: shopify, ordak_go, manual, api';

-- =====================================================
-- ADDRESSES TABLE
-- Purpose: Delivery addresses with geocoding support
-- =====================================================
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  label VARCHAR(50),
  line1 VARCHAR(255) NOT NULL,
  line2 VARCHAR(255),
  city VARCHAR(100) NOT NULL,
  state_province VARCHAR(100),
  postal_code VARCHAR(20) NOT NULL,
  country VARCHAR(2) DEFAULT 'US' NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  location GEOGRAPHY(POINT, 4326),
  geocoded_at TIMESTAMPTZ,
  delivery_instructions TEXT,
  is_default BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_addresses_customer_id ON addresses(customer_id);
CREATE INDEX idx_addresses_location ON addresses USING GIST(location);
CREATE INDEX idx_addresses_postal_code ON addresses(postal_code);

COMMENT ON TABLE addresses IS 'Geocoded delivery addresses with location data';
COMMENT ON COLUMN addresses.location IS 'PostGIS geography point for spatial queries';
COMMENT ON COLUMN addresses.country IS 'ISO 3166-1 alpha-2 country code';

-- Trigger to automatically set location from lat/long
CREATE OR REPLACE FUNCTION set_location_from_coordinates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_address_location
  BEFORE INSERT OR UPDATE ON addresses
  FOR EACH ROW
  EXECUTE FUNCTION set_location_from_coordinates();

-- Migration: 004_create_tracking_and_audit.sql
-- Description: Create location tracking, driver sessions, notifications, and audit tables
-- Created: 2024-11-18

-- =====================================================
-- LOCATION_TRACKING TABLE (PARTITIONED)
-- Purpose: Real-time driver location tracking history
-- =====================================================
CREATE TABLE location_tracking (
  id UUID DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  run_id UUID REFERENCES delivery_runs(id) ON DELETE SET NULL,

  location GEOGRAPHY(POINT, 4326) NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  accuracy_meters DECIMAL(10,2),

  speed_kmh DECIMAL(10,2),
  heading_degrees DECIMAL(5,2),
  altitude_meters DECIMAL(10,2),

  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Create partitions for current and next 3 months
CREATE TABLE location_tracking_2024_11 PARTITION OF location_tracking
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');

CREATE TABLE location_tracking_2024_12 PARTITION OF location_tracking
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE TABLE location_tracking_2025_01 PARTITION OF location_tracking
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE location_tracking_2025_02 PARTITION OF location_tracking
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Indexes on partitions
CREATE INDEX idx_location_tracking_driver_recorded ON location_tracking(driver_id, recorded_at DESC);
CREATE INDEX idx_location_tracking_run ON location_tracking(run_id, recorded_at DESC) WHERE run_id IS NOT NULL;
CREATE INDEX idx_location_tracking_location ON location_tracking USING GIST(location);

COMMENT ON TABLE location_tracking IS 'GPS breadcrumb trail for drivers (partitioned by month)';
COMMENT ON COLUMN location_tracking.accuracy_meters IS 'GPS accuracy in meters';

-- =====================================================
-- DRIVER_SESSIONS TABLE
-- Purpose: Track when drivers are on duty
-- =====================================================
CREATE TABLE driver_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,

  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,

  start_location GEOGRAPHY(POINT, 4326),
  end_location GEOGRAPHY(POINT, 4326),

  total_distance_km DECIMAL(10,2),
  total_deliveries INTEGER DEFAULT 0 NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_driver_sessions_driver_time ON driver_sessions(driver_id, start_time DESC);
CREATE INDEX idx_driver_sessions_active ON driver_sessions(driver_id) WHERE end_time IS NULL;

COMMENT ON TABLE driver_sessions IS 'Driver clock in/out tracking';

-- =====================================================
-- NOTIFICATIONS TABLE
-- Purpose: In-app notifications for users
-- =====================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = false;

COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON COLUMN notifications.type IS 'e.g., order_assigned, delivery_completed, run_started';

-- =====================================================
-- AUDIT_LOGS TABLE (PARTITIONED)
-- Purpose: Track all important actions in the system
-- =====================================================
CREATE TABLE audit_logs (
  id UUID DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions for current and next 3 months
CREATE TABLE audit_logs_2024_11 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');

CREATE TABLE audit_logs_2024_12 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE audit_logs_2025_02 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- =====================================================
-- AUDIT LOG RETENTION AND ARCHIVAL REQUIREMENTS
-- =====================================================
-- ⚠️ LEGAL COMPLIANCE NOTICE:
-- Audit log partitions are LEGAL RECORDS and must be handled according to compliance requirements.
--
-- DEFAULT RETENTION PERIOD: 7 years (adjust based on your jurisdiction)
--
-- PARTITION LIFECYCLE:
-- 1. Active partitions: Current month + 2 future months (keep in primary database)
-- 2. Historical partitions: Previous months up to retention period (archive to cold storage)
-- 3. Expired partitions: Older than retention period (archive, then drop)
--
-- ARCHIVAL PROCEDURE (REQUIRED before dropping any partition):
-- 1. Export partition to immutable cold storage (e.g., AWS S3 Glacier with Object Lock)
-- 2. Verify export integrity (checksum validation)
-- 3. Document archive location and retrieval procedure
-- 4. Only then detach/drop the partition from primary database
--
-- COMPLIANCE CHECKLIST:
-- □ Exported to immutable storage (no delete/modify capability)
-- □ Checksum verified and stored separately
-- □ Archive indexed for legal discovery/audit requests
-- □ Retention period documented in compliance register
-- □ Access logs enabled on archive storage
--
-- See database/README.md for detailed archive/detach procedures and compliance documentation.
--
-- MONTHLY MAINTENANCE (required):
-- - Create new partitions 3 months ahead
-- - Archive and detach partitions older than active window
-- - Never drop partitions without archiving first
-- =====================================================

-- Indexes
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;

COMMENT ON TABLE audit_logs IS 'Audit trail of all system actions (partitioned by month)';
COMMENT ON COLUMN audit_logs.action IS 'e.g., create, update, delete, assign, start, complete';
COMMENT ON COLUMN audit_logs.changes IS 'JSON containing before/after values';

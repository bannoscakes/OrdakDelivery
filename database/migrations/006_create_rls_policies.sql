-- Migration: 006_create_rls_policies.sql
-- Description: Create Row Level Security policies for Supabase Auth
-- Created: 2024-11-18
-- Note: These policies assume Supabase Auth is being used

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_of_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Admins can see all users
CREATE POLICY "Admins can view all users" ON users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Users can see their own record
CREATE POLICY "Users can view their own record" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Admins can update any user
CREATE POLICY "Admins can update any user" ON users
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Users can update their own record (except role)
CREATE POLICY "Users can update their own record" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM users WHERE id = auth.uid()));

-- =====================================================
-- DRIVERS TABLE POLICIES
-- =====================================================

-- Drivers can see their own data
CREATE POLICY "Drivers can view their own data" ON drivers
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'dispatcher'))
  );

-- Admins and dispatchers can update drivers
CREATE POLICY "Admins and dispatchers can update drivers" ON drivers
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'dispatcher'))
  );

-- Drivers can update their own status and location
CREATE POLICY "Drivers can update their own status" ON drivers
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- VEHICLES TABLE POLICIES
-- =====================================================

-- All authenticated users can view vehicles
CREATE POLICY "Authenticated users can view vehicles" ON vehicles
  FOR SELECT TO authenticated
  USING (true);

-- Only admins and dispatchers can modify vehicles
CREATE POLICY "Admins and dispatchers can modify vehicles" ON vehicles
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'dispatcher'))
  );

-- =====================================================
-- CUSTOMERS TABLE POLICIES
-- =====================================================

-- All authenticated users can view customers
CREATE POLICY "Authenticated users can view customers" ON customers
  FOR SELECT TO authenticated
  USING (true);

-- Admins and dispatchers can modify customers
CREATE POLICY "Admins and dispatchers can modify customers" ON customers
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'dispatcher'))
  );

-- =====================================================
-- ADDRESSES TABLE POLICIES
-- =====================================================

-- All authenticated users can view addresses
CREATE POLICY "Authenticated users can view addresses" ON addresses
  FOR SELECT TO authenticated
  USING (true);

-- Admins and dispatchers can modify addresses
CREATE POLICY "Admins and dispatchers can modify addresses" ON addresses
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'dispatcher'))
  );

-- =====================================================
-- ORDERS TABLE POLICIES
-- =====================================================

-- Drivers can see orders in their assigned runs
CREATE POLICY "Drivers can view their assigned orders" ON orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM run_orders ro
      JOIN delivery_runs dr ON ro.run_id = dr.id
      JOIN drivers d ON dr.driver_id = d.id
      WHERE ro.order_id = orders.id
        AND d.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'dispatcher'))
  );

-- Admins and dispatchers can modify orders
CREATE POLICY "Admins and dispatchers can modify orders" ON orders
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'dispatcher'))
  );

-- Drivers can update status of their assigned orders
CREATE POLICY "Drivers can update their assigned orders" ON orders
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM run_orders ro
      JOIN delivery_runs dr ON ro.run_id = dr.id
      JOIN drivers d ON dr.driver_id = d.id
      WHERE ro.order_id = orders.id
        AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Drivers can only modify status, notes, and failure fields
    -- All critical fields must remain unchanged
    OLD.order_number IS NOT DISTINCT FROM NEW.order_number AND
    OLD.customer_id IS NOT DISTINCT FROM NEW.customer_id AND
    OLD.delivery_address_id IS NOT DISTINCT FROM NEW.delivery_address_id AND
    OLD.subtotal IS NOT DISTINCT FROM NEW.subtotal AND
    OLD.delivery_fee IS NOT DISTINCT FROM NEW.delivery_fee AND
    OLD.tax IS NOT DISTINCT FROM NEW.tax AND
    OLD.total IS NOT DISTINCT FROM NEW.total AND
    OLD.priority IS NOT DISTINCT FROM NEW.priority AND
    OLD.external_order_id IS NOT DISTINCT FROM NEW.external_order_id AND
    OLD.external_system IS NOT DISTINCT FROM NEW.external_system AND
    -- Status can only transition to approved states
    (NEW.status IN ('in_transit', 'delivered', 'failed') OR
     OLD.status IS NOT DISTINCT FROM NEW.status)
  );

-- =====================================================
-- DELIVERY_RUNS TABLE POLICIES
-- =====================================================

-- Drivers can see their own runs
CREATE POLICY "Drivers can view their own runs" ON delivery_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = delivery_runs.driver_id
        AND drivers.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'dispatcher'))
  );

-- Admins and dispatchers can modify runs
CREATE POLICY "Admins and dispatchers can modify runs" ON delivery_runs
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'dispatcher'))
  );

-- Drivers can update their own run status
CREATE POLICY "Drivers can update their own runs" ON delivery_runs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = delivery_runs.driver_id
        AND drivers.user_id = auth.uid()
    )
  );

-- =====================================================
-- RUN_ORDERS TABLE POLICIES
-- =====================================================

-- Same as delivery_runs
CREATE POLICY "Users can view run_orders based on run access" ON run_orders
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM delivery_runs dr
      JOIN drivers d ON dr.driver_id = d.id
      WHERE dr.id = run_orders.run_id
        AND d.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'dispatcher'))
  );

CREATE POLICY "Admins and dispatchers can modify run_orders" ON run_orders
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'dispatcher'))
  );

-- =====================================================
-- PROOF_OF_DELIVERY TABLE POLICIES
-- =====================================================

-- Drivers can see POD for their deliveries
CREATE POLICY "Drivers can view their own PODs" ON proof_of_delivery
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = proof_of_delivery.driver_id
        AND drivers.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'dispatcher'))
  );

-- Drivers can create POD for their deliveries
CREATE POLICY "Drivers can create PODs for their deliveries" ON proof_of_delivery
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = proof_of_delivery.driver_id
        AND drivers.user_id = auth.uid()
    )
  );

-- =====================================================
-- LOCATION_TRACKING TABLE POLICIES
-- =====================================================

-- Drivers can create their own location records
CREATE POLICY "Drivers can create their own location records" ON location_tracking
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = location_tracking.driver_id
        AND drivers.user_id = auth.uid()
    )
  );

-- Admins and dispatchers can view all location records
CREATE POLICY "Admins and dispatchers can view all location records" ON location_tracking
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'dispatcher'))
  );

-- Drivers can view their own location history
CREATE POLICY "Drivers can view their own location history" ON location_tracking
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = location_tracking.driver_id
        AND drivers.user_id = auth.uid()
    )
  );

-- =====================================================
-- DRIVER_SESSIONS TABLE POLICIES
-- =====================================================

-- Drivers can manage their own sessions
CREATE POLICY "Drivers can manage their own sessions" ON driver_sessions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = driver_sessions.driver_id
        AND drivers.user_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('admin', 'dispatcher'))
  );

-- =====================================================
-- NOTIFICATIONS TABLE POLICIES
-- =====================================================

-- Users can see their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System can create notifications
-- Security: Restrict notification creation to prevent cross-user notification spam/impersonation
-- Users can only create notifications for themselves; backend uses service_role to create for others
CREATE POLICY "Users can create their own notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- AUDIT_LOGS TABLE POLICIES
-- =====================================================

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" ON audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- Security: No insert policy for authenticated users - audit logs are created by:
-- 1. Backend service using service_role (bypasses RLS)
-- 2. Database triggers (bypass RLS)
-- This prevents users from forging or flooding audit records

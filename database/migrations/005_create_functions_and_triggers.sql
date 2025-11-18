-- Migration: 005_create_functions_and_triggers.sql
-- Description: Create database functions and triggers for automation
-- Created: 2024-11-18

-- =====================================================
-- AUTO-UPDATE TIMESTAMPS
-- =====================================================
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

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_runs_updated_at BEFORE UPDATE ON delivery_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUTO-GENERATE ORDER NUMBERS
-- =====================================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                        LPAD(NEXTVAL('order_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- =====================================================
-- AUTO-GENERATE RUN NUMBERS
-- =====================================================
CREATE OR REPLACE FUNCTION generate_run_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.run_number IS NULL OR NEW.run_number = '' THEN
    NEW.run_number := 'RUN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                      LPAD(NEXTVAL('run_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_run_number_trigger
  BEFORE INSERT ON delivery_runs
  FOR EACH ROW EXECUTE FUNCTION generate_run_number();

-- =====================================================
-- UPDATE DRIVER LOCATION IN DRIVERS TABLE
-- =====================================================
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

-- =====================================================
-- UPDATE RUN STATISTICS
-- =====================================================
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

-- =====================================================
-- UPDATE CUSTOMER ORDER COUNT
-- =====================================================
CREATE OR REPLACE FUNCTION update_customer_order_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE customers
    SET total_orders = total_orders + 1
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE customers
    SET total_orders = GREATEST(total_orders - 1, 0)
    WHERE id = OLD.customer_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_order_count_trigger
  AFTER INSERT OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_customer_order_count();

-- =====================================================
-- AUTO-UPDATE ORDER STATUS WHEN DELIVERED
-- =====================================================
CREATE OR REPLACE FUNCTION update_order_status_on_pod()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders
  SET
    status = 'delivered',
    actual_delivery_time = NEW.delivered_at
  WHERE id = NEW.order_id;

  UPDATE run_orders
  SET status = 'delivered'
  WHERE order_id = NEW.order_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_status_on_pod_trigger
  AFTER INSERT ON proof_of_delivery
  FOR EACH ROW EXECUTE FUNCTION update_order_status_on_pod();

-- =====================================================
-- UPDATE DRIVER TOTAL DELIVERIES
-- =====================================================
CREATE OR REPLACE FUNCTION update_driver_total_deliveries()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE drivers
  SET total_deliveries = total_deliveries + 1
  WHERE id = NEW.driver_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_total_deliveries_trigger
  AFTER INSERT ON proof_of_delivery
  FOR EACH ROW EXECUTE FUNCTION update_driver_total_deliveries();

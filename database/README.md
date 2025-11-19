# OrdakDelivery Database Setup

This directory contains SQL migrations and database documentation for the OrdakDelivery system.

## Database Requirements

- **PostgreSQL**: 14.0 or higher
- **PostGIS Extension**: 3.3.2 or higher
- **uuid-ossp Extension**: For UUID generation

## Quick Start (Supabase)

### 1. Enable Extensions

Run this in Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

### 2. Run Migrations

Execute migrations in order:

```bash
# 001: Enable extensions
psql $DATABASE_URL < migrations/001_create_extensions.sql

# 002: Create core tables
psql $DATABASE_URL < migrations/002_create_core_tables.sql

# 003: Create orders and runs
psql $DATABASE_URL < migrations/003_create_orders_and_runs.sql

# 004: Create tracking and audit
psql $DATABASE_URL < migrations/004_create_tracking_and_audit.sql

# 005: Create functions and triggers
psql $DATABASE_URL < migrations/005_create_functions_and_triggers.sql

# 006: Create RLS policies
psql $DATABASE_URL < migrations/006_create_rls_policies.sql
```

### 3. Generate Prisma Client

```bash
npx prisma generate
```

### 4. (Optional) Seed Data

```bash
npx prisma db seed
```

## Migration Files

| File | Description |
|------|-------------|
| `001_create_extensions.sql` | Enable PostgreSQL extensions (uuid-ossp, PostGIS, pg_trgm) |
| `002_create_core_tables.sql` | Create users, drivers, vehicles, customers, addresses tables |
| `003_create_orders_and_runs.sql` | Create orders, delivery_runs, run_orders, proof_of_delivery tables |
| `004_create_tracking_and_audit.sql` | Create location_tracking, driver_sessions, notifications, audit_logs tables |
| `005_create_functions_and_triggers.sql` | Create database functions and triggers for automation |
| `006_create_rls_policies.sql` | Create Row Level Security policies for Supabase Auth |

## Database Schema Overview

### Core Tables

1. **users** - Authentication and user management
2. **drivers** - Driver profiles with license info
3. **vehicles** - Fleet management
4. **customers** - Delivery recipients
5. **addresses** - Geocoded delivery addresses
6. **orders** - Delivery orders from external systems
7. **delivery_runs** - Route planning and assignment
8. **run_orders** - Junction table linking orders to runs
9. **proof_of_delivery** - Signatures and photos
10. **location_tracking** - Real-time GPS breadcrumbs (partitioned by month)
11. **driver_sessions** - Clock in/out tracking
12. **notifications** - In-app notifications
13. **audit_logs** - Action audit trail (partitioned by month)

### Key Features

- **PostGIS Geography** - All location fields use `geography(Point, 4326)` for accurate distance calculations
- **Automatic Partitioning** - `location_tracking` and `audit_logs` are partitioned by month for performance
- **Triggers** - Automatic order number generation, location updates, statistics calculation
- **Row Level Security** - Multi-tenant access control via Supabase Auth
- **Full-Text Search** - Customer name search using pg_trgm
- **Audit Trail** - All important actions logged with before/after values

## Environment Variables

Add to your `.env` file:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/ordak_delivery"

# Supabase (if using)
SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# File Storage
STORAGE_BUCKET="proof-of-delivery"
```

## Prisma Commands

```bash
# Generate Prisma Client
npx prisma generate

# Pull schema from database
npx prisma db pull

# Push schema to database (dev only)
npx prisma db push

# Open Prisma Studio
npx prisma studio

# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy
```

## Partitioning Management

### Create New Partitions

Location tracking and audit logs are partitioned by month. Create new partitions before the start of each month:

```sql
-- Location tracking for March 2025
CREATE TABLE location_tracking_2025_03 PARTITION OF location_tracking
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- Audit logs for March 2025
CREATE TABLE audit_logs_2025_03 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
```

### Archive Old Partitions

After 3-6 months, detach and archive old partitions:

```sql
-- Detach partition
ALTER TABLE location_tracking DETACH PARTITION location_tracking_2024_11;

-- Export to archive
pg_dump -t location_tracking_2024_11 $DATABASE_URL > archive_2024_11.sql

-- Drop partition
DROP TABLE location_tracking_2024_11;
```

## Geographic Queries

### Find drivers near address

```sql
SELECT d.id, u.first_name, u.last_name,
       ST_Distance(d.current_location, a.location) / 1000 as distance_km
FROM drivers d
JOIN users u ON d.user_id = u.id
CROSS JOIN addresses a
WHERE a.id = $1
  AND d.status = 'available'
  AND ST_DWithin(d.current_location, a.location, 10000) -- 10km
ORDER BY distance_km ASC
LIMIT 5;
```

### Calculate route distance

```sql
SELECT ST_Length(
  ST_MakeLine(
    ARRAY(
      SELECT location::geometry
      FROM addresses
      WHERE id = ANY($1::uuid[])
      ORDER BY array_position($1::uuid[], id)
    )
  )::geography
) / 1000 as total_distance_km;
```

## Backup & Restore

### Backup

```bash
# Full backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Schema only
pg_dump --schema-only $DATABASE_URL > schema_backup.sql

# Data only
pg_dump --data-only $DATABASE_URL > data_backup.sql
```

### Restore

```bash
psql $DATABASE_URL < backup_20241118.sql
```

## Troubleshooting

### PostGIS not found

```sql
-- Check if PostGIS is installed
SELECT PostGIS_version();

-- Install PostGIS (requires superuser)
CREATE EXTENSION postgis;
```

### Partition not found

If you get "no partition of relation found" errors, create the missing partition:

```sql
-- Check existing partitions
SELECT tablename FROM pg_tables
WHERE tablename LIKE 'location_tracking_%'
ORDER BY tablename;

-- Create missing partition (adjust dates)
CREATE TABLE location_tracking_2024_12 PARTITION OF location_tracking
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
```

### RLS blocking queries

If Row Level Security is blocking legitimate queries:

```sql
-- Temporarily disable RLS for testing (NOT for production)
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Re-enable
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
```

## Performance Optimization

### Analyze tables

```sql
ANALYZE users;
ANALYZE drivers;
ANALYZE orders;
ANALYZE delivery_runs;
ANALYZE location_tracking;
```

### Check index usage

```sql
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;
```

### Vacuum partitioned tables

```sql
VACUUM ANALYZE location_tracking;
VACUUM ANALYZE audit_logs;
```

## Support

For detailed schema documentation, see:
- `/docs/DATABASE_SCHEMA.md` - Complete table definitions
- `/docs/DATABASE_RELATIONSHIPS.md` - Entity relationships and data flow

## License

Proprietary - OrdakDelivery System

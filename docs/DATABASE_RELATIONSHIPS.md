# Database Relationships Diagram

## Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ORDAK DELIVERY SYSTEM                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐
│    USERS     │
│──────────────│
│ id (PK)      │
│ email        │◄────────┐
│ role         │         │
│ password     │         │
└──────┬───────┘         │
       │                 │
       │ 1               │
       │                 │
       │ 1               │
       ▼                 │
┌──────────────┐         │
│   DRIVERS    │         │
│──────────────│         │
│ id (PK)      │         │
│ user_id (FK) │─────────┘
│ license      │
│ status       │◄────────────────────┐
│ vehicle_id   │──┐                  │
│ location     │  │                  │
└──────┬───────┘  │                  │
       │          │                  │
       │ 1        │ 1                │
       │          │                  │
       │          ▼                  │
       │   ┌──────────────┐          │
       │   │  VEHICLES    │          │
       │   │──────────────│          │
       │   │ id (PK)      │          │
       │   │ license_plate│          │
       │   │ make/model   │          │
       │   │ capacity     │          │
       │   └──────────────┘          │
       │                             │
       │ *                           │ *
       ▼                             │
┌────────────────┐                   │
│ DRIVER_SESSIONS│                   │
│────────────────│                   │
│ id (PK)        │                   │
│ driver_id (FK) │                   │
│ vehicle_id(FK) │                   │
│ start_time     │                   │
│ end_time       │                   │
└────────────────┘                   │
                                     │
       ┌─────────────────────────────┘
       │
       │ *
       ▼
┌────────────────────┐
│ LOCATION_TRACKING  │
│────────────────────│
│ id (PK)            │
│ driver_id (FK)     │
│ run_id (FK)        │
│ location (GEOG)    │
│ speed              │
│ recorded_at        │
└────────────────────┘


┌──────────────┐          ┌──────────────┐
│  CUSTOMERS   │          │  ADDRESSES   │
│──────────────│          │──────────────│
│ id (PK)      │───┐      │ id (PK)      │
│ external_id  │   │ 1    │ customer_id  │
│ first_name   │   │      │ line1        │
│ last_name    │   │      │ city         │
│ email        │   │      │ postal_code  │
│ phone        │   │  *   │ location     │
└──────┬───────┘   └─────►│ (GEOGRAPHY)  │
       │                  └───────┬──────┘
       │                          │
       │ 1                        │ 1
       │                          │
       │ *                        │ *
       ▼                          │
┌──────────────┐                  │
│   ORDERS     │◄─────────────────┘
│──────────────│
│ id (PK)      │
│ order_number │
│ external_id  │
│ customer_id  │
│ address_id   │
│ status       │
│ scheduled_dt │
│ priority     │
└──────┬───────┘
       │
       │ *
       │
       ▼
┌──────────────┐        ┌─────────────────┐
│ RUN_ORDERS   │───────►│ DELIVERY_RUNS   │
│──────────────│ *    1 │─────────────────│
│ id (PK)      │        │ id (PK)         │
│ run_id (FK)  │        │ run_number      │
│ order_id(FK) │        │ driver_id (FK)  │──┐
│ sequence     │        │ vehicle_id (FK) │  │
│ status       │        │ status          │  │
└──────────────┘        │ scheduled_date  │  │
                        │ start_time      │  │
                        │ optimized_route │  │
                        └─────────┬───────┘  │
                                  │          │
                                  │ 1        │ 1
                                  │          │
                                  │ *        │ *
                                  ▼          │
                        ┌─────────────────┐  │
                        │ PROOF_DELIVERY  │  │
                        │─────────────────│  │
                        │ id (PK)         │  │
                        │ order_id (FK)   │  │
                        │ run_id (FK)     │──┘
                        │ driver_id (FK)  │
                        │ signature_url   │
                        │ photos[]        │
                        │ recipient_name  │
                        │ delivered_at    │
                        │ location (GEOG) │
                        └─────────────────┘


AUDIT & NOTIFICATIONS (not shown in diagram):
┌──────────────┐        ┌──────────────┐
│ AUDIT_LOGS   │        │NOTIFICATIONS │
│──────────────│        │──────────────│
│ id (PK)      │        │ id (PK)      │
│ user_id (FK) │        │ user_id (FK) │
│ entity_type  │        │ type         │
│ entity_id    │        │ title        │
│ action       │        │ message      │
│ changes      │        │ read         │
└──────────────┘        └──────────────┘
```

---

## Key Relationships

### 1. User → Driver (1:1)
- Each driver account is linked to a user account
- The user provides authentication, the driver provides delivery-specific data

### 2. Driver → Vehicle (Many:1)
- Multiple drivers can be assigned to the same vehicle at different times
- Tracked via driver_sessions table

### 3. Customer → Addresses (1:Many)
- Customers can have multiple delivery addresses
- One can be marked as default

### 4. Customer → Orders (1:Many)
- Track all orders for each customer

### 5. Address → Orders (1:Many)
- Each order has ONE delivery address
- Supports address history even if customer changes address

### 6. Orders → Delivery Runs (Many:Many via RUN_ORDERS)
- Multiple orders in one run
- Junction table tracks sequence and status
- Allows historical tracking of which orders were in which runs

### 7. Driver → Delivery Runs (1:Many)
- One driver handles one run at a time
- Historical tracking of all runs per driver

### 8. Delivery Run → Proof of Delivery (1:Many)
- One POD per order in the run
- Links back to both the run and the specific order

### 9. Driver → Location Tracking (1:Many)
- Real-time breadcrumb trail
- Partitioned by date for performance

### 10. Driver → Sessions (1:Many)
- Track when drivers start/end their shift
- Calculate total working hours, distance traveled

---

## Data Flow: Order Lifecycle

```
1. ORDER RECEIVED
   ┌─────────────────────────────────┐
   │ External System (Shopify/API)   │
   └────────────┬────────────────────┘
                │
                ▼
   ┌─────────────────────────────────┐
   │ Create CUSTOMER (if new)        │
   │ Create ADDRESS (if new)         │
   │ Create ORDER                    │
   │   - status: 'pending'           │
   │   - external_id stored          │
   └────────────┬────────────────────┘
                │
                ▼
2. ROUTE PLANNING
   ┌─────────────────────────────────┐
   │ Admin/Dispatcher groups orders  │
   │ Create DELIVERY_RUN             │
   │   - status: 'draft'             │
   │ Create RUN_ORDERS (junction)    │
   │   - with sequence numbers       │
   │ Run route optimization          │
   │   - store in optimized_route    │
   └────────────┬────────────────────┘
                │
                ▼
3. DRIVER ASSIGNMENT
   ┌─────────────────────────────────┐
   │ Assign DRIVER to run            │
   │ Assign VEHICLE to run           │
   │ Update run status: 'assigned'   │
   │ Update order status: 'assigned' │
   │ Send notification to driver     │
   └────────────┬────────────────────┘
                │
                ▼
4. DELIVERY START
   ┌─────────────────────────────────┐
   │ Driver starts shift             │
   │ Create DRIVER_SESSION           │
   │ Update driver status: 'on_delivery'│
   │ Update run status: 'in_progress'│
   │ Start LOCATION_TRACKING         │
   └────────────┬────────────────────┘
                │
                ▼
5. DELIVERY EXECUTION
   ┌─────────────────────────────────┐
   │ Driver navigates to each order  │
   │ Location tracked every 5-10 sec │
   │ At each stop:                   │
   │   - Capture signature/photos    │
   │   - Create PROOF_OF_DELIVERY    │
   │   - Update RUN_ORDER status     │
   │   - Update ORDER status         │
   └────────────┬────────────────────┘
                │
                ▼
6. RUN COMPLETION
   ┌─────────────────────────────────┐
   │ All orders delivered/failed     │
   │ Update run status: 'completed'  │
   │ Update driver status: 'available'│
   │ Close DRIVER_SESSION            │
   │ Calculate stats                 │
   │ Create audit log entries        │
   └─────────────────────────────────┘
```

---

## Geographic Queries (PostGIS)

### Find drivers near an address
```sql
SELECT d.id, d.user_id, u.first_name, u.last_name,
       ST_Distance(d.current_location, a.location) as distance_meters
FROM drivers d
JOIN users u ON d.user_id = u.id
JOIN addresses a ON a.id = $1
WHERE d.status = 'available'
  AND ST_DWithin(d.current_location, a.location, 10000) -- 10km radius
ORDER BY distance_meters ASC
LIMIT 5;
```

### Calculate route distance
```sql
SELECT ST_Length(
  ST_MakeLine(
    ARRAY(
      SELECT location::geometry
      FROM addresses
      WHERE id = ANY($1)  -- Array of address IDs
      ORDER BY array_position($1, id)
    )
  )::geography
) / 1000 as total_distance_km;
```

### Find orders within delivery window
```sql
SELECT o.*,
       ST_Distance(
         (SELECT current_location FROM drivers WHERE id = $1),
         a.location
       ) / 1000 as distance_km
FROM orders o
JOIN addresses a ON o.delivery_address_id = a.id
WHERE o.status = 'pending'
  AND o.scheduled_date = CURRENT_DATE
  AND ST_DWithin(
    (SELECT current_location FROM drivers WHERE id = $1),
    a.location,
    50000  -- 50km radius
  )
ORDER BY distance_km ASC;
```

---

## Performance Considerations

### 1. Indexes
- Geographic indexes (GIST) on all location columns
- B-tree indexes on foreign keys and status fields
- Partial indexes for active/pending records

### 2. Partitioning
- `location_tracking` by month (hot data = current month)
- `audit_logs` by month
- Keep 3-6 months of location data, archive older

### 3. Caching Strategy
- Redis cache for:
  - Active driver locations (TTL: 30 seconds)
  - Active runs (TTL: 5 minutes)
  - Pending orders count (TTL: 1 minute)

### 4. Read Replicas
- Use read replicas for:
  - Admin dashboard queries
  - Historical reports
  - Location tracking queries
- Use primary for:
  - Order creation
  - Status updates
  - Proof of delivery submission

---

## Security Considerations

### 1. Row Level Security (RLS)
- Drivers can only see their assigned runs/orders
- Dispatchers can see all runs/orders
- Admins have full access

### 2. Data Encryption
- Sensitive fields encrypted at rest
- TLS for data in transit
- Signature/photo URLs use signed URLs with expiration

### 3. PII Handling
- Customer email/phone hashed for search
- Driver license numbers encrypted
- GDPR compliance: data export/deletion endpoints

### 4. API Security
- JWT tokens with short expiration (15 min access, 7 day refresh)
- Rate limiting per IP and per user
- Input validation and sanitization
- SQL injection prevention via parameterized queries

---

**This schema supports:**
✅ External order ingestion (Shopify, API, manual)
✅ Route optimization and planning
✅ Real-time driver tracking
✅ Proof of delivery with signatures/photos
✅ Historical tracking and auditing
✅ Multi-tenant support (via RLS)
✅ Scalability (partitioning, indexes)
✅ GDPR compliance (audit logs, data export)

**Ready for your approval to proceed with implementation!**

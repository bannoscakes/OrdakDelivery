# Getting Started with OrdakDelivery

This guide will walk you through setting up and using OrdakDelivery for the first time.

## Initial Setup

Follow the [SETUP.md](./SETUP.md) guide to install and configure the system.

## Quick Test

Once the server is running, you can test the API endpoints.

### 1. Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 1.234,
  "environment": "development"
}
```

### 2. Test Geocoding

Geocode an address:

```bash
curl -X POST http://localhost:3000/api/v1/geocoding/forward \
  -H "Content-Type: application/json" \
  -d '{
    "address": "1600 Pennsylvania Avenue NW, Washington, DC 20500",
    "country": "US"
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "coordinates": {
      "latitude": 38.8977,
      "longitude": -77.0365
    },
    "formattedAddress": "1600 Pennsylvania Avenue Northwest, Washington, District of Columbia 20500, United States",
    "cached": false
  }
}
```

### 3. Create an Order

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "ORD-001",
    "type": "DELIVERY",
    "customer": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "address": {
      "line1": "123 Main St",
      "city": "Toronto",
      "province": "ON",
      "postalCode": "M5V 3A8",
      "country": "CA"
    },
    "scheduledDate": "2024-01-20T00:00:00Z",
    "timeWindowStart": "2024-01-20T09:00:00Z",
    "timeWindowEnd": "2024-01-20T17:00:00Z",
    "items": [
      {
        "sku": "ITEM-001",
        "name": "Product 1",
        "quantity": 2
      }
    ],
    "notes": "Please call upon arrival"
  }'
```

The order will be automatically geocoded when created.

### 4. List Orders

```bash
curl http://localhost:3000/api/v1/orders
```

### 5. Get Unassigned Orders

Get orders ready for routing on a specific date:

```bash
curl "http://localhost:3000/api/v1/orders/unassigned?date=2024-01-20"
```

## Typical Workflow

### Daily Operations

1. **Import Orders**
   - Orders come from Shopify webhooks (or created manually via API)
   - Each order is automatically geocoded

2. **Review Orders**
   - Check orders for the day
   - Verify addresses are geocoded correctly

3. **Create Delivery Runs** (Coming soon)
   - Group orders by zone
   - Optimize routes using Mapbox Optimization API
   - Assign to drivers and vehicles

4. **Dispatch Drivers**
   - Drivers receive routes on mobile app
   - Real-time tracking begins

5. **Monitor Deliveries**
   - Track driver progress
   - Send customer notifications
   - Handle exceptions

6. **Complete Runs**
   - Mark deliveries complete
   - Update Shopify order status
   - Generate reports

## API Endpoints Reference

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/orders` | Create new order |
| GET | `/api/v1/orders` | List orders (paginated) |
| GET | `/api/v1/orders/:id` | Get order details |
| PUT | `/api/v1/orders/:id` | Update order |
| DELETE | `/api/v1/orders/:id` | Delete order |
| GET | `/api/v1/orders/unassigned` | Get unassigned orders |

### Geocoding

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/geocoding/forward` | Geocode address |
| POST | `/api/v1/geocoding/reverse` | Reverse geocode |

### Coming Soon

- Delivery Runs management
- Route Optimization
- Driver management
- Vehicle management
- Shopify webhook integration
- Real-time tracking

## Data Models

### Order

```typescript
{
  id: string;
  orderNumber: string;
  type: "DELIVERY" | "PICKUP";
  status: "PENDING" | "CONFIRMED" | "ASSIGNED" | "IN_PROGRESS" | "DELIVERED" | "FAILED" | "CANCELLED";
  customer: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  address: {
    line1: string;
    line2?: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  location?: {
    type: "Point";
    coordinates: [longitude, latitude];
  };
  scheduledDate: Date;
  timeWindowStart?: Date;
  timeWindowEnd?: Date;
  items: any[];
  notes?: string;
  specialInstructions?: string;
}
```

## Integrating with OrdakGOv2

OrdakGOv2 is your order management app. Here's how to connect it:

### Sending Orders to OrdakDelivery

From OrdakGOv2, send HTTP POST requests to create delivery orders:

```javascript
const response = await fetch('http://localhost:3000/api/v1/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    orderNumber: order.id,
    type: 'DELIVERY',
    customer: {
      firstName: order.customer.firstName,
      lastName: order.customer.lastName,
      email: order.customer.email,
      phone: order.customer.phone,
    },
    address: {
      line1: order.shippingAddress.address1,
      line2: order.shippingAddress.address2,
      city: order.shippingAddress.city,
      province: order.shippingAddress.province,
      postalCode: order.shippingAddress.zip,
      country: order.shippingAddress.countryCode,
    },
    scheduledDate: order.deliveryDate,
    items: order.lineItems,
  }),
});
```

### Receiving Status Updates (Coming soon)

OrdakDelivery will send webhooks back to OrdakGOv2 when:
- Order is assigned to a delivery run
- Driver starts delivery
- Order is delivered
- Delivery fails

## Common Issues

### Order not geocoding

**Problem**: Order created but `geocoded` field is `false`

**Solutions**:
1. Check that address is complete and valid
2. Verify Mapbox token is configured correctly
3. Check logs for geocoding errors
4. Manually retry geocoding for the order (endpoint coming soon)

### Performance with large batches

**Problem**: Creating many orders is slow

**Solution**:
- Use batch import endpoint (coming soon)
- Implement queue system for background geocoding
- Consider pre-geocoding addresses before import

## Next Steps

1. Import your first batch of real orders
2. Set up Shopify webhook integration
3. Configure delivery zones
4. Add drivers and vehicles
5. Start creating optimized delivery runs

## Support

- Documentation: See [README.md](./README.md) and [SETUP.md](./SETUP.md)
- Issues: [GitHub Issues](https://github.com/bannoscakes/OrdakDelivery/issues)

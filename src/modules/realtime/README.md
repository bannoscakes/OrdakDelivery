# Real-time Features API

Server-Sent Events (SSE) implementation for real-time updates of orders, delivery runs, and driver locations.

## Features

- **Order Status Updates**: Live updates when order status changes
- **Delivery Run Progress**: Real-time run status and completion tracking
- **Driver Location Tracking**: Live GPS location updates for drivers
- **Server-Sent Events (SSE)**: Simple, efficient unidirectional streaming
- **Auto-reconnection**: Clients can easily reconnect on disconnect
- **Multiple Subscribers**: Multiple clients can subscribe to same resource

## Why Server-Sent Events (SSE)?

SSE was chosen over WebSocket for this implementation because:

- **Simpler Protocol**: SSE is built on HTTP, easier to implement and debug
- **Auto-Reconnection**: Browsers automatically reconnect on disconnect
- **Firewall Friendly**: Works over standard HTTP/HTTPS (port 80/443)
- **Unidirectional**: Perfect for server-to-client updates (our main use case)
- **Native Browser Support**: EventSource API built into all modern browsers

## API Endpoints

All endpoints use SSE and require authentication.

### GET /api/v1/realtime/orders/:id/stream
Stream real-time updates for a specific order.

**Access**: All authenticated users

**Example:**
```javascript
const eventSource = new EventSource('/api/v1/realtime/orders/clxxx/stream', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Order update:', data);
};

eventSource.onerror = (error) => {
  console.error('Connection error:', error);
  eventSource.close();
};
```

**Event Format:**
```json
{
  "type": "order_update",
  "orderId": "clxxx...",
  "data": {
    "status": "IN_PROGRESS",
    "actualArrival": "2023-12-20T14:30:00.000Z",
    ...
  }
}
```

**Event Types:**
- `connected` - Initial connection established
- `order_update` - Order status or details changed

### GET /api/v1/realtime/runs/:id/stream
Stream real-time updates for a specific delivery run.

**Access**: All authenticated users

**Example:**
```javascript
const eventSource = new EventSource('/api/v1/realtime/runs/clzzz/stream');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'run_update') {
    console.log('Run status:', data.data.status);
    console.log('Completed stops:', data.data.completedStops);
  }
};
```

**Event Format:**
```json
{
  "type": "run_update",
  "runId": "clzzz...",
  "data": {
    "status": "IN_PROGRESS",
    "completedStops": 5,
    "totalStops": 10,
    ...
  }
}
```

**Event Types:**
- `connected` - Initial connection established
- `run_update` - Run status or progress changed

### GET /api/v1/realtime/drivers/:id/location
Stream real-time location updates for a specific driver.

**Access**: All authenticated users

**Example:**
```javascript
const eventSource = new EventSource('/api/v1/realtime/drivers/clyy/location');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'driver_location') {
    const { latitude, longitude, heading, speed } = data.location;
    console.log(`Driver at: ${latitude}, ${longitude}`);

    // Update map marker
    updateDriverMarker(data.driverId, latitude, longitude, heading);
  }
};
```

**Event Format:**
```json
{
  "type": "driver_location",
  "driverId": "clyy...",
  "location": {
    "latitude": 43.6532,
    "longitude": -79.3832,
    "heading": 180,
    "speed": 45.5
  },
  "timestamp": "2023-12-20T14:35:00.000Z"
}
```

**Event Types:**
- `connected` - Initial connection established
- `driver_location` - Driver GPS location updated

## Broadcasting Updates

Server-side code can broadcast updates to all connected clients using the `realtimeService`:

### Order Status Update
```typescript
import { realtimeService } from '@/modules/realtime/realtime.service';

// After updating order in database
realtimeService.broadcastOrderUpdate(orderId, {
  status: 'DELIVERED',
  deliveredAt: new Date(),
});
```

### Delivery Run Progress
```typescript
// After completing a stop
realtimeService.broadcastRunUpdate(runId, {
  status: 'IN_PROGRESS',
  completedStops: 5,
  totalStops: 10,
});
```

### Driver Location
```typescript
// After receiving GPS update from mobile app
realtimeService.broadcastDriverLocation(driverId, {
  latitude: 43.6532,
  longitude: -79.3832,
  heading: 180,
  speed: 45.5,
});
```

## Client Implementation

### React/TypeScript Example
```typescript
import { useEffect, useState } from 'react';

function useOrderUpdates(orderId: string) {
  const [orderData, setOrderData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(
      `/api/v1/realtime/orders/${orderId}/stream`
    );

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'order_update') {
        setOrderData(data.data);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [orderId]);

  return { orderData, isConnected };
}

// Usage in component
function OrderTracker({ orderId }) {
  const { orderData, isConnected } = useOrderUpdates(orderId);

  return (
    <div>
      {isConnected && <div>🟢 Live</div>}
      {orderData && <div>Status: {orderData.status}</div>}
    </div>
  );
}
```

### Vue.js Example
```javascript
export default {
  data() {
    return {
      orderData: null,
      eventSource: null,
    };
  },
  mounted() {
    this.connectToOrderStream();
  },
  beforeDestroy() {
    this.eventSource?.close();
  },
  methods: {
    connectToOrderStream() {
      this.eventSource = new EventSource(
        `/api/v1/realtime/orders/${this.orderId}/stream`
      );

      this.eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'order_update') {
          this.orderData = data.data;
        }
      };
    },
  },
};
```

## Connection Management

### Auto-Reconnection
Browsers automatically reconnect to SSE endpoints on disconnect. You can customize:

```javascript
const eventSource = new EventSource('/api/v1/realtime/orders/clxxx/stream');

// Manual reconnection with backoff
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

eventSource.onerror = () => {
  if (reconnectAttempts < maxReconnectAttempts) {
    reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
    setTimeout(() => {
      eventSource = new EventSource('/api/v1/realtime/orders/clxxx/stream');
    }, delay);
  }
};

eventSource.onopen = () => {
  reconnectAttempts = 0; // Reset on successful connection
};
```

### Connection Limits
To prevent resource exhaustion:
- Monitor subscriber counts via `realtimeService.getSubscriberCounts()`
- Implement per-user connection limits if needed
- Close stale connections after timeout (future enhancement)

## Performance Considerations

### Memory Usage
- Each active connection holds an open HTTP response
- Service uses in-memory Map for subscriber storage
- Clean up disconnected clients immediately
- Monitor subscriber counts in production

### Scalability
For high-traffic deployments:

1. **Redis Pub/Sub**: Use Redis for cross-instance broadcasting
2. **Load Balancing**: Use sticky sessions or Redis-backed state
3. **Connection Pooling**: Limit connections per user/resource
4. **CDN/Proxy**: Configure nginx/CDN for SSE support

### Network Efficiency
- SSE uses less bandwidth than WebSocket for one-way updates
- Gzip compression works with SSE
- Keep-alive reduces connection overhead

## Security

### Authentication
All SSE endpoints require JWT authentication:
```javascript
// Note: EventSource doesn't support custom headers natively
// Use alternative approaches:

// Option 1: Query parameter (less secure, logs token)
const url = `/api/v1/realtime/orders/${orderId}/stream?token=${accessToken}`;

// Option 2: Cookie-based auth (recommended)
// Set JWT in httpOnly cookie, automatically sent with request

// Option 3: Use fetch with ReadableStream for full header control
async function connectWithAuth(url, token) {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    // Process SSE data
  }
}
```

### Authorization
- Users can only subscribe to their own orders/runs (future enhancement)
- Drivers can track their own location
- Admin/Dispatcher can track all resources

## Monitoring

### Subscriber Counts
```typescript
import { realtimeService } from '@/modules/realtime/realtime.service';

// Get current subscriber counts
const counts = realtimeService.getSubscriberCounts();
console.log('Subscriber counts:', counts);
// { orders: 5, runs: 3, drivers: 2, totalClients: 10 }
```

### Logging
All connection events are logged:
- Client connections (info level)
- Client disconnections (info level)
- Broadcast events (debug level)
- Send errors (error level)

## Integration Points

### Orders Module
When order status changes:
```typescript
// In orders.service.ts
const order = await prisma.order.update({...});
realtimeService.broadcastOrderUpdate(order.id, order);
```

### Delivery Runs Module
When run progress updates:
```typescript
// In runs.service.ts
const run = await prisma.deliveryRun.update({...});
realtimeService.broadcastRunUpdate(run.id, run);
```

### Driver Tracking
Mobile app sends location updates:
```typescript
// In driver location endpoint
realtimeService.broadcastDriverLocation(driverId, {
  latitude,
  longitude,
  heading,
  speed,
});
```

## Use Cases

### Customer Order Tracking
- Customer tracks their order in real-time
- Updates on order status changes
- ETA updates as driver progresses

### Dispatcher Dashboard
- Monitor all active delivery runs
- Track driver locations on map
- Get alerted to delays or issues

### Driver Mobile App
- Receive new order assignments
- See route updates
- Get notified of run changes

## Testing

### Manual Testing with curl
```bash
# Stream order updates
curl -N -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/realtime/orders/clxxx/stream

# Stream run updates
curl -N -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/v1/realtime/runs/clzzz/stream
```

### Browser DevTools
1. Open Network tab
2. Filter by "EventStream"
3. Click on connection to see events
4. Verify reconnection on page refresh

## Future Enhancements

- **Authentication via Query Param**: Support token in query string for EventSource
- **Heartbeat**: Send periodic ping to detect stale connections
- **Redis Pub/Sub**: Scale across multiple server instances
- **Connection Limits**: Per-user and per-resource limits
- **Authorization**: Fine-grained access control for resources
- **Compression**: Enable gzip for SSE responses
- **Metrics**: Prometheus metrics for connection counts and broadcast rates

## Related Modules

- **Orders** - Order status updates
- **Delivery Runs** - Run progress tracking
- **Drivers** - Driver location tracking
- **Authentication** - JWT validation for SSE

# Ordak Delivery - Admin Dashboard

Web-based admin dashboard for managing delivery runs, orders, drivers, and vehicles in the Ordak Delivery system.

## Features

- **Delivery Runs Management**: Create, view, edit, and manage delivery runs
- **Order Assignment**: Assign and unassign orders to delivery runs
- **Driver Management**: View and manage drivers
- **Vehicle Management**: View and manage vehicles
- **Real-time Updates**: Uses TanStack Query for efficient data fetching and caching
- **Responsive Design**: Clean, modern interface

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **date-fns** - Date formatting

## Prerequisites

- Node.js 18+ (tested with Node 18.20.8)
- npm or yarn
- Backend API server running (default: http://localhost:3000)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update the API base URL if needed:

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

### 3. Start Development Server

```bash
npm run dev
```

The dashboard will be available at http://localhost:5173 (or next available port)

### 4. Build for Production

```bash
npm run build
```

The production build will be output to the `dist/` directory.

### 5. Preview Production Build

```bash
npm run preview
```

## Authentication

The dashboard expects a JWT token for authentication. The token should be stored in `localStorage` with the key `authToken`.

Currently, there is no login page implemented. To use the dashboard, you need to:
1. Set a valid JWT token in localStorage manually via browser dev tools:
   ```javascript
   localStorage.setItem('authToken', 'your-jwt-token-here');
   ```
2. Implement a login page (future enhancement)

## Available Pages

- **Dashboard** (`/`) - Overview and statistics
- **Delivery Runs** (`/runs`) - List all delivery runs with filtering
- **Create Delivery Run** (`/runs/create`) - Create a new delivery run
- **Delivery Run Details** (`/runs/:id`) - View and manage a specific delivery run
- **Orders** (`/orders`) - List all orders
- **Drivers** (`/drivers`) - List all drivers
- **Vehicles** (`/vehicles`) - List all vehicles

## API Integration

The dashboard integrates with the following backend endpoints:

### Delivery Runs
- `GET /api/v1/runs` - List delivery runs
- `POST /api/v1/runs` - Create delivery run
- `GET /api/v1/runs/:id` - Get delivery run details
- `PUT /api/v1/runs/:id` - Update delivery run
- `DELETE /api/v1/runs/:id` - Delete delivery run
- `POST /api/v1/runs/:id/assign` - Assign orders to run
- `POST /api/v1/runs/:id/unassign` - Unassign orders from run
- `POST /api/v1/runs/:id/optimize` - Optimize delivery route
- `POST /api/v1/runs/:id/start` - Start delivery run
- `POST /api/v1/runs/:id/complete` - Complete delivery run

### Orders
- `GET /api/v1/orders` - List orders
- `GET /api/v1/orders/unassigned` - Get unassigned orders
- `GET /api/v1/orders/:id` - Get order details
- `POST /api/v1/orders` - Create order
- `PUT /api/v1/orders/:id` - Update order
- `DELETE /api/v1/orders/:id` - Delete order

### Drivers
- `GET /api/v1/drivers` - List drivers
- `GET /api/v1/drivers/available` - Get available drivers
- `GET /api/v1/drivers/:id` - Get driver details
- `POST /api/v1/drivers` - Create driver
- `PUT /api/v1/drivers/:id` - Update driver
- `DELETE /api/v1/drivers/:id` - Delete driver

### Vehicles
- `GET /api/v1/vehicles` - List vehicles
- `GET /api/v1/vehicles/available` - Get available vehicles
- `GET /api/v1/vehicles/:id` - Get vehicle details
- `POST /api/v1/vehicles` - Create vehicle
- `PUT /api/v1/vehicles/:id` - Update vehicle
- `DELETE /api/v1/vehicles/:id` - Delete vehicle

## Project Structure

```
src/
├── api/              # API client and service functions
│   ├── client.ts     # Axios configuration
│   ├── deliveryRuns.ts
│   ├── orders.ts
│   ├── drivers.ts
│   ├── vehicles.ts
│   └── index.ts
├── components/       # Reusable React components
├── hooks/            # Custom React hooks
├── layouts/          # Layout components
│   └── MainLayout.tsx
├── pages/            # Page components
│   ├── Dashboard.tsx
│   ├── DeliveryRuns.tsx
│   ├── CreateDeliveryRun.tsx
│   ├── DeliveryRunDetail.tsx
│   ├── Orders.tsx
│   ├── Drivers.tsx
│   └── Vehicles.tsx
├── types/            # TypeScript type definitions
│   └── index.ts
├── utils/            # Utility functions
│   └── date.ts
├── App.tsx           # Main app component with routing
├── main.tsx          # App entry point
└── index.css         # Global styles
```

## Development

### Code Style

The project uses TypeScript strict mode for type safety. All components are functional components using React hooks.

### Adding New Features

1. Add API functions in `src/api/`
2. Add TypeScript types in `src/types/`
3. Create page components in `src/pages/`
4. Add routes in `src/App.tsx`

## Future Enhancements

- [ ] Add authentication/login page
- [ ] Implement user management
- [ ] Add dashboard statistics and charts
- [ ] Implement route optimization visualization
- [ ] Add real-time delivery tracking
- [ ] Implement notifications system
- [ ] Add export functionality (CSV, PDF)
- [ ] Implement advanced filtering and search
- [ ] Add dark mode support
- [ ] Mobile responsive improvements

## License

Proprietary - All rights reserved

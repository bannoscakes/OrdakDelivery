# CLAUDE.md - AI Assistant Development Guide

**Last Updated:** 2025-11-17
**Project:** OrdakDelivery - Self-hosted delivery management platform
**Version:** 0.1.0

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Repository Structure](#repository-structure)
3. [Technology Stack](#technology-stack)
4. [Development Environment](#development-environment)
5. [Code Architecture & Patterns](#code-architecture--patterns)
6. [Database Schema](#database-schema)
7. [API Structure](#api-structure)
8. [Code Conventions](#code-conventions)
9. [Development Workflow](#development-workflow)
10. [Testing Strategy](#testing-strategy)
11. [Common Tasks](#common-tasks)
12. [Git Workflow](#git-workflow)
13. [Key Files Reference](#key-files-reference)
14. [Troubleshooting](#troubleshooting)

---

## Project Overview

OrdakDelivery is a self-hosted delivery management platform built for Bannoscakes. It integrates Mapbox routing services, Shopify for order management, and PostGIS for spatial data storage.

### Purpose
Enable merchants to create, optimize, and dispatch delivery runs without relying on expensive third-party platforms. The system supports both local deliveries and pickups.

### Key Components
- **Backend API** (Node.js/Express/TypeScript) - Main service orchestration
- **Mobile Driver App** (React Native) - iOS/Android driver interface
- **Database** (PostgreSQL with PostGIS) - Spatial data storage
- **Integrations** - Mapbox, Shopify, Traccar (optional)

### Documentation
- **README.md** - Setup instructions and overview
- **mvp_plan_updated.md** - Comprehensive architecture and technology choices
- **CLAUDE.md** (this file) - Development guide for AI assistants

---

## Repository Structure

```
OrdakDelivery/
├── src/                          # Backend API source code
│   ├── config/                   # Configuration and initialization
│   │   ├── env.ts               # Environment validation with Zod
│   │   ├── logger.ts            # Winston logger setup
│   │   ├── database.ts          # Prisma client initialization
│   │   └── constants.ts         # Application constants
│   ├── constants/               # Shared constants
│   │   ├── pagination.ts
│   │   └── time.ts
│   ├── middleware/              # Express middleware
│   │   ├── authenticate.ts      # JWT authentication
│   │   ├── errorHandler.ts     # Global error handling
│   │   ├── rateLimiter.ts      # Rate limiting
│   │   ├── shopifyWebhook.ts   # Shopify HMAC verification
│   │   ├── validateRequest.ts  # Request validation
│   │   └── rawBody.ts          # Raw body preservation
│   ├── modules/                 # Feature modules (MVC pattern)
│   │   ├── orders/
│   │   │   ├── orders.controller.ts  # Request handlers
│   │   │   ├── orders.service.ts     # Business logic
│   │   │   ├── orders.routes.ts      # Route definitions
│   │   │   ├── orders.types.ts       # Type definitions
│   │   │   ├── shopify.controller.ts
│   │   │   ├── shopify.service.ts
│   │   │   └── shopify.routes.ts
│   │   ├── drivers/
│   │   ├── vehicles/
│   │   ├── runs/
│   │   └── geocoding/
│   ├── services/                # External service integrations
│   │   └── mapbox/
│   │       ├── client.ts        # Mapbox SDK client
│   │       ├── geocoding.service.ts
│   │       ├── directions.service.ts
│   │       ├── optimization.service.ts
│   │       ├── matrix.service.ts
│   │       ├── types.ts
│   │       └── index.ts
│   ├── types/                   # Global TypeScript types
│   │   └── express.d.ts
│   ├── utils/                   # Utility functions
│   │   ├── asyncHandler.ts      # Async error wrapper
│   │   ├── geocoding.ts         # Geocoding utilities
│   │   ├── pagination.ts        # Pagination helpers
│   │   ├── shopify.ts           # Shopify utilities
│   │   └── availability.ts
│   ├── app.ts                   # Express app creation
│   └── index.ts                 # Server entry point
├── mobile-driver-app/           # React Native mobile app
│   ├── src/
│   │   ├── navigation/          # Navigation configuration
│   │   ├── screens/             # Screen components
│   │   ├── services/            # API services
│   │   ├── store/               # Zustand state management
│   │   └── types/               # TypeScript types
│   ├── android/                 # Android native code
│   ├── ios/                     # iOS native code
│   └── App.tsx                  # App entry point
├── prisma/
│   ├── schema.prisma            # Database schema
│   └── seed.ts                  # Seed data
├── scripts/                     # Utility scripts
├── .eslintrc.json              # ESLint configuration
├── .prettierrc                 # Prettier configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

---

## Technology Stack

### Backend
- **Runtime:** Node.js 18+
- **Language:** TypeScript 5.7+ (strict mode enabled)
- **Framework:** Express.js 4.x
- **Database:** PostgreSQL 13+ with PostGIS 3.4
- **ORM:** Prisma 5.22+
- **Validation:** Zod 3.x
- **Authentication:** JWT (jsonwebtoken)
- **Logging:** Winston 3.x
- **Security:** Helmet, CORS, express-rate-limit

### Mobile App
- **Framework:** React Native 0.76+
- **Language:** TypeScript 5.7+
- **Navigation:** React Navigation 6.x
- **State Management:** Zustand 5.x
- **Data Fetching:** TanStack Query (React Query) 5.x
- **Maps:** @rnmapbox/maps 10.x
- **HTTP Client:** Axios 1.x

### External Services
- **Mapbox:** Routing, geocoding, navigation APIs
- **Shopify:** Order management and webhooks
- **Traccar:** (Optional) GPS tracking
- **Twilio:** (Optional) SMS notifications
- **SendGrid:** (Optional) Email notifications

### Development Tools
- **Linting:** ESLint with TypeScript plugin
- **Formatting:** Prettier
- **Testing:** Jest with ts-jest
- **Build:** TypeScript compiler (tsc)
- **Dev Server:** tsx (watch mode)

---

## Development Environment

### Prerequisites
- Node.js 18.0.0 or higher
- npm 9.0.0 or higher
- PostgreSQL 13+ with PostGIS extension
- Mapbox account and access token

### Environment Variables

Create a `.env` file in the project root:

```env
# Application
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/ordakdelivery

# Mapbox
MAPBOX_ACCESS_TOKEN=pk.your_token_here

# Shopify
SHOPIFY_API_KEY=your_key
SHOPIFY_API_SECRET=your_secret
SHOPIFY_SHOP_DOMAIN=yourshop.myshopify.com
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3001,http://localhost:3000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional: Tracking
TRACCAR_ENABLED=false
TRACCAR_API_URL=https://traccar.example.com
TRACCAR_API_TOKEN=your_token

# Optional: Notifications
TWILIO_ENABLED=false
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

SENDGRID_ENABLED=false
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
SENDGRID_FROM_NAME=

# Optional: Geocoding
ENABLE_PELIAS_GEOCODING=false
PELIAS_API_URL=

# Optional: Cache
REDIS_ENABLED=false
REDIS_URL=
```

**Important:** All environment variables are validated using Zod schema in `src/config/env.ts`. Missing required variables will cause the application to fail on startup with clear error messages.

### Setup Commands

```bash
# Install dependencies
npm install

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed

# Start development server
npm run dev

# Run in production
npm run build
npm start
```

---

## Code Architecture & Patterns

### MVC-Like Pattern

The codebase follows a **Controller → Service → Database** pattern within feature modules:

1. **Routes** (`*.routes.ts`) - Define HTTP endpoints and apply middleware
2. **Controllers** (`*.controller.ts`) - Handle requests, validate input, call services, send responses
3. **Services** (`*.service.ts`) - Contain business logic, interact with database and external APIs
4. **Types** (`*.types.ts`) - Define TypeScript interfaces and Zod schemas

### Module Structure Example

```typescript
// orders.routes.ts - Route definitions
import { Router } from 'express';
import * as ordersController from './orders.controller';
import { authenticate } from '@/middleware/authenticate';

const router = Router();
router.use(authenticate);
router.post('/', ordersController.createOrder);
router.get('/:id', ordersController.getOrder);
export default router;

// orders.controller.ts - Request handling
import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import ordersService from './orders.service';
import { z } from 'zod';

const createOrderSchema = z.object({
  body: z.object({
    orderNumber: z.string().min(1),
    // ... more validation
  }),
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { body } = createOrderSchema.parse({ body: req.body });
  const order = await ordersService.createOrder(body);
  res.status(201).json({ success: true, data: order });
});

// orders.service.ts - Business logic
import prisma from '@config/database';
import logger from '@config/logger';
import { createAppError } from '@/middleware/errorHandler';

export class OrdersService {
  async createOrder(input: CreateOrderInput): Promise<Order> {
    try {
      const order = await prisma.order.create({
        data: { /* ... */ },
      });
      logger.info('Order created', { orderId: order.id });
      return order;
    } catch (error) {
      logger.error('Failed to create order', { error });
      throw createAppError(500, 'Failed to create order', error);
    }
  }
}

export default new OrdersService();
```

### Key Architectural Decisions

1. **Strict TypeScript** - All strict checks enabled, no implicit `any`
2. **Zod Validation** - All input validated using Zod schemas
3. **Async/Await** - All async code uses async/await (no callbacks)
4. **Error Handling** - Custom `AppError` class, global error handler middleware
5. **Path Aliases** - Use `@/`, `@config/`, `@services/`, etc. instead of relative paths
6. **Dependency Injection** - Services are instantiated and exported as singletons
7. **Express Middleware** - Heavy use of middleware for cross-cutting concerns
8. **PostGIS Integration** - Geometry types for spatial queries

---

## Database Schema

### Key Models (Prisma Schema)

**Customers**
- Store customer contact information
- Linked to multiple orders

**Orders**
- Core entity for deliveries/pickups
- Contains address, scheduling, geocoded location (PostGIS point)
- Status tracking (PENDING → CONFIRMED → ASSIGNED → IN_PROGRESS → DELIVERED)
- Linked to customer, assigned run, items (JSON)

**Drivers**
- Driver information and availability
- Working hours, tracking device ID
- Status: ACTIVE, INACTIVE, ON_LEAVE

**Vehicles**
- Vehicle details and capacity constraints
- Types: CAR, VAN, TRUCK, BIKE, MOTORCYCLE
- Max weight, volume, stops

**DeliveryRuns**
- Route plans with assigned driver/vehicle
- Route geometry (GeoJSON), distance, duration
- Status: DRAFT → PLANNED → ASSIGNED → IN_PROGRESS → COMPLETED
- Contains multiple orders with sequence

**DeliveryZones**
- Geographic boundaries (PostGIS polygon)
- Can be manually defined or generated from isochrones

**GeocodingCache**
- Caches geocoding results to minimize API calls
- Stores provider (Mapbox/Pelias) and confidence score

**OptimizationJobs**
- Tracks route optimization requests
- Stores input parameters and solution
- Status tracking for async operations

**LocationHistory**
- GPS tracking data (PostGIS point)
- Associated with driver/vehicle/run
- Includes accuracy, speed, heading

### PostGIS Usage

Geometry columns use `Unsupported` type in Prisma:

```prisma
location Unsupported("geometry(Point, 4326)")
boundary Unsupported("geometry(Polygon, 4326)")
```

When creating/updating, use raw SQL:

```typescript
await prisma.order.create({
  data: {
    location: Prisma.sql`ST_GeomFromText(${locationWKT}, 4326)`,
  },
});
```

### Database Conventions

- **IDs:** CUID (cuid()) for all primary keys
- **Timestamps:** createdAt, updatedAt (automatic)
- **Enums:** Defined in Prisma schema, imported from `@prisma/client`
- **Indexes:** Created for foreign keys, status fields, dates
- **Cascade:** Customer deletion cascades to orders
- **Optional Relations:** Use `?` and `onDelete: SetNull`

---

## API Structure

### Base URL Pattern

```
http://localhost:3000/api/v1/{resource}
```

### Standard Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "pagination": { ... } // if applicable
}
```

**Error:**
```json
{
  "status": "error",
  "statusCode": 400,
  "message": "Validation Error",
  "errors": [ ... ], // if validation error
  "stack": "..." // only in development
}
```

### Authentication

- **Type:** JWT Bearer token
- **Header:** `Authorization: Bearer <token>`
- **Middleware:** `authenticate` in `src/middleware/authenticate.ts`
- **Routes:** Most API routes require authentication (except webhooks)

### Rate Limiting

- **API Routes:** 100 requests per 15 minutes (configurable via env)
- **Webhook Routes:** Separate rate limiter
- **Implementation:** express-rate-limit

### Available Endpoints

| Route | Method | Description | Auth |
|-------|--------|-------------|------|
| `/api/v1/orders` | GET | List orders with filters | Yes |
| `/api/v1/orders` | POST | Create new order | Yes |
| `/api/v1/orders/:id` | GET | Get order by ID | Yes |
| `/api/v1/orders/:id` | PUT | Update order | Yes |
| `/api/v1/orders/:id` | DELETE | Delete order | Yes |
| `/api/v1/orders/unassigned` | GET | Get unassigned orders | Yes |
| `/api/v1/drivers` | GET/POST | Manage drivers | Yes |
| `/api/v1/vehicles` | GET/POST | Manage vehicles | Yes |
| `/api/v1/runs` | GET/POST | Manage delivery runs | Yes |
| `/api/v1/runs/:id/optimize` | POST | Optimize route | Yes |
| `/api/v1/geocoding/geocode` | POST | Geocode address | Yes |
| `/api/v1/webhooks/shopify/orders` | POST | Shopify order webhook | No (HMAC) |
| `/health` | GET | Health check | No |

---

## Code Conventions

### TypeScript

1. **Strict Mode:** All strict checks enabled in `tsconfig.json`
2. **No Implicit Any:** `@typescript-eslint/no-explicit-any: "error"`
3. **Type Imports:** Use `import type { ... }` for type-only imports
4. **Return Types:** Explicit return types on exported functions
5. **Null Checks:** `strictNullChecks: true` - handle undefined/null explicitly

### Naming Conventions

- **Files:** camelCase for utilities, kebab-case for configs (`orders.controller.ts`)
- **Classes:** PascalCase (`OrdersService`, `AppError`)
- **Functions:** camelCase (`createOrder`, `getOrderById`)
- **Constants:** SCREAMING_SNAKE_CASE (`MAX_PAGINATION_LIMIT`)
- **Interfaces/Types:** PascalCase (`CreateOrderInput`, `OrderItem`)
- **Enums:** PascalCase with PascalCase values (from Prisma)

### Import Paths

Use path aliases defined in `tsconfig.json`:

```typescript
// Good
import logger from '@config/logger';
import ordersService from '@modules/orders/orders.service';
import { asyncHandler } from '@/utils/asyncHandler';

// Avoid
import logger from '../../../config/logger';
```

**Available aliases:**
- `@/*` → `src/*`
- `@config/*` → `src/config/*`
- `@services/*` → `src/services/*`
- `@modules/*` → `src/modules/*`
- `@utils/*` → `src/utils/*`
- `@types/*` → `src/types/*`

### Error Handling

1. **Controllers:** Use `asyncHandler` wrapper for async routes
2. **Services:** Throw `AppError` or use `createAppError` helper
3. **Logging:** Always log errors with context
4. **Status Codes:** Use appropriate HTTP status codes

```typescript
// In service
throw createAppError(404, 'Order not found');
throw new AppError(400, 'Invalid date range');

// In controller (with asyncHandler)
export const getOrder = asyncHandler(async (req, res) => {
  const order = await ordersService.getOrderById(req.params.id);
  res.json({ success: true, data: order });
});
```

### Validation

Use Zod for all input validation:

```typescript
const schema = z.object({
  body: z.object({
    email: z.string().email(),
    age: z.number().min(0).max(120),
  }),
});

const { body } = schema.parse({ body: req.body });
```

### Logging

Use Winston logger from `@config/logger`:

```typescript
import logger from '@config/logger';

logger.info('Order created', { orderId: order.id });
logger.error('Failed to geocode', { address, error });
logger.debug('API response', { data });
```

**Log Levels:** error, warn, info, debug (set via LOG_LEVEL env)

### Code Formatting

Prettier configuration (`.prettierrc`):
- Semi-colons: Required
- Single quotes: Yes
- Print width: 100
- Tab width: 2 (spaces)
- Trailing commas: ES5
- Line endings: LF

**Run formatting:**
```bash
npm run format
```

### ESLint Rules

Key rules from `.eslintrc.json`:
- `@typescript-eslint/no-explicit-any: "error"`
- `@typescript-eslint/no-unused-vars: "error"` (ignore vars/args starting with `_`)
- `no-console: "warn"` (allow `console.warn` and `console.error`)
- Prettier integration enabled

---

## Development Workflow

### Starting Development

```bash
# Terminal 1: Start backend dev server (with hot reload)
npm run dev

# Terminal 2: Watch TypeScript for type errors
npm run type-check

# Terminal 3: Run tests in watch mode (if working on tests)
npm run test:watch
```

### Mobile App Development

```bash
cd mobile-driver-app

# Install dependencies
npm install

# iOS
npm run ios

# Android
npm run android

# Start Metro bundler
npm start
```

### Code Quality Checks

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type check
npm run type-check

# Run tests
npm test

# Run tests with coverage
npm run test:coverage
```

### Database Workflow

```bash
# Create a new migration after schema changes
npm run db:migrate

# Generate Prisma client after schema changes
npm run db:generate

# Push schema to database (development only)
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio

# Seed database
npm run db:seed
```

### Adding a New Feature Module

1. Create module directory in `src/modules/{feature}/`
2. Create files: `{feature}.types.ts`, `{feature}.service.ts`, `{feature}.controller.ts`, `{feature}.routes.ts`
3. Implement service with business logic
4. Implement controller with validation
5. Define routes with appropriate middleware
6. Register routes in `src/app.ts`
7. Update Prisma schema if needed
8. Run migration: `npm run db:migrate`

### Adding a New External Service

1. Create service directory in `src/services/{service}/`
2. Create client configuration
3. Create service methods
4. Export from `index.ts`
5. Use in relevant modules

---

## Testing Strategy

### Test Structure

```
src/
  modules/
    orders/
      orders.service.ts
      orders.service.test.ts
      orders.controller.test.ts
```

### Testing Tools

- **Framework:** Jest 29.x
- **TypeScript:** ts-jest
- **Coverage:** Built-in Jest coverage

### Running Tests

```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
npm run test:coverage   # With coverage report
```

### Test Conventions

1. **File naming:** `*.test.ts` or `*.spec.ts`
2. **Location:** Next to the file being tested
3. **Structure:** Describe blocks for grouping
4. **Mocking:** Mock external services and database

---

## Common Tasks

### Creating a New Order

```typescript
POST /api/v1/orders
{
  "orderNumber": "ORD-001",
  "type": "DELIVERY",
  "customer": {
    "email": "customer@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "1234567890"
  },
  "address": {
    "line1": "123 Main St",
    "city": "Toronto",
    "province": "ON",
    "postalCode": "M5V 3A8",
    "country": "CA"
  },
  "scheduledDate": "2025-11-20T14:00:00Z",
  "items": [
    {
      "sku": "PROD-001",
      "name": "Chocolate Cake",
      "quantity": 1,
      "price": 25.00
    }
  ]
}
```

### Optimizing a Route

```typescript
POST /api/v1/runs/:id/optimize
{
  "vehicleId": "vehicle-id",
  "driverId": "driver-id"
}
```

### Geocoding an Address

```typescript
POST /api/v1/geocoding/geocode
{
  "address": "123 Main St, Toronto, ON M5V 3A8",
  "country": "CA"
}
```

---

## Git Workflow

### Branch Naming

- Feature branches: `feature/{feature-name}`
- Bug fixes: `fix/{bug-description}`
- Claude AI branches: `claude/{description}-{session-id}`

### Commit Messages

Follow conventional commits:
- `feat: Add route optimization endpoint`
- `fix: Resolve geocoding cache issue`
- `refactor: Extract validation schemas`
- `docs: Update API documentation`
- `test: Add tests for orders service`

### Pull Request Workflow

1. Create feature branch from main
2. Implement changes
3. Run linter and tests
4. Commit with descriptive message
5. Push to remote
6. Create pull request
7. Request review
8. Merge after approval

---

## Key Files Reference

### Configuration Files

- **tsconfig.json** - TypeScript compiler configuration
- **.eslintrc.json** - ESLint rules
- **.prettierrc** - Code formatting rules
- **.env** - Environment variables (not committed)
- **package.json** - Dependencies and scripts

### Entry Points

- **src/index.ts** - Server entry point, database connection, graceful shutdown
- **src/app.ts** - Express app creation, middleware setup, route registration
- **mobile-driver-app/App.tsx** - React Native app entry point

### Core Modules

- **src/config/env.ts** - Environment validation (critical for startup)
- **src/config/logger.ts** - Winston logger configuration
- **src/config/database.ts** - Prisma client initialization
- **src/middleware/errorHandler.ts** - Global error handling
- **src/middleware/authenticate.ts** - JWT authentication

### Database

- **prisma/schema.prisma** - Database schema definition
- **prisma/seed.ts** - Seed data for development

---

## Troubleshooting

### Database Connection Issues

1. Check DATABASE_URL in .env
2. Ensure PostgreSQL is running
3. Verify PostGIS extension is installed:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

### Environment Variable Errors

- Review `src/config/env.ts` for required variables
- Error messages will indicate which variables are missing
- Use `.env.example` as reference

### TypeScript Errors

- Run `npm run db:generate` to regenerate Prisma client
- Check path alias configuration in tsconfig.json
- Ensure all dependencies are installed

### Prisma Issues

```bash
# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Format schema
npx prisma format

# Validate schema
npx prisma validate
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Mobile App Issues

```bash
# Clear Metro bundler cache
cd mobile-driver-app
npm start -- --reset-cache

# Clean builds
cd android && ./gradlew clean
cd ios && xcodebuild clean
```

---

## Important Notes for AI Assistants

### When Making Changes

1. **Always run type-check** after code changes
2. **Update Prisma schema** if data model changes
3. **Run migrations** after schema updates
4. **Follow existing patterns** - maintain consistency
5. **Add proper error handling** - use AppError/createAppError
6. **Validate inputs** - use Zod schemas in controllers
7. **Log appropriately** - info for success, error for failures
8. **Use path aliases** - never use relative imports
9. **Test your changes** - write or update tests
10. **Update documentation** - keep CLAUDE.md and comments current

### Security Considerations

1. **Never commit secrets** - use environment variables
2. **Validate all inputs** - use Zod validation
3. **Use parameterized queries** - Prisma handles this automatically
4. **Apply rate limiting** - already configured
5. **Use HMAC verification** - for webhooks (Shopify)
6. **JWT tokens** - for API authentication
7. **PostGIS injection** - use Prisma.sql template literals

### Performance Considerations

1. **Geocoding cache** - check cache before API calls
2. **Database indexes** - already configured on key fields
3. **Pagination** - always paginate list endpoints
4. **Rate limiting** - respect Mapbox API limits
5. **Connection pooling** - Prisma handles this
6. **Logging** - use appropriate log levels (avoid debug in production)

### Common Pitfalls

1. **PostGIS types** - Use `Unsupported()` and raw SQL for geometry
2. **Async/await** - Don't forget to await Prisma calls
3. **Zod parsing** - Always parse before using user input
4. **Error handling** - Wrap async routes with `asyncHandler`
5. **Path aliases** - May need to rebuild after tsconfig changes
6. **Prisma client** - Regenerate after schema changes

---

## Useful Commands Quick Reference

```bash
# Development
npm run dev                      # Start dev server with hot reload
npm run build                    # Build for production
npm start                        # Run production build

# Database
npm run db:generate              # Generate Prisma client
npm run db:migrate              # Run migrations (dev)
npm run db:migrate:deploy       # Run migrations (production)
npm run db:push                 # Push schema without migration
npm run db:studio               # Open Prisma Studio GUI
npm run db:seed                 # Seed database

# Code Quality
npm run lint                    # Run ESLint
npm run lint:fix                # Fix linting issues
npm run format                  # Format with Prettier
npm run type-check              # Check types without emit

# Testing
npm test                        # Run tests
npm run test:watch              # Tests in watch mode
npm run test:coverage           # Tests with coverage

# Mobile App
cd mobile-driver-app
npm run android                 # Run on Android
npm run ios                     # Run on iOS
npm start                       # Start Metro bundler
```

---

**End of CLAUDE.md**

This document should be updated whenever significant architectural changes are made to the codebase. Last updated: 2025-11-17.

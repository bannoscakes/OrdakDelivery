# OrdakDelivery Setup Guide

Complete guide to set up and run OrdakDelivery locally.

## Prerequisites

Before starting, ensure you have:

- **Node.js 18+** and npm/yarn installed
- **Docker** and Docker Compose installed
- **Mapbox Account** - [Sign up here](https://mapbox.com)
- **Shopify Partner Account** (for order integration)

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/bannoscakes/OrdakDelivery.git
cd OrdakDelivery
npm install
```

### 2. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and set the following required variables:

```env
# Database (use default for local Docker setup)
DATABASE_URL=postgresql://ordak:ordak_dev_password@localhost:5432/ordakdelivery

# Mapbox - Get your token from https://account.mapbox.com/
MAPBOX_ACCESS_TOKEN=your_actual_mapbox_token_here

# Shopify - From your Shopify Partner Dashboard
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret

# Security - Generate a strong random string
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long
```

### 3. Start Database

Start PostgreSQL with PostGIS using Docker Compose:

```bash
docker-compose up -d postgres
```

Wait for the database to be ready (check with `docker-compose logs -f postgres`).

### 4. Run Database Migrations

Generate Prisma client and push schema to database:

```bash
npm run db:generate
npm run db:push
```

For production, use migrations:

```bash
npm run db:migrate
```

### 5. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### 6. Verify Installation

Check the health endpoint:

```bash
curl http://localhost:3000/health
```

You should see:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 1.234,
  "environment": "development"
}
```

## Database Management

### Using Prisma Studio

Prisma Studio provides a GUI for your database:

```bash
npm run db:studio
```

Opens at `http://localhost:5555`

### Using PgAdmin

PgAdmin is included in docker-compose:

1. Open `http://localhost:5050`
2. Login with:
   - Email: `admin@ordak.local`
   - Password: `admin`
3. Add server:
   - Host: `postgres` (or `localhost` if connecting from host)
   - Port: `5432`
   - Database: `ordakdelivery`
   - Username: `ordak`
   - Password: `ordak_dev_password`

## Development Workflow

### Running in Development Mode

```bash
npm run dev
```

Uses `tsx watch` for hot reloading.

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

### Formatting

```bash
npm run format
```

### Building for Production

```bash
npm run build
npm start
```

## Testing

```bash
npm test              # Run tests once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

## API Documentation

API is versioned and available at:

```
http://localhost:3000/api/v1
```

### Available Endpoints (as implemented)

- `GET /health` - Health check
- `POST /api/v1/geocoding/forward` - Geocode address
- `POST /api/v1/geocoding/reverse` - Reverse geocode coordinates
- `POST /api/v1/orders` - Create order
- `GET /api/v1/orders` - List orders
- `GET /api/v1/orders/:id` - Get order details

(More endpoints will be documented as they're implemented)

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/db` |
| `MAPBOX_ACCESS_TOKEN` | Mapbox API token | `pk.ey...` |
| `SHOPIFY_API_KEY` | Shopify app API key | `...` |
| `SHOPIFY_API_SECRET` | Shopify app secret | `...` |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) | `...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `3000` |
| `LOG_LEVEL` | Logging level | `info` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3001` |
| `TWILIO_*` | Twilio SMS configuration | - |
| `SENDGRID_*` | SendGrid email configuration | - |
| `TRACCAR_*` | Traccar GPS tracking | - |

## Troubleshooting

### Database Connection Issues

**Error: Can't reach database server**

1. Ensure Docker containers are running:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

3. Restart database:
   ```bash
   docker-compose restart postgres
   ```

### Prisma Issues

**Error: Prisma Client not generated**

```bash
npm run db:generate
```

**Error: Schema sync issues**

```bash
npm run db:push
```

### Port Already in Use

If port 3000 is taken, change `PORT` in `.env`:

```env
PORT=3001
```

### Mapbox API Errors

1. Verify token is valid at [Mapbox Account](https://account.mapbox.com/)
2. Check token has required scopes (public scopes should work)
3. Monitor usage at [Mapbox Statistics](https://account.mapbox.com/statistics/)

## Project Structure

```
OrdakDelivery/
├── prisma/
│   └── schema.prisma          # Database schema
├── scripts/
│   └── init-postgis.sql       # Database initialization
├── src/
│   ├── config/                # Configuration (env, logger, database)
│   ├── middleware/            # Express middleware
│   ├── modules/               # Feature modules
│   │   ├── orders/
│   │   ├── geocoding/
│   │   ├── routing/
│   │   └── ...
│   ├── services/              # External services (Mapbox, Shopify)
│   │   └── mapbox/
│   ├── types/                 # TypeScript types
│   ├── utils/                 # Utilities
│   ├── app.ts                 # Express app setup
│   └── index.ts               # Entry point
├── .env                       # Environment variables (not committed)
├── .env.example               # Example environment file
├── docker-compose.yml         # Docker services
├── package.json
├── tsconfig.json
└── README.md
```

## Next Steps

1. **Configure Mapbox Styles** - Create custom map styles in [Mapbox Studio](https://studio.mapbox.com/)
2. **Set up Shopify App** - Create app in Shopify Partner Dashboard
3. **Configure Webhooks** - Point Shopify webhooks to your server
4. **Import Orders** - Start importing orders from your shop
5. **Create Delivery Runs** - Optimize and assign routes

## Getting Help

- **Documentation**: See [README.md](./README.md) and [MVP Plan](./mvp_plan_updated.md)
- **Issues**: Report at [GitHub Issues](https://github.com/bannoscakes/OrdakDelivery/issues)
- **API Docs**: Coming soon - OpenAPI/Swagger documentation

## Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup instructions.

(Deployment guide to be created separately)

import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import 'express-async-errors';

import env from '@config/env';
import { stream } from '@config/logger';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { apiRateLimiter, webhookRateLimiter } from '@/middleware/rateLimiter';
import { preserveRawBody } from '@/middleware/rawBody';

// Routes
import ordersRouter from '@/modules/orders/orders.routes';
import shopifyRouter from '@/modules/orders/shopify.routes';
import geocodingRouter from '@/modules/geocoding/geocoding.routes';
import driversRouter from '@/modules/drivers/drivers.routes';
import vehiclesRouter from '@/modules/vehicles/vehicles.routes';
import runsRouter from '@/modules/runs/runs.routes';

const createApp = (): Application => {
  const app = express();

  // Security middleware
  app.use(helmet());

  // CORS - support multiple origins from comma-separated env variable
  const allowedOrigins = env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) {
          callback(null, true);
          return;
        }

        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );

  // Body parsing - use preserveRawBody for webhook HMAC verification
  app.use(preserveRawBody);
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging
  if (env.NODE_ENV === 'development') {
    app.use(morgan('dev', { stream }));
  } else {
    app.use(morgan('combined', { stream }));
  }

  // Health check
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
    });
  });

  // API version prefix
  const apiPrefix = `/api/${env.API_VERSION}`;

  // Apply rate limiting to all API routes
  app.use(`${apiPrefix}/`, apiRateLimiter);

  // Routes
  app.use(`${apiPrefix}/orders`, ordersRouter);
  app.use(`${apiPrefix}/geocoding`, geocodingRouter);
  app.use(`${apiPrefix}/drivers`, driversRouter);
  app.use(`${apiPrefix}/vehicles`, vehiclesRouter);
  app.use(`${apiPrefix}/runs`, runsRouter);

  // Webhooks (no auth required - verified by HMAC, separate rate limiter)
  app.use(`${apiPrefix}/webhooks/shopify`, webhookRateLimiter, shopifyRouter);

  // Catch 404
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

export default createApp;

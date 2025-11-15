import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import 'express-async-errors';

import env from '@config/env';
import { stream } from '@config/logger';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';

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
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
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

  // Routes
  app.use(`${apiPrefix}/orders`, ordersRouter);
  app.use(`${apiPrefix}/geocoding`, geocodingRouter);
  app.use(`${apiPrefix}/drivers`, driversRouter);
  app.use(`${apiPrefix}/vehicles`, vehiclesRouter);
  app.use(`${apiPrefix}/runs`, runsRouter);

  // Webhooks (no auth required - verified by HMAC)
  app.use(`${apiPrefix}/webhooks/shopify`, shopifyRouter);

  // Catch 404
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

export default createApp;

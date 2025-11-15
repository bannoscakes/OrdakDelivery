import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import 'express-async-errors';

import env from '@config/env';
import { stream } from '@config/logger';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';

// Routes will be imported here
// import ordersRouter from '@/modules/orders/orders.routes';

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
  // app.use(`${apiPrefix}/orders`, ordersRouter);
  // app.use(`${apiPrefix}/geocoding`, geocodingRouter);
  // app.use(`${apiPrefix}/routing`, routingRouter);
  // app.use(`${apiPrefix}/runs`, runsRouter);

  // Catch 404
  app.use(notFoundHandler);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

export default createApp;

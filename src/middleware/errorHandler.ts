import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '@config/logger';
import env from '@config/env';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create an AppError with detailed message in development, generic in production
 * @param statusCode - HTTP status code
 * @param productionMessage - Safe message for production
 * @param error - Original error (message will be included in dev mode)
 */
export const createAppError = (
  statusCode: number,
  productionMessage: string,
  error?: unknown
): AppError => {
  if (env.NODE_ENV === 'development' && error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new AppError(statusCode, `${productionMessage}: ${errorMessage}`);
  }
  return new AppError(statusCode, productionMessage);
};

export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  } else if (err instanceof Error) {
    message = err.message;
  }

  logger.error('Error occurred', {
    statusCode,
    message,
    path: req.path,
    method: req.method,
    stack: err instanceof Error ? err.stack : undefined,
    errors,
  });

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err instanceof Error ? err.stack : undefined,
    }),
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    statusCode: 404,
    message: `Route ${req.originalUrl} not found`,
  });
};

import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  API_VERSION: z.string().default('v1'),

  // Database
  DATABASE_URL: z.string().url(),

  // Mapbox
  MAPBOX_ACCESS_TOKEN: z.string().min(1),

  // Shopify
  SHOPIFY_API_KEY: z.string().min(1),
  SHOPIFY_API_SECRET: z.string().min(1),
  SHOPIFY_SHOP_DOMAIN: z.string().min(1),
  SHOPIFY_WEBHOOK_SECRET: z.string().min(1),

  // Tracking (Optional)
  TRACCAR_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  TRACCAR_API_URL: z.string().url().optional(),
  TRACCAR_API_TOKEN: z.string().optional(),

  // Notifications - Twilio
  TWILIO_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),

  // Notifications - SendGrid
  SENDGRID_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().email().optional(),
  SENDGRID_FROM_NAME: z.string().optional(),

  // Security - JWT Authentication
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3001')
    .transform((val) => val.split(',').map((origin) => origin.trim())),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Cache
  REDIS_ENABLED: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  REDIS_URL: z.string().optional(),

  // Feature Flags
  ENABLE_PELIAS_GEOCODING: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  PELIAS_API_URL: z.string().url().optional(),

  // Customer Tracking Portal
  TRACKING_BASE_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
  env = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('❌ Invalid environment variables:', error.errors);
    throw new Error('Invalid environment variables');
  }
  throw error;
}

export default env;

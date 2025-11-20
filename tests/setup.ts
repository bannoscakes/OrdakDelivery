import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

// Load test environment variables BEFORE anything else
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Ensure NODE_ENV is set to test
process.env.NODE_ENV = 'test';

// Global test database instance
let prisma: PrismaClient;

beforeAll(async () => {
  // Initialize Prisma client for tests
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Connect to database
  await prisma.$connect();
});

afterAll(async () => {
  // Disconnect from database
  if (prisma) {
    await prisma.$disconnect();
  }
});

// Export for use in tests
export { prisma };

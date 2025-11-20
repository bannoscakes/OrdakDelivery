import { PrismaClient, User, Driver, Vehicle } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

/**
 * Generate a JWT token for testing
 */
export function generateTestToken(userId: string, role: string = 'ADMIN'): string {
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || 'test-jwt-secret-for-testing-only-min-32-chars';
  return jwt.sign({ userId, role }, jwtAccessSecret, { expiresIn: '1h' });
}

/**
 * Create a test user with hashed password
 */
export async function createTestUser(overrides: Partial<User> = {}): Promise<User> {
  const defaultPassword = 'TestPassword123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const user = await prisma.user.create({
    data: {
      email: `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`,
      passwordHash,
      role: 'driver',
      firstName: 'Test',
      lastName: 'Driver',
      phone: '+14165551234',
      isActive: true,
      ...overrides,
    },
  });

  return user;
}

/**
 * Create a test driver with associated user
 */
export async function createTestDriver(overrides: {
  userOverrides?: Partial<User>;
  driverOverrides?: Partial<Driver>;
} = {}): Promise<Driver & { user: User }> {
  const user = await createTestUser(overrides.userOverrides);

  const driver = await prisma.driver.create({
    data: {
      userId: user.id,
      driverLicense: `DL-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      licenseExpiry: new Date('2026-12-31'),
      status: 'available',
      emergencyContactName: 'Emergency Contact',
      emergencyContactPhone: '+14165559999',
      ...overrides.driverOverrides,
    },
    include: {
      user: true,
      vehicle: true,
    },
  });

  return driver;
}

/**
 * Create a test vehicle
 */
export async function createTestVehicle(overrides: Partial<Vehicle> = {}): Promise<Vehicle> {
  const vehicle = await prisma.vehicle.create({
    data: {
      licensePlate: `VEH-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      make: 'Ford',
      model: 'Transit',
      year: 2022,
      type: 'van',
      capacityKg: 1000,
      capacityCubicM: 15,
      status: 'active',
      ...overrides,
    },
  });

  return vehicle;
}

/**
 * Clean up test data
 */
export async function cleanupTestData(): Promise<void> {
  // Delete in correct order to respect foreign key constraints
  await prisma.deliveryRun.deleteMany({
    where: {
      name: {
        startsWith: 'Test',
      },
    },
  });

  await prisma.driver.deleteMany({
    where: {
      driverLicense: {
        startsWith: 'DL-',
      },
    },
  });

  await prisma.vehicle.deleteMany({
    where: {
      licensePlate: {
        startsWith: 'VEH-',
      },
    },
  });

  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: 'test-',
      },
    },
  });
}

/**
 * Assert that an object does not contain sensitive fields
 */
export function assertNoSensitiveUserFields(obj: any, path: string = 'object'): void {
  if (!obj) return;

  const sensitiveFields = ['passwordHash', 'emailVerified', 'lastLoginAt'];
  const foundSensitiveFields = sensitiveFields.filter((field) => field in obj);

  if (foundSensitiveFields.length > 0) {
    throw new Error(
      `${path} contains sensitive fields: ${foundSensitiveFields.join(', ')}. ` +
        `This is a security violation!`
    );
  }
}

/**
 * Recursively check for sensitive fields in nested objects and arrays
 */
export function assertNoSensitiveFieldsRecursive(obj: any, path: string = 'root'): void {
  if (!obj || typeof obj !== 'object') return;

  // Check if object has a 'user' property (common in driver responses)
  if (obj.user && typeof obj.user === 'object') {
    assertNoSensitiveUserFields(obj.user, `${path}.user`);
  }

  // If it's an array, check each element
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      assertNoSensitiveFieldsRecursive(item, `${path}[${index}]`);
    });
  } else {
    // Check nested objects
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        assertNoSensitiveFieldsRecursive(obj[key], `${path}.${key}`);
      }
    });
  }
}

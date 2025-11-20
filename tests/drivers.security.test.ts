/**
 * Security Tests for Drivers API
 *
 * These tests verify that sensitive user fields (passwordHash, emailVerified, lastLoginAt)
 * are never exposed in driver API responses.
 *
 * CRITICAL: If any of these tests fail, it indicates a security vulnerability where
 * password hashes or other sensitive data could be leaked to API clients.
 */

import request from 'supertest';
import { Application } from 'express';
import createApp from '@/app';
import {
  generateTestToken,
  createTestDriver,
  createTestVehicle,
  cleanupTestData,
  assertNoSensitiveUserFields,
  assertNoSensitiveFieldsRecursive,
} from './helpers';
import { Driver, Vehicle } from '@prisma/client';

describe('Drivers API - Security Tests (Password Hash Exposure)', () => {
  let app: Application;
  let adminToken: string;
  let testDriver: Driver & { user: any; vehicle: any };
  let testVehicle: Vehicle;

  beforeAll(async () => {
    // Create Express app
    app = createApp();

    // Generate admin token for authentication
    adminToken = generateTestToken('admin-user-id', 'ADMIN');

    // Create test vehicle for driver
    testVehicle = await createTestVehicle();
  });

  beforeEach(async () => {
    // Create a fresh test driver for each test
    testDriver = await createTestDriver({
      driverOverrides: {
        vehicleId: testVehicle.id,
      },
    });
  });

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestData();
  });

  afterAll(async () => {
    // Final cleanup
    await cleanupTestData();
  });

  describe('POST /api/v1/drivers - Create Driver', () => {
    it('should NOT expose passwordHash in response when creating a driver', async () => {
      const newDriverData = {
        email: `new-driver-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        firstName: 'New',
        lastName: 'Driver',
        phone: '+14165551111',
        driverLicense: `DL-NEW-${Date.now()}`,
        licenseExpiry: '2026-12-31',
        vehicleId: testVehicle.id,
        emergencyContactName: 'Emergency Contact',
        emergencyContactPhone: '+14165559999',
      };

      const response = await request(app)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newDriverData)
        .expect(201);

      // Verify response structure
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      // CRITICAL SECURITY CHECK: Verify no sensitive fields in user object
      const driver = response.body.data;
      expect(driver.user).toBeDefined();
      assertNoSensitiveUserFields(driver.user, 'POST /drivers response.data.user');

      // Verify expected safe fields ARE present
      expect(driver.user.id).toBeDefined();
      expect(driver.user.email).toBe(newDriverData.email);
      expect(driver.user.firstName).toBe(newDriverData.firstName);
      expect(driver.user.lastName).toBe(newDriverData.lastName);

      // Explicitly verify sensitive fields are NOT present
      expect(driver.user.passwordHash).toBeUndefined();
      expect(driver.user.emailVerified).toBeUndefined();
      expect(driver.user.lastLoginAt).toBeUndefined();
    });

    it('should return valid driver data structure without sensitive fields', async () => {
      const newDriverData = {
        email: `secure-driver-${Date.now()}@example.com`,
        password: 'AnotherSecurePass123!',
        firstName: 'Secure',
        lastName: 'Driver',
        phone: '+14165552222',
        driverLicense: `DL-SEC-${Date.now()}`,
        licenseExpiry: '2027-06-30',
      };

      const response = await request(app)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newDriverData)
        .expect(201);

      const driver = response.body.data;

      // Verify driver structure
      expect(driver.id).toBeDefined();
      expect(driver.userId).toBeDefined();
      expect(driver.driverLicense).toBe(newDriverData.driverLicense);
      expect(driver.status).toBe('available');

      // Verify safe user fields
      expect(driver.user.email).toBe(newDriverData.email);
      expect(driver.user.firstName).toBe(newDriverData.firstName);
      expect(driver.user.role).toBe('driver');
      expect(driver.user.isActive).toBe(true);

      // SECURITY: Verify no password hash
      assertNoSensitiveFieldsRecursive(driver, 'POST /drivers response');
    });
  });

  describe('GET /api/v1/drivers/:id - Get Driver by ID', () => {
    it('should NOT expose passwordHash when fetching a driver by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/drivers/${testDriver.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const driver = response.body.data;
      expect(driver.user).toBeDefined();

      // CRITICAL SECURITY CHECK
      assertNoSensitiveUserFields(driver.user, 'GET /drivers/:id response.data.user');

      // Verify sensitive fields are explicitly undefined
      expect(driver.user.passwordHash).toBeUndefined();
      expect(driver.user.emailVerified).toBeUndefined();
      expect(driver.user.lastLoginAt).toBeUndefined();
    });

    it('should include safe user fields when fetching driver', async () => {
      const response = await request(app)
        .get(`/api/v1/drivers/${testDriver.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const driver = response.body.data;

      // Verify safe fields ARE present
      expect(driver.user.id).toBe(testDriver.userId);
      expect(driver.user.email).toBeDefined();
      expect(driver.user.firstName).toBeDefined();
      expect(driver.user.lastName).toBeDefined();
      expect(driver.user.role).toBe('driver');
      expect(driver.user.isActive).toBeDefined();
      expect(driver.user.createdAt).toBeDefined();
      expect(driver.user.updatedAt).toBeDefined();
    });

    it('should NOT expose passwordHash when including delivery runs', async () => {
      const response = await request(app)
        .get(`/api/v1/drivers/${testDriver.id}`)
        .query({ includeRuns: 'true' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const driver = response.body.data;
      expect(driver.user).toBeDefined();

      // CRITICAL SECURITY CHECK
      assertNoSensitiveUserFields(driver.user, 'GET /drivers/:id?includeRuns response.data.user');
      assertNoSensitiveFieldsRecursive(driver, 'GET /drivers/:id?includeRuns response');
    });
  });

  describe('GET /api/v1/drivers - List Drivers', () => {
    it('should NOT expose passwordHash in any driver in the list', async () => {
      // Create multiple test drivers
      const driver2 = await createTestDriver();
      const driver3 = await createTestDriver();

      const response = await request(app)
        .get('/api/v1/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // CRITICAL SECURITY CHECK: Verify no sensitive fields in ANY driver
      response.body.data.forEach((driver: any, index: number) => {
        expect(driver.user).toBeDefined();
        assertNoSensitiveUserFields(driver.user, `GET /drivers response.data[${index}].user`);

        // Explicitly verify sensitive fields are NOT present
        expect(driver.user.passwordHash).toBeUndefined();
        expect(driver.user.emailVerified).toBeUndefined();
        expect(driver.user.lastLoginAt).toBeUndefined();
      });

      // Recursive check for nested sensitive data
      assertNoSensitiveFieldsRecursive(response.body.data, 'GET /drivers response.data');
    });

    it('should include safe user fields for all drivers in list', async () => {
      const response = await request(app)
        .get('/api/v1/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const drivers = response.body.data;
      expect(drivers.length).toBeGreaterThan(0);

      // Verify safe fields are present for all drivers
      drivers.forEach((driver: any) => {
        expect(driver.user.id).toBeDefined();
        expect(driver.user.email).toBeDefined();
        expect(driver.user.firstName).toBeDefined();
        expect(driver.user.lastName).toBeDefined();
        expect(driver.user.role).toBe('driver');
        expect(driver.user.isActive).toBeDefined();
      });
    });

    it('should NOT expose passwordHash when filtering by status', async () => {
      const response = await request(app)
        .get('/api/v1/drivers')
        .query({ status: 'available' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const drivers = response.body.data;
      expect(drivers.length).toBeGreaterThan(0);

      // CRITICAL SECURITY CHECK
      drivers.forEach((driver: any, index: number) => {
        assertNoSensitiveUserFields(driver.user, `GET /drivers?status response.data[${index}].user`);
      });

      assertNoSensitiveFieldsRecursive(drivers, 'GET /drivers?status response.data');
    });

    it('should handle pagination without exposing sensitive fields', async () => {
      // Create additional drivers
      await createTestDriver();
      await createTestDriver();

      const response = await request(app)
        .get('/api/v1/drivers')
        .query({ page: 1, limit: 2 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.pagination).toBeDefined();
      expect(response.body.data).toBeDefined();

      // CRITICAL SECURITY CHECK
      response.body.data.forEach((driver: any, index: number) => {
        assertNoSensitiveUserFields(driver.user, `GET /drivers paginated response.data[${index}].user`);
      });
    });
  });

  describe('GET /api/v1/drivers/available - Get Available Drivers', () => {
    it('should NOT expose passwordHash for available drivers', async () => {
      // Create multiple available drivers
      await createTestDriver({ driverOverrides: { status: 'available' } });
      await createTestDriver({ driverOverrides: { status: 'available' } });

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];

      const response = await request(app)
        .get('/api/v1/drivers/available')
        .query({ date: dateString })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);

      // CRITICAL SECURITY CHECK
      response.body.data.forEach((driver: any, index: number) => {
        expect(driver.user).toBeDefined();
        assertNoSensitiveUserFields(driver.user, `GET /drivers/available response.data[${index}].user`);

        // Explicitly verify
        expect(driver.user.passwordHash).toBeUndefined();
        expect(driver.user.emailVerified).toBeUndefined();
        expect(driver.user.lastLoginAt).toBeUndefined();
      });

      assertNoSensitiveFieldsRecursive(response.body.data, 'GET /drivers/available response.data');
    });

    it('should include safe user fields for available drivers', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];

      const response = await request(app)
        .get('/api/v1/drivers/available')
        .query({ date: dateString })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const drivers = response.body.data;

      drivers.forEach((driver: any) => {
        expect(driver.user.id).toBeDefined();
        expect(driver.user.email).toBeDefined();
        expect(driver.user.firstName).toBeDefined();
        expect(driver.user.lastName).toBeDefined();
        expect(driver.user.role).toBe('driver');
      });
    });
  });

  describe('PUT /api/v1/drivers/:id - Update Driver', () => {
    it('should NOT expose passwordHash when updating a driver', async () => {
      const updateData = {
        status: 'on_leave' as const,
        emergencyContactName: 'Updated Contact',
        emergencyContactPhone: '+14165558888',
      };

      const response = await request(app)
        .put(`/api/v1/drivers/${testDriver.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();

      const driver = response.body.data;

      // Verify update was applied
      expect(driver.status).toBe(updateData.status);
      expect(driver.emergencyContactName).toBe(updateData.emergencyContactName);

      // CRITICAL SECURITY CHECK: The response might not include user,
      // but if it does, it must not have sensitive fields
      if (driver.user) {
        assertNoSensitiveUserFields(driver.user, 'PUT /drivers/:id response.data.user');
        expect(driver.user.passwordHash).toBeUndefined();
      }

      // Recursive check
      assertNoSensitiveFieldsRecursive(driver, 'PUT /drivers/:id response.data');
    });

    it('should update driver fields without exposing sensitive data', async () => {
      const newLicenseExpiry = '2028-12-31';

      const response = await request(app)
        .put(`/api/v1/drivers/${testDriver.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ licenseExpiry: newLicenseExpiry })
        .expect(200);

      const driver = response.body.data;

      // Verify update
      expect(driver.licenseExpiry).toBeDefined();

      // SECURITY: Ensure no sensitive fields anywhere in response
      assertNoSensitiveFieldsRecursive(response.body, 'PUT /drivers/:id response');
    });
  });

  describe('Security Edge Cases', () => {
    it('should not leak passwordHash through error messages', async () => {
      // Try to create driver with duplicate email
      const duplicateData = {
        email: testDriver.user.email, // Use existing email
        password: 'Password123!',
        firstName: 'Duplicate',
        lastName: 'Driver',
        driverLicense: `DL-DUP-${Date.now()}`,
        licenseExpiry: '2026-12-31',
      };

      const response = await request(app)
        .post('/api/v1/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(duplicateData)
        .expect(409); // Conflict

      // Verify error response doesn't leak sensitive data
      expect(response.body.message).toBeDefined();
      expect(response.body.message.toLowerCase()).not.toContain('password');
      expect(response.body.message.toLowerCase()).not.toContain('hash');

      // Ensure no sensitive fields in error response
      assertNoSensitiveFieldsRecursive(response.body, 'Error response');
    });

    it('should handle non-existent driver without leaking data', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/v1/drivers/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      // Verify no sensitive data in error response
      assertNoSensitiveFieldsRecursive(response.body, 'Not found error response');
    });

    it('should maintain security when response includes vehicle data', async () => {
      const response = await request(app)
        .get(`/api/v1/drivers/${testDriver.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const driver = response.body.data;

      // Verify vehicle is included
      if (driver.vehicle) {
        expect(driver.vehicle.id).toBeDefined();
        expect(driver.vehicle.licensePlate).toBeDefined();
      }

      // CRITICAL: Even with vehicle data, user must not have sensitive fields
      assertNoSensitiveUserFields(driver.user, 'Response with vehicle data - user object');
      assertNoSensitiveFieldsRecursive(driver, 'Response with vehicle data - full object');
    });
  });

  describe('Comprehensive Security Validation', () => {
    it('should NEVER expose passwordHash in any driver endpoint response', async () => {
      // This test calls ALL endpoints and verifies none expose passwordHash
      const endpoints = [
        {
          method: 'GET',
          path: `/api/v1/drivers/${testDriver.id}`,
          expectedStatus: 200,
        },
        {
          method: 'GET',
          path: '/api/v1/drivers',
          expectedStatus: 200,
        },
        {
          method: 'GET',
          path: '/api/v1/drivers/available',
          query: { date: new Date().toISOString().split('T')[0] },
          expectedStatus: 200,
        },
      ];

      for (const endpoint of endpoints) {
        const req = request(app)[endpoint.method.toLowerCase() as 'get'](endpoint.path)
          .set('Authorization', `Bearer ${adminToken}`);

        if (endpoint.query) {
          req.query(endpoint.query);
        }

        const response = await req.expect(endpoint.expectedStatus);

        // CRITICAL: Recursively check entire response for sensitive fields
        assertNoSensitiveFieldsRecursive(
          response.body,
          `${endpoint.method} ${endpoint.path} - full response`
        );

        // Verify response is not empty (endpoints should return data)
        if (endpoint.expectedStatus === 200) {
          expect(response.body.data).toBeDefined();
        }
      }
    });
  });
});

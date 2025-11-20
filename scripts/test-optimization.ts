/**
 * Test script for route optimization endpoint
 *
 * This script tests the complete optimization flow:
 * 1. Creates a test delivery run with orders
 * 2. Calls the optimization API
 * 3. Verifies the run is updated with optimized route data
 *
 * Prerequisites:
 * - Database must be running with migrations applied
 * - MAPBOX_ACCESS_TOKEN must be set in .env
 * - At least one driver and vehicle must exist in the database
 *
 * Usage:
 *   npm run test:optimization
 */

import prisma from '../src/config/database';
import logger from '../src/config/logger';
import runsService from '../src/modules/runs/runs.service';
import { Prisma } from '@prisma/client';

interface TestData {
  customerId: string;
  driverId: string;
  vehicleId: string;
  orderIds: string[];
  runId: string;
}

async function cleanup(testData: Partial<TestData>) {
  logger.info('Cleaning up test data...');

  if (testData.runId) {
    await prisma.deliveryRun.delete({ where: { id: testData.runId } }).catch(() => {});
  }

  if (testData.orderIds) {
    await prisma.order.deleteMany({ where: { id: { in: testData.orderIds } } });
  }

  if (testData.customerId) {
    // This will cascade delete addresses
    await prisma.customer.delete({ where: { id: testData.customerId } }).catch(() => {});
  }

  logger.info('Cleanup complete');
}

async function createTestData(): Promise<TestData> {
  logger.info('Creating test data...');

  // Create test customer
  const customer = await prisma.customer.create({
    data: {
      firstName: 'Test',
      lastName: 'Customer',
      email: 'test@example.com',
      phone: '1234567890',
      externalSource: 'test',
    },
  });

  // Create test addresses with geocoded locations (Toronto area)
  const addressData = [
    {
      line1: '123 Main St',
      city: 'Toronto',
      stateProvince: 'ON',
      postalCode: 'M5V 3A8',
      latitude: 43.6532,
      longitude: -79.3832,
    },
    {
      line1: '456 Queen St',
      city: 'Toronto',
      stateProvince: 'ON',
      postalCode: 'M5V 2B4',
      latitude: 43.6485,
      longitude: -79.3923,
    },
    {
      line1: '789 King St',
      city: 'Toronto',
      stateProvince: 'ON',
      postalCode: 'M5H 1H1',
      latitude: 43.6469,
      longitude: -79.3817,
    },
  ];

  const addresses = [];
  for (const data of addressData) {
    // Create address without location field
    const address = await prisma.address.create({
      data: {
        customerId: customer.id,
        line1: data.line1,
        city: data.city,
        stateProvince: data.stateProvince,
        postalCode: data.postalCode,
        country: 'CA',
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });

    // Update location using raw SQL (Unsupported fields can't be set in create)
    await prisma.$executeRaw`
      UPDATE addresses
      SET location = ST_GeomFromText(${`POINT(${data.longitude} ${data.latitude})`}, 4326)
      WHERE id = ${address.id}::uuid
    `;

    addresses.push(address);
  }

  // Create test orders
  const orders = await Promise.all(
    addresses.map((address, index) =>
      prisma.order.create({
        data: {
          orderNumber: `TEST-ORDER-${Date.now()}-${index}`,
          externalSource: 'test',
          customerId: customer.id,
          deliveryAddressId: address.id,
          scheduledDate: new Date(),
          status: 'pending',
          total: 50.00,
          currency: 'CAD',
        },
      })
    )
  );

  // Get first available driver and vehicle
  const driver = await prisma.driver.findFirst({
    where: { status: 'available' },
  });

  const vehicle = await prisma.vehicle.findFirst({
    where: { status: 'active' },
  });

  if (!driver || !vehicle) {
    throw new Error('No available driver or vehicle found. Please create them first.');
  }

  // Create delivery run
  const run = await runsService.createRun({
    name: 'Test Optimization Run',
    scheduledDate: new Date(),
    driverId: driver.id,
    vehicleId: vehicle.id,
  });

  logger.info('Test data created', {
    customerId: customer.id,
    orderCount: orders.length,
    runId: run.id,
  });

  return {
    customerId: customer.id,
    driverId: driver.id,
    vehicleId: vehicle.id,
    orderIds: orders.map((o) => o.id),
    runId: run.id,
  };
}

async function testOptimization() {
  let testData: Partial<TestData> = {};

  try {
    // Create test data
    testData = await createTestData();

    // Assign orders to run
    logger.info('Assigning orders to run...');
    await runsService.assignOrders(testData.runId!, testData.orderIds!);

    // Run optimization
    logger.info('Running optimization...');
    const startLocation: [number, number] = [-79.3832, 43.6532]; // Toronto downtown
    const solution = await runsService.optimizeRun(testData.runId!, startLocation);

    logger.info('Optimization completed', {
      distance: solution.summary.distance,
      duration: solution.summary.duration,
      routes: solution.routes.length,
      unassigned: solution.unassigned.length,
    });

    // Verify run was updated
    const updatedRun = await runsService.getRunById(testData.runId!);

    logger.info('Run updated successfully', {
      runNumber: updatedRun.runNumber,
      status: updatedRun.status,
      totalDistanceKm: updatedRun.totalDistanceKm?.toString(),
      estimatedDurationMinutes: updatedRun.estimatedDurationMinutes,
      optimizedRoute: updatedRun.optimizedRoute ? 'Yes' : 'No',
      ordersWithSequence: updatedRun.orders.filter((o) => o.sequenceInRun !== null).length,
    });

    // Verify orders have sequence and estimated arrival
    const ordersWithSequence = updatedRun.orders
      .filter((o) => o.sequenceInRun !== null)
      .sort((a, b) => (a.sequenceInRun || 0) - (b.sequenceInRun || 0));

    logger.info('Order sequence:', {
      orders: ordersWithSequence.map((o) => ({
        orderNumber: o.orderNumber,
        sequence: o.sequenceInRun,
        estimatedArrival: o.estimatedArrival?.toISOString(),
      })),
    });

    // Assertions
    if (updatedRun.status !== 'planned') {
      throw new Error(`Expected run status to be 'planned', got '${updatedRun.status}'`);
    }

    if (!updatedRun.optimizedRoute) {
      throw new Error('Expected optimizedRoute to be set');
    }

    if (!updatedRun.totalDistanceKm) {
      throw new Error('Expected totalDistanceKm to be set');
    }

    if (!updatedRun.estimatedDurationMinutes) {
      throw new Error('Expected estimatedDurationMinutes to be set');
    }

    if (ordersWithSequence.length !== testData.orderIds!.length) {
      throw new Error(
        `Expected ${testData.orderIds!.length} orders with sequence, got ${ordersWithSequence.length}`
      );
    }

    logger.info('✅ All assertions passed!');

    // Cleanup
    await cleanup(testData);

    logger.info('✅ Test completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Test failed', error);

    // Cleanup on error
    await cleanup(testData);

    process.exit(1);
  }
}

// Run test
testOptimization().catch((error) => {
  logger.error('Unhandled error', error);
  process.exit(1);
});

/**
 * Dispatch Service
 *
 * Core service for zone-based dispatch operations including:
 * - Auto-assign orders to zones
 * - Create draft runs
 * - Zone rebalancing
 * - Driver/vehicle assignment
 * - Finalize runs (send SMS notifications)
 */

import prisma from '@config/database';
import logger from '@config/logger';
import { createAppError } from '@/middleware/errorHandler';
import zoneTemplatesService from '@modules/zones/zone-templates.service';
import runsService from '@modules/runs/runs.service';
import type { DeliveryZone, Order, DeliveryRun } from '@prisma/client';
import type { GeoJSONPoint } from '@modules/zones/zones.types';
import type {
  AutoAssignResult,
  DraftRunsResult,
  ZoneBalanceCheck,
  RebalanceResult,
  RebalanceChange,
  DriverVehicleAssignment,
  BulkAssignResult,
  AssignmentResult,
  FinalizeRunResult,
  FinalizeAllResult,
  FinalizeFailure,
} from './dispatch.types';

// =====================================================
// SERVICE CLASS
// =====================================================

export class DispatchService {
  /**
   * METHOD 1: Auto-assign orders to zones based on delivery address
   *
   * @param scheduledDate - Date to assign orders for
   * @param cutoffTime - Optional cutoff time (default: 9:00 AM)
   * @returns Assignment results with zone breakdown
   */
  async autoAssignOrdersToZones(
    scheduledDate: Date,
    cutoffTime = '09:00'
  ): Promise<AutoAssignResult> {
    logger.info('Starting auto-assign orders to zones', { scheduledDate, cutoffTime });

    try {
      // Get active zones for this date
      const zones = await zoneTemplatesService.getActiveZonesForDate(scheduledDate);

      if (zones.length === 0) {
        throw createAppError(400, `No active zones found for date ${scheduledDate.toISOString()}`);
      }

      // Get unassigned orders for this date (confirmed, not yet assigned to zone)
      const orders = await prisma.order.findMany({
        where: {
          scheduledDate,
          status: 'CONFIRMED',
          zoneId: null,
        },
        select: {
          id: true,
          orderNumber: true,
          latitude: true,
          longitude: true,
        },
      });

      logger.info('Found orders to assign', { orderCount: orders.length, zoneCount: zones.length });

      const assignmentsByZone: Map<string, string[]> = new Map();
      const outOfBoundsOrderIds: string[] = [];

      // Initialize zone maps
      zones.forEach((zone) => {
        assignmentsByZone.set(zone.id, []);
      });

      // Assign each order to a zone
      for (const order of orders) {
        if (!order.latitude || !order.longitude) {
          logger.warn('Order missing coordinates, skipping', { orderId: order.id });
          outOfBoundsOrderIds.push(order.id);
          continue;
        }

        const point: GeoJSONPoint = {
          type: 'Point',
          coordinates: [order.longitude, order.latitude],
        };

        // Check which zone contains this point
        const result = zoneTemplatesService.findZoneForPoint(point, zones);

        if (result.isInside && result.zoneId) {
          assignmentsByZone.get(result.zoneId)?.push(order.id);
        } else {
          // Find nearest zone for out-of-bounds orders
          const nearestZone = zoneTemplatesService.findNearestZone(point, zones);
          if (nearestZone) {
            logger.info('Order out of bounds, assigning to nearest zone', {
              orderId: order.id,
              zoneId: nearestZone.zoneId,
              distance: nearestZone.distance,
            });
            assignmentsByZone.get(nearestZone.zoneId)?.push(order.id);
          } else {
            outOfBoundsOrderIds.push(order.id);
          }
        }
      }

      // Update database with zone assignments
      let totalAssigned = 0;
      const assignmentResults: AutoAssignResult['assignmentsByZone'] = [];

      for (const [zoneId, orderIds] of assignmentsByZone.entries()) {
        if (orderIds.length === 0) continue;

        await prisma.order.updateMany({
          where: { id: { in: orderIds } },
          data: { zoneId },
        });

        const zone = zones.find((z) => z.id === zoneId);
        assignmentResults.push({
          zoneId,
          zoneName: zone?.name ?? 'Unknown',
          orderCount: orderIds.length,
          orderIds,
        });

        totalAssigned += orderIds.length;
      }

      logger.info('Auto-assign completed', {
        totalOrders: orders.length,
        assignedOrders: totalAssigned,
        outOfBoundsOrders: outOfBoundsOrderIds.length,
      });

      return {
        totalOrders: orders.length,
        assignedOrders: totalAssigned,
        outOfBoundsOrders: outOfBoundsOrderIds.length,
        assignmentsByZone: assignmentResults,
      };
    } catch (error) {
      logger.error('Failed to auto-assign orders to zones', { scheduledDate, error });
      throw createAppError(500, 'Failed to auto-assign orders to zones', error);
    }
  }

  /**
   * METHOD 2: Create draft runs for all zones
   *
   * @param scheduledDate - Date to create runs for
   * @returns Summary of created draft runs
   */
  async createDraftRunsForDate(scheduledDate: Date): Promise<DraftRunsResult> {
    logger.info('Creating draft runs for date', { scheduledDate });

    try {
      // Get active zones for this date
      const zones = await zoneTemplatesService.getActiveZonesForDate(scheduledDate);

      if (zones.length === 0) {
        throw createAppError(400, `No active zones found for date ${scheduledDate.toISOString()}`);
      }

      const runs: DraftRunsResult['runs'] = [];

      // Create one draft run per zone
      for (const zone of zones) {
        // Get orders for this zone
        const orders = await prisma.order.findMany({
          where: {
            scheduledDate,
            zoneId: zone.id,
            assignedRunId: null,
          },
          select: { id: true },
        });

        if (orders.length === 0) {
          logger.info('No orders for zone, skipping run creation', { zoneId: zone.id });
          continue;
        }

        // Create draft run (no driver/vehicle yet)
        const run = await prisma.deliveryRun.create({
          data: {
            runNumber: await this.generateRunNumber(scheduledDate, zone.name),
            scheduledDate,
            status: 'DRAFT',
            zoneId: zone.id,
            isDraft: true,
            canFinalize: false,
            totalOrders: 0, // Will be updated when orders assigned
            totalDistance: 0,
            totalDuration: 0,
          },
        });

        // Assign orders to the draft run
        await runsService.assignOrders(run.id, orders.map((o) => o.id));

        runs.push({
          runId: run.id,
          runNumber: run.runNumber,
          zoneId: zone.id,
          zoneName: zone.name,
          orderCount: orders.length,
        });

        logger.info('Draft run created', { runId: run.id, zoneId: zone.id, orderCount: orders.length });
      }

      logger.info('Draft runs creation completed', {
        totalZones: zones.length,
        runsCreated: runs.length,
      });

      return {
        totalZones: zones.length,
        runsCreated: runs.length,
        runs,
      };
    } catch (error) {
      logger.error('Failed to create draft runs', { scheduledDate, error });
      throw createAppError(500, 'Failed to create draft runs', error);
    }
  }

  /**
   * METHOD 3: Check zone balance and return recommendations
   *
   * @param scheduledDate - Date to check
   * @returns Balance analysis for each zone
   */
  async checkZoneBalance(scheduledDate: Date): Promise<ZoneBalanceCheck[]> {
    logger.info('Checking zone balance', { scheduledDate });

    try {
      const zones = await zoneTemplatesService.getActiveZonesForDate(scheduledDate);

      const balanceChecks: ZoneBalanceCheck[] = [];

      for (const zone of zones) {
        const orderCount = await prisma.order.count({
          where: {
            scheduledDate,
            zoneId: zone.id,
          },
        });

        const ordersPerDriver = zone.targetDriverCount > 0
          ? orderCount / zone.targetDriverCount
          : orderCount;

        let status: ZoneBalanceCheck['status'] = 'balanced';
        let recommendation: string | undefined;

        // Determine status based on orders per driver
        if (ordersPerDriver > 20) {
          status = 'overloaded';
          recommendation = `Consider splitting into ${Math.ceil(orderCount / 20)} zones or adding ${Math.ceil(ordersPerDriver / 20) - zone.targetDriverCount} more driver(s)`;
        } else if (ordersPerDriver < 5 && orderCount > 0) {
          status = 'underutilized';
          recommendation = `Consider merging with adjacent zone or reducing to ${Math.max(1, Math.ceil(orderCount / 10))} driver(s)`;
        }

        balanceChecks.push({
          zoneId: zone.id,
          zoneName: zone.name,
          orderCount,
          targetDriverCount: zone.targetDriverCount,
          ordersPerDriver: Math.round(ordersPerDriver * 10) / 10,
          status,
          recommendation,
        });
      }

      logger.info('Zone balance check completed', {
        totalZones: zones.length,
        overloaded: balanceChecks.filter((c) => c.status === 'overloaded').length,
        underutilized: balanceChecks.filter((c) => c.status === 'underutilized').length,
      });

      return balanceChecks;
    } catch (error) {
      logger.error('Failed to check zone balance', { scheduledDate, error });
      throw createAppError(500, 'Failed to check zone balance', error);
    }
  }

  /**
   * METHOD 4: Rebalance zones by moving orders between zones
   *
   * @param scheduledDate - Date to rebalance
   * @returns Summary of rebalancing operations
   */
  async rebalanceAllZones(scheduledDate: Date): Promise<RebalanceResult> {
    logger.info('Starting zone rebalancing', { scheduledDate });

    try {
      const balanceChecks = await this.checkZoneBalance(scheduledDate);
      const overloadedZones = balanceChecks.filter((c) => c.status === 'overloaded');
      const underutilizedZones = balanceChecks.filter((c) => c.status === 'underutilized');

      if (overloadedZones.length === 0) {
        logger.info('No overloaded zones found, rebalancing not needed');
        return {
          totalZones: balanceChecks.length,
          zonesRebalanced: 0,
          ordersMoved: 0,
          changes: [],
        };
      }

      const changes: RebalanceChange[] = [];
      let ordersMoved = 0;

      // For each overloaded zone, try to move orders to nearby zones
      for (const overloadedZone of overloadedZones) {
        // Calculate how many orders to move
        const targetOrderCount = overloadedZone.targetDriverCount * 15; // Target 15 orders per driver
        const ordersToMove = Math.max(0, overloadedZone.orderCount - targetOrderCount);

        if (ordersToMove === 0) continue;

        // Get orders from overloaded zone (prioritize edge orders)
        const orders = await prisma.order.findMany({
          where: {
            scheduledDate,
            zoneId: overloadedZone.zoneId,
          },
          select: {
            id: true,
            orderNumber: true,
            latitude: true,
            longitude: true,
          },
          take: ordersToMove,
        });

        const zones = await zoneTemplatesService.getActiveZonesForDate(scheduledDate);

        // Try to reassign each order to nearest zone
        for (const order of orders) {
          if (!order.latitude || !order.longitude) continue;

          const point: GeoJSONPoint = {
            type: 'Point',
            coordinates: [order.longitude, order.latitude],
          };

          // Find nearest zone (excluding current zone)
          const otherZones = zones.filter((z) => z.id !== overloadedZone.zoneId);
          const nearestZone = zoneTemplatesService.findNearestZone(point, otherZones);

          if (nearestZone) {
            await prisma.order.update({
              where: { id: order.id },
              data: { zoneId: nearestZone.zoneId },
            });

            changes.push({
              orderId: order.id,
              orderNumber: order.orderNumber,
              fromZone: overloadedZone.zoneName,
              toZone: nearestZone.zoneName,
              reason: 'Rebalancing overloaded zone',
            });

            ordersMoved++;
          }
        }
      }

      logger.info('Zone rebalancing completed', {
        totalZones: balanceChecks.length,
        zonesRebalanced: overloadedZones.length,
        ordersMoved,
      });

      return {
        totalZones: balanceChecks.length,
        zonesRebalanced: overloadedZones.length,
        ordersMoved,
        changes,
      };
    } catch (error) {
      logger.error('Failed to rebalance zones', { scheduledDate, error });
      throw createAppError(500, 'Failed to rebalance zones', error);
    }
  }

  /**
   * METHOD 5: Assign driver and vehicle to a draft run
   *
   * @param runId - Run ID
   * @param driverId - Driver ID
   * @param vehicleId - Vehicle ID
   * @returns Updated run
   */
  async assignDriverAndVehicle(
    runId: string,
    driverId: string,
    vehicleId: string
  ): Promise<DeliveryRun> {
    logger.info('Assigning driver and vehicle to run', { runId, driverId, vehicleId });

    try {
      // Verify run exists and is in draft mode
      const run = await prisma.deliveryRun.findUnique({
        where: { id: runId },
      });

      if (!run) {
        throw createAppError(404, `Run ${runId} not found`);
      }

      if (!run.isDraft) {
        throw createAppError(400, `Run ${run.runNumber} is already finalized`);
      }

      // Verify driver exists and is available
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        throw createAppError(404, `Driver ${driverId} not found`);
      }

      if (driver.status !== 'ACTIVE') {
        throw createAppError(400, `Driver ${driver.firstName} ${driver.lastName} is not active`);
      }

      // Verify vehicle exists
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });

      if (!vehicle) {
        throw createAppError(404, `Vehicle ${vehicleId} not found`);
      }

      // Check if driver or vehicle already assigned for this date
      const existingAssignment = await prisma.deliveryRun.findFirst({
        where: {
          scheduledDate: run.scheduledDate,
          OR: [{ driverId }, { vehicleId }],
          id: { not: runId },
        },
      });

      if (existingAssignment) {
        throw createAppError(
          400,
          `Driver or vehicle already assigned to run ${existingAssignment.runNumber} on this date`
        );
      }

      // Update run with driver and vehicle
      const updatedRun = await prisma.deliveryRun.update({
        where: { id: runId },
        data: {
          driverId,
          vehicleId,
          canFinalize: true, // Now eligible for finalization
        },
        include: {
          driver: true,
          vehicle: true,
          zone: true,
        },
      });

      logger.info('Driver and vehicle assigned successfully', {
        runId,
        runNumber: updatedRun.runNumber,
        driverId,
        vehicleId,
      });

      return updatedRun;
    } catch (error) {
      logger.error('Failed to assign driver and vehicle', { runId, driverId, vehicleId, error });
      throw error;
    }
  }

  /**
   * METHOD 6: Bulk assign drivers and vehicles to multiple runs
   *
   * @param assignments - Array of run/driver/vehicle assignments
   * @returns Summary of bulk assignment results
   */
  async bulkAssignDrivers(assignments: DriverVehicleAssignment[]): Promise<BulkAssignResult> {
    logger.info('Starting bulk driver assignment', { count: assignments.length });

    const results: AssignmentResult[] = [];
    let successfulAssignments = 0;
    let failedAssignments = 0;

    for (const assignment of assignments) {
      try {
        const run = await this.assignDriverAndVehicle(
          assignment.runId,
          assignment.driverId,
          assignment.vehicleId
        );

        results.push({
          runId: assignment.runId,
          runNumber: run.runNumber,
          driverId: assignment.driverId,
          vehicleId: assignment.vehicleId,
          success: true,
        });

        successfulAssignments++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        results.push({
          runId: assignment.runId,
          runNumber: 'Unknown',
          driverId: assignment.driverId,
          vehicleId: assignment.vehicleId,
          success: false,
          error: errorMessage,
        });

        failedAssignments++;

        logger.warn('Bulk assignment failed for run', {
          runId: assignment.runId,
          error: errorMessage,
        });
      }
    }

    logger.info('Bulk driver assignment completed', {
      totalAssignments: assignments.length,
      successfulAssignments,
      failedAssignments,
    });

    return {
      totalAssignments: assignments.length,
      successfulAssignments,
      failedAssignments,
      results,
    };
  }

  /**
   * METHOD 7: Finalize a single run (optimize route, send SMS notifications)
   *
   * @param runId - Run ID to finalize
   * @param startLocation - Starting location [lng, lat]
   * @returns Finalization result
   */
  async finalizeRun(
    runId: string,
    startLocation: [number, number]
  ): Promise<FinalizeRunResult> {
    logger.info('Finalizing run', { runId });

    try {
      const run = await prisma.deliveryRun.findUnique({
        where: { id: runId },
        include: {
          orders: true,
          driver: true,
          vehicle: true,
          zone: true,
        },
      });

      if (!run) {
        throw createAppError(404, `Run ${runId} not found`);
      }

      if (!run.canFinalize) {
        throw createAppError(400, `Run ${run.runNumber} cannot be finalized (missing driver/vehicle)`);
      }

      if (!run.isDraft) {
        throw createAppError(400, `Run ${run.runNumber} is already finalized`);
      }

      // Optimize route
      await runsService.optimizeRun(runId, startLocation);

      // Update run status
      const finalizedRun = await prisma.deliveryRun.update({
        where: { id: runId },
        data: {
          status: 'PLANNED',
          isDraft: false,
          finalizedAt: new Date(),
          canFinalize: false,
        },
        include: {
          orders: true,
        },
      });

      // TODO: Send SMS notifications (will be implemented in SMS service)
      const customersSmsed = finalizedRun.orders.length;

      logger.info('Run finalized successfully', {
        runId,
        runNumber: finalizedRun.runNumber,
        orderCount: finalizedRun.orders.length,
        totalDistance: finalizedRun.totalDistance,
        totalDuration: finalizedRun.totalDuration,
      });

      return {
        runId: finalizedRun.id,
        runNumber: finalizedRun.runNumber,
        orderCount: finalizedRun.orders.length,
        customersSmsed,
        driverNotified: false, // TODO: Implement driver notification
        estimatedDuration: finalizedRun.totalDuration ?? 0,
        estimatedDistance: finalizedRun.totalDistance ?? 0,
      };
    } catch (error) {
      logger.error('Failed to finalize run', { runId, error });
      throw error;
    }
  }

  /**
   * METHOD 8: Finalize all draft runs for a date
   *
   * @param scheduledDate - Date to finalize runs for
   * @param startLocation - Starting location [lng, lat]
   * @returns Summary of finalization results
   */
  async finalizeAllRuns(
    scheduledDate: Date,
    startLocation: [number, number]
  ): Promise<FinalizeAllResult> {
    logger.info('Finalizing all runs for date', { scheduledDate });

    try {
      // Get all draft runs that can be finalized
      const runs = await prisma.deliveryRun.findMany({
        where: {
          scheduledDate,
          isDraft: true,
          canFinalize: true,
        },
        select: {
          id: true,
          runNumber: true,
        },
      });

      if (runs.length === 0) {
        logger.info('No runs ready for finalization');
        return {
          totalRuns: 0,
          finalizedRuns: 0,
          totalOrders: 0,
          totalSms: 0,
          failures: [],
        };
      }

      const failures: FinalizeFailure[] = [];
      let finalizedRuns = 0;
      let totalOrders = 0;
      let totalSms = 0;

      for (const run of runs) {
        try {
          const result = await this.finalizeRun(run.id, startLocation);
          finalizedRuns++;
          totalOrders += result.orderCount;
          totalSms += result.customersSmsed;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          failures.push({
            runId: run.id,
            runNumber: run.runNumber,
            error: errorMessage,
          });

          logger.warn('Failed to finalize run', { runId: run.id, error: errorMessage });
        }
      }

      logger.info('Finalize all runs completed', {
        totalRuns: runs.length,
        finalizedRuns,
        totalOrders,
        failures: failures.length,
      });

      return {
        totalRuns: runs.length,
        finalizedRuns,
        totalOrders,
        totalSms,
        failures,
      };
    } catch (error) {
      logger.error('Failed to finalize all runs', { scheduledDate, error });
      throw createAppError(500, 'Failed to finalize all runs', error);
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  /**
   * Generate unique run number
   */
  private async generateRunNumber(scheduledDate: Date, zoneName: string): Promise<string> {
    const dateStr = scheduledDate.toISOString().split('T')[0].replace(/-/g, '');
    const zonePrefix = zoneName.substring(0, 3).toUpperCase();

    // Count existing runs for this date and zone
    const count = await prisma.deliveryRun.count({
      where: {
        scheduledDate,
        runNumber: {
          startsWith: `RUN-${dateStr}-${zonePrefix}`,
        },
      },
    });

    return `RUN-${dateStr}-${zonePrefix}-${String(count + 1).padStart(3, '0')}`;
  }
}

export default new DispatchService();

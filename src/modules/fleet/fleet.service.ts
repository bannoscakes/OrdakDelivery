/**
 * Fleet Service
 *
 * Manages driver and vehicle availability, scheduling, and utilization tracking.
 * Used for checking which drivers/vehicles are available for assignment to runs.
 */

import prisma from '@config/database';
import logger from '@config/logger';
import { createAppError } from '@/middleware/errorHandler';
import type { Prisma } from '@prisma/client';
import type {
  AvailableDriver,
  AvailableVehicle,
  AvailabilityCheckResult,
  DriverSchedule,
  VehicleUtilization,
  FleetStats,
} from './fleet.types';

// =====================================================
// SERVICE CLASS
// =====================================================

export class FleetService {
  /**
   * Get all available drivers and vehicles for a specific date
   *
   * @param scheduledDate - Date to check availability for
   * @returns Available drivers and vehicles
   */
  async getAvailableFleet(scheduledDate: Date): Promise<AvailabilityCheckResult> {
    logger.info('Checking fleet availability', { scheduledDate });

    try {
      // Get all active drivers
      const drivers = await prisma.driver.findMany({
        where: {
          status: 'ACTIVE',
        },
        include: {
          runs: {
            where: {
              scheduledDate,
            },
            select: {
              id: true,
              runNumber: true,
            },
          },
        },
      });

      // Get all vehicles
      const vehicles = await prisma.vehicle.findMany({
        include: {
          runs: {
            where: {
              scheduledDate,
            },
            select: {
              id: true,
              runNumber: true,
            },
          },
        },
      });

      // Map drivers to availability format
      const availableDrivers: AvailableDriver[] = drivers.map((driver) => ({
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
        phone: driver.phone,
        status: driver.status,
        isAvailable: driver.runs.length === 0,
        currentRunId: driver.runs[0]?.id,
        currentRunNumber: driver.runs[0]?.runNumber,
      }));

      // Map vehicles to availability format
      const availableVehicles: AvailableVehicle[] = vehicles.map((vehicle) => ({
        id: vehicle.id,
        name: vehicle.name,
        licensePlate: vehicle.licensePlate,
        type: vehicle.type,
        capacityKg: vehicle.capacityKg?.toNumber() ?? 0,
        capacityCubicM: vehicle.capacityCubicM?.toNumber() ?? 0,
        isAvailable: vehicle.runs.length === 0,
        currentRunId: vehicle.runs[0]?.id,
        currentRunNumber: vehicle.runs[0]?.runNumber,
      }));

      const result = {
        availableDrivers: availableDrivers.filter((d) => d.isAvailable),
        availableVehicles: availableVehicles.filter((v) => v.isAvailable),
        totalDrivers: drivers.length,
        totalVehicles: vehicles.length,
      };

      logger.info('Fleet availability checked', {
        availableDrivers: result.availableDrivers.length,
        availableVehicles: result.availableVehicles.length,
        totalDrivers: result.totalDrivers,
        totalVehicles: result.totalVehicles,
      });

      return result;
    } catch (error) {
      logger.error('Failed to check fleet availability', { scheduledDate, error });
      throw createAppError(500, 'Failed to check fleet availability', error);
    }
  }

  /**
   * Get driver's schedule for a specific date
   *
   * @param driverId - Driver ID
   * @param scheduledDate - Date to get schedule for
   * @returns Driver schedule with all runs
   */
  async getDriverSchedule(driverId: string, scheduledDate: Date): Promise<DriverSchedule> {
    logger.info('Getting driver schedule', { driverId, scheduledDate });

    try {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver) {
        throw createAppError(404, `Driver ${driverId} not found`);
      }

      const runs = await prisma.deliveryRun.findMany({
        where: {
          driverId,
          scheduledDate,
        },
        include: {
          orders: {
            select: { id: true },
          },
        },
      });

      const totalOrders = runs.reduce((sum, run) => sum + run.orders.length, 0);
      const totalDuration = runs.reduce((sum, run) => sum + (run.estimatedDurationMinutes ?? 0), 0);
      const totalDistance = runs.reduce((sum, run) => sum + (run.totalDistanceKm?.toNumber() ?? 0), 0);

      return {
        driverId: driver.id,
        driverName: `${driver.firstName} ${driver.lastName}`,
        date: scheduledDate,
        runs: runs.map((run) => ({
          runId: run.id,
          runNumber: run.runNumber,
          status: run.status,
          orderCount: run.orders.length,
          estimatedDuration: run.estimatedDurationMinutes ?? 0,
          estimatedDistance: run.totalDistanceKm?.toNumber() ?? 0,
        })),
        totalOrders,
        totalDuration,
        totalDistance,
      };
    } catch (error) {
      logger.error('Failed to get driver schedule', { driverId, scheduledDate, error });
      throw error;
    }
  }

  /**
   * Get vehicle utilization for a specific date
   *
   * @param vehicleId - Vehicle ID
   * @param scheduledDate - Date to get utilization for
   * @returns Vehicle utilization details
   */
  async getVehicleUtilization(vehicleId: string, scheduledDate: Date): Promise<VehicleUtilization> {
    logger.info('Getting vehicle utilization', { vehicleId, scheduledDate });

    try {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });

      if (!vehicle) {
        throw createAppError(404, `Vehicle ${vehicleId} not found`);
      }

      const runs = await prisma.deliveryRun.findMany({
        where: {
          vehicleId,
          scheduledDate,
        },
        include: {
          orders: {
            select: {
              id: true,
              weightKg: true,
            },
          },
        },
      });

      const totalOrders = runs.reduce((sum, run) => sum + run.orders.length, 0);

      // Calculate total weight of orders
      let capacityUsedKg = 0;
      for (const run of runs) {
        for (const order of run.orders) {
          const weight = Number(order.weightKg);
          if (!Number.isNaN(weight)) {
            capacityUsedKg += weight;
          }
        }
      }

      const capacityTotalKg = vehicle.capacityKg?.toNumber() ?? 0;
      const utilizationPercent =
        capacityTotalKg > 0 ? Math.round((capacityUsedKg / capacityTotalKg) * 100) : 0;

      return {
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        date: scheduledDate,
        runs: runs.map((run) => ({
          runId: run.id,
          runNumber: run.runNumber,
          status: run.status,
          orderCount: run.orders.length,
          estimatedDuration: run.estimatedDurationMinutes ?? 0,
          estimatedDistance: run.totalDistanceKm?.toNumber() ?? 0,
        })),
        totalOrders,
        utilizationPercent,
        capacityUsedKg,
        capacityTotalKg,
      };
    } catch (error) {
      logger.error('Failed to get vehicle utilization', { vehicleId, scheduledDate, error });
      throw error;
    }
  }

  /**
   * Get fleet statistics for a specific date
   *
   * @param scheduledDate - Date to get statistics for
   * @returns Fleet statistics summary
   */
  async getFleetStats(scheduledDate: Date): Promise<FleetStats> {
    logger.info('Getting fleet statistics', { scheduledDate });

    try {
      // Get driver counts
      const totalDrivers = await prisma.driver.count({
        where: { status: 'ACTIVE' },
      });

      const activeDrivers = await prisma.deliveryRun.count({
        where: {
          scheduledDate,
          driverId: { not: null },
        },
        distinct: ['driverId'],
      });

      const availableDrivers = totalDrivers - activeDrivers;

      // Get vehicle counts
      const totalVehicles = await prisma.vehicle.count();

      const activeVehicles = await prisma.deliveryRun.count({
        where: {
          scheduledDate,
          vehicleId: { not: null },
        },
        distinct: ['vehicleId'],
      });

      const availableVehicles = totalVehicles - activeVehicles;

      // Get run count
      const totalRuns = await prisma.deliveryRun.count({
        where: { scheduledDate },
      });

      // Calculate utilization percentages
      const driverUtilizationPercent =
        totalDrivers > 0 ? Math.round((activeDrivers / totalDrivers) * 100) : 0;

      const vehicleUtilizationPercent =
        totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0;

      const stats = {
        date: scheduledDate,
        totalDrivers,
        activeDrivers,
        availableDrivers,
        totalVehicles,
        availableVehicles,
        totalRuns,
        driverUtilizationPercent,
        vehicleUtilizationPercent,
      };

      logger.info('Fleet statistics retrieved', stats);

      return stats;
    } catch (error) {
      logger.error('Failed to get fleet statistics', { scheduledDate, error });
      throw createAppError(500, 'Failed to get fleet statistics', error);
    }
  }

  /**
   * Check if a driver is available for a specific date
   *
   * @param driverId - Driver ID
   * @param scheduledDate - Date to check
   * @returns True if available, false otherwise
   */
  async isDriverAvailable(driverId: string, scheduledDate: Date): Promise<boolean> {
    try {
      const driver = await prisma.driver.findUnique({
        where: { id: driverId },
      });

      if (!driver || driver.status !== 'ACTIVE') {
        return false;
      }

      const existingRun = await prisma.deliveryRun.findFirst({
        where: {
          driverId,
          scheduledDate,
        },
      });

      return !existingRun;
    } catch (error) {
      logger.error('Failed to check driver availability', { driverId, scheduledDate, error });
      return false;
    }
  }

  /**
   * Check if a vehicle is available for a specific date
   *
   * @param vehicleId - Vehicle ID
   * @param scheduledDate - Date to check
   * @returns True if available, false otherwise
   */
  async isVehicleAvailable(vehicleId: string, scheduledDate: Date): Promise<boolean> {
    try {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });

      if (!vehicle) {
        return false;
      }

      const existingRun = await prisma.deliveryRun.findFirst({
        where: {
          vehicleId,
          scheduledDate,
        },
      });

      return !existingRun;
    } catch (error) {
      logger.error('Failed to check vehicle availability', { vehicleId, scheduledDate, error });
      return false;
    }
  }

  /**
   * Get suggested driver/vehicle pairs for a date
   *
   * @param scheduledDate - Date to get suggestions for
   * @returns Array of suggested pairs
   */
  async getSuggestedPairings(scheduledDate: Date) {
    logger.info('Getting suggested driver/vehicle pairings', { scheduledDate });

    try {
      const availability = await this.getAvailableFleet(scheduledDate);

      // Simple pairing: match drivers and vehicles by index
      const pairs = [];
      const pairCount = Math.min(
        availability.availableDrivers.length,
        availability.availableVehicles.length
      );

      for (let i = 0; i < pairCount; i++) {
        pairs.push({
          driver: availability.availableDrivers[i],
          vehicle: availability.availableVehicles[i],
          reason: 'Available for assignment',
        });
      }

      logger.info('Suggested pairings generated', { count: pairs.length });

      return pairs;
    } catch (error) {
      logger.error('Failed to get suggested pairings', { scheduledDate, error });
      throw createAppError(500, 'Failed to get suggested pairings', error);
    }
  }

  /**
   * Get all drivers scheduled for a specific date range
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Array of driver schedules
   */
  async getDriverScheduleRange(startDate: Date, endDate: Date) {
    logger.info('Getting driver schedules for range', { startDate, endDate });

    try {
      const drivers = await prisma.driver.findMany({
        where: { status: 'ACTIVE' },
        include: {
          runs: {
            where: {
              scheduledDate: {
                gte: startDate,
                lte: endDate,
              },
            },
            include: {
              orders: {
                select: { id: true },
              },
            },
          },
        },
      });

      const schedules = drivers.map((driver) => ({
        driverId: driver.id,
        driverName: `${driver.firstName} ${driver.lastName}`,
        email: driver.email,
        phone: driver.phone,
        runs: driver.runs.map((run) => ({
          runId: run.id,
          runNumber: run.runNumber,
          scheduledDate: run.scheduledDate,
          status: run.status,
          orderCount: run.orders.length,
          estimatedDuration: run.estimatedDurationMinutes ?? 0,
          estimatedDistance: run.totalDistanceKm?.toNumber() ?? 0,
        })),
        totalRuns: driver.runs.length,
      }));

      logger.info('Driver schedules retrieved', { count: schedules.length });

      return schedules;
    } catch (error) {
      logger.error('Failed to get driver schedule range', { startDate, endDate, error });
      throw createAppError(500, 'Failed to get driver schedule range', error);
    }
  }
}

export default new FleetService();

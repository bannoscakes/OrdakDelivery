import prisma from '@config/database';
import logger from '@config/logger';
import { AppError } from '@/middleware/errorHandler';
import { DeliveryRun, DeliveryRunStatus, Prisma } from '@prisma/client';
import { optimizationService } from '@/services/mapbox';
import type { OptimizationSolution } from '@/services/mapbox';
import { normalizePagination } from '@/utils/pagination';
import { DEFAULT_SERVICE_DURATION_SECONDS } from '@/constants/time';

interface CreateRunInput {
  name: string;
  scheduledDate: Date;
  driverId?: string;
  vehicleId?: string;
  orderIds?: string[];
}

interface UpdateRunInput {
  name?: string;
  status?: 'draft' | 'planned' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  driverId?: string;
  vehicleId?: string;
  startTime?: Date;
  endTime?: Date;
}

export class RunsService {
  /**
   * Create a new delivery run
   * @param input - Run creation data including name, scheduled date, driver, and vehicle
   * @returns Promise resolving to the created delivery run
   * @throws {AppError} If run creation fails
   */
  async createRun(input: CreateRunInput): Promise<DeliveryRun> {
    try {
      // Generate unique run number
      const runNumber = await this.generateRunNumber(input.scheduledDate);

      const run = await prisma.deliveryRun.create({
        data: {
          runNumber,
          name: input.name,
          scheduledDate: input.scheduledDate,
          driverId: input.driverId,
          vehicleId: input.vehicleId,
          status: 'draft',
        },
        include: {
          driver: true,
          vehicle: true,
          orders: true,
        },
      });

      // Assign orders if provided
      if (input.orderIds && input.orderIds.length > 0) {
        await this.assignOrders(run.id, input.orderIds);
      }

      logger.info('Delivery run created', { runId: run.id, name: run.name });

      return run;
    } catch (error) {
      logger.error('Failed to create delivery run', { input, error });
      throw new AppError(500, 'Failed to create delivery run');
    }
  }

  /**
   * Get run by ID
   */
  async getRunById(id: string) {
    const run = await prisma.deliveryRun.findUnique({
      where: { id },
      include: {
        driver: true,
        vehicle: true,
        orders: {
          include: {
            customer: true,
          },
          orderBy: {
            sequenceInRun: 'asc',
          },
        },
      },
    });

    if (!run) {
      throw new AppError(404, 'Delivery run not found');
    }

    return run;
  }

  /**
   * List runs with filters
   */
  async listRuns(params: {
    status?: DeliveryRunStatus;
    driverId?: string;
    scheduledAfter?: Date;
    scheduledBefore?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = normalizePagination(params);

    const where: Prisma.DeliveryRunWhereInput = {
      ...(params.status && { status: params.status }),
      ...(params.driverId && { driverId: params.driverId }),
      ...(params.scheduledAfter && {
        scheduledDate: { gte: params.scheduledAfter },
      }),
      ...(params.scheduledBefore && {
        scheduledDate: { lte: params.scheduledBefore },
      }),
    };

    const [runs, total] = await Promise.all([
      prisma.deliveryRun.findMany({
        where,
        include: {
          driver: true,
          vehicle: true,
          _count: {
            select: { orders: true },
          },
        },
        orderBy: { scheduledDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.deliveryRun.count({ where }),
    ]);

    return {
      runs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update run
   */
  async updateRun(id: string, input: UpdateRunInput): Promise<DeliveryRun> {
    const run = await prisma.deliveryRun.update({
      where: { id },
      data: input,
      include: {
        driver: true,
        vehicle: true,
        orders: true,
      },
    });

    logger.info('Delivery run updated', { runId: id });

    return run;
  }

  /**
   * Delete run
   */
  async deleteRun(id: string): Promise<void> {
    // Unassign all orders from this run
    await prisma.order.updateMany({
      where: { assignedRunId: id },
      data: {
        assignedRunId: null,
        sequenceInRun: null,
      },
    });

    await prisma.deliveryRun.delete({
      where: { id },
    });

    logger.info('Delivery run deleted', { runId: id });
  }

  /**
   * Assign orders to a run
   * Uses transaction to ensure data consistency
   */
  async assignOrders(runId: string, orderIds: string[]): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Update orders to assign them to the run
      await tx.order.updateMany({
        where: {
          id: { in: orderIds },
        },
        data: {
          assignedRunId: runId,
          status: 'assigned',
        },
      });

      // Update run statistics
      const orderCount = orderIds.length;
      await tx.deliveryRun.update({
        where: { id: runId },
        data: {
          totalOrders: orderCount,
        },
      });
    });

    logger.info('Orders assigned to run', { runId, orderCount: orderIds.length });
  }

  /**
   * Unassign orders from a run
   */
  async unassignOrders(runId: string, orderIds: string[]): Promise<void> {
    await prisma.order.updateMany({
      where: {
        id: { in: orderIds },
        assignedRunId: runId,
      },
      data: {
        assignedRunId: null,
        sequenceInRun: null,
        status: 'pending',
      },
    });

    // Recalculate run statistics
    const remainingOrders = await prisma.order.count({
      where: { assignedRunId: runId },
    });

    await prisma.deliveryRun.update({
      where: { id: runId },
      data: {
        totalOrders: remainingOrders,
      },
    });

    logger.info('Orders unassigned from run', { runId, orderCount: orderIds.length });
  }

  /**
   * Extract order locations from PostGIS for optimization
   * @private
   */
  private async extractOrderLocations(orders: any[]) {
    return Promise.all(
      orders.map(async (order) => {
        // Query location from PostGIS
        const result = await prisma.$queryRaw<Array<{ lon: number; lat: number }>>(
          Prisma.sql`SELECT ST_X(location::geometry) as lon, ST_Y(location::geometry) as lat
                     FROM orders
                     WHERE id = ${order.id} AND location IS NOT NULL`
        );

        if (!result[0]) {
          throw new AppError(400, `Order ${order.orderNumber} is not geocoded`);
        }

        return {
          id: order.id,
          location: [result[0].lon, result[0].lat] as [number, number],
          serviceDuration: DEFAULT_SERVICE_DURATION_SECONDS,
          ...(order.timeWindowStart &&
            order.timeWindowEnd && {
              timeWindow: [
                Math.floor(order.timeWindowStart.getTime() / 1000),
                Math.floor(order.timeWindowEnd.getTime() / 1000),
              ] as [number, number],
            }),
        };
      })
    );
  }

  /**
   * Optimize run using Mapbox Optimization API
   * Calculates optimal route for all orders in the run
   * @param runId - ID of the run to optimize
   * @param startLocation - Starting coordinates [longitude, latitude]
   * @param endLocation - Optional ending coordinates [longitude, latitude]
   * @returns Promise resolving to the optimization solution
   * @throws {AppError} If run has no orders or optimization fails
   */
  async optimizeRun(runId: string, startLocation: [number, number], endLocation?: [number, number]) {
    try {
      const run = await this.getRunById(runId);

      if (!run.orders || run.orders.length === 0) {
        throw new AppError(400, 'Cannot optimize run with no orders');
      }

      // Extract order locations from PostGIS
      const stops = await this.extractOrderLocations(run.orders);

      // Build and execute optimization request
      const optimizationRequest = optimizationService.buildOptimizationRequest({
        vehicleStartLocation: startLocation,
        vehicleEndLocation: endLocation,
        stops,
      });

      logger.info('Starting route optimization', { runId, stops: stops.length });
      const solution = await optimizationService.optimize(optimizationRequest);

      // Apply optimization solution to database
      await this.applySolution(runId, solution);

      logger.info('Route optimization completed', {
        runId,
        distance: solution.summary.distance,
        duration: solution.summary.duration,
      });

      return solution;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to optimize run', { runId, error });
      throw new AppError(500, 'Failed to optimize delivery run');
    }
  }

  /**
   * Apply optimization solution to run
   * Uses transaction to ensure data consistency across run and order updates
   */
  private async applySolution(runId: string, solution: OptimizationSolution) {
    if (solution.routes.length === 0) {
      throw new AppError(400, 'No routes found in optimization solution');
    }

    const route = solution.routes[0];

    if (!route) {
      throw new AppError(400, 'Invalid optimization solution');
    }

    // Wrap all updates in a transaction
    await prisma.$transaction(async (tx) => {
      // Update run with route data
      // Note: Mapbox returns distance in meters, duration in seconds
      await tx.deliveryRun.update({
        where: { id: runId },
        data: {
          optimizedRoute: route.geometry as Prisma.InputJsonValue,
          totalDistanceKm: route.distance / 1000, // Convert meters to kilometers
          estimatedDurationMinutes: Math.round(route.duration / 60), // Convert seconds to minutes
          status: 'planned',
        },
      });

      // Update order sequence based on optimization
      const serviceSteps = route.steps.filter((step) => step.type === 'service');

      for (let i = 0; i < serviceSteps.length; i++) {
        const step = serviceSteps[i];
        if (step && step.id) {
          await tx.order.update({
            where: { id: step.id },
            data: {
              sequenceInRun: i + 1,
              estimatedArrival: new Date(step.arrival * 1000),
            },
          });
        }
      }
    });
  }

  /**
   * Start a delivery run
   * @param runId - ID of the run to start
   * @param userContext - User making the request (id and role)
   * @returns Promise resolving to the updated delivery run
   * @throws {AppError} 404 if run not found, 403 if driver tries to start non-owned run
   */
  async startRun(runId: string, userContext: { id: string; role: string }): Promise<DeliveryRun> {
    // Single fetch with driver relation for authorization
    const run = await prisma.deliveryRun.findUnique({
      where: { id: runId },
      include: {
        driver: true,
      },
    });

    if (!run) {
      throw new AppError(404, 'Delivery run not found');
    }

    // Authorization check for DRIVER role
    if (userContext.role === 'DRIVER') {
      if (!run.driver || run.driver.userId !== userContext.id) {
        throw new AppError(403, 'Drivers can only start their own assigned runs');
      }
    }

    // Update run status
    const updatedRun = await this.updateRun(runId, {
      status: 'in_progress',
      startTime: new Date(),
    });

    // Update orders to in_transit
    await prisma.order.updateMany({
      where: { assignedRunId: runId },
      data: { status: 'in_transit' },
    });

    logger.info('Delivery run started', { runId });

    return updatedRun;
  }

  /**
   * Complete a delivery run
   * @param runId - ID of the run to complete
   * @param userContext - User making the request (id and role)
   * @returns Promise resolving to the updated delivery run
   * @throws {AppError} 404 if run not found, 403 if driver tries to complete non-owned run
   */
  async completeRun(runId: string, userContext: { id: string; role: string }): Promise<DeliveryRun> {
    // Single fetch with driver relation for authorization
    const run = await prisma.deliveryRun.findUnique({
      where: { id: runId },
      include: {
        driver: true,
      },
    });

    if (!run) {
      throw new AppError(404, 'Delivery run not found');
    }

    // Authorization check for DRIVER role
    if (userContext.role === 'DRIVER') {
      if (!run.driver || run.driver.userId !== userContext.id) {
        throw new AppError(403, 'Drivers can only complete their own assigned runs');
      }
    }

    // Update run status
    const updatedRun = await this.updateRun(runId, {
      status: 'completed',
      endTime: new Date(),
    });

    logger.info('Delivery run completed', { runId });

    return updatedRun;
  }

  /**
   * Generate a unique run number based on date
   * Format: RUN-YYYYMMDD-XXX where XXX is a sequential number
   */
  private async generateRunNumber(scheduledDate: Date): Promise<string> {
    const dateStr = scheduledDate.toISOString().slice(0, 10).replace(/-/g, '');
    const prefix = `RUN-${dateStr}`;

    // Count existing runs for this date to generate sequence number
    const count = await prisma.deliveryRun.count({
      where: {
        runNumber: {
          startsWith: prefix,
        },
      },
    });

    const sequence = (count + 1).toString().padStart(3, '0');
    return `${prefix}-${sequence}`;
  }
}

export default new RunsService();

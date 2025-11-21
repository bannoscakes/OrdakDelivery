import prisma from '@config/database';
import logger from '@config/logger';
import { AppError } from '@/middleware/errorHandler';
import { DeliveryRun, DeliveryRunStatus, Prisma } from '@prisma/client';
import { optimizationService } from '@/services/mapbox';
import type { OptimizationSolution } from '@/services/mapbox';
import { normalizePagination } from '@/utils/pagination';
import { getServiceDuration } from '@/constants/time';

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
  startTime?: Date; // Scheduled start time (Time only)
  actualStartTime?: Date; // Actual start timestamp
  endTime?: Date; // Scheduled end time (Time only)
  actualEndTime?: Date; // Actual end timestamp
}

export class RunsService {
  /**
   * Create a new delivery run
   * Validates vehicle capacity if orders are assigned during creation
   * Uses atomic operation: if order assignment fails, run creation is rolled back
   * @param input - Run creation data including name, scheduled date, driver, and vehicle
   * @returns Promise resolving to the created delivery run
   * @throws {AppError} If run creation fails or capacity constraints are exceeded
   */
  async createRun(input: CreateRunInput): Promise<DeliveryRun> {
    // Generate unique run number outside transaction (idempotent operation)
    const runNumber = await this.generateRunNumber(input.scheduledDate);

    let createdRunId: string | null = null;

    try {
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

      createdRunId = run.id;

      // Assign orders if provided (includes capacity validation)
      // If this fails, we need to clean up the created run
      if (input.orderIds && input.orderIds.length > 0) {
        await this.assignOrders(run.id, input.orderIds);
      }

      logger.info('Delivery run created', { runId: run.id, name: run.name });

      return run;
    } catch (error) {
      // If run was created but assignment failed, clean it up
      if (createdRunId) {
        try {
          await prisma.deliveryRun.delete({ where: { id: createdRunId } });
          logger.warn('Rolled back run creation due to assignment failure', {
            runId: createdRunId,
            runNumber,
          });
        } catch (deleteError) {
          logger.error('Failed to rollback run creation', {
            runId: createdRunId,
            deleteError,
          });
        }
      }

      logger.error('Failed to create delivery run', {
        runNumber,
        error: error instanceof Error ? error.message : String(error),
      });

      // Propagate the original error
      if (error instanceof AppError) {
        throw error;
      }
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
    status?: DeliveryRunStatus | DeliveryRunStatus[] | string | string[];
    driverId?: string;
    scheduledAfter?: Date;
    scheduledBefore?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = normalizePagination(params);

    const where: Prisma.DeliveryRunWhereInput = {
      ...(params.status && {
        status: Array.isArray(params.status)
          ? { in: params.status as DeliveryRunStatus[] }
          : (params.status as DeliveryRunStatus),
      }),
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
   * Validate run capacity constraints
   * Checks if all orders in the run fit within the assigned vehicle's capacity
   *
   * @param runId - ID of the run to validate
   * @returns Promise resolving to true if capacity is valid, false otherwise
   * @throws {AppError} If run or vehicle not found
   */
  async validateRunCapacity(runId: string): Promise<boolean> {
    const run = await prisma.deliveryRun.findUnique({
      where: { id: runId },
      include: {
        vehicle: true,
        orders: {
          select: {
            id: true,
            orderNumber: true,
            weightKg: true,
            packageCount: true,
          },
        },
      },
    });

    if (!run) {
      throw new AppError(404, 'Delivery run not found');
    }

    if (!run.vehicleId || !run.vehicle) {
      throw new AppError(400, 'Run has no assigned vehicle');
    }

    const capacity = this.calculateRunCapacity(run.orders);
    const vehicleCapacityKg = run.vehicle.capacityKg?.toNumber() ?? Infinity;
    const vehicleCapacityCubicM = run.vehicle.capacityCubicM?.toNumber() ?? Infinity;

    // Check weight capacity
    if (capacity.totalWeightKg > vehicleCapacityKg) {
      logger.warn('Run exceeds vehicle weight capacity', {
        runId,
        totalWeight: capacity.totalWeightKg,
        vehicleCapacity: vehicleCapacityKg,
      });
      return false;
    }

    // Check package count (simple capacity check - could be enhanced with volume)
    // Using package count as a proxy for cubic capacity
    const estimatedCubicM = capacity.totalPackages * 0.1; // Assume 0.1 cubic meters per package
    if (estimatedCubicM > vehicleCapacityCubicM) {
      logger.warn('Run exceeds vehicle cubic capacity', {
        runId,
        estimatedCubicM,
        vehicleCapacity: vehicleCapacityCubicM,
      });
      return false;
    }

    return true;
  }

  /**
   * Calculate total capacity requirements for a set of orders
   * Handles null/undefined weights and package counts safely
   * @private
   */
  private calculateRunCapacity(
    orders: Array<{
      weightKg: Prisma.Decimal | null | undefined;
      packageCount: number | null | undefined;
    }>
  ) {
    const totalWeightKg = orders.reduce((sum, order) => {
      const weight = Number(order.weightKg);
      const safeWeight = Number.isNaN(weight) ? 0 : weight;
      return sum + safeWeight;
    }, 0);

    const totalPackages = orders.reduce((sum, order) => {
      const packages = order.packageCount ?? 0;
      return sum + packages;
    }, 0);

    return { totalWeightKg, totalPackages };
  }

  /**
   * Check if adding specific orders would exceed vehicle capacity
   * @private
   */
  private async checkCapacityForOrders(
    runId: string,
    orderIds: string[]
  ): Promise<{ valid: boolean; error?: string }> {
    // Get run with vehicle
    const run = await prisma.deliveryRun.findUnique({
      where: { id: runId },
      include: {
        vehicle: true,
        orders: {
          select: {
            weightKg: true,
            packageCount: true,
          },
        },
      },
    });

    if (!run) {
      throw new AppError(404, 'Delivery run not found');
    }

    if (!run.vehicleId || !run.vehicle) {
      throw new AppError(400, 'Run has no assigned vehicle');
    }

    // Get orders to be added
    const newOrders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: {
        id: true,
        orderNumber: true,
        weightKg: true,
        packageCount: true,
      },
    });

    // Verify all requested order IDs were found
    if (newOrders.length !== orderIds.length) {
      const foundIds = new Set(newOrders.map((o) => o.id));
      const missingIds = orderIds.filter((id) => !foundIds.has(id));
      throw new AppError(
        400,
        `Order(s) not found: ${missingIds.join(', ')}. Cannot assign non-existent orders.`
      );
    }

    // Calculate combined capacity
    const existingCapacity = this.calculateRunCapacity(run.orders);
    const newCapacity = this.calculateRunCapacity(newOrders);

    const totalWeightKg = existingCapacity.totalWeightKg + newCapacity.totalWeightKg;
    const totalPackages = existingCapacity.totalPackages + newCapacity.totalPackages;

    const vehicleCapacityKg = run.vehicle.capacityKg?.toNumber() ?? Infinity;
    const vehicleCapacityCubicM = run.vehicle.capacityCubicM?.toNumber() ?? Infinity;

    // Check weight capacity
    if (totalWeightKg > vehicleCapacityKg) {
      return {
        valid: false,
        error: `Orders exceed vehicle weight capacity (${totalWeightKg.toFixed(2)} kg / ${vehicleCapacityKg.toFixed(2)} kg)`,
      };
    }

    // Check package/volume capacity
    const estimatedCubicM = totalPackages * 0.1; // Assume 0.1 cubic meters per package
    if (estimatedCubicM > vehicleCapacityCubicM) {
      return {
        valid: false,
        error: `Orders exceed vehicle capacity (${totalPackages} packages / ~${estimatedCubicM.toFixed(2)} m³)`,
      };
    }

    return { valid: true };
  }

  /**
   * Assign orders to a run
   * Validates vehicle capacity before assignment
   * Uses transaction to ensure data consistency
   * @throws {AppError} If capacity constraints are exceeded
   */
  async assignOrders(runId: string, orderIds: string[]): Promise<void> {
    // Check capacity before assigning (only if vehicle is assigned to run)
    const run = await prisma.deliveryRun.findUnique({
      where: { id: runId },
      select: { vehicleId: true },
    });

    if (!run) {
      throw new AppError(404, 'Delivery run not found');
    }

    if (run.vehicleId) {
      const capacityCheck = await this.checkCapacityForOrders(runId, orderIds);
      if (!capacityCheck.valid) {
        throw new AppError(400, capacityCheck.error || 'Orders exceed vehicle capacity');
      }
    }

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

      // Recalculate total orders from database (not just the batch size)
      const totalOrders = await tx.order.count({
        where: { assignedRunId: runId },
      });

      // Update run statistics with actual count
      await tx.deliveryRun.update({
        where: { id: runId },
        data: {
          totalOrders,
        },
      });
    });

    // Get final count for logging
    const finalCount = await prisma.order.count({
      where: { assignedRunId: runId },
    });

    logger.info('Orders assigned to run', {
      runId,
      batchSize: orderIds.length,
      totalOrders: finalCount,
    });
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
   * Includes service duration based on order type
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

        // Get service duration based on order type
        const serviceDuration = getServiceDuration(order.type);

        // Convert weight safely, guarding against NaN
        const weight = Number(order.weightKg);
        const safeWeight = Number.isNaN(weight) ? 0 : weight;

        return {
          id: order.id,
          location: [result[0].lon, result[0].lat] as [number, number],
          serviceDuration,
          weightKg: safeWeight,
          packageCount: order.packageCount ?? 0,
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
   * Includes vehicle capacity constraints and service durations
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

      // Extract order locations from PostGIS (includes weights and service durations)
      const stops = await this.extractOrderLocations(run.orders);

      // Get vehicle capacity for optimization constraints
      let vehicleCapacityKg: number | undefined;
      if (run.vehicle?.capacityKg) {
        const capacity = Number(run.vehicle.capacityKg);
        // Only assign if the conversion yields a finite number
        if (Number.isFinite(capacity)) {
          vehicleCapacityKg = capacity;
        }
      }

      // Build and execute optimization request with capacity constraints
      const optimizationRequest = optimizationService.buildOptimizationRequest({
        vehicleStartLocation: startLocation,
        vehicleEndLocation: endLocation,
        stops,
        vehicleCapacityKg,
      });

      logger.info('Starting route optimization', {
        runId,
        stops: stops.length,
        vehicleCapacityKg,
      });
      const solution = await optimizationService.optimize(optimizationRequest);

      // Apply optimization solution to database
      await this.applySolution(runId, solution);

      logger.info('Route optimization completed', {
        runId,
        distance: solution.summary.distance,
        duration: solution.summary.duration,
        service: solution.summary.service,
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
      status: RunStatus.IN_PROGRESS,
      startTime: new Date(),
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

    // Update run status and record actual start time
    const updatedRun = await this.updateRun(runId, {
      status: 'in_progress',
      actualStartTime: new Date(),
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
      status: RunStatus.COMPLETED,
      endTime: new Date(),
    // Update run status and record actual end time
    const updatedRun = await this.updateRun(runId, {
      status: 'completed',
      actualEndTime: new Date(),
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

  // =====================================================
  // DRAFT MODE OPERATIONS
  // =====================================================

  /**
   * Add a single order to a draft run
   * Validates capacity if vehicle is assigned
   *
   * @param runId - Run ID
   * @param orderId - Order ID to add
   * @returns Updated run
   */
  async addOrderToRun(runId: string, orderId: string): Promise<DeliveryRun> {
    logger.info('Adding order to run', { runId, orderId });

    try {
      const run = await prisma.deliveryRun.findUnique({
        where: { id: runId },
      });

      if (!run) {
        throw new AppError(404, 'Delivery run not found');
      }

      if (!run.isDraft) {
        throw new AppError(400, `Run ${run.runNumber} is finalized and cannot be modified`);
      }

      // Use existing assignOrders method (includes capacity validation)
      await this.assignOrders(runId, [orderId]);

      const updatedRun = await this.getRunById(runId);

      logger.info('Order added to run successfully', { runId, orderId });

      return updatedRun;
    } catch (error) {
      logger.error('Failed to add order to run', { runId, orderId, error });
      throw error;
    }
  }

  /**
   * Remove a single order from a draft run
   *
   * @param runId - Run ID
   * @param orderId - Order ID to remove
   * @returns Updated run
   */
  async removeOrderFromRun(runId: string, orderId: string): Promise<DeliveryRun> {
    logger.info('Removing order from run', { runId, orderId });

    try {
      const run = await prisma.deliveryRun.findUnique({
        where: { id: runId },
      });

      if (!run) {
        throw new AppError(404, 'Delivery run not found');
      }

      if (!run.isDraft) {
        throw new AppError(400, `Run ${run.runNumber} is finalized and cannot be modified`);
      }

      // Use existing unassignOrders method
      await this.unassignOrders(runId, [orderId]);

      const updatedRun = await this.getRunById(runId);

      logger.info('Order removed from run successfully', { runId, orderId });

      return updatedRun;
    } catch (error) {
      logger.error('Failed to remove order from run', { runId, orderId, error });
      throw error;
    }
  }

  /**
   * Reorder stops within a draft run
   *
   * @param runId - Run ID
   * @param orderSequence - Array of order IDs in desired sequence
   * @returns Updated run
   */
  async reorderStops(runId: string, orderSequence: string[]): Promise<DeliveryRun> {
    logger.info('Reordering stops in run', { runId, stopCount: orderSequence.length });

    try {
      const run = await prisma.deliveryRun.findUnique({
        where: { id: runId },
        include: {
          orders: true,
        },
      });

      if (!run) {
        throw new AppError(404, 'Delivery run not found');
      }

      if (!run.isDraft) {
        throw new AppError(400, `Run ${run.runNumber} is finalized and cannot be modified`);
      }

      // Verify all order IDs belong to this run
      const runOrderIds = new Set(run.orders.map((o) => o.id));
      const invalidOrderIds = orderSequence.filter((id) => !runOrderIds.has(id));

      if (invalidOrderIds.length > 0) {
        throw new AppError(
          400,
          `Orders not found in run: ${invalidOrderIds.join(', ')}`
        );
      }

      if (orderSequence.length !== run.orders.length) {
        throw new AppError(
          400,
          `Order sequence must include all orders in run (expected ${run.orders.length}, got ${orderSequence.length})`
        );
      }

      // Update sequence for each order
      await prisma.$transaction(
        orderSequence.map((orderId, index) =>
          prisma.order.update({
            where: { id: orderId },
            data: { sequenceInRun: index + 1 },
          })
        )
      );

      const updatedRun = await this.getRunById(runId);

      logger.info('Stops reordered successfully', { runId });

      return updatedRun;
    } catch (error) {
      logger.error('Failed to reorder stops', { runId, error });
      throw error;
    }
  }

  /**
   * Move an order from one run to another (both must be draft)
   *
   * @param orderId - Order ID to move
   * @param fromRunId - Source run ID
   * @param toRunId - Destination run ID
   * @returns Updated destination run
   */
  async moveOrderBetweenRuns(
    orderId: string,
    fromRunId: string,
    toRunId: string
  ): Promise<DeliveryRun> {
    logger.info('Moving order between runs', { orderId, fromRunId, toRunId });

    try {
      // Verify both runs exist and are in draft mode
      const [fromRun, toRun] = await Promise.all([
        prisma.deliveryRun.findUnique({
          where: { id: fromRunId },
        }),
        prisma.deliveryRun.findUnique({
          where: { id: toRunId },
        }),
      ]);

      if (!fromRun) {
        throw new AppError(404, `Source run ${fromRunId} not found`);
      }

      if (!toRun) {
        throw new AppError(404, `Destination run ${toRunId} not found`);
      }

      if (!fromRun.isDraft) {
        throw new AppError(400, `Source run ${fromRun.runNumber} is finalized`);
      }

      if (!toRun.isDraft) {
        throw new AppError(400, `Destination run ${toRun.runNumber} is finalized`);
      }

      // Verify order belongs to source run
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new AppError(404, `Order ${orderId} not found`);
      }

      if (order.assignedRunId !== fromRunId) {
        throw new AppError(400, `Order ${order.orderNumber} is not in source run`);
      }

      // Check capacity in destination run (if vehicle assigned)
      if (toRun.vehicleId) {
        const capacityCheck = await this.checkCapacityForOrders(toRunId, [orderId]);
        if (!capacityCheck.valid) {
          throw new AppError(400, capacityCheck.error || 'Order exceeds vehicle capacity');
        }
      }

      // Move order in transaction
      await prisma.$transaction(async (tx) => {
        // Remove from source run
        await tx.order.update({
          where: { id: orderId },
          data: {
            assignedRunId: null,
            sequenceInRun: null,
          },
        });

        // Update source run stats
        const sourceOrderCount = await tx.order.count({
          where: { assignedRunId: fromRunId },
        });

        await tx.deliveryRun.update({
          where: { id: fromRunId },
          data: { totalOrders: sourceOrderCount },
        });

        // Add to destination run
        await tx.order.update({
          where: { id: orderId },
          data: {
            assignedRunId: toRunId,
            status: 'assigned',
          },
        });

        // Update destination run stats
        const destOrderCount = await tx.order.count({
          where: { assignedRunId: toRunId },
        });

        await tx.deliveryRun.update({
          where: { id: toRunId },
          data: { totalOrders: destOrderCount },
        });
      });

      const updatedRun = await this.getRunById(toRunId);

      logger.info('Order moved between runs successfully', { orderId, fromRunId, toRunId });

      return updatedRun;
    } catch (error) {
      logger.error('Failed to move order between runs', { orderId, fromRunId, toRunId, error });
      throw error;
    }
  }
}

export default new RunsService();

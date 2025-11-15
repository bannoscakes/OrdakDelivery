import prisma from '@config/database';
import logger from '@config/logger';
import { AppError } from '@/middleware/errorHandler';
import { Vehicle, VehicleType, Prisma } from '@prisma/client';

interface CreateVehicleInput {
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  maxWeight?: number;
  maxVolume?: number;
  maxStops?: number;
  traccarDeviceId?: string;
}

interface UpdateVehicleInput {
  make?: string;
  model?: string;
  year?: number;
  type?: VehicleType;
  maxWeight?: number;
  maxVolume?: number;
  maxStops?: number;
  traccarDeviceId?: string;
  isActive?: boolean;
}

export class VehiclesService {
  /**
   * Create a new vehicle
   */
  async createVehicle(input: CreateVehicleInput): Promise<Vehicle> {
    try {
      // Check if vehicle with license plate already exists
      const existing = await prisma.vehicle.findUnique({
        where: { licensePlate: input.licensePlate },
      });

      if (existing) {
        throw new AppError(409, 'Vehicle with this license plate already exists');
      }

      const vehicle = await prisma.vehicle.create({
        data: {
          licensePlate: input.licensePlate,
          make: input.make,
          model: input.model,
          year: input.year,
          type: input.type,
          maxWeight: input.maxWeight,
          maxVolume: input.maxVolume,
          maxStops: input.maxStops,
          traccarDeviceId: input.traccarDeviceId,
          isActive: true,
        },
      });

      logger.info('Vehicle created', {
        vehicleId: vehicle.id,
        licensePlate: vehicle.licensePlate,
      });

      return vehicle;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to create vehicle', { input, error });
      throw new AppError(500, 'Failed to create vehicle');
    }
  }

  /**
   * Get vehicle by ID
   */
  async getVehicleById(id: string): Promise<Vehicle> {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        deliveryRuns: {
          where: {
            scheduledDate: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { scheduledDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!vehicle) {
      throw new AppError(404, 'Vehicle not found');
    }

    return vehicle;
  }

  /**
   * List vehicles with filters
   */
  async listVehicles(params: {
    type?: VehicleType;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput = {
      ...(params.type && { type: params.type }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
    };

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        orderBy: { licensePlate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.vehicle.count({ where }),
    ]);

    return {
      vehicles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update vehicle
   */
  async updateVehicle(id: string, input: UpdateVehicleInput): Promise<Vehicle> {
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: input,
    });

    logger.info('Vehicle updated', { vehicleId: id });

    return vehicle;
  }

  /**
   * Delete vehicle
   */
  async deleteVehicle(id: string): Promise<void> {
    // Check if vehicle has active runs
    const activeRuns = await prisma.deliveryRun.count({
      where: {
        vehicleId: id,
        status: {
          in: ['PLANNED', 'ASSIGNED', 'IN_PROGRESS'],
        },
      },
    });

    if (activeRuns > 0) {
      throw new AppError(400, 'Cannot delete vehicle with active delivery runs');
    }

    await prisma.vehicle.delete({
      where: { id },
    });

    logger.info('Vehicle deleted', { vehicleId: id });
  }

  /**
   * Get available vehicles for a specific date
   */
  async getAvailableVehicles(date: Date): Promise<Vehicle[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const vehiclesWithRuns = await prisma.deliveryRun.findMany({
      where: {
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { vehicleId: true },
    });

    const busyVehicleIds = vehiclesWithRuns
      .map((run) => run.vehicleId)
      .filter((id): id is string => id !== null);

    return prisma.vehicle.findMany({
      where: {
        isActive: true,
        id: {
          notIn: busyVehicleIds,
        },
      },
      orderBy: { licensePlate: 'asc' },
    });
  }
}

export default new VehiclesService();

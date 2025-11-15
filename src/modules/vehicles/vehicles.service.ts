import prisma from '@config/database';
import logger from '@config/logger';
import { AppError, createAppError } from '@/middleware/errorHandler';
import { Vehicle, VehicleType, Prisma } from '@prisma/client';
import { MAX_PAGINATION_LIMIT, DEFAULT_PAGINATION_LIMIT } from '@/constants/pagination';
import { getBusyResourceIds} from '@/utils/availability';
import { MS_PER_WEEK } from '@/constants/time';
import { normalizePagination } from '@/utils/pagination';

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
      throw createAppError(500, 'Failed to create vehicle', error);
    }
  }

  /**
   * Get vehicle by ID
   * @param id - Vehicle ID
   * @param includeRuns - Whether to include recent delivery runs (default: false)
   */
  async getVehicleById(id: string, includeRuns: boolean = false): Promise<Vehicle> {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: includeRuns
        ? {
            deliveryRuns: {
              where: {
                scheduledDate: {
                  gte: new Date(Date.now() - MS_PER_WEEK),
                },
              },
              orderBy: { scheduledDate: 'desc' },
              take: 10,
            },
          }
        : undefined,
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
    // Cap limit at MAX_PAGINATION_LIMIT to prevent abuse
    const limit = Math.min(params.limit || DEFAULT_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT);
    const skip = (page - 1) * limit;
    const { page, limit, skip } = normalizePagination(params);

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
    const busyVehicleIds = await getBusyResourceIds(date, 'vehicle');

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

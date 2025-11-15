import prisma from '@config/database';
import logger from '@config/logger';
import { AppError } from '@/middleware/errorHandler';
import { Driver, DriverStatus, Prisma } from '@prisma/client';
import { MAX_PAGINATION_LIMIT, DEFAULT_PAGINATION_LIMIT } from '@/constants/pagination';
import { getBusyResourceIds } from '@/utils/availability';
import { MS_PER_WEEK } from '@/constants/time';

interface CreateDriverInput {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  licenseNumber?: string;
  startTime?: string;
  endTime?: string;
  traccarDeviceId?: string;
}

interface UpdateDriverInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  licenseNumber?: string;
  status?: DriverStatus;
  startTime?: string;
  endTime?: string;
  traccarDeviceId?: string;
}

export class DriversService {
  /**
   * Create a new driver
   * @param input - Driver creation data including name, email, phone, and license
   * @returns Promise resolving to the created driver
   * @throws {AppError} If email is already in use or creation fails
   */
  async createDriver(input: CreateDriverInput): Promise<Driver> {
    try {
      // Check if driver with email already exists
      const existing = await prisma.driver.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        throw new AppError(409, 'Driver with this email already exists');
      }

      const driver = await prisma.driver.create({
        data: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          licenseNumber: input.licenseNumber,
          startTime: input.startTime,
          endTime: input.endTime,
          traccarDeviceId: input.traccarDeviceId,
          status: DriverStatus.ACTIVE,
        },
      });

      logger.info('Driver created', { driverId: driver.id, email: driver.email });

      return driver;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to create driver', { input, error });
      throw new AppError(500, 'Failed to create driver');
    }
  }

  /**
   * Get driver by ID
   * @param id - Driver ID
   * @param includeRuns - Whether to include recent delivery runs (default: false)
   */
  async getDriverById(id: string, includeRuns: boolean = false): Promise<Driver> {
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: includeRuns
        ? {
            deliveryRuns: {
              where: {
                scheduledDate: {
                  gte: new Date(Date.now() - MS_PER_WEEK), // Last 7 days
                },
              },
              orderBy: { scheduledDate: 'desc' },
              take: 10,
            },
          }
        : undefined,
    });

    if (!driver) {
      throw new AppError(404, 'Driver not found');
    }

    return driver;
  }

  /**
   * List drivers with filters
   */
  async listDrivers(params: { status?: DriverStatus; page?: number; limit?: number }) {
    const page = params.page || 1;
    // Cap limit at MAX_PAGINATION_LIMIT to prevent abuse
    const limit = Math.min(params.limit || DEFAULT_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT);
    const skip = (page - 1) * limit;

    const where: Prisma.DriverWhereInput = {
      ...(params.status && { status: params.status }),
    };

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        orderBy: { firstName: 'asc' },
        skip,
        take: limit,
      }),
      prisma.driver.count({ where }),
    ]);

    return {
      drivers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update driver
   */
  async updateDriver(id: string, input: UpdateDriverInput): Promise<Driver> {
    const driver = await prisma.driver.update({
      where: { id },
      data: input,
    });

    logger.info('Driver updated', { driverId: id });

    return driver;
  }

  /**
   * Delete driver
   */
  async deleteDriver(id: string): Promise<void> {
    // Check if driver has active runs
    const activeRuns = await prisma.deliveryRun.count({
      where: {
        driverId: id,
        status: {
          in: ['PLANNED', 'ASSIGNED', 'IN_PROGRESS'],
        },
      },
    });

    if (activeRuns > 0) {
      throw new AppError(400, 'Cannot delete driver with active delivery runs');
    }

    await prisma.driver.delete({
      where: { id },
    });

    logger.info('Driver deleted', { driverId: id });
  }

  /**
   * Get available drivers for a specific date/time
   * Returns drivers who are active and don't have a run scheduled for the given date
   * @param date - Date to check availability for
   * @returns Promise resolving to list of available drivers
   */
  async getAvailableDrivers(date: Date): Promise<Driver[]> {
    const busyDriverIds = await getBusyResourceIds(date, 'driver');

    return prisma.driver.findMany({
      where: {
        status: DriverStatus.ACTIVE,
        id: {
          notIn: busyDriverIds,
        },
      },
      orderBy: { firstName: 'asc' },
    });
  }
}

export default new DriversService();

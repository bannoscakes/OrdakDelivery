import prisma from '@config/database';
import logger from '@config/logger';
import { AppError } from '@/middleware/errorHandler';
import { Driver, DriverStatus, Prisma } from '@prisma/client';

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
   */
  async getDriverById(id: string): Promise<Driver> {
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        deliveryRuns: {
          where: {
            scheduledDate: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
          orderBy: { scheduledDate: 'desc' },
          take: 10,
        },
      },
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
    const limit = params.limit || 20;
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
   */
  async getAvailableDrivers(date: Date): Promise<Driver[]> {
    // Get drivers who don't have a run scheduled for this date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const driversWithRuns = await prisma.deliveryRun.findMany({
      where: {
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: { driverId: true },
    });

    const busyDriverIds = driversWithRuns
      .map((run) => run.driverId)
      .filter((id): id is string => id !== null);

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

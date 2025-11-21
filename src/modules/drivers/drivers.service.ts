import prisma from '@config/database';
import logger from '@config/logger';
import { AppError } from '@/middleware/errorHandler';
import { Driver, DriverStatus, Prisma } from '@prisma/client';
import { MAX_PAGINATION_LIMIT, DEFAULT_PAGINATION_LIMIT } from '@/constants/pagination';
import { getBusyResourceIds } from '@/utils/availability';
import { MS_PER_WEEK } from '@/constants/time';
import bcrypt from 'bcrypt';

interface CreateDriverInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  driverLicense: string;
  licenseExpiry: Date;
  vehicleId?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

interface UpdateDriverInput {
  driverLicense?: string;
  licenseExpiry?: Date;
  vehicleId?: string;
  status?: DriverStatus;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

// Safe user fields to expose in API responses (excludes sensitive data)
const safeUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  // Excluded: passwordHash, emailVerified, lastLoginAt
} as const;

export class DriversService {
  /**
   * Create a new driver
   * Creates a User record first, then links a Driver record to it
   * @param input - Driver creation data including user info and driver-specific details
   * @returns Promise resolving to the created driver with user relation
   * @throws {AppError} If email is already in use or creation fails
   */
  async createDriver(input: CreateDriverInput): Promise<Driver> {
    try {
      // Check if user with email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new AppError(409, 'User with this email already exists');
      }

      // Check if driver license already exists
      const existingLicense = await prisma.driver.findUnique({
        where: { driverLicense: input.driverLicense },
      });

      if (existingLicense) {
        throw new AppError(409, 'Driver with this license number already exists');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Create User and Driver in a transaction
      const driver = await prisma.$transaction(async (tx) => {
        // Create User first
        const user = await tx.user.create({
          data: {
            email: input.email,
            passwordHash,
            role: 'driver',
            firstName: input.firstName,
            lastName: input.lastName,
            phone: input.phone,
            isActive: true,
          },
        });

        // Create Driver linked to User
        return tx.driver.create({
          data: {
            userId: user.id,
            driverLicense: input.driverLicense,
            licenseExpiry: input.licenseExpiry,
            vehicleId: input.vehicleId,
            status: DriverStatus.available,
            emergencyContactName: input.emergencyContactName,
            emergencyContactPhone: input.emergencyContactPhone,
          },
          include: {
            user: {
              select: safeUserSelect,
            },
            vehicle: true,
          },
        });
      });

      logger.info('Driver created', { driverId: driver.id, userId: driver.userId });

      return driver;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Failed to create driver', { email: input.email, error });
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
      include: {
        user: {
          select: safeUserSelect,
        },
        vehicle: true,
        ...(includeRuns && {
          deliveryRuns: {
            where: {
              scheduledDate: {
                gte: new Date(Date.now() - MS_PER_WEEK), // Last 7 days
              },
            },
            orderBy: { scheduledDate: 'desc' },
            take: 10,
          },
        }),
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
    // Cap limit at MAX_PAGINATION_LIMIT to prevent abuse
    const limit = Math.min(params.limit || DEFAULT_PAGINATION_LIMIT, MAX_PAGINATION_LIMIT);
    const skip = (page - 1) * limit;

    const where: Prisma.DriverWhereInput = {
      ...(params.status && { status: params.status }),
    };

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where,
        include: {
          user: {
            select: safeUserSelect,
          },
          vehicle: true,
        },
        orderBy: {
          user: {
            firstName: 'asc',
          },
        },
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
   * Deletes the User record, which will cascade delete the Driver
   */
  async deleteDriver(id: string): Promise<void> {
    // Check if driver has active runs
    const activeRuns = await prisma.deliveryRun.count({
      where: {
        driverId: id,
        status: {
          in: ['planned', 'assigned', 'in_progress'],
        },
      },
    });

    if (activeRuns > 0) {
      throw new AppError(400, 'Cannot delete driver with active delivery runs');
    }

    // Get driver to find userId
    const driver = await prisma.driver.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!driver) {
      throw new AppError(404, 'Driver not found');
    }

    // Delete User (Driver will be cascade deleted)
    await prisma.user.delete({
      where: { id: driver.userId },
    });

    logger.info('Driver and associated user deleted', { driverId: id, userId: driver.userId });
  }

  /**
   * Get available drivers for a specific date/time
   * Returns drivers who are available and don't have a run scheduled for the given date
   * @param date - Date to check availability for
   * @returns Promise resolving to list of available drivers
   */
  async getAvailableDrivers(date: Date): Promise<Driver[]> {
    const busyDriverIds = await getBusyResourceIds(date, 'driver');

    return prisma.driver.findMany({
      where: {
        status: DriverStatus.available,
        user: {
          isActive: true,
        },
        id: {
          notIn: busyDriverIds,
        },
      },
      include: {
        user: {
          select: safeUserSelect,
        },
        vehicle: true,
      },
      orderBy: {
        user: {
          firstName: 'asc',
        },
      },
    });
  }
}

export default new DriversService();

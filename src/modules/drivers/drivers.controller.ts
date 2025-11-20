import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import driversService from './drivers.service';
import { z } from 'zod';
import { DriverStatus } from '@prisma/client';

const createDriverSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().optional(),
    driverLicense: z.string().min(1),
    licenseExpiry: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }).transform((val) => new Date(val)),
    vehicleId: z.string().uuid().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
  }),
});

const updateDriverSchema = z.object({
  body: z.object({
    driverLicense: z.string().min(1).optional(),
    licenseExpiry: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }).transform((val) => new Date(val)).optional(),
    vehicleId: z.string().uuid().optional(),
    status: z.nativeEnum(DriverStatus).optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
  }),
});

const listDriversSchema = z.object({
  query: z.object({
    status: z.nativeEnum(DriverStatus).optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

const getAvailableDriversSchema = z.object({
  query: z.object({
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }),
  }),
});

export const createDriver = asyncHandler(async (req: Request, res: Response) => {
  const { body } = createDriverSchema.parse({ body: req.body });

  const driver = await driversService.createDriver(body);

  res.status(201).json({
    success: true,
    data: driver,
  });
});

export const getDriver = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id']!;
  const includeRuns = req.query['includeRuns'] === 'true';

  const driver = await driversService.getDriverById(id, includeRuns);

  res.status(200).json({
    success: true,
    data: driver,
  });
});

export const listDrivers = asyncHandler(async (req: Request, res: Response) => {
  const { query } = listDriversSchema.parse({ query: req.query });

  const result = await driversService.listDrivers(query);

  res.status(200).json({
    success: true,
    data: result.drivers,
    pagination: result.pagination,
  });
});

export const updateDriver = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id']!;
  const { body } = updateDriverSchema.parse({ body: req.body });

  const driver = await driversService.updateDriver(id, body);

  res.status(200).json({
    success: true,
    data: driver,
  });
});

export const deleteDriver = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id']!;

  await driversService.deleteDriver(id);

  res.status(204).send();
});

export const getAvailableDrivers = asyncHandler(async (req: Request, res: Response) => {
  const { query } = getAvailableDriversSchema.parse({ query: req.query });

  const drivers = await driversService.getAvailableDrivers(new Date(query.date));

  res.status(200).json({
    success: true,
    data: drivers,
  });
});

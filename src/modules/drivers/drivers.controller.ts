import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import driversService from './drivers.service';
import { z } from 'zod';
import { DriverStatus } from '@prisma/client';

const createDriverSchema = z.object({
  body: z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(1),
    licenseNumber: z.string().optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    traccarDeviceId: z.string().optional(),
  }),
});

const updateDriverSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    phone: z.string().min(1).optional(),
    licenseNumber: z.string().optional(),
    status: z.nativeEnum(DriverStatus).optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    traccarDeviceId: z.string().optional(),
  }),
});

const listDriversSchema = z.object({
  query: z.object({
    status: z.nativeEnum(DriverStatus).optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
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
  const { id } = req.params;

  const driver = await driversService.getDriverById(id);

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
  const { id } = req.params;
  const { body } = updateDriverSchema.parse({ body: req.body });

  const driver = await driversService.updateDriver(id, body);

  res.status(200).json({
    success: true,
    data: driver,
  });
});

export const deleteDriver = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await driversService.deleteDriver(id);

  res.status(204).send();
});

export const getAvailableDrivers = asyncHandler(async (req: Request, res: Response) => {
  const { date } = req.query;

  if (!date || typeof date !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Date query parameter required',
    });
    return;
  }

  const drivers = await driversService.getAvailableDrivers(new Date(date));

  res.status(200).json({
    success: true,
    data: drivers,
  });
});

import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import vehiclesService from './vehicles.service';
import { z } from 'zod';
import { VehicleType } from '@prisma/client';

const createVehicleSchema = z.object({
  body: z.object({
    licensePlate: z.string().min(1),
    make: z.string().min(1),
    model: z.string().min(1),
    year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
    type: z.nativeEnum(VehicleType),
    maxWeight: z.number().positive().optional(),
    maxVolume: z.number().positive().optional(),
    maxStops: z.number().int().positive().optional(),
    traccarDeviceId: z.string().optional(),
  }),
});

const updateVehicleSchema = z.object({
  body: z.object({
    make: z.string().min(1).optional(),
    model: z.string().min(1).optional(),
    year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
    type: z.nativeEnum(VehicleType).optional(),
    maxWeight: z.number().positive().optional(),
    maxVolume: z.number().positive().optional(),
    maxStops: z.number().int().positive().optional(),
    traccarDeviceId: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const listVehiclesSchema = z.object({
  query: z.object({
    type: z.nativeEnum(VehicleType).optional(),
    isActive: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

const getAvailableVehiclesSchema = z.object({
  query: z.object({
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }),
  }),
});

export const createVehicle = asyncHandler(async (req: Request, res: Response) => {
  const { body } = createVehicleSchema.parse({ body: req.body });

  const vehicle = await vehiclesService.createVehicle(body);

  res.status(201).json({
    success: true,
    data: vehicle,
  });
});

export const getVehicle = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const includeRuns = req.query.includeRuns === 'true';

  const vehicle = await vehiclesService.getVehicleById(id, includeRuns);

  res.status(200).json({
    success: true,
    data: vehicle,
  });
});

export const listVehicles = asyncHandler(async (req: Request, res: Response) => {
  const { query } = listVehiclesSchema.parse({ query: req.query });

  const result = await vehiclesService.listVehicles(query);

  res.status(200).json({
    success: true,
    data: result.vehicles,
    pagination: result.pagination,
  });
});

export const updateVehicle = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = updateVehicleSchema.parse({ body: req.body });

  const vehicle = await vehiclesService.updateVehicle(id, body);

  res.status(200).json({
    success: true,
    data: vehicle,
  });
});

export const deleteVehicle = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await vehiclesService.deleteVehicle(id);

  res.status(204).send();
});

export const getAvailableVehicles = asyncHandler(async (req: Request, res: Response) => {
  const { query } = getAvailableVehiclesSchema.parse({ query: req.query });

  const vehicles = await vehiclesService.getAvailableVehicles(new Date(query.date));

  res.status(200).json({
    success: true,
    data: vehicles,
  });
});

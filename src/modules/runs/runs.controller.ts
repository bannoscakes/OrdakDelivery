import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import runsService from './runs.service';
import { z } from 'zod';
import { RunStatus } from '@prisma/client';

const createRunSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    scheduledDate: z.string().transform((val) => new Date(val)),
    driverId: z.string().optional(),
    vehicleId: z.string().optional(),
    orderIds: z.array(z.string()).optional(),
  }),
});

const updateRunSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    status: z.nativeEnum(RunStatus).optional(),
    driverId: z.string().optional(),
    vehicleId: z.string().optional(),
    startTime: z
      .string()
      .transform((val) => new Date(val))
      .optional(),
    endTime: z
      .string()
      .transform((val) => new Date(val))
      .optional(),
  }),
});

const assignOrdersSchema = z.object({
  body: z.object({
    orderIds: z.array(z.string()).min(1),
  }),
});

const optimizeRunSchema = z.object({
  body: z.object({
    startLocation: z.tuple([z.number(), z.number()]),
    endLocation: z.tuple([z.number(), z.number()]).optional(),
  }),
});

const listRunsSchema = z.object({
  query: z.object({
    status: z.nativeEnum(RunStatus).optional(),
    driverId: z.string().optional(),
    scheduledAfter: z
      .string()
      .transform((val) => new Date(val))
      .optional(),
    scheduledBefore: z
      .string()
      .transform((val) => new Date(val))
      .optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
  }),
});

export const createRun = asyncHandler(async (req: Request, res: Response) => {
  const { body } = createRunSchema.parse({ body: req.body });

  const run = await runsService.createRun(body);

  res.status(201).json({
    success: true,
    data: run,
  });
});

export const getRun = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id']!;

  const run = await runsService.getRunById(id);

  res.status(200).json({
    success: true,
    data: run,
  });
});

export const listRuns = asyncHandler(async (req: Request, res: Response) => {
  const { query } = listRunsSchema.parse({ query: req.query });

  const result = await runsService.listRuns(query);

  res.status(200).json({
    success: true,
    data: result.runs,
    pagination: result.pagination,
  });
});

export const updateRun = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id']!;
  const { body } = updateRunSchema.parse({ body: req.body });

  const run = await runsService.updateRun(id, body);

  res.status(200).json({
    success: true,
    data: run,
  });
});

export const deleteRun = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id']!;

  await runsService.deleteRun(id);

  res.status(204).send();
});

export const assignOrders = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id']!;
  const { body } = assignOrdersSchema.parse({ body: req.body });

  await runsService.assignOrders(id, body.orderIds);

  res.status(200).json({
    success: true,
    message: 'Orders assigned successfully',
  });
});

export const unassignOrders = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id']!;
  const { body } = assignOrdersSchema.parse({ body: req.body });

  await runsService.unassignOrders(id, body.orderIds);

  res.status(200).json({
    success: true,
    message: 'Orders unassigned successfully',
  });
});

export const optimizeRun = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id']!;
  const { body } = optimizeRunSchema.parse({ body: req.body });

  const solution = await runsService.optimizeRun(id, body.startLocation, body.endLocation);

  res.status(200).json({
    success: true,
    data: solution,
  });
});

export const startRun = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id']!;

  const run = await runsService.startRun(id);

  res.status(200).json({
    success: true,
    data: run,
  });
});

export const completeRun = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id']!;

  const run = await runsService.completeRun(id);

  res.status(200).json({
    success: true,
    data: run,
  });
});

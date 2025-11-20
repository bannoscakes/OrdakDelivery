/**
 * Dispatch Controller
 *
 * Handles all zone-based dispatch operations including:
 * - Zone template management
 * - Auto-assignment of orders to zones
 * - Draft run creation and management
 * - Driver/vehicle assignment
 * - Run finalization with SMS notifications
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '@/utils/asyncHandler';
import dispatchService from './dispatch.service';
import zoneTemplatesService from '@modules/zones/zone-templates.service';
import fleetService from '@modules/fleet/fleet.service';
import runsService from '@modules/runs/runs.service';
import logger from '@config/logger';

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const applyTemplateSchema = z.object({
  body: z.object({
    templateName: z.enum(['weekday', 'weekend']),
    activeDays: z.array(z.string()).optional(),
  }),
});

const autoAssignSchema = z.object({
  body: z.object({
    scheduledDate: z.string().datetime(),
    cutoffTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }),
});

const createDraftRunsSchema = z.object({
  body: z.object({
    scheduledDate: z.string().datetime(),
  }),
});

const assignDriverVehicleSchema = z.object({
  params: z.object({
    runId: z.string().uuid(),
  }),
  body: z.object({
    driverId: z.string().uuid(),
    vehicleId: z.string().uuid(),
  }),
});

const bulkAssignSchema = z.object({
  body: z.object({
    assignments: z.array(
      z.object({
        runId: z.string().uuid(),
        driverId: z.string().uuid(),
        vehicleId: z.string().uuid(),
      })
    ),
  }),
});

const finalizeRunSchema = z.object({
  params: z.object({
    runId: z.string().uuid(),
  }),
  body: z.object({
    startLocation: z.tuple([z.number(), z.number()]),
  }),
});

const finalizeAllSchema = z.object({
  body: z.object({
    scheduledDate: z.string().datetime(),
    startLocation: z.tuple([z.number(), z.number()]),
  }),
});

const addOrderToRunSchema = z.object({
  params: z.object({
    runId: z.string().uuid(),
  }),
  body: z.object({
    orderId: z.string().uuid(),
  }),
});

const removeOrderFromRunSchema = z.object({
  params: z.object({
    runId: z.string().uuid(),
  }),
  body: z.object({
    orderId: z.string().uuid(),
  }),
});

const reorderStopsSchema = z.object({
  params: z.object({
    runId: z.string().uuid(),
  }),
  body: z.object({
    orderSequence: z.array(z.string().uuid()),
  }),
});

const moveOrderSchema = z.object({
  body: z.object({
    orderId: z.string().uuid(),
    fromRunId: z.string().uuid(),
    toRunId: z.string().uuid(),
  }),
});

const getActiveZonesSchema = z.object({
  query: z.object({
    date: z.string().datetime(),
  }),
});

const checkBalanceSchema = z.object({
  query: z.object({
    date: z.string().datetime(),
  }),
});

const rebalanceSchema = z.object({
  body: z.object({
    scheduledDate: z.string().datetime(),
  }),
});

const getFleetSchema = z.object({
  query: z.object({
    date: z.string().datetime(),
  }),
});

// =====================================================
// ZONE TEMPLATE ENDPOINTS
// =====================================================

/**
 * POST /api/v1/dispatch/zones/templates/apply
 * Apply a zone template (weekday or weekend)
 */
export const applyZoneTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { body } = applyTemplateSchema.parse({ body: req.body });

  const zones = await zoneTemplatesService.applyTemplate(body.templateName, body.activeDays);

  logger.info('Zone template applied', { templateName: body.templateName, zoneCount: zones.length });

  res.status(201).json({
    success: true,
    data: {
      templateName: body.templateName,
      zonesCreated: zones.length,
      zones,
    },
  });
});

/**
 * GET /api/v1/dispatch/zones/active
 * Get active zones for a specific date
 */
export const getActiveZones = asyncHandler(async (req: Request, res: Response) => {
  const { query } = getActiveZonesSchema.parse({ query: req.query });

  const date = new Date(query.date);
  const zones = await zoneTemplatesService.getActiveZonesForDate(date);

  res.json({
    success: true,
    data: {
      date,
      zones,
    },
  });
});

// =====================================================
// AUTO-ASSIGNMENT ENDPOINTS
// =====================================================

/**
 * POST /api/v1/dispatch/orders/auto-assign
 * Auto-assign orders to zones based on delivery address
 */
export const autoAssignOrders = asyncHandler(async (req: Request, res: Response) => {
  const { body } = autoAssignSchema.parse({ body: req.body });

  const scheduledDate = new Date(body.scheduledDate);
  const result = await dispatchService.autoAssignOrdersToZones(scheduledDate, body.cutoffTime);

  logger.info('Auto-assignment completed', {
    scheduledDate,
    assignedOrders: result.assignedOrders,
  });

  res.json({
    success: true,
    data: result,
  });
});

// =====================================================
// DRAFT RUN ENDPOINTS
// =====================================================

/**
 * POST /api/v1/dispatch/runs/create-drafts
 * Create draft runs for all zones on a specific date
 */
export const createDraftRuns = asyncHandler(async (req: Request, res: Response) => {
  const { body } = createDraftRunsSchema.parse({ body: req.body });

  const scheduledDate = new Date(body.scheduledDate);
  const result = await dispatchService.createDraftRunsForDate(scheduledDate);

  logger.info('Draft runs created', { scheduledDate, runsCreated: result.runsCreated });

  res.status(201).json({
    success: true,
    data: result,
  });
});

/**
 * POST /api/v1/dispatch/runs/:runId/add-order
 * Add an order to a draft run
 */
export const addOrderToRun = asyncHandler(async (req: Request, res: Response) => {
  const { params, body } = addOrderToRunSchema.parse({ params: req.params, body: req.body });

  const run = await runsService.addOrderToRun(params.runId, body.orderId);

  res.json({
    success: true,
    data: run,
  });
});

/**
 * POST /api/v1/dispatch/runs/:runId/remove-order
 * Remove an order from a draft run
 */
export const removeOrderFromRun = asyncHandler(async (req: Request, res: Response) => {
  const { params, body } = removeOrderFromRunSchema.parse({ params: req.params, body: req.body });

  const run = await runsService.removeOrderFromRun(params.runId, body.orderId);

  res.json({
    success: true,
    data: run,
  });
});

/**
 * POST /api/v1/dispatch/runs/:runId/reorder
 * Reorder stops within a draft run
 */
export const reorderStops = asyncHandler(async (req: Request, res: Response) => {
  const { params, body } = reorderStopsSchema.parse({ params: req.params, body: req.body });

  const run = await runsService.reorderStops(params.runId, body.orderSequence);

  res.json({
    success: true,
    data: run,
  });
});

/**
 * POST /api/v1/dispatch/orders/move
 * Move an order from one draft run to another
 */
export const moveOrderBetweenRuns = asyncHandler(async (req: Request, res: Response) => {
  const { body } = moveOrderSchema.parse({ body: req.body });

  const run = await runsService.moveOrderBetweenRuns(body.orderId, body.fromRunId, body.toRunId);

  res.json({
    success: true,
    data: run,
  });
});

// =====================================================
// ZONE BALANCE ENDPOINTS
// =====================================================

/**
 * GET /api/v1/dispatch/zones/balance
 * Check zone balance and get recommendations
 */
export const checkZoneBalance = asyncHandler(async (req: Request, res: Response) => {
  const { query } = checkBalanceSchema.parse({ query: req.query });

  const scheduledDate = new Date(query.date);
  const balanceChecks = await dispatchService.checkZoneBalance(scheduledDate);

  res.json({
    success: true,
    data: {
      scheduledDate,
      zones: balanceChecks,
    },
  });
});

/**
 * POST /api/v1/dispatch/zones/rebalance
 * Rebalance zones by moving orders between zones
 */
export const rebalanceZones = asyncHandler(async (req: Request, res: Response) => {
  const { body } = rebalanceSchema.parse({ body: req.body });

  const scheduledDate = new Date(body.scheduledDate);
  const result = await dispatchService.rebalanceAllZones(scheduledDate);

  logger.info('Zone rebalancing completed', {
    scheduledDate,
    zonesRebalanced: result.zonesRebalanced,
    ordersMoved: result.ordersMoved,
  });

  res.json({
    success: true,
    data: result,
  });
});

// =====================================================
// DRIVER/VEHICLE ASSIGNMENT ENDPOINTS
// =====================================================

/**
 * GET /api/v1/dispatch/fleet/available
 * Get available drivers and vehicles for a specific date
 */
export const getAvailableFleet = asyncHandler(async (req: Request, res: Response) => {
  const { query } = getFleetSchema.parse({ query: req.query });

  const scheduledDate = new Date(query.date);
  const availability = await fleetService.getAvailableFleet(scheduledDate);

  res.json({
    success: true,
    data: {
      scheduledDate,
      ...availability,
    },
  });
});

/**
 * POST /api/v1/dispatch/runs/:runId/assign
 * Assign driver and vehicle to a draft run
 */
export const assignDriverVehicle = asyncHandler(async (req: Request, res: Response) => {
  const { params, body } = assignDriverVehicleSchema.parse({ params: req.params, body: req.body });

  const run = await dispatchService.assignDriverAndVehicle(
    params.runId,
    body.driverId,
    body.vehicleId
  );

  logger.info('Driver and vehicle assigned', {
    runId: params.runId,
    driverId: body.driverId,
    vehicleId: body.vehicleId,
  });

  res.json({
    success: true,
    data: run,
  });
});

/**
 * POST /api/v1/dispatch/runs/assign-bulk
 * Bulk assign drivers and vehicles to multiple runs
 */
export const bulkAssignDrivers = asyncHandler(async (req: Request, res: Response) => {
  const { body } = bulkAssignSchema.parse({ body: req.body });

  const result = await dispatchService.bulkAssignDrivers(body.assignments);

  logger.info('Bulk driver assignment completed', {
    totalAssignments: result.totalAssignments,
    successfulAssignments: result.successfulAssignments,
    failedAssignments: result.failedAssignments,
  });

  res.json({
    success: true,
    data: result,
  });
});

// =====================================================
// FINALIZATION ENDPOINTS
// =====================================================

/**
 * POST /api/v1/dispatch/runs/:runId/finalize
 * Finalize a single run (optimize route, send SMS notifications)
 */
export const finalizeRun = asyncHandler(async (req: Request, res: Response) => {
  const { params, body } = finalizeRunSchema.parse({ params: req.params, body: req.body });

  const result = await dispatchService.finalizeRun(params.runId, body.startLocation);

  logger.info('Run finalized', {
    runId: params.runId,
    runNumber: result.runNumber,
    orderCount: result.orderCount,
  });

  res.json({
    success: true,
    data: result,
  });
});

/**
 * POST /api/v1/dispatch/runs/finalize-all
 * Finalize all draft runs for a specific date
 */
export const finalizeAllRuns = asyncHandler(async (req: Request, res: Response) => {
  const { body } = finalizeAllSchema.parse({ body: req.body });

  const scheduledDate = new Date(body.scheduledDate);
  const result = await dispatchService.finalizeAllRuns(scheduledDate, body.startLocation);

  logger.info('All runs finalized', {
    scheduledDate,
    finalizedRuns: result.finalizedRuns,
    totalOrders: result.totalOrders,
    failures: result.failures.length,
  });

  res.json({
    success: true,
    data: result,
  });
});

import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import ordersService from './orders.service';
import { z } from 'zod';
import { OrderType, OrderStatus } from '@prisma/client';
import { orderItemSchema } from './orders.types';

const createOrderSchema = z.object({
  body: z.object({
    orderNumber: z.string().min(1),
    type: z.nativeEnum(OrderType),
    customer: z.object({
      email: z.string().email().optional(),
      phone: z.string().optional(),
      firstName: z.string().min(1),
      lastName: z.string().min(1),
    }),
    address: z.object({
      line1: z.string().min(1),
      line2: z.string().optional(),
      city: z.string().min(1),
      province: z.string().min(1),
      postalCode: z.string().min(1),
      country: z.string().length(2).optional(),
    }),
    scheduledDate: z.string().transform((val) => new Date(val)),
    timeWindowStart: z
      .string()
      .transform((val) => new Date(val))
      .optional(),
    timeWindowEnd: z
      .string()
      .transform((val) => new Date(val))
      .optional(),
    items: z.array(orderItemSchema).min(1, 'At least one item is required'),
    notes: z.string().optional(),
    specialInstructions: z.string().optional(),
  }),
});

const updateOrderSchema = z.object({
  body: z.object({
    status: z.nativeEnum(OrderStatus).optional(),
    scheduledDate: z
      .string()
      .transform((val) => new Date(val))
      .optional(),
    timeWindowStart: z
      .string()
      .transform((val) => new Date(val))
      .optional(),
    timeWindowEnd: z
      .string()
      .transform((val) => new Date(val))
      .optional(),
    notes: z.string().optional(),
    specialInstructions: z.string().optional(),
  }),
});

const listOrdersSchema = z.object({
  query: z.object({
    status: z.nativeEnum(OrderStatus).optional(),
    type: z.nativeEnum(OrderType).optional(),
    scheduledAfter: z
      .string()
      .transform((val) => new Date(val))
      .optional(),
    scheduledBefore: z
      .string()
      .transform((val) => new Date(val))
      .optional(),
    page: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .optional(),
  }),
});

const getUnassignedOrdersSchema = z.object({
  query: z.object({
    date: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }),
  }),
});

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const { body } = createOrderSchema.parse({ body: req.body });

  const order = await ordersService.createOrder(body);

  res.status(201).json({
    success: true,
    data: order,
  });
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id']!;

  const order = await ordersService.getOrderById(id);

  res.status(200).json({
    success: true,
    data: order,
  });
});

export const listOrders = asyncHandler(async (req: Request, res: Response) => {
  const { query } = listOrdersSchema.parse({ query: req.query });

  const result = await ordersService.listOrders(query);

  res.status(200).json({
    success: true,
    data: result.orders,
    pagination: result.pagination,
  });
});

export const updateOrder = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id']!;
  const { body } = updateOrderSchema.parse({ body: req.body });

  const order = await ordersService.updateOrder(id, body);

  res.status(200).json({
    success: true,
    data: order,
  });
});

export const deleteOrder = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params['id']!;

  await ordersService.deleteOrder(id);

  res.status(204).send();
});

export const getUnassignedOrders = asyncHandler(async (req: Request, res: Response) => {
  const { query } = getUnassignedOrdersSchema.parse({ query: req.query });

  const orders = await ordersService.getUnassignedOrders(new Date(query.date));

  res.status(200).json({
    success: true,
    data: orders,
  });
});

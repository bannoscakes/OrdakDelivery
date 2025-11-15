import { z } from 'zod';
import { OrderType, OrderStatus } from '@prisma/client';

/**
 * Order Item Interface
 */
export interface OrderItem {
  sku: string;
  name: string;
  quantity: number;
  price: string; // Stored as string to avoid floating point issues
}

/**
 * Zod schema for OrderItem validation
 */
export const orderItemSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  price: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid decimal number'),
});

/**
 * Zod schema for array of order items
 */
export const orderItemsArraySchema = z.array(orderItemSchema).min(1, 'At least one item is required');

/**
 * Create Order Input Interface
 */
export interface CreateOrderInput {
  orderNumber: string;
  type: OrderType;
  customer: {
    email?: string;
    phone?: string;
    firstName: string;
    lastName: string;
  };
  address: {
    line1: string;
    line2?: string;
    city: string;
    province: string;
    postalCode: string;
    country?: string;
  };
  scheduledDate: Date;
  timeWindowStart?: Date;
  timeWindowEnd?: Date;
  items: OrderItem[];
  notes?: string;
  specialInstructions?: string;
}

/**
 * Update Order Input Interface
 */
export interface UpdateOrderInput {
  status?: OrderStatus;
  scheduledDate?: Date;
  timeWindowStart?: Date;
  timeWindowEnd?: Date;
  notes?: string;
  specialInstructions?: string;
}

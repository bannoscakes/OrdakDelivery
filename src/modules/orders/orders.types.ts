import { z } from 'zod';
import { OrderType, OrderStatus } from '@prisma/client';

/**
 * Order Item Interface
 * Note: Items are stored as JSON in external integrations (Shopify),
 * but the Order model in schema doesn't have an items field.
 * Consider adding items field to schema or storing in separate OrderItems table.
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
 * Address Input for Order Creation
 */
export interface AddressInput {
  line1: string;
  line2?: string;
  city: string;
  stateProvince?: string; // Maps to stateProvince in Address model
  postalCode: string;
  country?: string;
  deliveryInstructions?: string;
}

/**
 * Create Order Input Interface
 * FIXED: Uses deliveryAddressId relation instead of inline address fields
 */
export interface CreateOrderInput {
  orderNumber: string;
  externalId?: string; // For orders from external systems (Shopify, etc.)
  externalSource?: string; // Defaults to 'manual' for API orders
  type: OrderType;
  customer: {
    email?: string;
    phone?: string;
    firstName: string;
    lastName: string;
    company?: string;
  };
  address: AddressInput; // Will be used to create Address record
  scheduledDate?: Date;
  deliveryWindowStart?: Date; // FIXED: was timeWindowStart
  deliveryWindowEnd?: Date; // FIXED: was timeWindowEnd
  priority?: number;
  weightKg?: number;
  dimensionsCm?: string; // Format: "LxWxH"
  packageCount?: number;
  specialInstructions?: string;
  requiresSignature?: boolean;
  fragile?: boolean;
  subtotal?: number;
  deliveryFee?: number;
  tax?: number;
  total?: number;
  currency?: string;
  notes?: string;
  // Items not in schema - stored in external metadata or consider adding to schema
  items?: OrderItem[];
}

/**
 * Update Order Input Interface
 * FIXED: Uses correct field names from schema
 */
export interface UpdateOrderInput {
  status?: OrderStatus;
  scheduledDate?: Date;
  deliveryWindowStart?: Date; // FIXED: was timeWindowStart
  deliveryWindowEnd?: Date; // FIXED: was timeWindowEnd
  priority?: number;
  estimatedDeliveryTime?: Date;
  weightKg?: number;
  dimensionsCm?: string;
  packageCount?: number;
  specialInstructions?: string;
  requiresSignature?: boolean;
  fragile?: boolean;
  subtotal?: number;
  deliveryFee?: number;
  tax?: number;
  total?: number;
  failureReason?: string;
  notes?: string;
}

/**
 * Proof of Delivery Input
 * FIXED: Uses ProofOfDelivery model instead of inline fields on Order
 */
export interface ProofOfDeliveryInput {
  recipientName?: string;
  recipientRelationship?: string;
  signatureUrl?: string;
  photos?: string[];
  notes?: string;
}

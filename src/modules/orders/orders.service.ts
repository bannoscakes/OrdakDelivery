import prisma from '@config/database';
import logger from '@config/logger';
import { AppError, createAppError } from '@/middleware/errorHandler';
import { Order, OrderType, OrderStatus, Prisma, Address } from '@prisma/client';
import type { CreateOrderInput, UpdateOrderInput, ProofOfDeliveryInput } from './orders.types';
import { normalizePagination } from '@/utils/pagination';
import { geocodeAddressToWKT } from '@/utils/geocoding';

export class OrdersService {
  /**
   * Create a new order with automatic geocoding
   * FIXED: Creates Address record first, then links Order via deliveryAddressId
   * Uses transaction for atomicity
   *
   * @param input - Order creation data including customer, address, and items
   * @returns Promise resolving to the created order with relations
   * @throws {AppError} If order creation fails
   */
  async createOrder(input: CreateOrderInput): Promise<Order> {
    try {
      // Use transaction to ensure atomicity (Address + Order created together)
      const order = await prisma.$transaction(async (tx) => {
        // 1. Find or create customer
        const customer = await tx.customer.upsert({
          where: {
            // Customer doesn't have unique email in schema, use email+phone combo or create always
            email: input.customer.email || undefined,
          },
          update: {
            firstName: input.customer.firstName,
            lastName: input.customer.lastName,
            phone: input.customer.phone,
            company: input.customer.company,
          },
          create: {
            email: input.customer.email,
            phone: input.customer.phone,
            firstName: input.customer.firstName,
            lastName: input.customer.lastName,
            company: input.customer.company,
          },
        });

        // 2. Geocode address
        const fullAddress = `${input.address.line1}, ${input.address.city}, ${input.address.stateProvince || ''} ${input.address.postalCode}, ${input.address.country || 'US'}`;
        const { locationWKT, geocoded } = await geocodeAddressToWKT(
          fullAddress,
          input.address.country || 'US'
        );

        // 3. Create Address record
        const address: Address = await tx.address.create({
          data: {
            customerId: customer.id,
            line1: input.address.line1,
            line2: input.address.line2,
            city: input.address.city,
            stateProvince: input.address.stateProvince, // FIXED: was province
            postalCode: input.address.postalCode,
            country: input.address.country || 'US',
            // Store geocoded location if available
            ...(geocoded && locationWKT
              ? {
                  location: Prisma.sql`ST_GeomFromText(${locationWKT}, 4326)`,
                  geocodedAt: new Date(),
                }
              : {}),
            deliveryInstructions: input.address.deliveryInstructions,
          },
        });

        // 4. Create Order with deliveryAddressId
        const createdOrder = await tx.order.create({
          data: {
            orderNumber: input.orderNumber,
            externalId: input.externalId,
            externalSource: input.externalSource || 'manual', // FIXED: Added default
            type: input.type,
            status: OrderStatus.pending, // FIXED: lowercase enum
            customerId: customer.id,
            deliveryAddressId: address.id, // FIXED: Use relation instead of inline fields
            scheduledDate: input.scheduledDate,
            deliveryWindowStart: input.deliveryWindowStart, // FIXED: renamed from timeWindowStart
            deliveryWindowEnd: input.deliveryWindowEnd, // FIXED: renamed from timeWindowEnd
            priority: input.priority ?? 0,
            weightKg: input.weightKg,
            dimensionsCm: input.dimensionsCm,
            packageCount: input.packageCount ?? 1,
            specialInstructions: input.specialInstructions,
            requiresSignature: input.requiresSignature ?? false,
            fragile: input.fragile ?? false,
            subtotal: input.subtotal,
            deliveryFee: input.deliveryFee,
            tax: input.tax,
            total: input.total,
            currency: input.currency || 'USD',
            notes: input.notes,
            // Items: Consider storing in externalMetadata or separate table
            ...(input.items
              ? {
                  externalMetadata: {
                    items: input.items,
                  } as Prisma.InputJsonValue,
                }
              : {}),
          },
          include: {
            customer: true,
            deliveryAddress: true, // FIXED: Include address relation
          },
        });

        return createdOrder;
      });

      logger.info('Order created', {
        orderId: order.id,
        orderNumber: order.orderNumber,
        deliveryAddressId: order.deliveryAddressId,
      });

      return order;
    } catch (error) {
      logger.error('Failed to create order', { input, error });
      throw createAppError(500, 'Failed to create order', error);
    }
  }

  /**
   * Get order by ID
   * FIXED: Includes deliveryAddress relation
   *
   * @param id - Order ID
   * @returns Promise resolving to the order with relations
   * @throws {AppError} 404 if order not found
   */
  async getOrderById(id: string): Promise<Order> {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        deliveryAddress: true, // FIXED: Include address relation
        assignedRun: {
          include: {
            driver: {
              include: {
                user: true,
              },
            },
            vehicle: true,
          },
        },
        proofOfDelivery: true, // FIXED: Include POD records
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    return order;
  }

  /**
   * List orders with filters and pagination
   * FIXED: Includes deliveryAddress relation
   *
   * @param params - Filter and pagination parameters
   * @returns Promise resolving to paginated orders list
   */
  async listOrders(params: {
    status?: OrderStatus;
    type?: OrderType;
    customerId?: string;
    assignedRunId?: string;
    scheduledAfter?: Date;
    scheduledBefore?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = normalizePagination(params);

    const where: Prisma.OrderWhereInput = {
      ...(params.status && { status: params.status }),
      ...(params.type && { type: params.type }),
      ...(params.customerId && { customerId: params.customerId }),
      ...(params.assignedRunId !== undefined && { assignedRunId: params.assignedRunId }),
      ...(params.scheduledAfter && {
        scheduledDate: { gte: params.scheduledAfter },
      }),
      ...(params.scheduledBefore && {
        scheduledDate: { lte: params.scheduledBefore },
      }),
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: true,
          deliveryAddress: true, // FIXED: Include address relation
          assignedRun: true,
        },
        orderBy: { scheduledDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update order
   * FIXED: Uses correct field names (deliveryWindowStart/End)
   */
  async updateOrder(id: string, input: UpdateOrderInput): Promise<Order> {
    const order = await prisma.order.update({
      where: { id },
      data: input,
      include: {
        customer: true,
        deliveryAddress: true, // FIXED: Include address relation
      },
    });

    logger.info('Order updated', { orderId: id });

    return order;
  }

  /**
   * Delete order
   * Note: This will cascade delete ProofOfDelivery records
   */
  async deleteOrder(id: string): Promise<void> {
    await prisma.order.delete({
      where: { id },
    });

    logger.info('Order deleted', { orderId: id });
  }

  /**
   * Get unassigned orders ready for routing
   * FIXED: Uses correct enum values and includes deliveryAddress
   */
  async getUnassignedOrders(scheduledDate: Date): Promise<Order[]> {
    const startOfDay = new Date(scheduledDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(scheduledDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return prisma.order.findMany({
      where: {
        status: OrderStatus.pending, // FIXED: lowercase enum
        assignedRunId: null,
        // Only orders with geocoded addresses can be routed
        deliveryAddress: {
          geocodedAt: {
            not: null,
          },
        },
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        customer: true,
        deliveryAddress: true, // FIXED: Include address for routing
      },
      orderBy: {
        deliveryWindowStart: 'asc', // FIXED: renamed from timeWindowStart
      },
    });
  }

  /**
   * Submit proof of delivery for an order
   * FIXED: Creates ProofOfDelivery record instead of updating Order directly
   *
   * @param id - Order ID
   * @param data - Proof of delivery data
   * @param userContext - User context for authorization
   * @returns Promise resolving to updated order
   * @throws {AppError} If authorization fails or order not found
   */
  async submitProofOfDelivery(
    id: string,
    data: ProofOfDeliveryInput,
    userContext: { id: string; role: string }
  ): Promise<Order> {
    // Single fetch with run and driver for authorization
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        assignedRun: {
          include: {
            driver: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    // Get driver ID for POD record
    let driverId: string;

    // Authorization check for DRIVER role
    if (userContext.role === 'DRIVER') {
      if (!order.assignedRun || !order.assignedRun.driver || order.assignedRun.driver.userId !== userContext.id) {
        throw new AppError(403, 'Drivers can only submit POD for orders in their assigned runs');
      }
      driverId = order.assignedRun.driver.id;
    } else {
      // Admin/Dispatcher - need to get driver from run
      if (!order.assignedRun || !order.assignedRun.driverId) {
        throw new AppError(400, 'Order must be assigned to a driver to submit POD');
      }
      driverId = order.assignedRun.driverId;
    }

    // Use transaction to update order and create POD record
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Create ProofOfDelivery record
      await tx.proofOfDelivery.create({
        data: {
          orderId: id,
          runId: order.assignedRunId,
          driverId,
          recipientName: data.recipientName,
          recipientRelationship: data.recipientRelationship,
          signatureUrl: data.signatureUrl,
          photos: data.photos || [],
          notes: data.notes,
          deliveredAt: new Date(),
        },
      });

      // 2. Update order status
      return tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.delivered, // FIXED: lowercase enum
          actualDeliveryTime: new Date(), // FIXED: use actualDeliveryTime not deliveredAt
        },
        include: {
          customer: true,
          deliveryAddress: true, // FIXED: Include address
          proofOfDelivery: true,
        },
      });
    });

    logger.info('Proof of delivery submitted', {
      orderId: id,
      driverId,
      hasSignature: !!data.signatureUrl,
      photoCount: data.photos?.length || 0,
    });

    return updatedOrder;
  }

  /**
   * Mark order as delivered (without proof)
   * FIXED: Uses actualDeliveryTime field
   */
  async markAsDelivered(id: string, userContext: { id: string; role: string }): Promise<Order> {
    // Single fetch with run and driver for authorization
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        assignedRun: {
          include: {
            driver: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    // Authorization check for DRIVER role
    if (userContext.role === 'DRIVER') {
      if (!order.assignedRun || !order.assignedRun.driver || order.assignedRun.driver.userId !== userContext.id) {
        throw new AppError(403, 'Drivers can only mark orders as delivered in their assigned runs');
      }
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.delivered, // FIXED: lowercase enum
        actualDeliveryTime: new Date(), // FIXED: use actualDeliveryTime
      },
      include: {
        customer: true,
        deliveryAddress: true, // FIXED: Include address
      },
    });

    logger.info('Order marked as delivered', { orderId: id });

    return updatedOrder;
  }

  /**
   * Mark order as failed with reason
   * FIXED: Uses lowercase enum values
   */
  async markAsFailed(
    id: string,
    failureReason: string | undefined,
    userContext: { id: string; role: string }
  ): Promise<Order> {
    // Single fetch with run and driver for authorization
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        assignedRun: {
          include: {
            driver: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    // Authorization check for DRIVER role
    if (userContext.role === 'DRIVER') {
      if (!order.assignedRun || !order.assignedRun.driver || order.assignedRun.driver.userId !== userContext.id) {
        throw new AppError(403, 'Drivers can only mark orders as failed in their assigned runs');
      }
    }

    // Update order
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.failed, // FIXED: lowercase enum
        failureReason, // FIXED: schema has failureReason field
      },
      include: {
        customer: true,
        deliveryAddress: true, // FIXED: Include address
      },
    });

    logger.info('Order marked as failed', { orderId: id, reason: failureReason });

    return updatedOrder;
  }
}

export default new OrdersService();

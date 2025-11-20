import prisma from '@config/database';
import logger from '@config/logger';
import { AppError, createAppError } from '@/middleware/errorHandler';
import { Order, OrderType, OrderStatus, Prisma } from '@prisma/client';
import type { CreateOrderInput, UpdateOrderInput } from './orders.types';
import { normalizePagination } from '@/utils/pagination';
import { geocodeAddressToWKT } from '@/utils/geocoding';

export class OrdersService {
  /**
   * Create a new order with automatic geocoding
   * @param input - Order creation data including customer, address, and items
   * @returns Promise resolving to the created order
   * @throws {AppError} If order creation fails
   */
  async createOrder(input: CreateOrderInput): Promise<Order> {
    try {
      // Find or create customer
      const customer = await prisma.customer.upsert({
        where: {
          email: input.customer.email || `noemail_${Date.now()}@temp.local`,
        },
        update: {
          firstName: input.customer.firstName,
          lastName: input.customer.lastName,
          phone: input.customer.phone,
        },
        create: {
          email: input.customer.email,
          phone: input.customer.phone,
          firstName: input.customer.firstName,
          lastName: input.customer.lastName,
        },
      });

      // Geocode address
      const fullAddress = `${input.address.line1}, ${input.address.city}, ${input.address.province} ${input.address.postalCode}, ${input.address.country || 'CA'}`;
      const { locationWKT, geocoded } = await geocodeAddressToWKT(
        fullAddress,
        input.address.country || 'CA'
      );

      // Create order
      const order = await prisma.order.create({
        data: {
          orderNumber: input.orderNumber,
          type: input.type,
          status: OrderStatus.PENDING,
          customerId: customer.id,
          addressLine1: input.address.line1,
          addressLine2: input.address.line2,
          city: input.address.city,
          province: input.address.province,
          postalCode: input.address.postalCode,
          country: input.address.country || 'CA',
          // Note: location field removed - Order model uses deliveryAddressId instead
          // TODO: Fix this service to create Address record and link via deliveryAddressId
          geocoded,
          geocodedAt: geocoded ? new Date() : null,
          scheduledDate: input.scheduledDate,
          timeWindowStart: input.timeWindowStart,
          timeWindowEnd: input.timeWindowEnd,
          items: input.items as unknown as Prisma.InputJsonValue,
          notes: input.notes,
          specialInstructions: input.specialInstructions,
        },
        include: {
          customer: true,
        },
      });

      logger.info('Order created', { orderId: order.id, orderNumber: order.orderNumber });

      return order;
    } catch (error) {
      logger.error('Failed to create order', { input, error });
      throw createAppError(500, 'Failed to create order', error);
    }
  }

  /**
   * Get order by ID
   * @param id - Order ID
   * @returns Promise resolving to the order
   * @throws {AppError} 404 if order not found
   */
  async getOrderById(id: string): Promise<Order> {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        assignedRun: {
          include: {
            driver: true,
            vehicle: true,
          },
        },
      },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    return order;
  }

  /**
   * List orders with filters and pagination
   * @param params - Filter and pagination parameters
   * @param params.status - Filter by order status
   * @param params.type - Filter by order type
   * @param params.scheduledAfter - Filter orders scheduled after this date
   * @param params.scheduledBefore - Filter orders scheduled before this date
   * @param params.page - Page number (default: 1)
   * @param params.limit - Items per page (default: 20, max: 100)
   * @returns Promise resolving to paginated orders list
   */
  async listOrders(params: {
    status?: OrderStatus;
    type?: OrderType;
    scheduledAfter?: Date;
    scheduledBefore?: Date;
    page?: number;
    limit?: number;
  }) {
    const { page, limit, skip } = normalizePagination(params);

    const where: Prisma.OrderWhereInput = {
      ...(params.status && { status: params.status }),
      ...(params.type && { type: params.type }),
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
   */
  async updateOrder(id: string, input: UpdateOrderInput): Promise<Order> {
    const order = await prisma.order.update({
      where: { id },
      data: input,
      include: {
        customer: true,
      },
    });

    logger.info('Order updated', { orderId: id });

    return order;
  }

  /**
   * Delete order
   */
  async deleteOrder(id: string): Promise<void> {
    await prisma.order.delete({
      where: { id },
    });

    logger.info('Order deleted', { orderId: id });
  }

  /**
   * Get unassigned orders ready for routing
   */
  async getUnassignedOrders(scheduledDate: Date): Promise<Order[]> {
    const startOfDay = new Date(scheduledDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(scheduledDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    return prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        assignedRunId: null,
        geocoded: true, // Only geocoded orders can be routed
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        customer: true,
      },
      orderBy: {
        timeWindowStart: 'asc',
      },
    });
  }

  /**
   * Submit proof of delivery for an order
   */
  async submitProofOfDelivery(
    id: string,
    data: {
      signatureUrl?: string;
      photoUrls?: string[];
      deliveryNotes?: string;
      recipientName?: string;
    },
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
        throw new AppError(403, 'Drivers can only submit POD for orders in their assigned runs');
      }
    }

    // Update order with POD data
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
        signatureUrl: data.signatureUrl,
        photoUrls: data.photoUrls as unknown as Prisma.InputJsonValue,
        deliveryNotes: data.deliveryNotes,
      },
      include: {
        customer: true,
      },
    });

    logger.info('Proof of delivery submitted', {
      orderId: id,
      hasSignature: !!data.signatureUrl,
      photoCount: data.photoUrls?.length || 0,
    });

    return updatedOrder;
  }

  /**
   * Mark order as delivered (without proof)
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
        status: OrderStatus.DELIVERED,
        deliveredAt: new Date(),
      },
      include: {
        customer: true,
      },
    });

    logger.info('Order marked as delivered', { orderId: id });

    return updatedOrder;
  }

  /**
   * Mark order as failed with reason
   */
  async markAsFailed(id: string, failureReason: string | undefined, userContext: { id: string; role: string }): Promise<Order> {
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
        status: OrderStatus.FAILED,
        deliveryNotes: failureReason,
      },
      include: {
        customer: true,
      },
    });

    logger.info('Order marked as failed', { orderId: id, reason: failureReason });

    return updatedOrder;
  }
}

export default new OrdersService();

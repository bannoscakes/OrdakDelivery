import prisma from '@config/database';
import logger from '@config/logger';
import { AppError } from '@/middleware/errorHandler';
import geocodingService from '@/modules/geocoding/geocoding.service';
import { Order, OrderType, OrderStatus, Prisma } from '@prisma/client';

interface CreateOrderInput {
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
  items: unknown;
  notes?: string;
  specialInstructions?: string;
}

interface UpdateOrderInput {
  status?: OrderStatus;
  scheduledDate?: Date;
  timeWindowStart?: Date;
  timeWindowEnd?: Date;
  notes?: string;
  specialInstructions?: string;
}

export class OrdersService {
  /**
   * Create a new order with automatic geocoding
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

      let geocoded = false;
      let locationWKT: string | undefined;

      try {
        const geocodeResult = await geocodingService.geocodeAddress(fullAddress, {
          country: input.address.country || 'CA',
        });

        // Create WKT Point for PostGIS
        // Format: POINT(longitude latitude)
        locationWKT = `POINT(${geocodeResult.coordinates.longitude} ${geocodeResult.coordinates.latitude})`;
        geocoded = true;

        logger.info('Order address geocoded', {
          address: fullAddress,
          coordinates: geocodeResult.coordinates,
        });
      } catch (error) {
        logger.warn('Failed to geocode order address', { address: fullAddress, error });
        // Continue without geocoding - can be done later
      }

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
          ...(locationWKT && {
            location: Prisma.raw(`ST_GeomFromText('${locationWKT}', 4326)`),
          }),
          geocoded,
          geocodedAt: geocoded ? new Date() : null,
          scheduledDate: input.scheduledDate,
          timeWindowStart: input.timeWindowStart,
          timeWindowEnd: input.timeWindowEnd,
          items: input.items as Prisma.InputJsonValue,
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
      throw new AppError(500, 'Failed to create order');
    }
  }

  /**
   * Get order by ID
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
   */
  async listOrders(params: {
    status?: OrderStatus;
    type?: OrderType;
    scheduledAfter?: Date;
    scheduledBefore?: Date;
    page?: number;
    limit?: number;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

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
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(scheduledDate);
    endOfDay.setHours(23, 59, 59, 999);

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
}

export default new OrdersService();

import prisma from '@config/database';
import logger from '@config/logger';
import { AppError } from '@/middleware/errorHandler';
import geocodingService from '@/modules/geocoding/geocoding.service';
import { OrderType, OrderStatus, Prisma } from '@prisma/client';

interface ShopifyAddress {
  address1: string;
  address2?: string;
  city: string;
  province: string;
  zip: string;
  country_code: string;
  phone?: string;
}

interface ShopifyCustomer {
  id: number;
  email?: string;
  phone?: string;
  first_name: string;
  last_name: string;
}

interface ShopifyLineItem {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  price: string;
}

interface ShopifyOrder {
  id: number;
  name: string; // e.g., "#1001"
  email?: string;
  created_at: string;
  customer?: ShopifyCustomer;
  shipping_address?: ShopifyAddress;
  line_items: ShopifyLineItem[];
  note?: string;
  note_attributes?: Array<{ name: string; value: string }>;
  tags?: string;
}

export class ShopifyService {
  /**
   * Process order created webhook
   */
  async handleOrderCreated(shopifyOrder: ShopifyOrder) {
    try {
      logger.info('Processing Shopify order', {
        shopifyOrderId: shopifyOrder.id,
        orderName: shopifyOrder.name,
      });

      // Check if order already exists
      const existing = await prisma.order.findUnique({
        where: { shopifyOrderId: String(shopifyOrder.id) },
      });

      if (existing) {
        logger.warn('Order already exists, skipping', { shopifyOrderId: shopifyOrder.id });
        return existing;
      }

      // Extract delivery metadata from note_attributes
      const deliveryDate = this.extractNoteAttribute(shopifyOrder, 'delivery_date');
      const deliveryTimeStart = this.extractNoteAttribute(shopifyOrder, 'delivery_time_start');
      const deliveryTimeEnd = this.extractNoteAttribute(shopifyOrder, 'delivery_time_end');
      const deliveryType = this.extractNoteAttribute(shopifyOrder, 'delivery_type');

      // Determine order type
      const orderType: OrderType =
        deliveryType?.toLowerCase() === 'pickup' ? OrderType.PICKUP : OrderType.DELIVERY;

      // Use shipping address or customer default
      const address = shopifyOrder.shipping_address;

      if (!address) {
        throw new AppError(400, 'Order has no shipping address');
      }

      // Create or update customer
      const customer = await prisma.customer.upsert({
        where: {
          email:
            shopifyOrder.customer?.email ||
            shopifyOrder.email ||
            `shopify_${shopifyOrder.id}@temp.local`,
        },
        update: {
          firstName: shopifyOrder.customer?.first_name || 'Unknown',
          lastName: shopifyOrder.customer?.last_name || 'Customer',
          phone: shopifyOrder.customer?.phone || address.phone,
        },
        create: {
          email: shopifyOrder.customer?.email || shopifyOrder.email,
          firstName: shopifyOrder.customer?.first_name || 'Unknown',
          lastName: shopifyOrder.customer?.last_name || 'Customer',
          phone: shopifyOrder.customer?.phone || address.phone,
        },
      });

      // Geocode address
      const fullAddress = `${address.address1}, ${address.city}, ${address.province} ${address.zip}, ${address.country_code}`;

      let geocoded = false;
      let locationWKT: string | undefined;

      try {
        const geocodeResult = await geocodingService.geocodeAddress(fullAddress, {
          country: address.country_code,
        });

        locationWKT = `POINT(${geocodeResult.coordinates.longitude} ${geocodeResult.coordinates.latitude})`;
        geocoded = true;
      } catch (error) {
        logger.warn('Failed to geocode Shopify order address', { address: fullAddress, error });
      }

      // Parse delivery date
      const scheduledDate = deliveryDate
        ? new Date(deliveryDate)
        : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to tomorrow

      const timeWindowStart = deliveryTimeStart ? new Date(deliveryTimeStart) : undefined;
      const timeWindowEnd = deliveryTimeEnd ? new Date(deliveryTimeEnd) : undefined;

      // Create order
      const order = await prisma.order.create({
        data: {
          orderNumber: shopifyOrder.name.replace('#', 'ORD-'),
          shopifyOrderId: String(shopifyOrder.id),
          shopifyOrderName: shopifyOrder.name,
          type: orderType,
          status: OrderStatus.PENDING,
          customerId: customer.id,
          addressLine1: address.address1,
          addressLine2: address.address2,
          city: address.city,
          province: address.province,
          postalCode: address.zip,
          country: address.country_code,
          ...(locationWKT && {
            location: Prisma.sql`ST_GeomFromText(${locationWKT}, 4326)`,
          }),
          geocoded,
          geocodedAt: geocoded ? new Date() : null,
          scheduledDate,
          timeWindowStart,
          timeWindowEnd,
          items: shopifyOrder.line_items as Prisma.InputJsonValue,
          notes: shopifyOrder.note,
        },
        include: {
          customer: true,
        },
      });

      logger.info('Shopify order imported successfully', {
        orderId: order.id,
        shopifyOrderId: shopifyOrder.id,
        orderNumber: order.orderNumber,
      });

      return order;
    } catch (error) {
      logger.error('Failed to process Shopify order', { shopifyOrder, error });
      throw error;
    }
  }

  /**
   * Handle order updated webhook
   */
  async handleOrderUpdated(shopifyOrder: ShopifyOrder) {
    try {
      const order = await prisma.order.findUnique({
        where: { shopifyOrderId: String(shopifyOrder.id) },
      });

      if (!order) {
        logger.warn('Order not found for update, creating new', {
          shopifyOrderId: shopifyOrder.id,
        });
        return this.handleOrderCreated(shopifyOrder);
      }

      // Update order details if needed
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          items: shopifyOrder.line_items as Prisma.InputJsonValue,
          notes: shopifyOrder.note,
        },
      });

      logger.info('Shopify order updated', { orderId: order.id });

      return updated;
    } catch (error) {
      logger.error('Failed to update Shopify order', { shopifyOrder, error });
      throw error;
    }
  }

  /**
   * Handle order cancelled webhook
   */
  async handleOrderCancelled(shopifyOrder: ShopifyOrder) {
    try {
      const order = await prisma.order.findUnique({
        where: { shopifyOrderId: String(shopifyOrder.id) },
      });

      if (!order) {
        logger.warn('Order not found for cancellation', { shopifyOrderId: shopifyOrder.id });
        return;
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
        },
      });

      logger.info('Shopify order cancelled', { orderId: order.id });
    } catch (error) {
      logger.error('Failed to cancel Shopify order', { shopifyOrder, error });
      throw error;
    }
  }

  /**
   * Extract custom attribute from order metadata
   */
  private extractNoteAttribute(order: ShopifyOrder, name: string): string | undefined {
    if (!order.note_attributes) return undefined;

    const attr = order.note_attributes.find((a) => a.name === name);
    return attr?.value;
  }
}

export default new ShopifyService();

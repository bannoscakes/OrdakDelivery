import prisma from '@config/database';
import logger from '@config/logger';
import { AppError } from '@/middleware/errorHandler';
import { OrderType, OrderStatus, Prisma, Customer, Address } from '@prisma/client';
import { geocodeAddressToWKT } from '@/utils/geocoding';
import { MS_PER_DAY } from '@/constants/time';

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
  financial_status?: string;
  fulfillment_status?: string;
}

export class ShopifyService {
  /**
   * Process order created webhook
   * FIXED: Uses externalId/externalSource, transaction-based creation, correct field names
   */
  async handleOrderCreated(shopifyOrder: ShopifyOrder) {
    try {
      logger.info('Processing Shopify order', {
        shopifyOrderId: shopifyOrder.id,
        orderName: shopifyOrder.name,
      });

      // FIXED: Check using externalId + externalSource pattern
      const existing = await prisma.order.findFirst({
        where: {
          externalId: String(shopifyOrder.id),
          externalSource: 'shopify',
        },
      });

      if (existing) {
        logger.warn('Order already exists, skipping', {
          shopifyOrderId: shopifyOrder.id,
          orderId: existing.id,
        });
        return existing;
      }

      // Extract delivery metadata from note_attributes
      const deliveryDate = this.extractNoteAttribute(shopifyOrder, 'delivery_date');
      const deliveryTimeStart = this.extractNoteAttribute(shopifyOrder, 'delivery_time_start');
      const deliveryTimeEnd = this.extractNoteAttribute(shopifyOrder, 'delivery_time_end');
      const deliveryType = this.extractNoteAttribute(shopifyOrder, 'delivery_type');

      // Determine order type
      const orderType: OrderType =
        deliveryType?.toLowerCase() === 'pickup' ? OrderType.pickup : OrderType.delivery;

      // Use shipping address
      const shippingAddress = shopifyOrder.shipping_address;

      if (!shippingAddress) {
        throw new AppError(400, 'Order has no shipping address');
      }

      // FIXED: Move geocoding OUTSIDE transaction
      let locationWKT: string | null = null;
      let geocodingSucceeded = false;

      try {
        const fullAddress = `${shippingAddress.address1}, ${shippingAddress.city}, ${shippingAddress.province} ${shippingAddress.zip}, ${shippingAddress.country_code}`;
        const geocodeResult = await geocodeAddressToWKT(fullAddress, shippingAddress.country_code);
        locationWKT = geocodeResult.locationWKT;
        geocodingSucceeded = geocodeResult.geocoded;
      } catch (geocodeError) {
        logger.warn('Geocoding failed for Shopify order, continuing without location', {
          shopifyOrderId: shopifyOrder.id,
          error: geocodeError instanceof Error ? geocodeError.message : String(geocodeError),
        });
      }

      // Parse delivery date and time windows
      const scheduledDate = deliveryDate
        ? new Date(deliveryDate)
        : new Date(Date.now() + MS_PER_DAY); // Default to tomorrow

      const deliveryWindowStart = deliveryTimeStart ? new Date(deliveryTimeStart) : undefined;
      const deliveryWindowEnd = deliveryTimeEnd ? new Date(deliveryTimeEnd) : undefined;

      // FIXED: Use transaction for atomicity (Customer + Address + Order)
      const order = await prisma.$transaction(async (tx) => {
        // 1. Find or create customer
        // FIXED: Avoid undefined in where clause
        let customer: Customer;

        const customerEmail =
          shopifyOrder.customer?.email ||
          shopifyOrder.email ||
          `shopify_${shopifyOrder.id}@temp.local`;

        const existingCustomer = await tx.customer.findUnique({
          where: { email: customerEmail },
        });

        if (existingCustomer) {
          // Update existing customer
          customer = await tx.customer.update({
            where: { id: existingCustomer.id },
            data: {
              firstName: shopifyOrder.customer?.first_name || 'Unknown',
              lastName: shopifyOrder.customer?.last_name || 'Customer',
              phone: shopifyOrder.customer?.phone || shippingAddress.phone,
              // Store Shopify customer ID in notes or metadata if needed
            },
          });
        } else {
          // Create new customer
          customer = await tx.customer.create({
            data: {
              email: customerEmail,
              firstName: shopifyOrder.customer?.first_name || 'Unknown',
              lastName: shopifyOrder.customer?.last_name || 'Customer',
              phone: shopifyOrder.customer?.phone || shippingAddress.phone,
              externalId: shopifyOrder.customer ? String(shopifyOrder.customer.id) : undefined,
              externalSource: 'shopify',
            },
          });
        }

        // 2. Create Address record with geometry if geocoding succeeded
        let address: Address;

        if (geocodingSucceeded && locationWKT) {
          // Create address without geometry first
          const tempAddress = await tx.address.create({
            data: {
              customerId: customer.id,
              line1: shippingAddress.address1,
              line2: shippingAddress.address2,
              city: shippingAddress.city,
              stateProvince: shippingAddress.province, // FIXED: was province
              postalCode: shippingAddress.zip,
              country: shippingAddress.country_code,
              geocodedAt: new Date(),
            },
          });

          // Update with geometry using raw query
          await tx.$executeRaw`
            UPDATE addresses
            SET location = ST_GeomFromText(${locationWKT}, 4326)
            WHERE id = ${tempAddress.id}::uuid
          `;

          // Fetch complete address
          address = (await tx.address.findUnique({
            where: { id: tempAddress.id },
          }))!;
        } else {
          // Create address without geometry
          address = await tx.address.create({
            data: {
              customerId: customer.id,
              line1: shippingAddress.address1,
              line2: shippingAddress.address2,
              city: shippingAddress.city,
              stateProvince: shippingAddress.province,
              postalCode: shippingAddress.zip,
              country: shippingAddress.country_code,
            },
          });
        }

        // 3. Create Order
        const createdOrder = await tx.order.create({
          data: {
            orderNumber: shopifyOrder.name.replace('#', 'ORD-'),
            externalId: String(shopifyOrder.id), // FIXED: Use externalId instead of shopifyOrderId
            externalSource: 'shopify', // FIXED: Set externalSource
            externalMetadata: {
              // Store Shopify-specific data
              shopifyOrderName: shopifyOrder.name,
              financialStatus: shopifyOrder.financial_status,
              fulfillmentStatus: shopifyOrder.fulfillment_status,
              tags: shopifyOrder.tags,
              items: shopifyOrder.line_items, // Store line items in metadata
            } as Prisma.InputJsonValue,
            type: orderType,
            status: OrderStatus.pending, // FIXED: lowercase enum
            customerId: customer.id,
            deliveryAddressId: address.id, // FIXED: Use deliveryAddressId relation
            scheduledDate,
            deliveryWindowStart, // FIXED: renamed from timeWindowStart
            deliveryWindowEnd, // FIXED: renamed from timeWindowEnd
            notes: shopifyOrder.note,
          },
          include: {
            customer: true,
            deliveryAddress: true, // FIXED: Include address relation
          },
        });

        return createdOrder;
      });

      logger.info('Shopify order imported successfully', {
        orderId: order.id,
        shopifyOrderId: shopifyOrder.id,
        orderNumber: order.orderNumber,
        geocoded: geocodingSucceeded,
      });

      return order;
    } catch (error) {
      // FIXED: Remove PII from error logs
      logger.error('Failed to process Shopify order', {
        shopifyOrderId: shopifyOrder.id,
        shopifyOrderName: shopifyOrder.name,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Handle order updated webhook
   * FIXED: Uses externalId/externalSource pattern
   */
  async handleOrderUpdated(shopifyOrder: ShopifyOrder) {
    try {
      // FIXED: Find by externalId + externalSource
      const order = await prisma.order.findFirst({
        where: {
          externalId: String(shopifyOrder.id),
          externalSource: 'shopify',
        },
      });

      if (!order) {
        logger.warn('Order not found for update, creating new', {
          shopifyOrderId: shopifyOrder.id,
        });
        return this.handleOrderCreated(shopifyOrder);
      }

      // Update order metadata (items, notes, Shopify status)
      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          externalMetadata: {
            shopifyOrderName: shopifyOrder.name,
            financialStatus: shopifyOrder.financial_status,
            fulfillmentStatus: shopifyOrder.fulfillment_status,
            tags: shopifyOrder.tags,
            items: shopifyOrder.line_items,
          } as Prisma.InputJsonValue,
          notes: shopifyOrder.note,
        },
        include: {
          customer: true,
          deliveryAddress: true,
        },
      });

      logger.info('Shopify order updated', {
        orderId: order.id,
        shopifyOrderId: shopifyOrder.id,
      });

      return updated;
    } catch (error) {
      // FIXED: Remove PII from error logs
      logger.error('Failed to update Shopify order', {
        shopifyOrderId: shopifyOrder.id,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Handle order cancelled webhook
   * FIXED: Uses externalId/externalSource and lowercase enum
   */
  async handleOrderCancelled(shopifyOrder: ShopifyOrder) {
    try {
      // FIXED: Find by externalId + externalSource
      const order = await prisma.order.findFirst({
        where: {
          externalId: String(shopifyOrder.id),
          externalSource: 'shopify',
        },
      });

      if (!order) {
        logger.warn('Order not found for cancellation', {
          shopifyOrderId: shopifyOrder.id,
        });
        return;
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.cancelled, // FIXED: lowercase enum
        },
      });

      logger.info('Shopify order cancelled', {
        orderId: order.id,
        shopifyOrderId: shopifyOrder.id,
      });
    } catch (error) {
      // FIXED: Remove PII from error logs
      logger.error('Failed to cancel Shopify order', {
        shopifyOrderId: shopifyOrder.id,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * OUTBOUND: Update Shopify order status
   * Call this when order status changes in our system
   */
  async updateShopifyOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          externalId: true,
          externalSource: true,
        },
      });

      if (!order || order.externalSource !== 'shopify' || !order.externalId) {
        logger.debug('Order is not from Shopify, skipping status update', { orderId });
        return;
      }

      // TODO: Implement Shopify API call to update order
      // This would use @shopify/shopify-api SDK
      logger.info('Would update Shopify order status', {
        orderId,
        shopifyOrderId: order.externalId,
        newStatus: status,
      });

      // Placeholder for actual implementation:
      // const shopify = await getShopifyClient();
      // await shopify.rest.Order.update({
      //   session,
      //   id: order.externalId,
      //   note_attributes: [
      //     { name: 'internal_status', value: status }
      //   ]
      // });
    } catch (error) {
      logger.error('Failed to update Shopify order status', {
        orderId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - this is a non-critical outbound sync
    }
  }

  /**
   * OUTBOUND: Mark Shopify order as fulfilled
   * Call this when order is delivered
   */
  async fulfillShopifyOrder(
    orderId: string,
    trackingUrl?: string,
    trackingNumber?: string
  ): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          externalId: true,
          externalSource: true,
          orderNumber: true,
        },
      });

      if (!order || order.externalSource !== 'shopify' || !order.externalId) {
        logger.debug('Order is not from Shopify, skipping fulfillment', { orderId });
        return;
      }

      // TODO: Implement Shopify Fulfillment API call
      logger.info('Would fulfill Shopify order', {
        orderId,
        shopifyOrderId: order.externalId,
        trackingUrl,
        trackingNumber,
      });

      // Placeholder for actual implementation:
      // const shopify = await getShopifyClient();
      // const fulfillment = await shopify.rest.Fulfillment.create({
      //   session,
      //   order_id: order.externalId,
      //   location_id: WAREHOUSE_LOCATION_ID,
      //   tracking_number: trackingNumber,
      //   tracking_url: trackingUrl,
      //   notify_customer: true,
      // });
    } catch (error) {
      logger.error('Failed to fulfill Shopify order', {
        orderId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - this is a non-critical outbound sync
    }
  }

  /**
   * OUTBOUND: Add tracking information to Shopify order
   * Call this when tracking URL is available
   */
  async addTrackingToShopifyOrder(
    orderId: string,
    trackingUrl: string,
    trackingNumber?: string
  ): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          externalId: true,
          externalSource: true,
        },
      });

      if (!order || order.externalSource !== 'shopify' || !order.externalId) {
        logger.debug('Order is not from Shopify, skipping tracking update', { orderId });
        return;
      }

      // TODO: Implement Shopify Tracking API call
      logger.info('Would add tracking to Shopify order', {
        orderId,
        shopifyOrderId: order.externalId,
        trackingUrl,
        trackingNumber,
      });

      // Placeholder for actual implementation:
      // Update existing fulfillment with tracking info
      // Or create new fulfillment with tracking
    } catch (error) {
      logger.error('Failed to add tracking to Shopify order', {
        orderId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * OUTBOUND: Upload proof of delivery photos to Shopify
   * Call this when POD is submitted
   */
  async uploadPODToShopify(orderId: string, photoUrls: string[], signature?: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          externalId: true,
          externalSource: true,
        },
      });

      if (!order || order.externalSource !== 'shopify' || !order.externalId) {
        logger.debug('Order is not from Shopify, skipping POD upload', { orderId });
        return;
      }

      // TODO: Implement POD upload to Shopify
      // Could use order notes, metafields, or file attachments
      logger.info('Would upload POD to Shopify order', {
        orderId,
        shopifyOrderId: order.externalId,
        photoCount: photoUrls.length,
        hasSignature: !!signature,
      });

      // Placeholder for actual implementation:
      // Option 1: Add note to order with photo URLs
      // Option 2: Use Shopify Metafields to attach files
      // Option 3: Use Shopify Admin API to attach files
    } catch (error) {
      logger.error('Failed to upload POD to Shopify', {
        orderId,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
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

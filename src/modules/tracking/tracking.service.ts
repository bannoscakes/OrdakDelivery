/**
 * Tracking Service
 *
 * Handles public order tracking functionality.
 * Provides customer-facing tracking information without authentication.
 * Phase 1: Basic tracking info with timeline and delivery window.
 */

import prisma from '@config/database';
import logger from '@config/logger';
import { createAppError } from '@/middleware/errorHandler';
import config from '@config/env';
import type { OrderStatus } from '@prisma/client';
import type { TrackingInfo, TimelineEvent, TrackingUrlResponse } from './tracking.types';

// =====================================================
// SERVICE CLASS
// =====================================================

export class TrackingService {
  /**
   * Get tracking information by tracking number (PUBLIC - no auth required)
   *
   * @param trackingNumber - Unique tracking number
   * @returns Tracking information
   * @throws {AppError} If tracking number not found
   */
  async getTrackingInfo(trackingNumber: string): Promise<TrackingInfo> {
    logger.info('Fetching tracking info', { trackingNumber });

    try {
      const order = await prisma.order.findUnique({
        where: { trackingNumber },
        include: {
          deliveryAddress: true,
          customer: {
            select: {
              firstName: true,
              // Don't expose email, phone, or other sensitive customer data publicly
            },
          },
          runOrders: {
            include: {
              run: {
                include: {
                  driver: {
                    select: {
                      firstName: true,
                      lastName: true,
                      // Don't expose driver phone publicly
                    },
                  },
                  vehicle: {
                    select: {
                      make: true,
                      model: true,
                      color: true,
                      licensePlate: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          proofOfDelivery: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!order) {
        throw createAppError(404, 'Tracking number not found');
      }

      // Get the most recent run assignment
      const activeRun = order.runOrders[0]?.run;
      const pod = order.proofOfDelivery[0];

      // Build tracking info response
      const trackingInfo: TrackingInfo = {
        trackingNumber: order.trackingNumber,
        orderNumber: order.orderNumber,

        // Status
        status: order.status,
        customerStatus: this.getCustomerFriendlyStatus(order.status),

        // Delivery window
        estimatedArrival:
          order.estimatedArrivalStart && order.estimatedArrivalEnd
            ? {
                start: order.estimatedArrivalStart,
                end: order.estimatedArrivalEnd,
                displayText: this.formatTimeWindow(
                  order.estimatedArrivalStart,
                  order.estimatedArrivalEnd
                ),
              }
            : null,

        // Delivery address (partial - no customer name for privacy)
        deliveryAddress: {
          addressLine1: order.deliveryAddress.line1,
          city: order.deliveryAddress.city,
          stateProvince: order.deliveryAddress.stateProvince || '',
          postalCode: order.deliveryAddress.postalCode,
          // Coordinates for map display (Phase 2)
          latitude: order.deliveryAddress.latitude?.toNumber() || 0,
          longitude: order.deliveryAddress.longitude?.toNumber() || 0,
        },

        // Driver info (if assigned)
        driver: activeRun?.driver
          ? {
              firstName: activeRun.driver.firstName,
              photoUrl: null, // Future: driver photo
              currentLocation: null, // Phase 2: Real-time location
              isOnTheWay: activeRun.status === 'in_progress',
            }
          : null,

        // Vehicle info (if assigned)
        vehicle: activeRun?.vehicle
          ? {
              make: activeRun.vehicle.make,
              model: activeRun.vehicle.model,
              color: activeRun.vehicle.color || 'Unknown',
              licensePlate: activeRun.vehicle.licensePlate,
            }
          : null,

        // Timeline
        timeline: this.buildTimeline(order, activeRun),

        // Delivery completed info
        completedAt: order.actualDeliveryTime,
        proofOfDelivery: pod
          ? {
              hasSignature: !!pod.signatureUrl,
              hasPhotos: (pod.photoUrls?.length || 0) > 0,
              recipientName: pod.recipientName,
            }
          : null,
      };

      logger.info('Tracking info retrieved', { trackingNumber, status: order.status });

      return trackingInfo;
    } catch (error) {
      if ((error as any).statusCode === 404) {
        throw error;
      }
      logger.error('Failed to fetch tracking info', { trackingNumber, error });
      throw createAppError(500, 'Failed to fetch tracking information', error);
    }
  }

  /**
   * Convert technical status to customer-friendly text
   *
   * @param status - Order status from database
   * @returns Customer-friendly status message
   */
  getCustomerFriendlyStatus(status: OrderStatus): string {
    const statusMap: Record<OrderStatus, string> = {
      pending: 'Order Received',
      assigned: 'Order Assigned to Driver',
      in_transit: 'Out for Delivery',
      delivered: 'Delivered',
      failed: 'Delivery Attempted',
      cancelled: 'Order Cancelled',
    };

    return statusMap[status] || 'Processing';
  }

  /**
   * Format time window for customer display
   *
   * @param start - Start of time window
   * @param end - End of time window
   * @returns Formatted string (e.g., "Monday, November 20 between 2:00PM - 4:00PM")
   */
  formatTimeWindow(start: Date, end: Date): string {
    // Format: "Monday, November 20 between 2:00PM - 4:00PM"
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    };

    const dateStr = start.toLocaleDateString('en-US', options);

    const startTime = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const endTime = end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return `${dateStr} between ${startTime} - ${endTime}`;
  }

  /**
   * Build delivery timeline for customer display
   *
   * @param order - Order with status history
   * @param activeRun - Current delivery run (if assigned)
   * @returns Array of timeline events
   */
  buildTimeline(order: any, activeRun: any): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    // Event 1: Order created
    events.push({
      status: 'created',
      title: 'Order Received',
      description: 'Your order has been received and is being processed',
      timestamp: order.createdAt,
      completed: true,
    });

    // Event 2: Driver assigned
    if (activeRun) {
      events.push({
        status: 'assigned',
        title: 'Driver Assigned',
        description: `Your order has been assigned to ${activeRun.driver?.firstName || 'a driver'}`,
        timestamp: activeRun.createdAt,
        completed: true,
      });
    }

    // Event 3: Out for delivery
    if (order.status === 'in_transit' || order.status === 'delivered') {
      events.push({
        status: 'in_transit',
        title: 'Out for Delivery',
        description: 'Your driver is on the way',
        timestamp: activeRun?.actualStartTime || order.updatedAt,
        completed: order.status === 'delivered',
      });
    }

    // Event 4: Delivered
    if (order.status === 'delivered') {
      events.push({
        status: 'delivered',
        title: 'Delivered',
        description: 'Your order has been successfully delivered',
        timestamp: order.actualDeliveryTime,
        completed: true,
      });
    }

    // Event 5: Failed delivery (if applicable)
    if (order.status === 'failed') {
      events.push({
        status: 'failed',
        title: 'Delivery Attempted',
        description: order.failureReason || 'Unable to complete delivery',
        timestamp: order.updatedAt,
        completed: true,
      });
    }

    return events;
  }

  /**
   * Generate tracking URL for order
   *
   * @param trackingNumber - Unique tracking number
   * @returns Full tracking URL
   */
  generateTrackingUrl(trackingNumber: string): string {
    const baseUrl = config.TRACKING_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/track/${trackingNumber}`;
  }

  /**
   * Update customer-facing status when order status changes
   *
   * @param orderId - Order ID
   * @param newStatus - New order status
   * @returns Updated order
   */
  async updateCustomerStatus(orderId: string, newStatus: OrderStatus): Promise<void> {
    logger.info('Updating customer status', { orderId, newStatus });

    try {
      const customerStatus = this.getCustomerFriendlyStatus(newStatus);

      await prisma.order.update({
        where: { id: orderId },
        data: {
          customerStatus,
          customerStatusUpdatedAt: new Date(),
        },
      });

      logger.info('Customer status updated', { orderId, customerStatus });
    } catch (error) {
      logger.error('Failed to update customer status', { orderId, newStatus, error });
      throw createAppError(500, 'Failed to update customer status', error);
    }
  }

  /**
   * Generate and save tracking URL for an existing order
   *
   * @param orderId - Order ID
   * @returns Tracking URL response
   */
  async generateAndSaveTrackingUrl(orderId: string): Promise<TrackingUrlResponse> {
    logger.info('Generating tracking URL', { orderId });

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { trackingNumber: true, trackingUrl: true },
      });

      if (!order) {
        throw createAppError(404, `Order ${orderId} not found`);
      }

      // Generate tracking URL
      const trackingUrl = this.generateTrackingUrl(order.trackingNumber);

      // Save to order if not already set
      if (!order.trackingUrl) {
        await prisma.order.update({
          where: { id: orderId },
          data: { trackingUrl },
        });
      }

      logger.info('Tracking URL generated', { orderId, trackingNumber: order.trackingNumber });

      return {
        trackingUrl,
        trackingNumber: order.trackingNumber,
      };
    } catch (error) {
      logger.error('Failed to generate tracking URL', { orderId, error });
      throw error;
    }
  }
}

export default new TrackingService();

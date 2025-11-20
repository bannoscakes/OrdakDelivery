/**
 * SMS Notification Service
 *
 * Handles sending SMS notifications to customers and drivers.
 * Supports Twilio integration (when enabled) and tracks all notifications in database.
 */

import prisma from '@config/database';
import logger from '@config/logger';
import { createAppError } from '@/middleware/errorHandler';
import config from '@config/env';
import type {
  SendSmsInput,
  SmsResult,
  BulkSmsInput,
  BulkSmsResult,
  DeliveryNotificationInput,
  RunAssignmentNotificationInput,
} from './sms.types';

// =====================================================
// SERVICE CLASS
// =====================================================

export class SmsService {
  private twilioClient: any = null;

  constructor() {
    // Initialize Twilio client if enabled
    if (config.TWILIO_ENABLED) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const twilio = require('twilio');
        this.twilioClient = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
        logger.info('Twilio SMS client initialized');
      } catch (error) {
        logger.warn('Twilio not available, SMS will be logged only', { error });
      }
    } else {
      logger.info('Twilio disabled, SMS will be logged only');
    }
  }

  /**
   * Send a single SMS message
   *
   * @param input - SMS input parameters
   * @returns SMS result with status
   */
  async sendSms(input: SendSmsInput): Promise<SmsResult> {
    logger.info('Sending SMS', {
      type: input.type,
      phoneNumber: input.phoneNumber,
      orderId: input.orderId,
      runId: input.runId,
    });

    try {
      // Create SMS notification record
      const notification = await prisma.smsNotification.create({
        data: {
          type: input.type as any,
          status: 'pending',
          phoneNumber: input.phoneNumber,
          recipientName: input.recipientName,
          message: input.message,
          orderId: input.orderId,
          runId: input.runId,
          scheduledDate: input.scheduledDate,
        },
      });

      // Send SMS via Twilio if enabled
      if (this.twilioClient && config.TWILIO_PHONE_NUMBER) {
        try {
          const result = await this.twilioClient.messages.create({
            body: input.message,
            from: config.TWILIO_PHONE_NUMBER,
            to: input.phoneNumber,
          });

          // Update notification with success
          await prisma.smsNotification.update({
            where: { id: notification.id },
            data: {
              status: 'sent',
              providerId: result.sid,
              providerResponse: result as any,
              sentAt: new Date(),
            },
          });

          logger.info('SMS sent successfully', {
            notificationId: notification.id,
            providerId: result.sid,
          });

          return {
            id: notification.id,
            status: 'sent',
            providerId: result.sid,
          };
        } catch (twilioError) {
          // Update notification with failure
          const errorMessage = twilioError instanceof Error ? twilioError.message : 'Unknown error';

          await prisma.smsNotification.update({
            where: { id: notification.id },
            data: {
              status: 'failed',
              error: errorMessage,
            },
          });

          logger.error('Failed to send SMS via Twilio', {
            notificationId: notification.id,
            error: twilioError,
          });

          return {
            id: notification.id,
            status: 'failed',
            error: errorMessage,
          };
        }
      } else {
        // Twilio not enabled, mark as sent (mock)
        await prisma.smsNotification.update({
          where: { id: notification.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
          },
        });

        logger.info('SMS logged (Twilio disabled)', {
          notificationId: notification.id,
          message: input.message,
        });

        return {
          id: notification.id,
          status: 'sent',
        };
      }
    } catch (error) {
      logger.error('Failed to send SMS', { input, error });
      throw createAppError(500, 'Failed to send SMS', error);
    }
  }

  /**
   * Send multiple SMS messages in bulk
   *
   * @param input - Bulk SMS input
   * @returns Summary of bulk SMS results
   */
  async sendBulkSms(input: BulkSmsInput): Promise<BulkSmsResult> {
    logger.info('Sending bulk SMS', { count: input.messages.length });

    const results: SmsResult[] = [];
    let sentMessages = 0;
    let failedMessages = 0;

    for (const message of input.messages) {
      try {
        const result = await this.sendSms(message);
        results.push(result);

        if (result.status === 'sent') {
          sentMessages++;
        } else {
          failedMessages++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        results.push({
          id: 'unknown',
          status: 'failed',
          error: errorMessage,
        });

        failedMessages++;

        logger.warn('Bulk SMS failed for message', { message, error: errorMessage });
      }
    }

    logger.info('Bulk SMS completed', {
      totalMessages: input.messages.length,
      sentMessages,
      failedMessages,
    });

    return {
      totalMessages: input.messages.length,
      sentMessages,
      failedMessages,
      results,
    };
  }

  /**
   * Send delivery notification to customer with time window
   *
   * @param input - Delivery notification parameters
   * @returns SMS result
   */
  async sendDeliveryNotification(input: DeliveryNotificationInput): Promise<SmsResult> {
    logger.info('Sending delivery notification', { orderId: input.orderId });

    // Format time window
    const startTime = input.timeWindow.start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const endTime = input.timeWindow.end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Build message
    let message = `Hi ${input.customerName}! Your delivery is scheduled for ${input.deliveryDate.toLocaleDateString()} between ${startTime} and ${endTime}.`;

    if (input.trackingUrl) {
      message += ` Track your delivery: ${input.trackingUrl}`;
    }

    message += ` Reply STOP to opt out.`;

    return this.sendSms({
      phoneNumber: input.customerPhone,
      recipientName: input.customerName,
      message,
      type: 'customer_delivery_notification',
      orderId: input.orderId,
      scheduledDate: input.deliveryDate,
    });
  }

  /**
   * Send "on the way" notification to customer
   *
   * @param orderId - Order ID
   * @param estimatedMinutes - ETA in minutes
   * @returns SMS result
   */
  async sendOnTheWayNotification(orderId: string, estimatedMinutes: number): Promise<SmsResult> {
    logger.info('Sending on the way notification', { orderId, estimatedMinutes });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
      },
    });

    if (!order) {
      throw createAppError(404, `Order ${orderId} not found`);
    }

    if (!order.customer?.phone) {
      throw createAppError(400, `Customer phone not available for order ${orderId}`);
    }

    const message = `Hi ${order.customer.firstName}! Your delivery is on the way and will arrive in approximately ${estimatedMinutes} minutes. Reply STOP to opt out.`;

    return this.sendSms({
      phoneNumber: order.customer.phone,
      recipientName: order.customer.firstName ?? undefined,
      message,
      type: 'customer_on_the_way',
      orderId,
    });
  }

  /**
   * Send "arrived" notification to customer
   *
   * @param orderId - Order ID
   * @returns SMS result
   */
  async sendArrivedNotification(orderId: string): Promise<SmsResult> {
    logger.info('Sending arrived notification', { orderId });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
      },
    });

    if (!order) {
      throw createAppError(404, `Order ${orderId} not found`);
    }

    if (!order.customer?.phone) {
      throw createAppError(400, `Customer phone not available for order ${orderId}`);
    }

    const message = `Hi ${order.customer.firstName}! Your delivery driver has arrived. Reply STOP to opt out.`;

    return this.sendSms({
      phoneNumber: order.customer.phone,
      recipientName: order.customer.firstName ?? undefined,
      message,
      type: 'customer_arrived',
      orderId,
    });
  }

  /**
   * Send "delivered" notification to customer
   *
   * @param orderId - Order ID
   * @returns SMS result
   */
  async sendDeliveredNotification(orderId: string): Promise<SmsResult> {
    logger.info('Sending delivered notification', { orderId });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
      },
    });

    if (!order) {
      throw createAppError(404, `Order ${orderId} not found`);
    }

    if (!order.customer?.phone) {
      throw createAppError(400, `Customer phone not available for order ${orderId}`);
    }

    const message = `Hi ${order.customer.firstName}! Your order has been delivered. Thank you for your business! Reply STOP to opt out.`;

    return this.sendSms({
      phoneNumber: order.customer.phone,
      recipientName: order.customer.firstName ?? undefined,
      message,
      type: 'customer_delivered',
      orderId,
    });
  }

  /**
   * Send run assignment notification to driver
   *
   * @param input - Run assignment parameters
   * @returns SMS result
   */
  async sendRunAssignmentNotification(
    input: RunAssignmentNotificationInput
  ): Promise<SmsResult> {
    logger.info('Sending run assignment notification', { runId: input.runId });

    const durationHours = Math.floor(input.estimatedDuration / 3600);
    const durationMinutes = Math.floor((input.estimatedDuration % 3600) / 60);
    const durationStr =
      durationHours > 0
        ? `${durationHours}h ${durationMinutes}m`
        : `${durationMinutes} minutes`;

    const message = `Hi ${input.driverName}! You have been assigned a delivery run for ${input.scheduledDate.toLocaleDateString()} with ${input.orderCount} stops. Estimated duration: ${durationStr}. First stop: ${input.firstStopAddress}. Check the app for details.`;

    return this.sendSms({
      phoneNumber: input.driverPhone,
      recipientName: input.driverName,
      message,
      type: 'driver_run_assigned',
      runId: input.runId,
      scheduledDate: input.scheduledDate,
    });
  }

  /**
   * Send route update notification to driver
   *
   * @param runId - Run ID
   * @param message - Custom message
   * @returns SMS result
   */
  async sendRouteUpdateNotification(runId: string, message: string): Promise<SmsResult> {
    logger.info('Sending route update notification', { runId });

    const run = await prisma.deliveryRun.findUnique({
      where: { id: runId },
      include: {
        driver: true,
      },
    });

    if (!run) {
      throw createAppError(404, `Run ${runId} not found`);
    }

    if (!run.driver?.phone) {
      throw createAppError(400, `Driver phone not available for run ${runId}`);
    }

    const fullMessage = `${message} Check the app for updated route details.`;

    return this.sendSms({
      phoneNumber: run.driver.phone,
      recipientName: `${run.driver.firstName} ${run.driver.lastName}`,
      message: fullMessage,
      type: 'driver_route_updated',
      runId,
    });
  }

  /**
   * Get SMS notification history for an order
   *
   * @param orderId - Order ID
   * @returns Array of SMS notifications
   */
  async getOrderNotifications(orderId: string) {
    return prisma.smsNotification.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get SMS notification history for a run
   *
   * @param runId - Run ID
   * @returns Array of SMS notifications
   */
  async getRunNotifications(runId: string) {
    return prisma.smsNotification.findMany({
      where: { runId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get SMS notification statistics for a date range
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Statistics summary
   */
  async getNotificationStats(startDate: Date, endDate: Date) {
    const total = await prisma.smsNotification.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const sent = await prisma.smsNotification.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'sent',
      },
    });

    const failed = await prisma.smsNotification.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'failed',
      },
    });

    const byType = await prisma.smsNotification.groupBy({
      by: ['type'],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: true,
    });

    return {
      total,
      sent,
      failed,
      successRate: total > 0 ? Math.round((sent / total) * 100) : 0,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
    };
  }
}

export default new SmsService();

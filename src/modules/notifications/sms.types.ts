/**
 * Type definitions for SMS Notification Service
 */

export interface SendSmsInput {
  phoneNumber: string;
  recipientName?: string;
  message: string;
  type: SmsType;
  orderId?: string;
  runId?: string;
  scheduledDate?: Date;
}

export type SmsType =
  | 'customer_delivery_notification'
  | 'customer_on_the_way'
  | 'customer_arrived'
  | 'customer_delivered'
  | 'driver_run_assigned'
  | 'driver_route_updated';

export interface SmsResult {
  id: string;
  status: 'sent' | 'failed';
  providerId?: string;
  error?: string;
}

export interface BulkSmsInput {
  messages: SendSmsInput[];
}

export interface BulkSmsResult {
  totalMessages: number;
  sentMessages: number;
  failedMessages: number;
  results: SmsResult[];
}

export interface DeliveryNotificationInput {
  orderId: string;
  customerPhone: string;
  customerName: string;
  deliveryDate: Date;
  timeWindow: {
    start: Date;
    end: Date;
  };
  trackingUrl?: string;
}

export interface RunAssignmentNotificationInput {
  runId: string;
  driverPhone: string;
  driverName: string;
  scheduledDate: Date;
  orderCount: number;
  estimatedDuration: number;
  firstStopAddress: string;
}

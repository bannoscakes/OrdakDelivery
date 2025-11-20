/**
 * Tracking Types
 *
 * Type definitions for public order tracking functionality.
 * Used for customer-facing tracking portal (Phase 1).
 */

import type { OrderStatus } from '@prisma/client';

// =====================================================
// TRACKING INFO (PUBLIC API RESPONSE)
// =====================================================

export interface TrackingInfo {
  trackingNumber: string;
  orderNumber: string;
  status: OrderStatus;
  customerStatus: string;
  estimatedArrival: {
    start: Date;
    end: Date;
    displayText: string;
  } | null;
  deliveryAddress: {
    addressLine1: string;
    city: string;
    stateProvince: string;
    postalCode: string;
    latitude: number;
    longitude: number;
  };
  driver: {
    firstName: string;
    photoUrl: string | null;
    currentLocation: { lat: number; lng: number } | null;
    isOnTheWay: boolean;
  } | null;
  vehicle: {
    make: string;
    model: string;
    color: string;
    licensePlate: string;
  } | null;
  timeline: TimelineEvent[];
  completedAt: Date | null;
  proofOfDelivery: {
    hasSignature: boolean;
    hasPhotos: boolean;
    recipientName: string | null;
  } | null;
}

// =====================================================
// TIMELINE EVENT
// =====================================================

export interface TimelineEvent {
  status: string;
  title: string;
  description: string;
  timestamp: Date | null;
  completed: boolean;
}

// =====================================================
// TRACKING URL GENERATION
// =====================================================

export interface TrackingUrlResponse {
  trackingUrl: string;
  trackingNumber: string;
}

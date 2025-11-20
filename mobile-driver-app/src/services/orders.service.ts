import { apiClient } from './api';
import { Order, ProofOfDelivery, Status } from '@/types';

export interface UpdateOrderStatusPayload {
  status: Status;
  notes?: string;
  actualArrival?: string;
  proofOfDelivery?: ProofOfDelivery;
}

class OrdersService {
  /**
   * Get a specific order by ID
   */
  async getOrder(orderId: string): Promise<Order> {
    const response = await apiClient.get<Order>(`/orders/${orderId}`);
    return response.data;
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, payload: UpdateOrderStatusPayload): Promise<Order> {
    const response = await apiClient.put<Order>(`/orders/${orderId}`, payload);
    return response.data;
  }

  /**
   * Mark order as in progress
   */
  async startOrder(orderId: string): Promise<Order> {
    return this.updateOrderStatus(orderId, {
      status: 'in_transit',
      actualArrival: new Date().toISOString(),
    });
  }

  /**
   * Mark order as delivered
   */
  async deliverOrder(orderId: string, proofOfDelivery: ProofOfDelivery): Promise<Order> {
    return this.updateOrderStatus(orderId, {
      status: 'delivered',
      proofOfDelivery,
    });
  }

  /**
   * Mark order as failed
   */
  async failOrder(orderId: string, reason: string): Promise<Order> {
    return this.updateOrderStatus(orderId, {
      status: 'failed',
      notes: reason,
    });
  }

  /**
   * Upload proof of delivery signature
   */
  async uploadSignature(orderId: string, signatureBase64: string): Promise<string> {
    const formData = new FormData();
    formData.append('signature', {
      uri: signatureBase64,
      type: 'image/png',
      name: `signature_${orderId}.png`,
    } as any);

    const response = await apiClient.upload<{ url: string }>(
      `/orders/${orderId}/signature`,
      formData,
    );

    return response.data.url;
  }

  /**
   * Upload proof of delivery photos
   */
  async uploadPhotos(orderId: string, photos: string[]): Promise<string[]> {
    const formData = new FormData();

    photos.forEach((photo, index) => {
      formData.append('photos', {
        uri: photo,
        type: 'image/jpeg',
        name: `photo_${orderId}_${index}.jpg`,
      } as any);
    });

    const response = await apiClient.upload<{ urls: string[] }>(
      `/orders/${orderId}/photos`,
      formData,
    );

    return response.data.urls;
  }

  /**
   * Add notes to an order
   */
  async addNotes(orderId: string, notes: string): Promise<Order> {
    const response = await apiClient.patch<Order>(`/orders/${orderId}`, { notes });
    return response.data;
  }

  /**
   * Get order navigation details
   */
  async getNavigationDetails(orderId: string): Promise<{
    order: Order;
    directions: any;
  }> {
    const response = await apiClient.get<{
      order: Order;
      directions: any;
    }>(`/orders/${orderId}/navigation`);
    return response.data;
  }
}

export const ordersService = new OrdersService();

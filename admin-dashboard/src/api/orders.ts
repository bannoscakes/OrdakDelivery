import { apiClient } from './client';
import type {
  Order,
  CreateOrderInput,
  UpdateOrderInput,
  PaginatedResponse,
  OrderStatus,
  OrderType,
} from '../types';

export const ordersApi = {
  // List orders with filters
  list: async (params?: {
    status?: OrderStatus;
    type?: OrderType;
    scheduledAfter?: string;
    scheduledBefore?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Order>> => {
    const response = await apiClient.get('/orders', { params });
    return response.data;
  },

  // Get unassigned orders for a date
  getUnassigned: async (date: string): Promise<Order[]> => {
    const response = await apiClient.get('/orders/unassigned', { params: { date } });
    return response.data.data || response.data;
  },

  // Get single order by ID
  getById: async (id: string): Promise<Order> => {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data.data || response.data;
  },

  // Create new order
  create: async (data: CreateOrderInput): Promise<Order> => {
    const response = await apiClient.post('/orders', data);
    return response.data.data || response.data;
  },

  // Update order
  update: async (id: string, data: UpdateOrderInput): Promise<Order> => {
    const response = await apiClient.put(`/orders/${id}`, data);
    return response.data.data || response.data;
  },

  // Delete order
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/orders/${id}`);
  },
};

import { apiClient } from './client';
import type {
  DeliveryRun,
  CreateDeliveryRunInput,
  UpdateDeliveryRunInput,
  AssignOrdersInput,
  OptimizeRunInput,
  PaginatedResponse,
  ApiResponse,
  RunStatus,
} from '../types';

export const deliveryRunsApi = {
  // List delivery runs with filters
  list: async (params?: {
    status?: RunStatus;
    driverId?: string;
    scheduledAfter?: string;
    scheduledBefore?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<DeliveryRun>> => {
    const response = await apiClient.get('/runs', { params });
    return response.data;
  },

  // Get single delivery run by ID
  getById: async (id: string): Promise<DeliveryRun> => {
    const response = await apiClient.get(`/runs/${id}`);
    return response.data.data || response.data;
  },

  // Create new delivery run
  create: async (data: CreateDeliveryRunInput): Promise<DeliveryRun> => {
    const response = await apiClient.post('/runs', data);
    return response.data.data || response.data;
  },

  // Update delivery run
  update: async (id: string, data: UpdateDeliveryRunInput): Promise<DeliveryRun> => {
    const response = await apiClient.put(`/runs/${id}`, data);
    return response.data.data || response.data;
  },

  // Delete delivery run
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/runs/${id}`);
  },

  // Assign orders to run
  assignOrders: async (id: string, data: AssignOrdersInput): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/runs/${id}/assign`, data);
    return response.data;
  },

  // Unassign orders from run
  unassignOrders: async (id: string, data: AssignOrdersInput): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/runs/${id}/unassign`, data);
    return response.data;
  },

  // Optimize delivery run route
  optimize: async (id: string, data: OptimizeRunInput): Promise<ApiResponse<any>> => {
    const response = await apiClient.post(`/runs/${id}/optimize`, data);
    return response.data;
  },

  // Start delivery run
  start: async (id: string): Promise<DeliveryRun> => {
    const response = await apiClient.post(`/runs/${id}/start`);
    return response.data.data || response.data;
  },

  // Complete delivery run
  complete: async (id: string): Promise<DeliveryRun> => {
    const response = await apiClient.post(`/runs/${id}/complete`);
    return response.data.data || response.data;
  },
};

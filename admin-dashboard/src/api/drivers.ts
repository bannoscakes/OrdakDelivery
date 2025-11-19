import { apiClient } from './client';
import type {
  Driver,
  CreateDriverInput,
  UpdateDriverInput,
  PaginatedResponse,
  DriverStatus,
} from '../types';

export const driversApi = {
  // List drivers with filters
  list: async (params?: {
    status?: DriverStatus;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Driver>> => {
    const response = await apiClient.get('/drivers', { params });
    return response.data;
  },

  // Get available drivers for a date
  getAvailable: async (date: string): Promise<Driver[]> => {
    const response = await apiClient.get('/drivers/available', { params: { date } });
    return response.data.data || response.data;
  },

  // Get single driver by ID
  getById: async (id: string, includeRuns?: boolean): Promise<Driver> => {
    const response = await apiClient.get(`/drivers/${id}`, {
      params: { includeRuns: includeRuns ? 'true' : undefined },
    });
    return response.data.data || response.data;
  },

  // Create new driver
  create: async (data: CreateDriverInput): Promise<Driver> => {
    const response = await apiClient.post('/drivers', data);
    return response.data.data || response.data;
  },

  // Update driver
  update: async (id: string, data: UpdateDriverInput): Promise<Driver> => {
    const response = await apiClient.put(`/drivers/${id}`, data);
    return response.data.data || response.data;
  },

  // Delete driver
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/drivers/${id}`);
  },
};

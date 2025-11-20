import { apiClient } from './client';
import type {
  Vehicle,
  CreateVehicleInput,
  UpdateVehicleInput,
  PaginatedResponse,
  VehicleType,
} from '../types';

export const vehiclesApi = {
  // List vehicles with filters
  list: async (params?: {
    type?: VehicleType;
    status?: 'active' | 'maintenance' | 'retired';
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Vehicle>> => {
    const response = await apiClient.get('/vehicles', { params });
    return response.data;
  },

  // Get available vehicles for a date
  getAvailable: async (date: string): Promise<Vehicle[]> => {
    const response = await apiClient.get('/vehicles/available', { params: { date } });
    return response.data.data || response.data;
  },

  // Get single vehicle by ID
  getById: async (id: string, includeRuns?: boolean): Promise<Vehicle> => {
    const response = await apiClient.get(`/vehicles/${id}`, {
      params: { includeRuns: includeRuns ? 'true' : undefined },
    });
    return response.data.data || response.data;
  },

  // Create new vehicle
  create: async (data: CreateVehicleInput): Promise<Vehicle> => {
    const response = await apiClient.post('/vehicles', data);
    return response.data.data || response.data;
  },

  // Update vehicle
  update: async (id: string, data: UpdateVehicleInput): Promise<Vehicle> => {
    const response = await apiClient.put(`/vehicles/${id}`, data);
    return response.data.data || response.data;
  },

  // Delete vehicle
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/vehicles/${id}`);
  },
};

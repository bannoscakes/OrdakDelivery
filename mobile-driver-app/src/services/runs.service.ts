import { apiClient } from './api';
import { DeliveryRun, PaginatedResponse, RunStatus } from '@/types';

export interface RunsQueryParams {
  status?: RunStatus;
  driverId?: string;
  scheduledAfter?: string;
  scheduledBefore?: string;
  page?: number;
  limit?: number;
}

class RunsService {
  /**
   * Get all delivery runs for the current driver
   */
  async getMyRuns(params?: RunsQueryParams): Promise<PaginatedResponse<DeliveryRun>> {
    const response = await apiClient.get<PaginatedResponse<DeliveryRun>>('/runs/my-runs', params);
    return response.data;
  }

  /**
   * Get a specific delivery run by ID
   */
  async getRun(runId: string): Promise<DeliveryRun> {
    const response = await apiClient.get<DeliveryRun>(`/runs/${runId}`);
    return response.data;
  }

  /**
   * Get today's assigned runs
   */
  async getTodayRuns(): Promise<DeliveryRun[]> {
    const today = new Date().toISOString().split('T')[0];
    const response = await apiClient.get<DeliveryRun[]>('/runs/my-runs', {
      scheduledAfter: `${today}T00:00:00Z`,
      scheduledBefore: `${today}T23:59:59Z`,
      status: 'ASSIGNED,PLANNED,IN_PROGRESS',
    });
    return response.data;
  }

  /**
   * Start a delivery run
   */
  async startRun(runId: string): Promise<DeliveryRun> {
    const response = await apiClient.post<DeliveryRun>(`/runs/${runId}/start`);
    return response.data;
  }

  /**
   * Complete a delivery run
   */
  async completeRun(runId: string): Promise<DeliveryRun> {
    const response = await apiClient.post<DeliveryRun>(`/runs/${runId}/complete`);
    return response.data;
  }

  /**
   * Get upcoming runs (next 7 days)
   */
  async getUpcomingRuns(): Promise<DeliveryRun[]> {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const response = await apiClient.get<DeliveryRun[]>('/runs/my-runs', {
      scheduledAfter: today.toISOString(),
      scheduledBefore: nextWeek.toISOString(),
      status: 'ASSIGNED,PLANNED',
    });
    return response.data;
  }

  /**
   * Get run history
   */
  async getRunHistory(page: number = 1, limit: number = 20): Promise<PaginatedResponse<DeliveryRun>> {
    const response = await apiClient.get<PaginatedResponse<DeliveryRun>>('/runs/my-runs', {
      status: 'COMPLETED',
      page,
      limit,
    });
    return response.data;
  }

  /**
   * Accept a run assignment
   */
  async acceptRun(runId: string): Promise<DeliveryRun> {
    const response = await apiClient.post<DeliveryRun>(`/runs/${runId}/accept`);
    return response.data;
  }

  /**
   * Reject a run assignment
   */
  async rejectRun(runId: string, reason?: string): Promise<void> {
    await apiClient.post(`/runs/${runId}/reject`, { reason });
  }
}

export const runsService = new RunsService();

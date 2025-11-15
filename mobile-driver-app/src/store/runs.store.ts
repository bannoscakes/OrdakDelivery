import { create } from 'zustand';
import { DeliveryRun, Location } from '@/types';
import { runsService } from '@/services/runs.service';

interface RunsState {
  runs: DeliveryRun[];
  currentRun: DeliveryRun | null;
  currentOrderIndex: number;
  isLoading: boolean;
  error: string | null;
  currentLocation: Location | null;

  // Actions
  fetchTodayRuns: () => Promise<void>;
  fetchUpcomingRuns: () => Promise<void>;
  setCurrentRun: (run: DeliveryRun) => void;
  startRun: (runId: string) => Promise<void>;
  completeRun: (runId: string) => Promise<void>;
  moveToNextOrder: () => void;
  moveToPreviousOrder: () => void;
  updateCurrentLocation: (location: Location) => void;
  refreshCurrentRun: () => Promise<void>;
  clearError: () => void;
}

export const useRunsStore = create<RunsState>((set, get) => ({
  runs: [],
  currentRun: null,
  currentOrderIndex: 0,
  isLoading: false,
  error: null,
  currentLocation: null,

  fetchTodayRuns: async () => {
    set({ isLoading: true, error: null });
    try {
      const runs = await runsService.getTodayRuns();
      set({ runs, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch runs',
        isLoading: false,
      });
    }
  },

  fetchUpcomingRuns: async () => {
    set({ isLoading: true, error: null });
    try {
      const runs = await runsService.getUpcomingRuns();
      set({ runs, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch upcoming runs',
        isLoading: false,
      });
    }
  },

  setCurrentRun: (run: DeliveryRun) => {
    set({ currentRun: run, currentOrderIndex: 0 });
  },

  startRun: async (runId: string) => {
    set({ isLoading: true, error: null });
    try {
      const run = await runsService.startRun(runId);
      set({
        currentRun: run,
        currentOrderIndex: 0,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to start run',
        isLoading: false,
      });
      throw error;
    }
  },

  completeRun: async (runId: string) => {
    set({ isLoading: true, error: null });
    try {
      await runsService.completeRun(runId);
      set({
        currentRun: null,
        currentOrderIndex: 0,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to complete run',
        isLoading: false,
      });
      throw error;
    }
  },

  moveToNextOrder: () => {
    const { currentRun, currentOrderIndex } = get();
    if (currentRun && currentOrderIndex < currentRun.orders.length - 1) {
      set({ currentOrderIndex: currentOrderIndex + 1 });
    }
  },

  moveToPreviousOrder: () => {
    const { currentOrderIndex } = get();
    if (currentOrderIndex > 0) {
      set({ currentOrderIndex: currentOrderIndex - 1 });
    }
  },

  updateCurrentLocation: (location: Location) => {
    set({ currentLocation: location });
  },

  refreshCurrentRun: async () => {
    const { currentRun } = get();
    if (!currentRun) {return;}

    try {
      const refreshedRun = await runsService.getRun(currentRun.id);
      set({ currentRun: refreshedRun });
    } catch (error) {
      console.error('Failed to refresh current run:', error);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));

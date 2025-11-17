import { create } from 'zustand';
import { Driver, AuthTokens } from '@/types';
import { authService } from '@/services/auth.service';
import { logger } from '@/utils/logger';

interface AuthState {
  driver: Driver | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  updateDriver: (driver: Driver) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  driver: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authService.login({ email, password });
      set({
        driver: response.driver,
        tokens: response.tokens,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
    } catch (error) {
      logger.error('Logout error:', error);
    } finally {
      set({
        driver: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  loadStoredAuth: async () => {
    set({ isLoading: true });
    try {
      const isAuth = await authService.isAuthenticated();
      if (isAuth) {
        const driver = await authService.getStoredDriver();
        if (driver) {
          set({
            driver,
            isAuthenticated: true,
          });
        }
      }
    } catch (error) {
      logger.error('Error loading stored auth:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateDriver: (driver: Driver) => {
    set({ driver });
  },

  clearError: () => {
    set({ error: null });
  },
}));

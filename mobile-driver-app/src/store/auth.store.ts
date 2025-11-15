import { create } from 'zustand';
import { Driver, AuthTokens } from '@/types';
import { authService } from '@/services/auth.service';

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

export const useAuthStore = create<AuthState>((set, _get) => ({
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      set({
        error: errorMessage,
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await authService.logout();

      // Always clear local state (even if server logout failed)
      set({
        driver: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: result.success ? null : result.error || 'Logout failed',
      });

      // Log warning if partial logout
      if (result.success && !result.serverLoggedOut) {
        console.warn('[AuthStore] Partial logout: server session may still be active');
      }
    } catch (error) {
      console.error('[AuthStore] Logout error:', error);

      // Clear local state anyway (logout should always succeed locally)
      set({
        driver: null,
        tokens: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Logout error',
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
      console.error('[AuthStore] Error loading stored auth:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      set({ isLoading: false, error: error instanceof Error ? error.message : 'Failed to load stored auth' });
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

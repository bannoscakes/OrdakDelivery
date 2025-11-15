import { apiClient, STORAGE_KEYS } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Driver, LoginCredentials, AuthTokens } from '@/types';

export interface LoginResponse {
  driver: Driver;
  tokens: AuthTokens;
}

export interface LogoutResult {
  success: boolean;
  localCleared: boolean;
  serverLoggedOut: boolean;
  error?: string;
}

class AuthService {
  /**
   * Login driver with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/driver/login', credentials);

    // Save tokens and driver data
    await apiClient.saveTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    await AsyncStorage.setItem(STORAGE_KEYS.DRIVER_DATA, JSON.stringify(response.data.driver));

    return response.data;
  }

  /**
   * Logout driver
   *
   * Handles both server-side session invalidation and local auth cleanup.
   * Ensures local cleanup always happens even if server call fails.
   *
   * @returns {Promise<LogoutResult>} Status of logout operation
   */
  async logout(): Promise<LogoutResult> {
    let serverLoggedOut = false;
    let localCleared = false;
    let error: string | undefined;

    // Step 1: Try to invalidate server-side session
    try {
      await apiClient.post('/auth/logout');
      serverLoggedOut = true;
    } catch (err) {
      console.error('[AuthService] Server logout failed:', {
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      error = 'Server logout failed';
    }

    // Step 2: Always clear local auth data (critical)
    try {
      await apiClient.clearAuth();
      localCleared = true;
    } catch (err) {
      const clearError = err instanceof Error ? err.message : 'Unknown error';
      console.error('[AuthService] CRITICAL: Failed to clear local auth:', clearError);

      error = `Failed to clear local auth: ${clearError}${error ? `. ${error}` : ''}`;
    }

    const success = localCleared;

    if (success && !serverLoggedOut) {
      console.warn('[AuthService] Partial logout: local cleared, server session may be active');
    }

    return {
      success,
      localCleared,
      serverLoggedOut,
      error,
    };
  }

  /**
   * Get stored driver data
   */
  async getStoredDriver(): Promise<Driver | null> {
    try {
      const driverData = await AsyncStorage.getItem(STORAGE_KEYS.DRIVER_DATA);
      if (!driverData) {
        return null;
      }

      try {
        const parsed = JSON.parse(driverData);
        return parsed;
      } catch (parseError) {
        // Corrupted data - clear it and return null
        console.error('[AuthService] Corrupted driver data detected, clearing:', {
          error: parseError instanceof Error ? parseError.message : 'Parse error',
        });

        try {
          await AsyncStorage.removeItem(STORAGE_KEYS.DRIVER_DATA);
        } catch (removeError) {
          console.error('[AuthService] Failed to remove corrupted driver data:', removeError);
        }

        return null;
      }
    } catch (error) {
      console.error('[AuthService] Error getting stored driver:', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const accessToken = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      return !!accessToken;
    } catch {
      return false;
    }
  }

  /**
   * Get current driver profile
   */
  async getProfile(): Promise<Driver> {
    const response = await apiClient.get<Driver>('/auth/profile');

    // Update stored driver data
    await AsyncStorage.setItem(STORAGE_KEYS.DRIVER_DATA, JSON.stringify(response.data));

    return response.data;
  }

  /**
   * Update driver profile
   */
  async updateProfile(data: Partial<Driver>): Promise<Driver> {
    const response = await apiClient.put<Driver>('/auth/profile', data);

    // Update stored driver data
    await AsyncStorage.setItem(STORAGE_KEYS.DRIVER_DATA, JSON.stringify(response.data));

    return response.data;
  }

  /**
   * Change password
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      oldPassword,
      newPassword,
    });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });
  }
}

export const authService = new AuthService();

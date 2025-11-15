import { apiClient, STORAGE_KEYS } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Driver, LoginCredentials, AuthTokens } from '@/types';

export interface LoginResponse {
  driver: Driver;
  tokens: AuthTokens;
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
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      await apiClient.clearAuth();
    }
  }

  /**
   * Get stored driver data
   */
  async getStoredDriver(): Promise<Driver | null> {
    try {
      const driverData = await AsyncStorage.getItem(STORAGE_KEYS.DRIVER_DATA);
      return driverData ? JSON.parse(driverData) : null;
    } catch (error) {
      console.error('Error getting stored driver:', error);
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
    } catch (error) {
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

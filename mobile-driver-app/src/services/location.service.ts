import Geolocation from 'react-native-geolocation-service';
import BackgroundGeolocation from 'react-native-background-geolocation';
import { Platform, PermissionsAndroid } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { apiClient } from './api';
import { Location } from '@/types';
import { logger } from '@/utils/logger';

class LocationService {
  private watchId: number | null = null;
  private isTracking: boolean = false;

  /**
   * Request location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'Ordak Driver needs access to your location to track deliveries.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          // Also request background location for Android 10+
          if (Platform.Version >= 29) {
            const bgGranted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
            );
            return bgGranted === PermissionsAndroid.RESULTS.GRANTED;
          }
          return true;
        }
        return false;
      } else {
        // iOS
        const result = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        if (result === RESULTS.GRANTED) {
          const bgResult = await request(PERMISSIONS.IOS.LOCATION_ALWAYS);
          return bgResult === RESULTS.GRANTED;
        }
        return false;
      }
    } catch (error) {
      logger.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Check if location permissions are granted
   */
  async hasPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const result = await check(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
        return result === RESULTS.GRANTED;
      } else {
        const result = await check(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        return result === RESULTS.GRANTED || result === RESULTS.LIMITED;
      }
    } catch (error) {
      logger.error('Error checking location permissions:', error);
      return false;
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed || undefined,
            heading: position.coords.heading || undefined,
            timestamp: position.timestamp,
          });
        },
        error => {
          reject(new Error(`Location error: ${error.message}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        },
      );
    });
  }

  /**
   * Start tracking location (foreground)
   */
  startTracking(callback: (location: Location) => void): void {
    if (this.watchId !== null) {
      return; // Already tracking
    }

    this.watchId = Geolocation.watchPosition(
      position => {
        const location: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed || undefined,
          heading: position.coords.heading || undefined,
          timestamp: position.timestamp,
        };
        callback(location);
      },
      error => {
        logger.error('Location tracking error:', error);
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 10, // Update every 10 meters
        interval: 5000, // Update every 5 seconds
        fastestInterval: 2000,
      },
    );

    this.isTracking = true;
  }

  /**
   * Stop tracking location (foreground)
   */
  stopTracking(): void {
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isTracking = false;
    }
  }

  /**
   * Configure background location tracking
   */
  async configureBackgroundTracking(runId: string): Promise<void> {
    await BackgroundGeolocation.ready({
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      distanceFilter: 10,
      stopTimeout: 5,
      debug: false, // Set to true for development
      logLevel: BackgroundGeolocation.LOG_LEVEL_VERBOSE,
      stopOnTerminate: false,
      startOnBoot: true,
      url: `${apiClient.getBaseURL()}/tracking/location`,
      autoSync: true,
      headers: {
        'X-Run-ID': runId,
      },
      params: {
        runId,
      },
      batchSync: true,
      maxBatchSize: 50,
      locationUpdateInterval: 5000,
      fastestLocationUpdateInterval: 2000,
      activityRecognitionInterval: 10000,
      notification: {
        title: 'Ordak Driver Active',
        text: 'Tracking delivery route',
        color: '#2196F3',
        channelName: 'Delivery Tracking',
      },
    });
  }

  /**
   * Start background location tracking
   */
  async startBackgroundTracking(): Promise<void> {
    const state = await BackgroundGeolocation.start();
    logger.debug('Background tracking started', { state });
  }

  /**
   * Stop background location tracking
   */
  async stopBackgroundTracking(): Promise<void> {
    await BackgroundGeolocation.stop();
    logger.debug('Background tracking stopped');
  }

  /**
   * Send location update to server
   */
  async sendLocationUpdate(location: Location, runId: string): Promise<void> {
    try {
      await apiClient.post('/tracking/location', {
        ...location,
        runId,
      });
    } catch (error) {
      logger.error('Error sending location update:', error);
      // Store locally for retry
    }
  }

  /**
   * Calculate distance between two coordinates (in meters)
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export const locationService = new LocationService();

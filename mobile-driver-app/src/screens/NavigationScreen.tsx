import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import Config from 'react-native-config';
import { useRunsStore } from '@/store/runs.store';
import { locationService } from '@/services/location.service';
import { Location } from '@/types';

// Initialize Mapbox
MapboxGL.setAccessToken(Config.MAPBOX_ACCESS_TOKEN || '');

// Mapbox line layer style (extracted to prevent inline style warning)
const routeLineStyle = {
  lineColor: '#2196F3',
  lineWidth: 4,
  lineCap: 'round',
  lineJoin: 'round',
} as const;

interface NavigationScreenProps {
  navigation: any;
  route: any;
}

const NavigationScreen: React.FC<NavigationScreenProps> = ({ navigation, route }) => {
  const { runId } = route.params;
  const {
    currentRun,
    currentOrderIndex,
    moveToNextOrder,
    updateCurrentLocation,
    currentLocation,
  } = useRunsStore();

  const [userHasPanned, setUserHasPanned] = useState(false);
  const cameraRef = useRef<MapboxGL.Camera>(null);
  const mapRef = useRef<MapboxGL.MapView>(null);

  const currentOrder = currentRun?.orders[currentOrderIndex];

  const startLocationTracking = useCallback(async () => {
    const hasPermission = await locationService.requestPermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Location permission is required for navigation');
      return;
    }

    locationService.startTracking((location: Location) => {
      updateCurrentLocation(location);

      // Send location to server
      if (runId) {
        locationService.sendLocationUpdate(location, runId);
      }
    });
  }, [runId, updateCurrentLocation]);

  const centerOnCurrentLocation = useCallback(() => {
    if (currentLocation && cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: [currentLocation.longitude, currentLocation.latitude],
        zoomLevel: 16,
        animationDuration: 1000,
      });
      // Allow auto-centering after manual re-center button press
      setUserHasPanned(false);
    }
  }, [currentLocation]);

  const handleCameraChanged = useCallback((event: any) => {
    // Only mark as user panned if it was actually a gesture
    if (event?.gestures?.isGestureActive) {
      setUserHasPanned(true);
    }
  }, []);

  useEffect(() => {
    startLocationTracking();
    return () => {
      locationService.stopTracking();
    };
  }, [startLocationTracking]);

  useEffect(() => {
    if (currentLocation && currentOrder && !userHasPanned) {
      // Center map on current location only if user hasn't manually panned
      centerOnCurrentLocation();
    }
  }, [currentLocation, currentOrder, userHasPanned, centerOnCurrentLocation]);

  useEffect(() => {
    // Reset userHasPanned when currentOrder changes to auto-center on new stop
    setUserHasPanned(false);
  }, [currentOrder]);

  const handleArrived = () => {
    if (!currentOrder) {return;}

    navigation.navigate('ProofOfDelivery', {
      orderId: currentOrder.id,
      orderIndex: currentOrderIndex,
    });
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Stop',
      'Do you want to skip this delivery?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            if (currentRun && currentOrderIndex < currentRun.orders.length - 1) {
              moveToNextOrder();
            } else {
              Alert.alert('Last Stop', 'This is the last stop in your route');
            }
          },
        },
      ],
    );
  };

  const openInMapsApp = () => {
    if (!currentOrder?.location) {return;}

    const { latitude, longitude } = currentOrder.location;
    const label = `${currentOrder.customer.firstName} ${currentOrder.customer.lastName}`;
    const url = Platform.select({
      ios: `maps://app?daddr=${latitude},${longitude}&q=${encodeURIComponent(label)}`,
      android: `google.navigation:q=${latitude},${longitude}`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  if (!currentRun || !currentOrder) {
    return (
      <View style={styles.container}>
        <Text>No active delivery</Text>
      </View>
    );
  }

  const routeCoordinates = currentRun.orders
    .filter(o => o.location)
    .map(o => [o.location!.longitude, o.location!.latitude]);

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapboxGL.MapView
        ref={mapRef}
        style={styles.map}
        styleURL={Config.MAPBOX_STYLE_URL || MapboxGL.StyleURL.Street}
        onCameraChanged={handleCameraChanged}>
        <MapboxGL.Camera
          ref={cameraRef}
          zoomLevel={13}
          centerCoordinate={
            currentLocation
              ? [currentLocation.longitude, currentLocation.latitude]
              : currentOrder.location
              ? [currentOrder.location.longitude, currentOrder.location.latitude]
              : [-79.3871, 43.6426]
          }
        />

        {/* Current Location */}
        {currentLocation && (
          <MapboxGL.PointAnnotation
            id="current-location"
            coordinate={[currentLocation.longitude, currentLocation.latitude]}>
            <View style={styles.currentLocationMarker}>
              <View style={styles.currentLocationDot} />
            </View>
          </MapboxGL.PointAnnotation>
        )}

        {/* Delivery Stops */}
        {currentRun.orders.map((order, index) => {
          if (!order.location) {return null;}

          const isCurrentStop = index === currentOrderIndex;
          const isCompleted = ['DELIVERED', 'FAILED'].includes(order.status);

          return (
            <MapboxGL.PointAnnotation
              key={order.id}
              id={`stop-${order.id}`}
              coordinate={[order.location.longitude, order.location.latitude]}>
              <View
                style={[
                  styles.stopMarker,
                  isCurrentStop && styles.currentStopMarker,
                  isCompleted && styles.completedStopMarker,
                ]}>
                <Text style={styles.stopMarkerText}>{index + 1}</Text>
              </View>
            </MapboxGL.PointAnnotation>
          );
        })}

        {/* Route Line */}
        {routeCoordinates.length > 1 && (
          <MapboxGL.ShapeSource
            id="route-source"
            shape={{
              type: 'LineString',
              coordinates: routeCoordinates,
            }}>
            <MapboxGL.LineLayer id="route-line" style={routeLineStyle} />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      {/* Top Info Card */}
      <View style={styles.topCard}>
        <View style={styles.topCardHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.stopCounter}>
            Stop {currentOrderIndex + 1} of {currentRun.orders.length}
          </Text>
          <TouchableOpacity onPress={centerOnCurrentLocation}>
            <Text style={styles.centerButton}>⊙</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.customerName}>
          {currentOrder.customer.firstName} {currentOrder.customer.lastName}
        </Text>
        <Text style={styles.address}>
          {currentOrder.address.line1}
          {currentOrder.address.line2 ? `, ${currentOrder.address.line2}` : ''}
        </Text>
        <Text style={styles.cityState}>
          {currentOrder.address.city}, {currentOrder.address.province} {currentOrder.address.postalCode}
        </Text>
        {currentOrder.customer.phone && (
          <TouchableOpacity
            style={styles.phoneButton}
            onPress={() => Linking.openURL(`tel:${currentOrder.customer.phone}`)}>
            <Text style={styles.phoneButtonText}>📞 Call Customer</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomCard}>
        <TouchableOpacity
          style={styles.mapsButton}
          onPress={openInMapsApp}>
          <Text style={styles.mapsButtonText}>🗺️ Open in Maps</Text>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.skipButton]}
            onPress={handleSkip}>
            <Text style={styles.actionButtonText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.arrivedButton]}
            onPress={handleArrived}>
            <Text style={styles.actionButtonText}>I've Arrived</Text>
          </TouchableOpacity>
        </View>

        {currentOrder.specialInstructions && (
          <View style={styles.instructionsCard}>
            <Text style={styles.instructionsTitle}>📋 Special Instructions:</Text>
            <Text style={styles.instructionsText}>
              {currentOrder.specialInstructions}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  topCard: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  topCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  stopCounter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  centerButton: {
    fontSize: 24,
    color: '#666',
  },
  customerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  address: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  cityState: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  phoneButton: {
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  phoneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  mapsButton: {
    backgroundColor: '#f5f5f5',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  mapsButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: '#757575',
  },
  arrivedButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructionsCard: {
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    color: '#666',
  },
  currentLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(33, 150, 243, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2196F3',
    borderWidth: 2,
    borderColor: '#fff',
  },
  stopMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  currentStopMarker: {
    backgroundColor: '#4CAF50',
    transform: [{ scale: 1.2 }],
  },
  completedStopMarker: {
    backgroundColor: '#9E9E9E',
  },
  stopMarkerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default NavigationScreen;

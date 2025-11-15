import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRunsStore } from '@/store/runs.store';
import { DeliveryRun, Order } from '@/types';
import { format } from 'date-fns';

interface RunDetailsScreenProps {
  navigation: any;
  route: any;
}

const RunDetailsScreen: React.FC<RunDetailsScreenProps> = ({ navigation, route }) => {
  const { runId } = route.params;
  const { currentRun, startRun, completeRun, isLoading, setCurrentRun } = useRunsStore();
  const [run, setRun] = useState<DeliveryRun | null>(currentRun);

  useEffect(() => {
    if (currentRun?.id === runId) {
      setRun(currentRun);
    }
  }, [currentRun, runId]);

  const handleStartRun = async () => {
    Alert.alert(
      'Start Delivery Run',
      'Are you ready to start this delivery run?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            try {
              await startRun(runId);
              navigation.navigate('Navigation', { runId });
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to start run');
            }
          },
        },
      ],
    );
  };

  const handleCompleteRun = async () => {
    const incompleteOrders = run?.orders.filter(
      o => !['DELIVERED', 'FAILED', 'CANCELLED'].includes(o.status),
    );

    if (incompleteOrders && incompleteOrders.length > 0) {
      Alert.alert(
        'Incomplete Deliveries',
        `You have ${incompleteOrders.length} incomplete deliveries. Complete all deliveries before finishing the run.`,
      );
      return;
    }

    Alert.alert(
      'Complete Run',
      'Mark this run as completed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await completeRun(runId);
              Alert.alert('Success', 'Run completed successfully!');
              navigation.navigate('Dashboard');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to complete run');
            }
          },
        },
      ],
    );
  };

  const handleOrderPress = (order: Order, index: number) => {
    navigation.navigate('OrderDetails', { orderId: order.id, orderIndex: index });
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return '#4CAF50';
      case 'IN_PROGRESS':
        return '#2196F3';
      case 'FAILED':
        return '#f44336';
      case 'CANCELLED':
        return '#9E9E9E';
      default:
        return '#FF9800';
    }
  };

  if (!run) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  const deliveredCount = run.orders.filter(o => o.status === 'DELIVERED').length;
  const totalOrders = run.orders.length;
  const progress = (deliveredCount / totalOrders) * 100;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{run.name}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* Run Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: getOrderStatusColor(run.status) }]}>
              <Text style={styles.statusText}>{run.status.replace('_', ' ')}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>
              {format(new Date(run.scheduledDate), 'MMM dd, yyyy')}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vehicle</Text>
            <Text style={styles.infoValue}>
              {run.vehicle.make} {run.vehicle.model} ({run.vehicle.licensePlate})
            </Text>
          </View>
          {run.totalDistance && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Distance</Text>
              <Text style={styles.infoValue}>
                {(run.totalDistance / 1000).toFixed(1)} km
              </Text>
            </View>
          )}
          {run.totalDuration && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoValue}>
                {Math.round(run.totalDuration / 60)} min
              </Text>
            </View>
          )}
        </View>

        {/* Progress */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Delivery Progress</Text>
            <Text style={styles.progressText}>
              {deliveredCount} of {totalOrders}
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Orders List */}
        <View style={styles.ordersSection}>
          <Text style={styles.sectionTitle}>Delivery Stops ({totalOrders})</Text>
          {run.orders.map((order, index) => (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => handleOrderPress(order, index)}>
              <View style={styles.orderHeader}>
                <View style={styles.orderNumber}>
                  <Text style={styles.orderNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.orderInfo}>
                  <Text style={styles.orderCustomerName}>
                    {order.customer.firstName} {order.customer.lastName}
                  </Text>
                  <Text style={styles.orderAddress} numberOfLines={1}>
                    {order.address.line1}, {order.address.city}
                  </Text>
                  <Text style={styles.orderType}>
                    {order.type} • {order.items.length} items
                  </Text>
                </View>
                <View
                  style={[
                    styles.orderStatusBadge,
                    { backgroundColor: getOrderStatusColor(order.status) },
                  ]}>
                  <Text style={styles.orderStatusText}>
                    {order.status === 'DELIVERED' ? '✓' :
                     order.status === 'FAILED' ? '✗' :
                     order.status === 'IN_PROGRESS' ? '→' : '○'}
                  </Text>
                </View>
              </View>
              {order.timeWindowStart && (
                <Text style={styles.orderTimeWindow}>
                  ⏰ {format(new Date(order.timeWindowStart), 'h:mm a')} -{' '}
                  {format(new Date(order.timeWindowEnd!), 'h:mm a')}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        {run.status === 'ASSIGNED' || run.status === 'PLANNED' ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.startButton]}
            onPress={handleStartRun}
            disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionButtonText}>Start Delivery Run</Text>
            )}
          </TouchableOpacity>
        ) : run.status === 'IN_PROGRESS' ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.navigateButton]}
              onPress={() => navigation.navigate('Navigation', { runId })}>
              <Text style={styles.actionButtonText}>🧭 Navigate</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={handleCompleteRun}
              disabled={isLoading}>
              <Text style={styles.actionButtonText}>✓ Complete</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  progressCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  ordersSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  orderNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  orderInfo: {
    flex: 1,
  },
  orderCustomerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  orderAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  orderType: {
    fontSize: 12,
    color: '#999',
  },
  orderStatusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orderStatusText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  orderTimeWindow: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    marginLeft: 48,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
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
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  navigateButton: {
    backgroundColor: '#2196F3',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RunDetailsScreen;

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAuthStore } from '@/store/auth.store';
import { useRunsStore } from '@/store/runs.store';
import { DeliveryRun } from '@/types';
import { format } from 'date-fns';

interface DashboardScreenProps {
  navigation: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { driver } = useAuthStore();
  const { runs, fetchTodayRuns, isLoading, setCurrentRun } = useRunsStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await fetchTodayRuns();
  }, [fetchTodayRuns]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRunPress = (run: DeliveryRun) => {
    setCurrentRun(run);
    navigation.navigate('RunDetails', { runId: run.id });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED':
      case 'PLANNED':
        return '#2196F3';
      case 'IN_PROGRESS':
        return '#4CAF50';
      case 'COMPLETED':
        return '#9E9E9E';
      default:
        return '#757575';
    }
  };

  const getStatusText = (status: string) => {
    return status.replace('_', ' ');
  };

  const todayRuns = runs.filter(run =>
    ['ASSIGNED', 'PLANNED', 'IN_PROGRESS'].includes(run.status),
  );

  const activeRun = runs.find(run => run.status === 'IN_PROGRESS');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello,</Text>
          <Text style={styles.driverName}>
            {driver?.firstName} {driver?.lastName}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.profileIcon}>👤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Active Run Card */}
        {activeRun && (
          <View style={styles.activeRunCard}>
            <Text style={styles.activeRunTitle}>🚚 Active Delivery</Text>
            <Text style={styles.activeRunName}>{activeRun.name}</Text>
            <View style={styles.activeRunStats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{activeRun.orders.length}</Text>
                <Text style={styles.statLabel}>Stops</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {activeRun.orders.filter(o => o.status === 'DELIVERED').length}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {activeRun.orders.filter(
                    o => !['DELIVERED', 'FAILED', 'CANCELLED'].includes(o.status),
                  ).length}
                </Text>
                <Text style={styles.statLabel}>Remaining</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => handleRunPress(activeRun)}>
              <Text style={styles.continueButtonText}>Continue Delivery →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Today's Runs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Runs</Text>
          {isLoading && !refreshing ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : todayRuns.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>📦</Text>
              <Text style={styles.emptyStateText}>
                No runs assigned for today
              </Text>
            </View>
          ) : (
            todayRuns.map(run => (
              <TouchableOpacity
                key={run.id}
                style={styles.runCard}
                onPress={() => handleRunPress(run)}>
                <View style={styles.runHeader}>
                  <Text style={styles.runName}>{run.name}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(run.status) },
                    ]}>
                    <Text style={styles.statusText}>
                      {getStatusText(run.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.runDetails}>
                  <Text style={styles.runDetailText}>
                    📍 {run.orders.length} stops
                  </Text>
                  <Text style={styles.runDetailText}>
                    🚗 {run.vehicle.make} {run.vehicle.model}
                  </Text>
                  {run.totalDistanceKm && (
                    <Text style={styles.runDetailText}>
                      📏 {run.totalDistanceKm.toFixed(1)} km
                    </Text>
                  )}
                </View>
                {run.actualStartTime && (
                  <Text style={styles.runTime}>
                    Started: {format(new Date(run.actualStartTime), 'h:mm a')}
                  </Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('RunsList')}>
              <Text style={styles.actionIcon}>📋</Text>
              <Text style={styles.actionText}>All Runs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('History')}>
              <Text style={styles.actionIcon}>📊</Text>
              <Text style={styles.actionText}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.actionIcon}>⚙️</Text>
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  driverName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIcon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  activeRunCard: {
    backgroundColor: '#4CAF50',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  activeRunTitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  activeRunName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  activeRunStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginTop: 4,
  },
  continueButton: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  runCard: {
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
  runHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  runName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
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
  runDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  runDetailText: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  runTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  loadingText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
  },
});

export default DashboardScreen;

import { useQuery } from '@tanstack/react-query';
import { Truck, Package, Users, CheckCircle, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { MetricCard } from '../components/ui/MetricCard';
import { DriverStatusCard } from '../components/ui/DriverStatusCard';
import { Button } from '../components/ui/Button';
import { deliveryRunsApi, ordersApi, driversApi } from '../api';
import { RunStatus, OrderStatus, DriverStatus } from '../types';

export function Dashboard() {
  // Fetch dashboard data
  const { data: runsData } = useQuery({
    queryKey: ['deliveryRuns'],
    queryFn: () => deliveryRunsApi.list(),
  });

  const { data: ordersData } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list(),
  });

  const { data: driversData } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversApi.list(),
  });

  // Calculate metrics
  const runs = runsData?.data || [];
  const orders = ordersData?.data || [];
  const drivers = driversData?.data || [];

  const activeRuns = runs.filter(run => run.status === RunStatus.IN_PROGRESS).length;
  const completedToday = runs.filter(run => {
    if (run.status === RunStatus.COMPLETED && run.endTime) {
      const today = new Date();
      const endTime = new Date(run.endTime);
      return endTime.toDateString() === today.toDateString();
    }
    return false;
  }).length;

  const pendingOrders = orders.filter(order => order.status === OrderStatus.PENDING).length;
  const deliveredOrders = orders.filter(order => order.status === OrderStatus.DELIVERED).length;
  const totalOrders = orders.length;
  const activeDrivers = drivers.filter(d => d.status === DriverStatus.ACTIVE).length;

  // Mock driver statuses (in real app, fetch from API)
  const mockDrivers = [
    { name: 'John Smith', status: 'online' as const, completed: 8, total: 12, distance: '2.3km away' },
    { name: 'Sarah Johnson', status: 'busy' as const, completed: 15, total: 18, distance: '5.1km away' },
    { name: 'Mike Wilson', status: 'online' as const, completed: 6, total: 10, distance: '1.8km away' },
    { name: 'Emma Davis', status: 'offline' as const, completed: 0, total: 0 },
  ];

  return (
    <div className="p-6 bg-dark-bg min-h-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Dashboard
        </h1>
        <p className="text-ordak-gray-400">
          Real-time overview of your delivery operations
        </p>
      </div>

      {/* Metrics Grid - 4 colorful cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard
          icon={<Truck />}
          label="Active Runs"
          value={activeRuns}
          trend={`${completedToday} completed today`}
          variant="pink"
        />
        <MetricCard
          icon={<Package />}
          label="Total Orders"
          value={totalOrders}
          trend={`${deliveredOrders} delivered`}
          variant="cyan"
        />
        <MetricCard
          icon={<CheckCircle />}
          label="Pending Orders"
          value={pendingOrders}
          trend="Awaiting assignment"
          variant="green"
        />
        <MetricCard
          icon={<Users />}
          label="Active Drivers"
          value={activeDrivers}
          trend={`${drivers.length} total drivers`}
          variant="purple"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-dark-card rounded-xl border border-dark-border p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="text-gradient-cyan-start" size={20} />
              Quick Actions
            </h2>
            <div className="space-y-3">
              <Button variant="primary" fullWidth>
                Create New Run
              </Button>
              <Button variant="secondary" fullWidth>
                View All Orders
              </Button>
              <Button variant="success" fullWidth>
                Manage Drivers
              </Button>
            </div>
          </div>

          {/* Alerts */}
          {pendingOrders > 0 && (
            <div className="bg-gradient-to-r from-gradient-orange-start/20 to-gradient-orange-end/20 border border-gradient-orange-start/30 rounded-xl p-4 mt-6">
              <div className="flex gap-3">
                <AlertTriangle className="text-gradient-orange-start flex-shrink-0" size={24} />
                <div>
                  <h3 className="font-semibold text-white mb-1">Attention Required</h3>
                  <p className="text-sm text-ordak-gray-400">
                    {pendingOrders} orders are waiting to be assigned to delivery runs.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active Drivers */}
        <div className="lg:col-span-2">
          <div className="bg-dark-card rounded-xl border border-dark-border p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Users className="text-gradient-green-start" size={20} />
              Driver Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockDrivers.map((driver, index) => (
                <DriverStatusCard
                  key={index}
                  driverName={driver.name}
                  status={driver.status}
                  completedDeliveries={driver.completed}
                  totalDeliveries={driver.total}
                  distanceAway={driver.distance}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-dark-card rounded-xl border border-dark-border p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="text-gradient-purple-start" size={20} />
          Recent Activity
        </h2>
        <div className="space-y-3">
          {runs.length === 0 ? (
            <p className="text-ordak-gray-400 text-center py-8">No recent activity</p>
          ) : (
            runs.slice(0, 5).map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between p-4 bg-dark-bg rounded-lg border border-dark-border hover:border-ordak-gray-600 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-gradient-green-start" />
                  <div>
                    <p className="font-semibold text-white">
                      Run #{run.id.slice(0, 8)}
                    </p>
                    <p className="text-sm text-ordak-gray-400">
                      {new Date(run.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`
                    px-3 py-1 rounded-full text-xs font-medium
                    ${run.status === RunStatus.COMPLETED ? 'bg-gradient-green-start/20 text-gradient-green-start' : ''}
                    ${run.status === RunStatus.IN_PROGRESS ? 'bg-gradient-cyan-start/20 text-gradient-cyan-start' : ''}
                    ${run.status === RunStatus.PLANNED ? 'bg-gradient-orange-start/20 text-gradient-orange-start' : ''}
                    ${run.status === RunStatus.DRAFT ? 'bg-ordak-gray-600/20 text-ordak-gray-400' : ''}
                  `}>
                    {run.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

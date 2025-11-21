import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Truck, Plus, Filter } from 'lucide-react';
import { deliveryRunsApi } from '../api';
import { RunStatus } from '../types';
import { formatDate } from '../utils/date';
import { Button } from '../components/ui/Button';

const statusStyles: Record<string, string> = {
  [RunStatus.DRAFT]: 'bg-ordak-gray-600/20 text-ordak-gray-400',
  [RunStatus.PLANNED]: 'bg-gradient-cyan-start/20 text-gradient-cyan-start',
  [RunStatus.ASSIGNED]: 'bg-gradient-purple-start/20 text-gradient-purple-start',
  [RunStatus.IN_PROGRESS]: 'bg-gradient-yellow-start/20 text-gradient-yellow-start',
  [RunStatus.COMPLETED]: 'bg-gradient-green-start/20 text-gradient-green-start',
  [RunStatus.CANCELLED]: 'bg-ordak-red-primary/20 text-ordak-red-primary',
};

export function DeliveryRuns() {
  const [statusFilter, setStatusFilter] = useState<RunStatus | ''>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['deliveryRuns', statusFilter],
    queryFn: () =>
      deliveryRunsApi.list({
        status: statusFilter || undefined,
        limit: 50,
      }),
  });

  return (
    <div className="p-6 bg-dark-bg min-h-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Truck className="text-gradient-pink-start" />
            Delivery Runs
          </h1>
          <p className="text-ordak-gray-400">
            Plan and manage delivery routes
          </p>
        </div>
        <Link to="/runs/create">
          <Button variant="primary">
            <Plus size={18} className="mr-2" />
            Create New Run
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-dark-card rounded-xl border border-dark-border p-4 mb-6">
        <div className="flex items-center gap-4">
          <Filter className="text-ordak-gray-400" size={20} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RunStatus | '')}
            className="bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gradient-pink-start"
          >
            <option value="">All Statuses</option>
            {Object.values(RunStatus).map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-dark-card rounded-xl border border-dark-border p-12 text-center">
          <div className="animate-pulse">
            <Truck className="mx-auto text-ordak-gray-600 mb-4" size={48} />
            <p className="text-ordak-gray-400">Loading delivery runs...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-dark-card rounded-xl border border-ordak-red-primary/30 p-12 text-center">
          <Truck className="mx-auto text-ordak-red-primary mb-4" size={48} />
          <h3 className="text-lg font-semibold text-white mb-2">Unable to load delivery runs</h3>
          <p className="text-ordak-gray-400 mb-2">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <p className="text-ordak-gray-600 text-sm">Please check your connection and try again.</p>
        </div>
      ) : data ? (
        <>
          {data.data.length === 0 ? (
            <div className="bg-dark-card rounded-xl border border-dark-border p-12 text-center">
              <Truck className="mx-auto text-ordak-gray-600 mb-4" size={64} />
              <h3 className="text-xl font-semibold text-white mb-2">No delivery runs found</h3>
              <p className="text-ordak-gray-400 mb-6">Create your first delivery run to get started</p>
              <Link to="/runs/create">
                <Button variant="primary">
                  <Plus size={18} className="mr-2" />
                  Create Your First Run
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.data.map((run) => (
                <Link
                  key={run.id}
                  to={`/runs/${run.id}`}
                  className="bg-dark-card rounded-xl border border-dark-border p-5 hover:border-ordak-gray-600 transition-all hover:shadow-lg"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-white text-lg">{run.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[run.status] || statusStyles[RunStatus.DRAFT]}`}>
                      {run.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ordak-gray-400">Date</span>
                      <span className="text-white">{formatDate(run.scheduledDate)}</span>
                    </div>
                    {run.driver && (
                      <div className="flex justify-between">
                        <span className="text-ordak-gray-400">Driver</span>
                        <span className="text-white">{run.driver.firstName} {run.driver.lastName}</span>
                      </div>
                    )}
                    {run.vehicle && (
                      <div className="flex justify-between">
                        <span className="text-ordak-gray-400">Vehicle</span>
                        <span className="text-white">{run.vehicle.licensePlate}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-ordak-gray-400">Orders</span>
                      <span className="text-white font-medium">{run.orders?.length || 0}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-dark-border">
                    <span className="text-gradient-pink-start text-sm font-medium">
                      View Details →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {data.pagination && data.pagination.totalPages > 1 && (
            <div className="mt-6 text-center text-ordak-gray-400">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

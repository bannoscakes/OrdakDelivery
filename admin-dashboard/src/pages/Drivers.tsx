import { useQuery } from '@tanstack/react-query';
import { Users, Search, UserPlus } from 'lucide-react';
import { driversApi } from '../api';
import { Button } from '../components/ui/Button';
import { DriverStatus } from '../types';

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  [DriverStatus.ACTIVE]: { bg: 'bg-gradient-green-start', text: 'text-gradient-green-start', label: 'Active' },
  [DriverStatus.INACTIVE]: { bg: 'bg-ordak-gray-600', text: 'text-ordak-gray-400', label: 'Inactive' },
  [DriverStatus.ON_LEAVE]: { bg: 'bg-gradient-orange-start', text: 'text-gradient-orange-start', label: 'On Leave' },
};

export function Drivers() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversApi.list({ limit: 50 }),
  });

  return (
    <div className="p-6 bg-dark-bg min-h-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="text-gradient-green-start" />
            Drivers
          </h1>
          <p className="text-ordak-gray-400">
            Manage your delivery team
          </p>
        </div>
        <Button variant="primary" disabled title="Coming soon">
          <UserPlus size={18} className="mr-2" />
          Add Driver
        </Button>
      </div>

      {/* Search/Filter Bar */}
      <div className="bg-dark-card rounded-xl border border-dark-border p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ordak-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search drivers..."
              className="w-full bg-dark-bg border border-dark-border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-ordak-gray-600 focus:outline-none focus:border-gradient-green-start"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-dark-card rounded-xl border border-dark-border p-12 text-center">
          <div className="animate-pulse">
            <Users className="mx-auto text-ordak-gray-600 mb-4" size={48} />
            <p className="text-ordak-gray-400">Loading drivers...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-dark-card rounded-xl border border-ordak-red-primary/30 p-12 text-center">
          <Users className="mx-auto text-ordak-red-primary mb-4" size={48} />
          <h3 className="text-lg font-semibold text-white mb-2">Unable to load drivers</h3>
          <p className="text-ordak-gray-400 mb-2">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <p className="text-ordak-gray-600 text-sm">Please check your connection and try again.</p>
        </div>
      ) : data?.data && data.data.length === 0 ? (
        <div className="bg-dark-card rounded-xl border border-dark-border p-12 text-center">
          <Users className="mx-auto text-ordak-gray-600 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-white mb-2">No drivers yet</h3>
          <p className="text-ordak-gray-400">Drivers will appear here once they are added</p>
        </div>
      ) : data?.data?.length ? (
        <div className="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
          <div className="p-4 border-b border-dark-border">
            <p className="text-ordak-gray-400">
              Total drivers: <span className="text-white font-semibold">{data.pagination.total}</span> (showing {data.data.length})
            </p>
          </div>
          <div className="divide-y divide-dark-border">
            {data.data.map((driver) => {
              const status = statusStyles[driver.status] || statusStyles[DriverStatus.INACTIVE];
              const firstInitial = driver.firstName?.trim()?.[0]?.toUpperCase() ?? '';
              const lastInitial = driver.lastName?.trim()?.[0]?.toUpperCase() ?? '';
              const initials = firstInitial + lastInitial || '?';
              return (
                <div
                  key={driver.id}
                  className="p-4 hover:bg-dark-card-hover transition-colors flex justify-between items-center"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gradient-purple-start to-gradient-purple-end flex items-center justify-center text-white font-semibold">
                      {initials}
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        {driver.firstName ?? 'Unknown'} {driver.lastName ?? ''}
                      </p>
                      <p className="text-sm text-ordak-gray-400">
                        {driver.email ?? 'No email'} • {driver.phone ?? 'No phone'}
                      </p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-2 text-sm ${status.text}`}>
                    <span className={`w-2 h-2 rounded-full ${status.bg}`} />
                    <span className="font-medium">{status.label}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

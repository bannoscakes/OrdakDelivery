import { useQuery } from '@tanstack/react-query';
import { Car, Search, Plus } from 'lucide-react';
import { vehiclesApi } from '../api';
import { Button } from '../components/ui/Button';

const statusStyles: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-gradient-green-start/20', text: 'text-gradient-green-start' },
  maintenance: { bg: 'bg-gradient-orange-start/20', text: 'text-gradient-orange-start' },
  inactive: { bg: 'bg-ordak-gray-600/20', text: 'text-ordak-gray-400' },
};

export function Vehicles() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.list({ limit: 50 }),
  });

  return (
    <div className="p-6 bg-dark-bg min-h-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Car className="text-gradient-orange-start" />
            Vehicles
          </h1>
          <p className="text-ordak-gray-400">
            Manage your delivery fleet
          </p>
        </div>
        <Button variant="primary" disabled title="Coming soon">
          <Plus size={18} className="mr-2" />
          Add Vehicle
        </Button>
      </div>

      {/* Search/Filter Bar */}
      <div className="bg-dark-card rounded-xl border border-dark-border p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ordak-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search vehicles..."
              className="w-full bg-dark-bg border border-dark-border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-ordak-gray-600 focus:outline-none focus:border-gradient-orange-start"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-dark-card rounded-xl border border-dark-border p-12 text-center">
          <div className="animate-pulse">
            <Car className="mx-auto text-ordak-gray-600 mb-4" size={48} />
            <p className="text-ordak-gray-400">Loading vehicles...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-dark-card rounded-xl border border-ordak-red-primary/30 p-12 text-center">
          <Car className="mx-auto text-ordak-red-primary mb-4" size={48} />
          <h3 className="text-lg font-semibold text-white mb-2">Unable to load vehicles</h3>
          <p className="text-ordak-gray-400 mb-2">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <p className="text-ordak-gray-600 text-sm">Please check your connection and try again.</p>
        </div>
      ) : data && data.data.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.data.map((vehicle) => {
            const status = statusStyles[vehicle.status] || statusStyles.inactive;
            return (
              <div
                key={vehicle.id}
                className="bg-dark-card rounded-xl border border-dark-border p-5 hover:border-ordak-gray-600 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gradient-orange-start to-gradient-orange-end flex items-center justify-center">
                    <Car className="text-white" size={24} />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                    {vehicle.status.toUpperCase()}
                  </span>
                </div>
                <h3 className="font-semibold text-white text-lg">
                  {vehicle.make} {vehicle.model}
                </h3>
                <p className="text-ordak-gray-400 text-sm mb-3">
                  {vehicle.year}
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-dark-border">
                  <span className="text-sm text-ordak-gray-400">{vehicle.type}</span>
                  <span className="text-sm font-medium text-white bg-dark-bg px-3 py-1 rounded-lg">
                    {vehicle.licensePlate}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : data && data.data.length === 0 ? (
        <div className="bg-dark-card rounded-xl border border-dark-border p-12 text-center">
          <Car className="mx-auto text-ordak-gray-600 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-white mb-2">No vehicles yet</h3>
          <p className="text-ordak-gray-400 mb-4">Vehicles will appear here once they are added</p>
          <Button variant="primary" disabled title="Coming soon">
            <Plus size={18} className="mr-2" />
            Add Your First Vehicle
          </Button>
        </div>
      ) : null}
    </div>
  );
}

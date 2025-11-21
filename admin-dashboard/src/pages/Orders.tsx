import { useQuery } from '@tanstack/react-query';
import { Package, Search } from 'lucide-react';
import { ordersApi } from '../api';
import { formatDate } from '../utils/date';
import { OrderStatus } from '../types';

const statusStyles: Record<string, string> = {
  [OrderStatus.PENDING]: 'bg-gradient-orange-start/20 text-gradient-orange-start',
  [OrderStatus.CONFIRMED]: 'bg-gradient-cyan-start/20 text-gradient-cyan-start',
  [OrderStatus.ASSIGNED]: 'bg-gradient-purple-start/20 text-gradient-purple-start',
  [OrderStatus.IN_PROGRESS]: 'bg-gradient-yellow-start/20 text-gradient-yellow-start',
  [OrderStatus.DELIVERED]: 'bg-gradient-green-start/20 text-gradient-green-start',
  [OrderStatus.CANCELLED]: 'bg-ordak-red-primary/20 text-ordak-red-primary',
  [OrderStatus.FAILED]: 'bg-ordak-red-primary/20 text-ordak-red-primary',
};

export function Orders() {
  const limit = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ['orders', { limit }],
    queryFn: () => ordersApi.list({ limit }),
  });

  return (
    <div className="p-6 bg-dark-bg min-h-full">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Package className="text-gradient-cyan-start" />
          Orders
        </h1>
        <p className="text-ordak-gray-400">
          Manage and track all delivery orders
        </p>
      </div>

      {/* Search/Filter Bar */}
      <div className="bg-dark-card rounded-xl border border-dark-border p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ordak-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search orders..."
              className="w-full bg-dark-bg border border-dark-border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-ordak-gray-600 focus:outline-none focus:border-gradient-cyan-start"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-dark-card rounded-xl border border-dark-border p-12 text-center">
          <div className="animate-pulse">
            <Package className="mx-auto text-ordak-gray-600 mb-4" size={48} />
            <p className="text-ordak-gray-400">Loading orders...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-dark-card rounded-xl border border-ordak-red-primary/30 p-12 text-center">
          <Package className="mx-auto text-ordak-red-primary mb-4" size={48} />
          <h3 className="text-lg font-semibold text-white mb-2">Unable to load orders</h3>
          <p className="text-ordak-gray-400 mb-2">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <p className="text-ordak-gray-600 text-sm">Please check your connection and try again.</p>
        </div>
      ) : data && data.data.length > 0 ? (
        <div className="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
          <div className="p-4 border-b border-dark-border">
            <p className="text-ordak-gray-400">
              Total orders: <span className="text-white font-semibold">{data.pagination.total}</span> (showing {data.data.length})
            </p>
          </div>
          <div className="divide-y divide-dark-border">
            {data.data.map((order) => (
              <div
                key={order.id}
                className="p-4 hover:bg-dark-card-hover transition-colors flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold text-white">
                    {order.orderNumber}
                    <span className="text-ordak-gray-400 font-normal ml-2">
                      - {order.customer?.firstName ?? 'Unknown'} {order.customer?.lastName ?? ''}
                    </span>
                  </p>
                  <p className="text-sm text-ordak-gray-400 mt-1">
                    {order.address?.line1 ?? '—'}, {order.address?.city ?? '—'} •{' '}
                    {order.scheduledDate ? formatDate(order.scheduledDate) : '—'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[order.status] || 'bg-ordak-gray-600/20 text-ordak-gray-400'}`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : data && data.data.length === 0 ? (
        <div className="bg-dark-card rounded-xl border border-dark-border p-12 text-center">
          <Package className="mx-auto text-ordak-gray-600 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-white mb-2">No orders yet</h3>
          <p className="text-ordak-gray-400">Orders will appear here once they are created</p>
        </div>
      ) : null}
    </div>
  );
}

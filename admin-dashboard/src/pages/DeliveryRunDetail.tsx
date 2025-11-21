import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, ArrowLeft, Calendar, User, Car, Package, Play, CheckCircle, Trash2, Plus, X } from 'lucide-react';
import { deliveryRunsApi, ordersApi } from '../api';
import { RunStatus, OrderStatus } from '../types';
import { formatDate } from '../utils/date';
import { Button } from '../components/ui/Button';
import { clsx } from 'clsx';

const statusStyles: Record<string, string> = {
  [RunStatus.DRAFT]: 'bg-ordak-gray-600/20 text-ordak-gray-400',
  [RunStatus.PLANNED]: 'bg-gradient-cyan-start/20 text-gradient-cyan-start',
  [RunStatus.ASSIGNED]: 'bg-gradient-purple-start/20 text-gradient-purple-start',
  [RunStatus.IN_PROGRESS]: 'bg-gradient-yellow-start/20 text-gradient-yellow-start',
  [RunStatus.COMPLETED]: 'bg-gradient-green-start/20 text-gradient-green-start',
  [RunStatus.CANCELLED]: 'bg-ordak-red-primary/20 text-ordak-red-primary',
};

const orderStatusStyles: Record<string, string> = {
  [OrderStatus.PENDING]: 'bg-gradient-orange-start/20 text-gradient-orange-start',
  [OrderStatus.CONFIRMED]: 'bg-gradient-cyan-start/20 text-gradient-cyan-start',
  [OrderStatus.ASSIGNED]: 'bg-gradient-purple-start/20 text-gradient-purple-start',
  [OrderStatus.IN_PROGRESS]: 'bg-gradient-yellow-start/20 text-gradient-yellow-start',
  [OrderStatus.DELIVERED]: 'bg-gradient-green-start/20 text-gradient-green-start',
  [OrderStatus.CANCELLED]: 'bg-ordak-red-primary/20 text-ordak-red-primary',
  [OrderStatus.FAILED]: 'bg-ordak-red-primary/20 text-ordak-red-primary',
};

export function DeliveryRunDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddOrders, setShowAddOrders] = useState(false);
  const [selectedNewOrderIds, setSelectedNewOrderIds] = useState<string[]>([]);

  const { data: run, isLoading, error } = useQuery({
    queryKey: ['deliveryRun', id],
    queryFn: () => deliveryRunsApi.getById(id!),
    enabled: !!id,
  });

  const { data: unassignedOrders } = useQuery({
    queryKey: ['orders', 'unassigned', run?.scheduledDate],
    queryFn: () => ordersApi.getUnassigned(run!.scheduledDate),
    enabled: !!run && showAddOrders,
  });

  const startRunMutation = useMutation({
    mutationFn: () => deliveryRunsApi.start(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryRun', id] });
    },
  });

  const completeRunMutation = useMutation({
    mutationFn: () => deliveryRunsApi.complete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryRun', id] });
    },
  });

  const assignOrdersMutation = useMutation({
    mutationFn: (orderIds: string[]) => deliveryRunsApi.assignOrders(id!, { orderIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryRun', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowAddOrders(false);
      setSelectedNewOrderIds([]);
    },
  });

  const unassignOrderMutation = useMutation({
    mutationFn: (orderIds: string[]) => deliveryRunsApi.unassignOrders(id!, { orderIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveryRun', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const deleteRunMutation = useMutation({
    mutationFn: () => deliveryRunsApi.delete(id!),
    onSuccess: () => {
      navigate('/runs');
    },
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this delivery run?')) {
      deleteRunMutation.mutate();
    }
  };

  const handleUnassignOrder = (orderId: string) => {
    if (window.confirm('Remove this order from the delivery run?')) {
      unassignOrderMutation.mutate([orderId]);
    }
  };

  const handleAddOrders = () => {
    if (selectedNewOrderIds.length > 0) {
      assignOrdersMutation.mutate(selectedNewOrderIds);
    }
  };

  const toggleNewOrderSelection = (orderId: string) => {
    setSelectedNewOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 bg-dark-bg min-h-full flex items-center justify-center">
        <div className="text-ordak-gray-400">Loading delivery run...</div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="p-6 bg-dark-bg min-h-full">
        <div className="bg-ordak-red-primary/20 border border-ordak-red-primary/30 rounded-xl p-4 text-ordak-red-light">
          {error ? 'Error loading delivery run' : 'Delivery run not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-dark-bg min-h-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <Link
            to="/runs"
            className="flex items-center gap-2 text-ordak-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Delivery Runs
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-white">{run.name}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyles[run.status]}`}>
              {run.status.replace('_', ' ')}
            </span>
          </div>
        </div>
        <Button variant="danger" onClick={handleDelete} disabled={deleteRunMutation.isPending}>
          <Trash2 size={18} className="mr-2" />
          Delete Run
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark-card rounded-xl border border-dark-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="text-gradient-cyan-start" size={20} />
            <span className="text-sm text-ordak-gray-400">Scheduled Date</span>
          </div>
          <p className="text-lg font-semibold text-white">{formatDate(run.scheduledDate)}</p>
        </div>

        <div className="bg-dark-card rounded-xl border border-dark-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <User className="text-gradient-purple-start" size={20} />
            <span className="text-sm text-ordak-gray-400">Driver</span>
          </div>
          {run.driver ? (
            <div>
              <p className="text-lg font-semibold text-white">
                {run.driver.firstName} {run.driver.lastName}
              </p>
              <p className="text-sm text-ordak-gray-400">{run.driver.email}</p>
            </div>
          ) : (
            <p className="text-lg text-ordak-gray-600 italic">Not assigned</p>
          )}
        </div>

        <div className="bg-dark-card rounded-xl border border-dark-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <Car className="text-gradient-orange-start" size={20} />
            <span className="text-sm text-ordak-gray-400">Vehicle</span>
          </div>
          {run.vehicle ? (
            <div>
              <p className="text-lg font-semibold text-white">
                {run.vehicle.make} {run.vehicle.model}
              </p>
              <p className="text-sm text-ordak-gray-400">{run.vehicle.licensePlate}</p>
            </div>
          ) : (
            <p className="text-lg text-ordak-gray-600 italic">Not assigned</p>
          )}
        </div>

        <div className="bg-dark-card rounded-xl border border-dark-border p-5">
          <div className="flex items-center gap-3 mb-2">
            <Package className="text-gradient-green-start" size={20} />
            <span className="text-sm text-ordak-gray-400">Orders</span>
          </div>
          <p className="text-3xl font-bold text-white">{run.orders?.length || 0}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-dark-card rounded-xl border border-dark-border p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
        <div className="flex gap-4">
          {(run.status === RunStatus.DRAFT || run.status === RunStatus.PLANNED) && (
            <Button
              variant="primary"
              onClick={() => startRunMutation.mutate()}
              disabled={startRunMutation.isPending}
            >
              <Play size={18} className="mr-2" />
              Start Run
            </Button>
          )}

          {run.status === RunStatus.IN_PROGRESS && (
            <Button
              variant="success"
              onClick={() => completeRunMutation.mutate()}
              disabled={completeRunMutation.isPending}
            >
              <CheckCircle size={18} className="mr-2" />
              Complete Run
            </Button>
          )}
        </div>
      </div>

      {/* Orders Section */}
      <div className="bg-dark-card rounded-xl border border-dark-border p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Package className="text-gradient-green-start" size={20} />
            Orders ({run.orders?.length || 0})
          </h2>
          <Button
            variant="secondary"
            onClick={() => setShowAddOrders(!showAddOrders)}
          >
            {showAddOrders ? (
              <>
                <X size={18} className="mr-2" />
                Cancel
              </>
            ) : (
              <>
                <Plus size={18} className="mr-2" />
                Add Orders
              </>
            )}
          </Button>
        </div>

        {/* Add Orders Panel */}
        {showAddOrders && (
          <div className="bg-dark-bg rounded-xl border border-dark-border p-4 mb-6">
            <h3 className="font-semibold text-white mb-4">Add Orders to Run</h3>
            {unassignedOrders && unassignedOrders.length === 0 && (
              <p className="text-ordak-gray-400">No unassigned orders available for this date.</p>
            )}
            {unassignedOrders && unassignedOrders.length > 0 && (
              <>
                <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                  {unassignedOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => toggleNewOrderSelection(order.id)}
                      className={clsx(
                        'flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-all',
                        selectedNewOrderIds.includes(order.id)
                          ? 'bg-gradient-green-start/10 border-gradient-green-start'
                          : 'bg-dark-card border-dark-border hover:border-ordak-gray-600'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedNewOrderIds.includes(order.id)}
                        readOnly
                        className="w-4 h-4 rounded"
                      />
                      <div>
                        <p className="font-medium text-white">{order.orderNumber}</p>
                        <p className="text-sm text-ordak-gray-400">
                          {order.customer?.firstName ?? ''} {order.customer?.lastName ?? ''} - {order.address?.line1 ?? ''}, {order.address?.city ?? ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  variant="primary"
                  onClick={handleAddOrders}
                  disabled={selectedNewOrderIds.length === 0 || assignOrdersMutation.isPending}
                >
                  Add Selected Orders ({selectedNewOrderIds.length})
                </Button>
              </>
            )}
          </div>
        )}

        {/* Orders List */}
        {run.orders && run.orders.length === 0 ? (
          <div className="text-center py-12 text-ordak-gray-400">
            No orders assigned to this run yet.
          </div>
        ) : (
          <div className="space-y-3">
            {run.orders?.map((order, index) => (
              <div
                key={order.id}
                className="bg-dark-bg rounded-lg border border-dark-border p-4 flex items-center gap-4"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gradient-pink-start to-gradient-pink-end flex items-center justify-center text-white font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-semibold text-white">{order.orderNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${orderStatusStyles[order.status] || 'bg-ordak-gray-600/20 text-ordak-gray-400'}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-ordak-gray-400">
                    {order.customer?.firstName ?? 'Unknown'} {order.customer?.lastName ?? ''}
                  </p>
                  <p className="text-sm text-ordak-gray-600">
                    {order.address?.line1 ?? 'Address unavailable'}{order.address?.city ? `, ${order.address.city}` : ''}
                  </p>
                  {order.specialInstructions && (
                    <p className="text-sm text-gradient-yellow-start mt-1">
                      Note: {order.specialInstructions}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/orders/${order.id}`}
                    className="text-sm text-gradient-cyan-start hover:underline"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => handleUnassignOrder(order.id)}
                    className="text-sm text-ordak-red-light hover:underline"
                    disabled={unassignOrderMutation.isPending}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

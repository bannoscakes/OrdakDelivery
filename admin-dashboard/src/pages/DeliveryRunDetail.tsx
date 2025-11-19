import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryRunsApi, ordersApi } from '../api';
import { RunStatus } from '../types';
import { formatDate, formatDateTime } from '../utils/date';
import './DeliveryRunDetail.css';

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

  const getStatusColor = (status: RunStatus) => {
    const colors: Record<RunStatus, string> = {
      [RunStatus.DRAFT]: '#6c757d',
      [RunStatus.PLANNED]: '#0dcaf0',
      [RunStatus.ASSIGNED]: '#0d6efd',
      [RunStatus.IN_PROGRESS]: '#ffc107',
      [RunStatus.COMPLETED]: '#198754',
      [RunStatus.CANCELLED]: '#dc3545',
    };
    return colors[status] || '#6c757d';
  };

  if (isLoading) return <div className="loading">Loading delivery run...</div>;
  if (error) return <div className="error">Error loading delivery run</div>;
  if (!run) return <div className="error">Delivery run not found</div>;

  return (
    <div className="delivery-run-detail-page">
      <div className="page-header">
        <div>
          <Link to="/runs" className="breadcrumb">
            ← Back to Delivery Runs
          </Link>
          <h1>{run.name}</h1>
        </div>
        <div className="header-actions">
          <button onClick={handleDelete} className="btn btn-danger" disabled={deleteRunMutation.isPending}>
            Delete Run
          </button>
        </div>
      </div>

      <div className="run-overview">
        <div className="overview-card">
          <h3>Status</h3>
          <span className="status-badge" style={{ backgroundColor: getStatusColor(run.status) }}>
            {run.status}
          </span>
        </div>

        <div className="overview-card">
          <h3>Scheduled Date</h3>
          <p>{formatDate(run.scheduledDate)}</p>
        </div>

        <div className="overview-card">
          <h3>Driver</h3>
          <p>
            {run.driver ? (
              <>
                {run.driver.firstName} {run.driver.lastName}
                <br />
                <small>{run.driver.email}</small>
              </>
            ) : (
              <em>Not assigned</em>
            )}
          </p>
        </div>

        <div className="overview-card">
          <h3>Vehicle</h3>
          <p>
            {run.vehicle ? (
              <>
                {run.vehicle.make} {run.vehicle.model}
                <br />
                <small>{run.vehicle.licensePlate}</small>
              </>
            ) : (
              <em>Not assigned</em>
            )}
          </p>
        </div>

        <div className="overview-card">
          <h3>Orders</h3>
          <p className="stat-number">{run.orders?.length || 0}</p>
        </div>
      </div>

      <div className="run-actions-section">
        <h2>Actions</h2>
        <div className="action-buttons">
          {run.status === RunStatus.DRAFT || run.status === RunStatus.PLANNED ? (
            <button
              onClick={() => startRunMutation.mutate()}
              className="btn btn-primary"
              disabled={startRunMutation.isPending}
            >
              Start Run
            </button>
          ) : null}

          {run.status === RunStatus.IN_PROGRESS ? (
            <button
              onClick={() => completeRunMutation.mutate()}
              className="btn btn-success"
              disabled={completeRunMutation.isPending}
            >
              Complete Run
            </button>
          ) : null}
        </div>
      </div>

      <div className="orders-section">
        <div className="section-header">
          <h2>Orders ({run.orders?.length || 0})</h2>
          <button onClick={() => setShowAddOrders(!showAddOrders)} className="btn btn-secondary">
            {showAddOrders ? 'Cancel' : 'Add Orders'}
          </button>
        </div>

        {showAddOrders && (
          <div className="add-orders-panel">
            <h3>Add Orders to Run</h3>
            {unassignedOrders && unassignedOrders.length === 0 && (
              <p>No unassigned orders available for this date.</p>
            )}
            {unassignedOrders && unassignedOrders.length > 0 && (
              <>
                <div className="orders-list">
                  {unassignedOrders.map((order) => (
                    <div
                      key={order.id}
                      className={`order-item ${selectedNewOrderIds.includes(order.id) ? 'selected' : ''}`}
                      onClick={() => toggleNewOrderSelection(order.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selectedNewOrderIds.includes(order.id)}
                        onChange={() => {}}
                      />
                      <div className="order-info">
                        <div className="order-number">{order.orderNumber}</div>
                        <div className="order-customer">
                          {order.customer.firstName} {order.customer.lastName}
                        </div>
                        <div className="order-address">
                          {order.address.line1}, {order.address.city}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleAddOrders}
                  className="btn btn-primary"
                  disabled={selectedNewOrderIds.length === 0 || assignOrdersMutation.isPending}
                >
                  Add Selected Orders ({selectedNewOrderIds.length})
                </button>
              </>
            )}
          </div>
        )}

        {run.orders && run.orders.length === 0 ? (
          <div className="empty-state">No orders assigned to this run yet.</div>
        ) : (
          <div className="orders-table">
            {run.orders?.map((order, index) => (
              <div key={order.id} className="order-row">
                <div className="order-sequence">#{index + 1}</div>
                <div className="order-details">
                  <div className="order-number">{order.orderNumber}</div>
                  <div className="order-customer">
                    {order.customer.firstName} {order.customer.lastName}
                  </div>
                  <div className="order-address">
                    {order.address.line1}, {order.address.city}
                  </div>
                  {order.specialInstructions && (
                    <div className="order-instructions">📝 {order.specialInstructions}</div>
                  )}
                </div>
                <div className="order-status">
                  <span className={`status-badge-sm status-${order.status.toLowerCase()}`}>
                    {order.status}
                  </span>
                </div>
                <div className="order-actions">
                  <Link to={`/orders/${order.id}`} className="btn-link">
                    View
                  </Link>
                  <button
                    onClick={() => handleUnassignOrder(order.id)}
                    className="btn-link danger"
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

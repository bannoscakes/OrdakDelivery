import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { deliveryRunsApi, driversApi, vehiclesApi, ordersApi } from '../api';
import type { CreateDeliveryRunInput } from '../types';
import { toISODateString } from '../utils/date';
import './CreateDeliveryRun.css';

export function CreateDeliveryRun() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(toISODateString(new Date()));
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const { register, handleSubmit, formState: { errors } } = useForm<CreateDeliveryRunInput>({
    defaultValues: {
      scheduledDate: toISODateString(new Date()),
    },
  });

  // Fetch available drivers and vehicles
  const { data: drivers } = useQuery({
    queryKey: ['drivers', 'available', selectedDate],
    queryFn: () => driversApi.getAvailable(selectedDate),
  });

  const { data: vehicles } = useQuery({
    queryKey: ['vehicles', 'available', selectedDate],
    queryFn: () => vehiclesApi.getAvailable(selectedDate),
  });

  // Fetch unassigned orders
  const { data: unassignedOrders } = useQuery({
    queryKey: ['orders', 'unassigned', selectedDate],
    queryFn: () => ordersApi.getUnassigned(selectedDate),
  });

  const createRunMutation = useMutation({
    mutationFn: (data: CreateDeliveryRunInput) => deliveryRunsApi.create(data),
    onSuccess: (data) => {
      navigate(`/runs/${data.id}`);
    },
    onError: (error) => {
      alert(`Error creating delivery run: ${error instanceof Error ? error.message : 'Unknown error'}`);
    },
  });

  const onSubmit = (data: CreateDeliveryRunInput) => {
    const payload: CreateDeliveryRunInput = {
      ...data,
      orderIds: selectedOrderIds.length > 0 ? selectedOrderIds : undefined,
    };
    createRunMutation.mutate(payload);
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  return (
    <div className="create-delivery-run-page">
      <div className="page-header">
        <h1>Create Delivery Run</h1>
        <button
          type="button"
          onClick={() => !createRunMutation.isPending && navigate('/runs')}
          className="btn btn-secondary"
          disabled={createRunMutation.isPending}
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="run-form">
        <div className="form-section">
          <h2>Basic Information</h2>

          <div className="form-group">
            <label htmlFor="name">
              Run Name <span className="required">*</span>
            </label>
            <input
              id="name"
              type="text"
              {...register('name', { required: 'Run name is required' })}
              placeholder="e.g., Downtown Morning Route"
            />
            {errors.name && <span className="error-message">{errors.name.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="scheduledDate">
              Scheduled Date <span className="required">*</span>
            </label>
            <input
              id="scheduledDate"
              type="date"
              {...register('scheduledDate', {
                required: 'Scheduled date is required',
                onChange: (e) => setSelectedDate(e.target.value),
              })}
            />
            {errors.scheduledDate && (
              <span className="error-message">{errors.scheduledDate.message}</span>
            )}
          </div>
        </div>

        <div className="form-section">
          <h2>Assignment</h2>

          <div className="form-group">
            <label htmlFor="driverId">Driver (optional)</label>
            <select id="driverId" {...register('driverId')}>
              <option value="">Select a driver</option>
              {drivers?.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.firstName} {driver.lastName} ({driver.email})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="vehicleId">Vehicle (optional)</label>
            <select id="vehicleId" {...register('vehicleId')}>
              <option value="">Select a vehicle</option>
              {vehicles?.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.make} {vehicle.model} - {vehicle.licensePlate} ({vehicle.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-section">
          <h2>Orders ({selectedOrderIds.length} selected)</h2>
          <p className="section-description">
            Select orders to include in this delivery run. You can also add orders later.
          </p>

          {unassignedOrders && unassignedOrders.length === 0 && (
            <div className="info-box">No unassigned orders found for this date.</div>
          )}

          {unassignedOrders && unassignedOrders.length > 0 && (
            <div className="orders-list">
              {unassignedOrders.map((order) => (
                <div
                  key={order.id}
                  className={`order-item ${selectedOrderIds.includes(order.id) ? 'selected' : ''}`}
                  onClick={() => toggleOrderSelection(order.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.includes(order.id)}
                    readOnly
                  />
                  <div className="order-info">
                    <div className="order-number">{order.orderNumber}</div>
                    <div className="order-customer">
                      {order.customer?.firstName ?? ''} {order.customer?.lastName ?? ''}
                    </div>
                    <div className="order-address">
                      {order.address?.line1 ?? ''}, {order.address?.city ?? ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button
            type="button"
            onClick={() => navigate('/runs')}
            className="btn btn-secondary"
            disabled={createRunMutation.isPending}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={createRunMutation.isPending}>
            {createRunMutation.isPending ? 'Creating...' : 'Create Delivery Run'}
          </button>
        </div>
      </form>
    </div>
  );
}

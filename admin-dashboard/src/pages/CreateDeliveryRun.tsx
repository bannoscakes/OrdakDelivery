import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Truck, ArrowLeft, Calendar, User, Car, Package } from 'lucide-react';
import { deliveryRunsApi, driversApi, vehiclesApi, ordersApi } from '../api';
import type { CreateDeliveryRunInput } from '../types';
import { toISODateString } from '../utils/date';
import { Button } from '../components/ui/Button';
import { clsx } from 'clsx';

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
    <div className="p-6 bg-dark-bg min-h-full">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <button
            onClick={() => navigate('/runs')}
            className="flex items-center gap-2 text-ordak-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft size={18} />
            Back to Delivery Runs
          </button>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Truck className="text-gradient-pink-start" />
            Create Delivery Run
          </h1>
        </div>
        <Button
          variant="secondary"
          onClick={() => !createRunMutation.isPending && navigate('/runs')}
          disabled={createRunMutation.isPending}
        >
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-dark-card rounded-xl border border-dark-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="text-gradient-cyan-start" size={20} />
            Basic Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-ordak-gray-400 mb-2">
                Run Name <span className="text-gradient-pink-start">*</span>
              </label>
              <input
                id="name"
                type="text"
                {...register('name', { required: 'Run name is required' })}
                placeholder="e.g., Downtown Morning Route"
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-white placeholder-ordak-gray-600 focus:outline-none focus:border-gradient-pink-start"
              />
              {errors.name && (
                <span className="text-ordak-red-light text-sm mt-1">{errors.name.message}</span>
              )}
            </div>

            <div>
              <label htmlFor="scheduledDate" className="block text-sm font-medium text-ordak-gray-400 mb-2">
                Scheduled Date <span className="text-gradient-pink-start">*</span>
              </label>
              <input
                id="scheduledDate"
                type="date"
                {...register('scheduledDate', {
                  required: 'Scheduled date is required',
                  onChange: (e) => setSelectedDate(e.target.value),
                })}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gradient-pink-start"
              />
              {errors.scheduledDate && (
                <span className="text-ordak-red-light text-sm mt-1">{errors.scheduledDate.message}</span>
              )}
            </div>
          </div>
        </div>

        {/* Assignment */}
        <div className="bg-dark-card rounded-xl border border-dark-border p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="text-gradient-purple-start" size={20} />
            Assignment
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="driverId" className="block text-sm font-medium text-ordak-gray-400 mb-2">
                Driver (optional)
              </label>
              <select
                id="driverId"
                {...register('driverId')}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gradient-purple-start"
              >
                <option value="">Select a driver</option>
                {drivers?.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.firstName} {driver.lastName} ({driver.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="vehicleId" className="block text-sm font-medium text-ordak-gray-400 mb-2">
                <Car className="inline mr-1" size={16} />
                Vehicle (optional)
              </label>
              <select
                id="vehicleId"
                {...register('vehicleId')}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-gradient-purple-start"
              >
                <option value="">Select a vehicle</option>
                {vehicles?.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.make} {vehicle.model} - {vehicle.licensePlate} ({vehicle.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Orders */}
        <div className="bg-dark-card rounded-xl border border-dark-border p-6">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <Package className="text-gradient-green-start" size={20} />
            Orders ({selectedOrderIds.length} selected)
          </h2>
          <p className="text-sm text-ordak-gray-400 mb-4">
            Select orders to include in this delivery run. You can also add orders later.
          </p>

          {unassignedOrders && unassignedOrders.length === 0 && (
            <div className="bg-dark-bg rounded-lg p-4 text-ordak-gray-400 text-center">
              No unassigned orders found for this date.
            </div>
          )}

          {unassignedOrders && unassignedOrders.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {unassignedOrders.map((order) => (
                <div
                  key={order.id}
                  onClick={() => toggleOrderSelection(order.id)}
                  className={clsx(
                    'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all',
                    selectedOrderIds.includes(order.id)
                      ? 'bg-gradient-green-start/10 border-gradient-green-start'
                      : 'bg-dark-bg border-dark-border hover:border-ordak-gray-600'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.includes(order.id)}
                    readOnly
                    className="w-4 h-4 rounded accent-gradient-green-start"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-white">{order.orderNumber}</p>
                    <p className="text-sm text-ordak-gray-400">
                      {order.customer?.firstName ?? ''} {order.customer?.lastName ?? ''}
                    </p>
                    <p className="text-sm text-ordak-gray-600">
                      {order.address?.line1 ?? ''}, {order.address?.city ?? ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/runs')}
            disabled={createRunMutation.isPending}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={createRunMutation.isPending}>
            {createRunMutation.isPending ? 'Creating...' : 'Create Delivery Run'}
          </Button>
        </div>
      </form>
    </div>
  );
}

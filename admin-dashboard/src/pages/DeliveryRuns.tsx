import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { deliveryRunsApi } from '../api';
import { RunStatus } from '../types';
import { formatDate } from '../utils/date';
import './DeliveryRuns.css';

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

  return (
    <div className="delivery-runs-page">
      <div className="page-header">
        <h1>Delivery Runs</h1>
        <Link to="/runs/create" className="btn btn-primary">
          Create New Run
        </Link>
      </div>

      <div className="filters">
        <label>
          Filter by Status:
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RunStatus | '')}
          >
            <option value="">All Statuses</option>
            {Object.values(RunStatus).map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && <div className="loading">Loading delivery runs...</div>}

      {error && (
        <div className="error">
          Error loading delivery runs: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {data && (
        <div className="runs-grid">
          {data.data.length === 0 ? (
            <div className="empty-state">
              <p>No delivery runs found.</p>
              <Link to="/runs/create" className="btn btn-primary">
                Create Your First Run
              </Link>
            </div>
          ) : (
            data.data.map((run) => (
              <div key={run.id} className="run-card">
                <div className="run-card-header">
                  <h3>{run.name}</h3>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(run.status) }}
                  >
                    {run.status}
                  </span>
                </div>
                <div className="run-card-body">
                  <div className="run-detail">
                    <strong>Date:</strong> {formatDate(run.scheduledDate)}
                  </div>
                  {run.driver && (
                    <div className="run-detail">
                      <strong>Driver:</strong> {run.driver.firstName} {run.driver.lastName}
                    </div>
                  )}
                  {run.vehicle && (
                    <div className="run-detail">
                      <strong>Vehicle:</strong> {run.vehicle.make} {run.vehicle.model} (
                      {run.vehicle.licensePlate})
                    </div>
                  )}
                  <div className="run-detail">
                    <strong>Orders:</strong> {run.orders?.length || 0}
                  </div>
                </div>
                <div className="run-card-footer">
                  <Link to={`/runs/${run.id}`} className="btn btn-sm">
                    View Details
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {data && data.pagination && data.pagination.totalPages > 1 && (
        <div className="pagination">
          Page {data.pagination.page} of {data.pagination.totalPages}
        </div>
      )}
    </div>
  );
}

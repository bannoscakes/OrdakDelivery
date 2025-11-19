import { useQuery } from '@tanstack/react-query';
import { ordersApi } from '../api';
import { formatDate } from '../utils/date';

export function Orders() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['orders'],
    queryFn: () => ordersApi.list({ limit: 50 }),
  });

  return (
    <div>
      <div className="page-header">
        <h1>Orders</h1>
      </div>

      {isLoading && <div className="loading">Loading orders...</div>}
      {error && <div className="error">Error loading orders</div>}

      {data && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <p>Total orders: {data.pagination.total} (showing {data.data.length})</p>
          <div style={{ marginTop: '20px' }}>
            {data.data.map((order) => (
              <div
                key={order.id}
                style={{
                  padding: '15px',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <strong>{order.orderNumber}</strong> - {order.customer?.firstName ?? 'Unknown'}{' '}
                  {order.customer?.lastName ?? ''}
                  <br />
                  <small style={{ color: '#666' }}>
                    {order.address?.line1 ?? '—'}, {order.address?.city ?? '—'} •{' '}
                    {order.scheduledDate ? formatDate(order.scheduledDate) : '—'}
                  </small>
                </div>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    background: '#e3f2fd',
                    fontSize: '12px',
                  }}
                >
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

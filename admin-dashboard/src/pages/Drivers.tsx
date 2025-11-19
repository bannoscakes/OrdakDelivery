import { useQuery } from '@tanstack/react-query';
import { driversApi } from '../api';

export function Drivers() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversApi.list({ limit: 50 }),
  });

  return (
    <div>
      <div className="page-header">
        <h1>Drivers</h1>
      </div>

      {isLoading && <div className="loading">Loading drivers...</div>}
      {error && <div className="error">Error loading drivers</div>}

      {data && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <p>Total drivers: {data.pagination.total} (showing {data.data.length})</p>
          <div style={{ marginTop: '20px' }}>
            {data.data.map((driver) => (
              <div
                key={driver.id}
                style={{
                  padding: '15px',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <strong>
                    {driver.firstName} {driver.lastName}
                  </strong>
                  <br />
                  <small style={{ color: '#666' }}>
                    {driver.email} • {driver.phone}
                  </small>
                </div>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    background: driver.status === 'ACTIVE' ? '#d4edda' : '#f8d7da',
                    fontSize: '12px',
                  }}
                >
                  {driver.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

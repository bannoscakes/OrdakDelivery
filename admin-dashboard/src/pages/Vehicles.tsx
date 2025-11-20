import { useQuery } from '@tanstack/react-query';
import { vehiclesApi } from '../api';

export function Vehicles() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.list({ limit: 50 }),
  });

  return (
    <div>
      <div className="page-header">
        <h1>Vehicles</h1>
      </div>

      {isLoading && <div className="loading">Loading vehicles...</div>}
      {error && <div className="error">Error loading vehicles</div>}

      {data && (
        <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
          <p>Total vehicles: {data.data.length}</p>
          <div style={{ marginTop: '20px' }}>
            {data.data.map((vehicle) => (
              <div
                key={vehicle.id}
                style={{
                  padding: '15px',
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <strong>
                    {vehicle.make} {vehicle.model} ({vehicle.year})
                  </strong>
                  <br />
                  <small style={{ color: '#666' }}>
                    {vehicle.licensePlate} • {vehicle.type}
                  </small>
                </div>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    background: vehicle.status === 'active' ? '#d4edda' : vehicle.status === 'maintenance' ? '#fff3cd' : '#f8d7da',
                    fontSize: '12px',
                  }}
                >
                  {vehicle.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

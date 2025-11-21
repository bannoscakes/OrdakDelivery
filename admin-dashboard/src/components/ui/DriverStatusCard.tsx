import { clsx } from 'clsx';

interface DriverStatusCardProps {
  driverName: string;
  status: 'online' | 'busy' | 'offline';
  completedDeliveries: number;
  totalDeliveries: number;
  distanceAway?: string;
}

export const DriverStatusCard = ({
  driverName,
  status,
  completedDeliveries,
  totalDeliveries,
  distanceAway
}: DriverStatusCardProps) => {
  const statusConfig = {
    online: { color: 'bg-gradient-green-start', text: 'Online', textColor: 'text-gradient-green-start' },
    busy: { color: 'bg-gradient-yellow-start', text: 'Busy', textColor: 'text-gradient-yellow-start' },
    offline: { color: 'bg-ordak-gray-600', text: 'Offline', textColor: 'text-ordak-gray-400' },
  };

  const config = statusConfig[status];
  const progress = totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0;

  const progressColor = {
    online: 'bg-gradient-to-r from-gradient-green-start to-gradient-green-end',
    busy: 'bg-gradient-to-r from-gradient-yellow-start to-gradient-yellow-end',
    offline: 'bg-ordak-gray-600',
  }[status];

  return (
    <div className="bg-dark-bg rounded-lg p-4 border border-dark-border hover:border-ordak-gray-600 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-white">{driverName}</h3>
        <span className={clsx('flex items-center gap-2 text-sm', config.textColor)}>
          <span className={clsx('w-2 h-2 rounded-full', config.color)} />
          <span className="font-medium">{config.text}</span>
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm text-ordak-gray-400 mb-2">
          <span>Deliveries</span>
          <span className="text-white font-medium">{completedDeliveries}/{totalDeliveries}</span>
        </div>
        <div className="w-full bg-dark-border rounded-full h-1.5">
          <div
            className={clsx(
              'h-1.5 rounded-full transition-all duration-500',
              progressColor
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {distanceAway && (
        <p className="text-sm text-ordak-gray-400 flex items-center gap-1">
          <span className="text-gradient-pink-start">📍</span>
          {distanceAway}
        </p>
      )}
    </div>
  );
};

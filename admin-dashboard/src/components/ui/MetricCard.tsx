import type { ReactNode } from 'react';
import { clsx } from 'clsx';

type GradientVariant = 'pink' | 'cyan' | 'green' | 'purple' | 'orange' | 'yellow';

interface MetricCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  variant?: GradientVariant;
}

const gradientStyles: Record<GradientVariant, string> = {
  pink: 'bg-gradient-to-br from-gradient-pink-start to-gradient-pink-end',
  cyan: 'bg-gradient-to-br from-gradient-cyan-start to-gradient-cyan-end',
  green: 'bg-gradient-to-br from-gradient-green-start to-gradient-green-end',
  purple: 'bg-gradient-to-br from-gradient-purple-start to-gradient-purple-end',
  orange: 'bg-gradient-to-br from-gradient-orange-start to-gradient-orange-end',
  yellow: 'bg-gradient-to-br from-gradient-yellow-start to-gradient-yellow-end',
};

export const MetricCard = ({ icon, label, value, trend, variant }: MetricCardProps) => {
  const hasGradient = !!variant;

  return (
    <div className={clsx(
      'rounded-xl p-5 transition-all duration-300 hover:scale-105 hover:shadow-2xl',
      hasGradient
        ? `${gradientStyles[variant]} text-white shadow-lg`
        : 'bg-dark-card border border-dark-border text-white hover:border-ordak-gray-600'
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className={clsx(
          'text-2xl',
          hasGradient ? 'opacity-90' : 'text-ordak-gray-400'
        )}>
          {icon}
        </span>
      </div>

      <p className={clsx(
        'text-xs font-medium uppercase tracking-wider mb-1',
        hasGradient ? 'text-white/80' : 'text-ordak-gray-400'
      )}>
        {label}
      </p>

      <p className={clsx(
        'text-3xl font-bold mb-1',
        hasGradient ? 'text-white' : 'text-white'
      )}>
        {value}
      </p>

      {trend && (
        <p className={clsx(
          'text-xs',
          hasGradient ? 'text-white/70' : 'text-ordak-gray-600'
        )}>
          {trend}
        </p>
      )}
    </div>
  );
};

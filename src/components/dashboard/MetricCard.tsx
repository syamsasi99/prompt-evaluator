import React, { useState } from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: number; // Percentage change
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  onClick?: () => void;
  infoText?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'blue',
  onClick,
  infoText,
}: MetricCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
  };

  const trendColor = trend && trend > 0 ? 'text-green-600' : trend && trend < 0 ? 'text-red-600' : 'text-gray-600';
  const trendIcon = trend && trend > 0 ? '↑' : trend && trend < 0 ? '↓' : '→';

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 shadow-sm p-6 ${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            {infoText && (
              <div className="relative">
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTooltip(!showTooltip);
                  }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                {showTooltip && (
                  <div className="absolute z-50 bottom-full left-0 mb-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                    {infoText}
                    <div className="absolute top-full left-4 -mt-1">
                      <div className="border-4 border-transparent border-t-gray-900"></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
        </div>
        {icon && (
          <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]}`}>
            <div className="text-white">{icon}</div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        {trend !== undefined && Math.abs(trend) > 0.1 && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
            <span>{trendIcon}</span>
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

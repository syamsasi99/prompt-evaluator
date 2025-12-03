import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

interface MiniChartProps {
  data: { timestamp: string; value: number }[];
  title: string;
  color?: string;
  valueFormatter?: (value: number) => string;
  onClick?: () => void;
}

export function MiniChart({
  data,
  title,
  color = '#3B82F6',
  valueFormatter = (value) => value.toFixed(1),
  onClick,
}: MiniChartProps) {
  // Calculate current and trend
  const currentValue = data.length > 0 ? data[data.length - 1].value : 0;
  const previousValue = data.length > 1 ? data[0].value : currentValue;
  const trend = previousValue !== 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0;
  const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '→';
  const trendColor = trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-600';

  if (data.length === 0) {
    return (
      <div
        className={`bg-white rounded-lg border shadow-sm p-4 ${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow`}
        onClick={onClick}
      >
        <h4 className="text-sm font-medium text-gray-600 mb-2">{title}</h4>
        <p className="text-gray-400 text-xs">No data available</p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg border shadow-sm p-4 ${onClick ? 'cursor-pointer hover:shadow-md' : ''} transition-shadow`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-sm font-medium text-gray-600">{title}</h4>
          <p className="text-2xl font-bold text-gray-900 mt-1">{valueFormatter(currentValue)}</p>
        </div>
        {Math.abs(trend) > 0.1 && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${trendColor}`}>
            <span>{trendIcon}</span>
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className="h-16 -mx-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <YAxis hide domain={['dataMin', 'dataMax']} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

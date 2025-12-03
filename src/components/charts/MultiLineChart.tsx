import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDarkMode } from '../../contexts/DarkModeContext';

interface Series {
  key: string;
  name: string;
  color: string;
}

interface MultiLineChartProps {
  data: any[];
  series: Series[];
  title: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  valueFormatter?: (value: number) => string;
  showGrid?: boolean;
  height?: number;
}

export function MultiLineChart({
  data,
  series,
  title,
  yAxisLabel,
  xAxisLabel,
  valueFormatter = (value) => value.toFixed(1),
  showGrid = true,
  height = 300,
}: MultiLineChartProps) {
  const { isDarkMode } = useDarkMode();

  // Format timestamp for display
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Dark mode aware colors
  const gridColor = isDarkMode ? '#374151' : '#E5E7EB';
  const axisColor = isDarkMode ? '#9CA3AF' : '#6B7280';
  const tooltipBg = isDarkMode ? '#1F2937' : 'white';
  const tooltipBorder = isDarkMode ? '#374151' : '#E5E7EB';
  const tooltipTextColor = isDarkMode ? '#F3F4F6' : '#111827';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 80, bottom: 25 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatDate}
            stroke={axisColor}
            style={{ fontSize: '12px', fill: axisColor }}
            label={xAxisLabel ? { value: xAxisLabel, position: 'bottom', offset: 0, fill: axisColor } : undefined}
          />
          <YAxis
            stroke={axisColor}
            style={{ fontSize: '12px', fill: axisColor }}
            tickFormatter={valueFormatter}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -65, style: { textAnchor: 'middle' }, fill: axisColor } : undefined}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBg,
              border: `1px solid ${tooltipBorder}`,
              borderRadius: '8px',
              padding: '8px',
              color: tooltipTextColor,
            }}
            labelStyle={{ color: tooltipTextColor }}
            itemStyle={{ color: tooltipTextColor }}
            labelFormatter={(label) => `Date: ${formatDate(label)}`}
            formatter={(value: number) => [valueFormatter(value), '']}
          />
          <Legend wrapperStyle={{ color: isDarkMode ? '#F3F4F6' : '#111827' }} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={{ fill: s.color, r: 4 }}
              activeDot={{ r: 6 }}
              name={s.name}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

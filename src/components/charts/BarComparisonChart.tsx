import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useDarkMode } from '../../contexts/DarkModeContext';

interface DataPoint {
  name: string;
  value: number;
  color?: string;
}

interface BarComparisonChartProps {
  data: DataPoint[];
  title: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
  valueFormatter?: (value: number) => string;
  showGrid?: boolean;
  height?: number;
  horizontal?: boolean;
}

export function BarComparisonChart({
  data,
  title,
  yAxisLabel,
  xAxisLabel,
  valueFormatter = (value) => value.toFixed(1),
  showGrid = true,
  height = 300,
  horizontal = false,
}: BarComparisonChartProps) {
  const { isDarkMode } = useDarkMode();
  const defaultColor = '#3B82F6';

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
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 5, right: 30, left: 80, bottom: 25 }}
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />}
          {horizontal ? (
            <>
              <XAxis
                type="number"
                tickFormatter={valueFormatter}
                stroke={axisColor}
                style={{ fontSize: '12px', fill: axisColor }}
                label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fill: axisColor } : undefined}
              />
              <YAxis
                type="category"
                dataKey="name"
                stroke={axisColor}
                style={{ fontSize: '12px', fill: axisColor }}
                width={100}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="name"
                stroke={axisColor}
                style={{ fontSize: '12px', fill: axisColor }}
                label={xAxisLabel ? { value: xAxisLabel, position: 'bottom', offset: 0, fill: axisColor } : undefined}
              />
              <YAxis
                tickFormatter={valueFormatter}
                stroke={axisColor}
                style={{ fontSize: '12px', fill: axisColor }}
                label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', offset: -65, style: { textAnchor: 'middle' }, fill: axisColor } : undefined}
              />
            </>
          )}
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
            formatter={(value: number) => [valueFormatter(value), 'Value']}
          />
          <Legend wrapperStyle={{ color: isDarkMode ? '#F3F4F6' : '#111827' }} />
          <Bar dataKey="value" name={yAxisLabel || 'Value'} radius={[8, 8, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || defaultColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

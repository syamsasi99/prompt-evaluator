import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDarkMode } from '../../contexts/DarkModeContext';

interface DataPoint {
  name: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: DataPoint[];
  title: string;
  valueFormatter?: (value: number) => string;
  height?: number;
  showLabels?: boolean;
}

export function PieChart({
  data,
  title,
  valueFormatter = (value) => value.toLocaleString(),
  height = 300,
  showLabels = true,
}: PieChartProps) {
  const { isDarkMode } = useDarkMode();

  const renderLabel = (entry: any) => {
    const percent = ((entry.value / data.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1);
    return `${percent}%`;
  };

  // Dark mode aware colors
  const tooltipBg = isDarkMode ? '#1F2937' : 'white';
  const tooltipBorder = isDarkMode ? '#374151' : '#E5E7EB';
  const tooltipTextColor = isDarkMode ? '#F3F4F6' : '#111827';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={showLabels}
            label={showLabels ? renderLabel : false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
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
            formatter={(value: number) => [valueFormatter(value), '']}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            wrapperStyle={{ color: isDarkMode ? '#F3F4F6' : '#111827' }}
            formatter={(value, entry: any) => (
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {value}: {valueFormatter(entry.payload.value)}
              </span>
            )}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

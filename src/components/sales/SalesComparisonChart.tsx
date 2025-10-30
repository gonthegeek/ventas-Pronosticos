import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { formatCurrency } from '../../utils/timezone';

interface SalesComparisonChartProps {
  data: Array<{
    date: string;
    displayName: string;
    totalSales: number;
    machine76: number;
    machine79: number;
  }>;
  selectedMachines: string[];
  mode?: 'line' | 'bar';
}

const SalesComparisonChart: React.FC<SalesComparisonChartProps> = ({
  data,
  selectedMachines,
  mode = 'line',
}) => {
  // Format data for chart
  const chartData = data.map((item, index) => {
    // Generate short label based on data length
    let shortName: string;
    if (data.length <= 7) {
      // For 7 or fewer items, show day name (e.g., "Lun", "Mar")
      const date = new Date(item.date);
      shortName = date.toLocaleDateString('es-ES', { weekday: 'short' });
    } else if (data.length <= 31) {
      // For up to a month, show day number (e.g., "1", "15", "31")
      const date = new Date(item.date);
      shortName = date.getDate().toString();
    } else {
      // For longer periods, show abbreviated date (e.g., "Sep 1", "Oct 15")
      const date = new Date(item.date);
      shortName = date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
    }

    return {
      name: item.displayName,
      shortName,
      total: item.totalSales,
      machine76: selectedMachines.includes('76') ? item.machine76 : 0,
      machine79: selectedMachines.includes('79') ? item.machine79 : 0,
      date: item.date,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-1">{payload[0].payload.name}</p>
          <p className="text-sm text-gray-600 mb-2">{payload[0].payload.date}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: <strong>{formatCurrency(entry.value)}</strong>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const formatYAxis = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}k`;
    }
    return `$${value}`;
  };

  if (mode === 'bar') {
    return (
      <div className="w-full h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="shortName"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
            />
            <YAxis tickFormatter={formatYAxis} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {selectedMachines.includes('76') && (
              <Bar
                dataKey="machine76"
                name="Máquina 76"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            )}
            {selectedMachines.includes('79') && (
              <Bar
                dataKey="machine79"
                name="Máquina 79"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
            )}
            <Bar
              dataKey="total"
              name="Total"
              fill="#8b5cf6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="shortName"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12 }}
          />
          <YAxis tickFormatter={formatYAxis} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {selectedMachines.includes('76') && (
            <Line
              type="monotone"
              dataKey="machine76"
              name="Máquina 76"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
          {selectedMachines.includes('79') && (
            <Line
              type="monotone"
              dataKey="machine79"
              name="Máquina 79"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#8b5cf6"
            strokeWidth={3}
            dot={{ r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalesComparisonChart;

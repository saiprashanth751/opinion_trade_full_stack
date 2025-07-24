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
} from 'recharts';

interface PricePoint {
  timestamp: number;
  yesPrice: number;
  noPrice: number;
}

interface PriceLineChartProps {
  priceHistory: PricePoint[];
}

export const PriceLineChart: React.FC<PriceLineChartProps> = ({ priceHistory }) => {
  // Format timestamp for display on X-axis
  const formatXAxis = (tickItem: number) => {
    return new Date(tickItem).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full h-80"> {/* Set a fixed height for the chart container */}
      <h3 className="text-lg font-semibold mb-2">Price Movement</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={priceHistory}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={formatXAxis}
            minTickGap={30} // Adjust to prevent overlapping labels
            interval="preserveStartEnd"
          />
          <YAxis domain={['auto', 'auto']} />
          <Tooltip
            labelFormatter={(label) => new Date(label).toLocaleString()}
            formatter={(value: number) => [`₹${value.toFixed(2)}`]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="yesPrice"
            stroke="#8884d8"
            activeDot={{ r: 8 }}
            name="Yes Price"
            dot={false} // Hide dots for cleaner look
          />
          <Line
            type="monotone"
            dataKey="noPrice"
            stroke="#82ca9d"
            name="No Price"
            dot={false} // Hide dots for cleaner look
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

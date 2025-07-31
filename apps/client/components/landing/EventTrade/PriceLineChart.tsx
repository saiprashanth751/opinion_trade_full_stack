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
import { TrendingUp, Activity } from 'lucide-react';

interface PricePoint {
  timestamp: number;
  yesPrice: number;
  noPrice: number;
}

interface PriceLineChartProps {
  priceHistory: PricePoint[];
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-lg p-4 shadow-2xl">
        <p className="text-slate-300 text-sm font-medium mb-2">
          {new Date(label).toLocaleString()}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-white font-semibold">
              {entry.name}: ₹{entry.value % 1 === 0 ? entry.value.toFixed(0) : entry.value.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const PriceLineChart: React.FC<PriceLineChartProps> = ({ priceHistory }) => {
  // Format timestamp for display on X-axis
  const formatXAxis = (tickItem: number) => {
    return new Date(tickItem).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="w-full h-[28rem] p-6">
      {/* Header with icon */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
          <Activity className="w-5 h-5 text-cyan-400" />
        </div>
        <h3 className="text-xl font-bold text-white">Price Movement</h3>
        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-sm text-slate-300 font-medium">Yes Price</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm text-slate-300 font-medium">No Price</span>
          </div>
        </div>
      </div>

      {/* Increased chart container height from h-80 to h-96 */}
      <div className="w-full h-96 bg-slate-900/30 rounded-xl border border-slate-700/30 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={priceHistory}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            {/* Dark theme grid */}
            <CartesianGrid 
              strokeDasharray="2 2" 
              stroke="#334155" 
              strokeOpacity={0.3}
            />
            
            {/* X-axis with dark theme */}
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatXAxis}
              minTickGap={40}
              interval="preserveStartEnd"
              axisLine={{ stroke: '#475569', strokeWidth: 1 }}
              tickLine={{ stroke: '#475569' }}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
            />
            
            {/* Y-axis with dark theme */}
            <YAxis 
              domain={['dataMin - 2', 'dataMax + 2']}
              axisLine={{ stroke: '#475569', strokeWidth: 1 }}
              tickLine={{ stroke: '#475569' }}
              tick={{ fill: '#94a3b8', fontSize: 12 }}
              tickFormatter={(value) => `₹${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}`}
            />
            
            {/* Custom tooltip */}
            <Tooltip content={<CustomTooltip />} />
            
            {/* Yes price line with glow effect */}
            <Line
              type="monotone"
              dataKey="yesPrice"
              stroke="#10b981"
              strokeWidth={3}
              dot={false}
              name="Yes Price"
              filter="drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))"
              activeDot={{ 
                r: 6, 
                fill: '#10b981',
                stroke: '#065f46',
                strokeWidth: 2,
                filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))'
              }}
            />
            
            {/* No price line with glow effect */}
            <Line
              type="monotone"
              dataKey="noPrice"
              stroke="#ef4444"
              strokeWidth={3}
              dot={false}
              name="No Price"
              filter="drop-shadow(0 0 6px rgba(239, 68, 68, 0.4))"
              activeDot={{ 
                r: 6, 
                fill: '#ef4444',
                stroke: '#7f1d1d',
                strokeWidth: 2,
                filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))'
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
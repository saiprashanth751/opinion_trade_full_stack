import React, { useState, useMemo, useEffect } from 'react';
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
import { TrendingUp, Activity, Clock, BarChart3 } from 'lucide-react';

interface PricePoint {
  timestamp: number;
  yesPrice: number;
  noPrice: number;
}

interface PriceLineChartProps {
  priceHistory: PricePoint[];
  isInitialDataLoaded?: boolean;
}

type TimeFrame = '1H' | '6H' | '24H' | 'ALL';

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
              {entry.name}: ₹{entry.value.toFixed(6)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const PriceLineChart: React.FC<PriceLineChartProps> = ({ 
  priceHistory, 
  isInitialDataLoaded = true 
}) => {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('24H');

  // Filter data based on selected timeframe
  const filteredData = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) return [];

    const now = Date.now();
    let cutoffTime: number;

    switch (selectedTimeFrame) {
      case '1H':
        cutoffTime = now - (60 * 60 * 1000);
        break;
      case '6H':
        cutoffTime = now - (6 * 60 * 60 * 1000);
        break;
      case '24H':
        cutoffTime = now - (24 * 60 * 60 * 1000);
        break;
      case 'ALL':
      default:
        cutoffTime = 0;
        break;
    }

    return priceHistory
      .filter(point => point.timestamp >= cutoffTime)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [priceHistory, selectedTimeFrame]);

  // Calculate price change
  const priceStats = useMemo(() => {
    if (filteredData.length < 2) {
      return { yesChange: 0, noChange: 0, yesChangePercent: 0, noChangePercent: 0 };
    }

    const firstPoint = filteredData[0];
    const lastPoint = filteredData[filteredData.length - 1];

    const yesChange = lastPoint.yesPrice - firstPoint.yesPrice;
    const noChange = lastPoint.noPrice - firstPoint.noPrice;
    const yesChangePercent = firstPoint.yesPrice !== 0 ? (yesChange / firstPoint.yesPrice) * 100 : 0;
    const noChangePercent = firstPoint.noPrice !== 0 ? (noChange / firstPoint.noPrice) * 100 : 0;

    return { yesChange, noChange, yesChangePercent, noChangePercent };
  }, [filteredData]);

  // Format timestamp for display on X-axis
  const formatXAxis = (tickItem: number) => {
    const date = new Date(tickItem);
    if (selectedTimeFrame === '1H') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  // Calculate Y-axis domain with padding
  const yAxisDomain = useMemo(() => {
    if (filteredData.length === 0) return [0, 100];
    
    const allPrices = filteredData.flatMap(point => [point.yesPrice, point.noPrice]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const padding = (maxPrice - minPrice) * 0.1; // 10% padding
    
    return [
      Math.max(0, minPrice - padding),
      Math.min(100, maxPrice + padding)
    ];
  }, [filteredData]);

  const timeFrameButtons: { key: TimeFrame; label: string; icon: React.ReactNode }[] = [
    { key: '1H', label: '1H', icon: <Clock className="w-3 h-3" /> },
    { key: '6H', label: '6H', icon: <Clock className="w-3 h-3" /> },
    { key: '24H', label: '24H', icon: <BarChart3 className="w-3 h-3" /> },
    { key: 'ALL', label: 'ALL', icon: <TrendingUp className="w-3 h-3" /> },
  ];

  return (
    <div className="w-full h-[28rem] p-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Price Movement</h3>
            {!isInitialDataLoaded && (
              <p className="text-sm text-slate-400">Loading historical data...</p>
            )}
          </div>
        </div>
        
        {/* Timeframe selector */}
        <div className="flex items-center gap-2">
          {timeFrameButtons.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setSelectedTimeFrame(key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedTimeFrame === key
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-700/50 text-slate-300 border border-slate-600/30 hover:bg-slate-600/50'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Price statistics */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-sm text-slate-300 font-medium">Yes Price</span>
            {filteredData.length > 0 && (
              <span className={`text-sm font-semibold ${
                priceStats.yesChange >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {priceStats.yesChange >= 0 ? '+' : ''}{priceStats.yesChange.toFixed(4)} 
                ({priceStats.yesChangePercent >= 0 ? '+' : ''}{priceStats.yesChangePercent.toFixed(2)}%)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm text-slate-300 font-medium">No Price</span>
            {filteredData.length > 0 && (
              <span className={`text-sm font-semibold ${
                priceStats.noChange >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {priceStats.noChange >= 0 ? '+' : ''}{priceStats.noChange.toFixed(4)}
                ({priceStats.noChangePercent >= 0 ? '+' : ''}{priceStats.noChangePercent.toFixed(2)}%)
              </span>
            )}
          </div>
        </div>
        
        {/* Data points counter */}
        <div className="text-sm text-slate-400">
          {filteredData.length} data points
        </div>
      </div>

      {/* Chart container */}
      <div className="w-full h-96 bg-slate-900/30 rounded-xl border border-slate-700/30 p-4">
        {!isInitialDataLoaded ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Activity className="w-8 h-8 animate-pulse text-cyan-400 mx-auto mb-3" />
              <p className="text-slate-400">Loading chart data...</p>
            </div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">No data available for selected timeframe</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filteredData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid 
                strokeDasharray="2 2" 
                stroke="#334155" 
                strokeOpacity={0.3}
              />
              
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                minTickGap={60}
                interval="preserveStartEnd"
                axisLine={{ stroke: '#475569', strokeWidth: 1 }}
                tickLine={{ stroke: '#475569' }}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              
              <YAxis 
                domain={yAxisDomain}
                axisLine={{ stroke: '#475569', strokeWidth: 1 }}
                tickLine={{ stroke: '#475569' }}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(value) => `₹${value.toFixed(2)}`}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Yes price line */}
              <Line
                type="monotone"
                dataKey="yesPrice"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
                name="Yes Price"
                connectNulls={false}
                activeDot={{ 
                  r: 5, 
                  fill: '#10b981',
                  stroke: '#065f46',
                  strokeWidth: 2,
                }}
              />
              
              {/* No price line */}
              <Line
                type="monotone"
                dataKey="noPrice"
                stroke="#ef4444"
                strokeWidth={2.5}
                dot={false}
                name="No Price"
                connectNulls={false}
                activeDot={{ 
                  r: 5, 
                  fill: '#ef4444',
                  stroke: '#7f1d1d',
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
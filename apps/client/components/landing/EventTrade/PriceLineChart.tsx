import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1 = normal, 2 = 2x zoom, etc.
  
  // Refs to maintain stable state and prevent unnecessary re-renders
  const stableDataRef = useRef<PricePoint[]>([]);
  const lastUpdateRef = useRef<number>(0);
  const domainRef = useRef<[number, number]>([0, 100]);
  const timeRangeRef = useRef<[number, number]>([0, 0]);

  // CRITICAL: Stable data processing to prevent chart blinking
  const { chartData, yAxisDomain, xAxisDomain, priceStats } = useMemo(() => {
    if (!priceHistory || priceHistory.length === 0) {
      return {
        chartData: stableDataRef.current,
        yAxisDomain: domainRef.current,
        xAxisDomain: timeRangeRef.current,
        priceStats: { yesChange: 0, noChange: 0, yesChangePercent: 0, noChangePercent: 0 }
      };
    }

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

    // Filter and sort data
    let filtered = priceHistory
      .filter(point => point.timestamp >= cutoffTime)
      .sort((a, b) => a.timestamp - b.timestamp);

    // ACTUAL ZOOM IMPLEMENTATION: Filter data based on zoom level
    if (zoomLevel !== 1 && filtered.length > 0) {
      const totalDataPoints = filtered.length;
      const zoomedDataPoints = Math.max(10, Math.floor(totalDataPoints / zoomLevel)); // Minimum 10 points
      
      // Take the most recent data points for zoom
      filtered = filtered.slice(-zoomedDataPoints);
    }

    // PROFESSIONAL TRADING CHART BEHAVIOR: 
    // Show data from start, but extend time window so latest data appears in right-middle
    let startTime: number, endTime: number;
    
    if (filtered.length === 0) {
      const chartTimeSpan = selectedTimeFrame === '1H' ? 60 * 60 * 1000 :
                           selectedTimeFrame === '6H' ? 6 * 60 * 60 * 1000 :
                           24 * 60 * 60 * 1000;
      startTime = now - chartTimeSpan;
      endTime = now;
    } else {
      const dataStartTime = filtered[0].timestamp;
      const dataEndTime = filtered[filtered.length - 1].timestamp;
      const dataSpan = dataEndTime - dataStartTime;
      
      // Extend the end time so the latest data appears in right-middle (not at edge)
      const extension = Math.max(dataSpan * 0.3, 10 * 60 * 1000); // 30% extension or 10 minutes minimum
      
      startTime = dataStartTime;
      endTime = dataEndTime + extension;
    }

    // Update stable data only if there are meaningful changes
    const dataChanged = filtered.length !== stableDataRef.current.length ||
                       (filtered.length > 0 && stableDataRef.current.length > 0 &&
                        filtered[filtered.length - 1].timestamp !== stableDataRef.current[stableDataRef.current.length - 1]?.timestamp);

    if (dataChanged || now - lastUpdateRef.current > 5000) { // Update every 5 seconds max
      stableDataRef.current = filtered;
      lastUpdateRef.current = now;
    }

    // Calculate Y-axis domain with stable padding
    let yMin = 0, yMax = 100;
    if (stableDataRef.current.length > 0) {
      const allPrices = stableDataRef.current.flatMap(point => [point.yesPrice, point.noPrice]);
      const minPrice = Math.min(...allPrices);
      const maxPrice = Math.max(...allPrices);
      const padding = Math.max(1, (maxPrice - minPrice) * 0.15); // At least 1 unit padding
      
      yMin = Math.max(0, minPrice - padding);
      yMax = Math.min(100, maxPrice + padding);
    }

    // Only update domain if there's a significant change (reduces blinking)
    const domainChange = Math.abs(yMin - domainRef.current[0]) > 0.5 || 
                        Math.abs(yMax - domainRef.current[1]) > 0.5;
    
    if (domainChange) {
      domainRef.current = [yMin, yMax];
    }

    // Set stable time range
    timeRangeRef.current = [startTime, endTime];

    // Price statistics
    const stats = stableDataRef.current.length < 2 ? 
      { yesChange: 0, noChange: 0, yesChangePercent: 0, noChangePercent: 0 } :
      (() => {
        const first = stableDataRef.current[0];
        const last = stableDataRef.current[stableDataRef.current.length - 1];
        const yesChange = last.yesPrice - first.yesPrice;
        const noChange = last.noPrice - first.noPrice;
        return {
          yesChange,
          noChange,
          yesChangePercent: first.yesPrice !== 0 ? (yesChange / first.yesPrice) * 100 : 0,
          noChangePercent: first.noPrice !== 0 ? (noChange / first.noPrice) * 100 : 0
        };
      })();

    return {
      chartData: stableDataRef.current,
      yAxisDomain: domainRef.current,
      xAxisDomain: [startTime, endTime],
      priceStats: stats
    };
  }, [priceHistory, selectedTimeFrame]);

  // PROFESSIONAL X-AXIS: Stable formatting that doesn't jump
  const formatXAxis = (tickItem: number) => {
    const date = new Date(tickItem);
    if (selectedTimeFrame === '1H') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (selectedTimeFrame === '6H') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      // For 24H and ALL, show time or date based on span
      const hourMinute = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return hourMinute;
    }
  };

  const timeFrameButtons: { key: TimeFrame; label: string; icon: React.ReactNode }[] = [
    { key: '1H', label: '1H', icon: <Clock className="w-3 h-3" /> },
    { key: '6H', label: '6H', icon: <Clock className="w-3 h-3" /> },
    { key: '24H', label: '24H', icon: <BarChart3 className="w-3 h-3" /> },
    { key: 'ALL', label: 'ALL', icon: <TrendingUp className="w-3 h-3" /> },
  ];

  // Zoom controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev * 1.5, 8)); // Max 8x zoom
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev / 1.5, 0.5)); // Min 0.5x zoom
  const handleZoomReset = () => setZoomLevel(1);

  // Auto-reset zoom when timeframe changes
  useEffect(() => {
    setZoomLevel(1);
  }, [selectedTimeFrame]);

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
        
        {/* Timeframe and Zoom Controls */}
        <div className="flex items-center gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1.5 bg-slate-800/50 rounded-lg p-1.5 border border-slate-600/30">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.5}
              className="p-1.5 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Zoom Out"
            >
              −
            </button>
            <span className="text-xs text-slate-400 px-2 min-w-[3rem] text-center">
              {zoomLevel === 1 ? '1×' : `${zoomLevel.toFixed(1)}×`}
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 8}
              className="p-1.5 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              title="Zoom In"
            >
              +
            </button>
            {zoomLevel !== 1 && (
              <button
                onClick={handleZoomReset}
                className="p-1.5 rounded text-xs text-slate-300 hover:text-white hover:bg-slate-700/50 ml-1 transition-all"
                title="Reset Zoom"
              >
                ⌂
              </button>
            )}
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
                {key === '1H' && zoomLevel > 1 && (
                  <span className="text-xs opacity-75">·{zoomLevel.toFixed(1)}×</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Price statistics */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-sm text-slate-300 font-medium">Yes Price</span>
            {chartData.length > 0 && (
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
            {chartData.length > 0 && (
              <span className={`text-sm font-semibold ${
                priceStats.noChange >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {priceStats.noChange >= 0 ? '+' : ''}{priceStats.noChange.toFixed(4)}
                ({priceStats.noChange >= 0 ? '+' : ''}{priceStats.noChangePercent.toFixed(2)}%)
              </span>
            )}
          </div>
        </div>
        
        {/* Data points counter with zoom info */}
        <div className="text-sm text-slate-400">
          {chartData.length} data points • Live
          {zoomLevel !== 1 && (
            <span className="ml-2 px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-xs">
              {zoomLevel.toFixed(1)}× Zoom
            </span>
          )}
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
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 text-slate-500 mx-auto mb-3" />
              <p className="text-slate-400">No data available for selected timeframe</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 60, // INCREASED: More space on right for "live edge" effect
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
                type="number"
                dataKey="timestamp"
                scale="time"
                domain={xAxisDomain}
                tickFormatter={formatXAxis}
                axisLine={{ stroke: '#475569', strokeWidth: 1 }}
                tickLine={{ stroke: '#475569' }}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                interval="preserveStartEnd"
                tickCount={6}
              />
              
              <YAxis 
                domain={yAxisDomain}
                axisLine={{ stroke: '#475569', strokeWidth: 1 }}
                tickLine={{ stroke: '#475569' }}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(value) => `₹${value.toFixed(2)}`}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              {/* Yes price line - Professional styling */}
              <Line
                type="monotone"
                dataKey="yesPrice"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
                name="Yes Price"
                connectNulls={false}
                activeDot={{ 
                  r: 6, 
                  fill: '#10b981',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
                // SMOOTH ANIMATION: Key for preventing re-renders
                isAnimationActive={false}
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
                  r: 6, 
                  fill: '#ef4444',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
                // SMOOTH ANIMATION: Key for preventing re-renders
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      
      {/* Professional trading platform footer */}
      <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
        <span>Real-time market data</span>
        {chartData.length > 0 && (
          <span>
            Last update: {new Date(chartData[chartData.length - 1]?.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
};
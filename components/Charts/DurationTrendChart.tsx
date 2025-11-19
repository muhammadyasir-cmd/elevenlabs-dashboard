'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DailyMetric } from '@/types';
import { formatDuration } from '@/lib/supabase';

interface DurationTrendChartProps {
  data: DailyMetric[];
}

export default function DurationTrendChart({ data }: DurationTrendChartProps) {
  // Calculate 3-day moving average for trend line
  const chartData = useMemo(() => {
    return data.map((item, index) => {
      const windowSize = 3;
      const start = Math.max(0, index - Math.floor(windowSize / 2));
      const end = Math.min(data.length, start + windowSize);
      const window = data.slice(start, end);
      const trendValue = window.length > 0
        ? window.reduce((sum, d) => sum + d.avgDuration, 0) / window.length
        : item.avgDuration;
      
      return {
        ...item,
        trendValue: trendValue,
      };
    });
  }, [data]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Average Call Duration Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
            tickFormatter={(value) => formatDuration(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#F3F4F6',
            }}
            labelFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });
            }}
            formatter={(value: number) => formatDuration(value)}
          />
          <Line
            type="monotone"
            dataKey="avgDuration"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ fill: '#10B981', r: 4 }}
            name="Avg Duration"
          />
          <Line
            type="monotone"
            dataKey="trendValue"
            stroke="#ef4444"
            strokeWidth={3}
            dot={false}
            name="Trend"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


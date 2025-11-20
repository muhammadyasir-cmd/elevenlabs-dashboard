'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DailyMetric } from '@/types';

interface CallVolumeChartProps {
  data: DailyMetric[];
}

export default function CallVolumeChart({ data }: CallVolumeChartProps) {
  // Calculate linear regression for straight trend line
  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    
    // Calculate linear regression coefficients
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    data.forEach((point, index) => {
      const x = index;
      const y = point.conversationCount || 0;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Create straight line using linear regression
    return data.map((item, index) => {
      return {
        ...item,
        trendValue: intercept + slope * index,
      };
    });
  }, [data]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Call Volume Over Time</h3>
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
          <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF' }} />
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
          />
          <Line
            type="monotone"
            dataKey="conversationCount"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ fill: '#3B82F6', r: 4 }}
            name="Conversations"
          />
          <Line
            type="linear"
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


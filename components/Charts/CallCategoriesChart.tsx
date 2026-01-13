'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import CategoryDetailsModal from '../CategoryDetailsModal';

interface CategoryData {
  category: string;
  count: number;
  percentage: number;
}

interface CallCategoriesChartProps {
  data: CategoryData[];
  totalCalls: number;
  loading?: boolean;
  agentId?: string;
  startDate?: string;
  endDate?: string;
  title?: string;
  totalLabel?: string;
  valueLabel?: string;
}

const COLORS = [
  '#8884d8', // Hangups - light blue
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#6366F1', // Indigo
];

export default function CallCategoriesChart({
  data,
  totalCalls,
  loading,
  agentId,
  startDate,
  endDate,
  title,
  totalLabel,
  valueLabel,
}: CallCategoriesChartProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const resolvedTitle = title ?? 'Call Categories';
  const resolvedTotalLabel = totalLabel ?? 'Total Calls';
  const resolvedValueLabel = valueLabel ?? 'Calls';
  const resolvedValueLabelLower = resolvedValueLabel.toLowerCase();

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{resolvedTitle}</h3>
        <div className="flex items-center justify-center h-64 text-gray-400">
          Loading categories...
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">{resolvedTitle}</h3>
        <div className="flex items-center justify-center h-64 text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  // Prepare chart data with formatted labels
  const chartData = data.map((item, index) => ({
    name: item.category,
    count: item.count,
    percentage: item.percentage,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">{resolvedTitle}</h3>
        <p className="text-sm text-gray-400">
          {resolvedTotalLabel}:{' '}
          <span className="text-white font-semibold">{totalCalls.toLocaleString()}</span>
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
          onClick={(data: any) => {
            if (data && data.activePayload && data.activePayload[0]) {
              setSelectedCategory(data.activePayload[0].payload.name);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            type="number"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF' }}
            label={{
              value: `Number of ${resolvedValueLabel}`,
              position: 'insideBottom',
              offset: -5,
              fill: '#9CA3AF',
            }}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#9CA3AF"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            width={140}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(31, 41, 55, 0.9)',
              border: 'none',
              color: '#ffffff',
            }}
            formatter={(value: number, name: string, props: any) => {
              if (name === 'count') {
                return [`${value.toLocaleString()} ${resolvedValueLabelLower} (${props.payload.percentage}%)`, 'Count'];
              }
              return [value, name];
            }}
            labelStyle={{ color: '#ffffff' }}
            itemStyle={{ color: '#ffffff' }}
          />
          <Bar 
            dataKey="count" 
            radius={[0, 4, 4, 0]}
            cursor="pointer"
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                onClick={() => setSelectedCategory(entry.name)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Category breakdown table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left pb-2 text-gray-400 font-medium">Category</th>
              <th className="text-right pb-2 text-gray-400 font-medium">Count</th>
              <th className="text-right pb-2 text-gray-400 font-medium">Percentage</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((item, index) => (
              <tr 
                key={item.name} 
                className="border-b border-gray-700/50 hover:bg-gray-700/50 cursor-pointer transition-colors"
                onClick={() => setSelectedCategory(item.name)}
              >
                <td className="py-2 text-gray-300">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.name}
                  </div>
                </td>
                <td className="py-2 text-right text-white font-medium">
                  {item.count.toLocaleString()}
                </td>
                <td className="py-2 text-right text-gray-400">
                  {item.percentage}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CategoryDetailsModal
        isOpen={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        category={selectedCategory || ''}
        agentId={agentId}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  );
}


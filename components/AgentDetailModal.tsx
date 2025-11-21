'use client';

import { useState, useEffect } from 'react';
import { AgentMetrics, DailyMetric, DateRange, CallCategory } from '@/types';
import { formatDuration } from '@/lib/supabase';
import MetricCard from './MetricCard';
import CallVolumeChart from './Charts/CallVolumeChart';
import DurationTrendChart from './Charts/DurationTrendChart';
import AverageMessagesChart from './Charts/AverageMessagesChart';
import CallCategoriesChart from './Charts/CallCategoriesChart';
import ConversationsTable from './ConversationsTable';
import LoadingSpinner from './LoadingSpinner';

interface AgentDetailModalProps {
  agentId: string;
  agentName: string;
  dateRange: DateRange;
  onClose: () => void;
}

export default function AgentDetailModal({
  agentId,
  agentName,
  dateRange,
  onClose,
}: AgentDetailModalProps) {
  const [metrics, setMetrics] = useState<AgentMetrics | null>(null);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [callCategories, setCallCategories] = useState<CallCategory[]>([]);
  const [callCategoriesLoading, setCallCategoriesLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [metricsRes, trendsRes] = await Promise.all([
          fetch(
            `/api/metrics?agent_id=${agentId}&start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`
          ),
          fetch(
            `/api/trends?agent_id=${agentId}&start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`
          ),
        ]);

        if (!metricsRes.ok || !trendsRes.ok) {
          throw new Error('Failed to fetch data');
        }

        const metricsData = await metricsRes.json();
        const trendsData = await trendsRes.json();

        if (metricsData.metrics && metricsData.metrics.length > 0) {
          setMetrics(metricsData.metrics[0]);
        }
        setDailyMetrics(trendsData.dailyMetrics || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [agentId, dateRange]);

  // Fetch call categories when modal opens or date range changes
  useEffect(() => {
    const fetchCallCategories = async () => {
      setCallCategoriesLoading(true);
      try {
        const response = await fetch(
          `/api/call-categories?agent_id=${agentId}&start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch call categories');
        }
        
        const data = await response.json();
        setCallCategories(data.categories || []);
      } catch (error) {
        console.error('Failed to fetch call categories:', error);
        setCallCategories([]);
      } finally {
        setCallCategoriesLoading(false);
      }
    };

    if (agentId && dateRange.startDate && dateRange.endDate) {
      fetchCallCategories();
    }
  }, [agentId, dateRange]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error || 'No data available'}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-8 max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">{agentName}</h2>
            <p className="text-sm text-gray-400 font-mono">{agentId}</p>
            <p className="text-sm text-gray-500 mt-2">
              {new Date(dateRange.startDate).toLocaleDateString()} -{' '}
              {new Date(dateRange.endDate).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            title="Total Conversations"
            value={metrics.totalConversations}
            className="bg-gray-800"
          />
          <MetricCard
            title="Avg Call Duration"
            value={formatDuration(metrics.avgCallDuration)}
            className="bg-gray-800"
          />
          <MetricCard
            title="Avg Messages"
            value={metrics.avgMessages}
            className="bg-gray-800"
          />
          <MetricCard
            title="Success Rate"
            value={`${metrics.successRate}%`}
            subtitle={
              metrics.successRate >= 80
                ? 'Excellent'
                : metrics.successRate >= 60
                ? 'Good'
                : 'Needs Improvement'
            }
            className="bg-gray-800"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <CallVolumeChart data={dailyMetrics} />
          <DurationTrendChart data={dailyMetrics} />
          <AverageMessagesChart data={dailyMetrics} />
        </div>

        {/* Call Categories Chart */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Call Categories</h3>
          {callCategoriesLoading ? (
            <div className="flex items-center justify-center h-64 bg-gray-800 border border-gray-700 rounded-lg">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <CallCategoriesChart 
              data={callCategories}
              totalCalls={callCategories.reduce((sum, cat) => sum + cat.count, 0)}
              agentId={agentId}
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
            />
          )}
        </div>

        {/* Conversations Table */}
        <ConversationsTable
          agentId={agentId}
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
        />
      </div>
    </div>
  );
}


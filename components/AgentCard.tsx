'use client';

import { AgentMetrics } from '@/types';
import { formatDuration } from '@/lib/supabase';

interface AgentCardProps {
  metrics: AgentMetrics;
  onViewDetails: (agentId: string) => void;
}

export default function AgentCard({ metrics, onViewDetails }: AgentCardProps) {
  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-400';
    if (rate >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-all duration-200">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">{metrics.agent_name}</h2>
          <p className="text-xs text-gray-500 font-mono">{metrics.agent_id}</p>
        </div>
        <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
          {metrics.totalConversations} calls
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-400 mb-1">Avg Duration</p>
          <p className="text-base font-semibold text-white">
            {formatDuration(metrics.avgCallDuration)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Avg Messages</p>
          <p className="text-base font-semibold text-white">{metrics.avgMessages}</p>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <p className="text-xs text-gray-400">Success Rate</p>
          <p className={`text-base font-bold ${getSuccessRateColor(metrics.successRate)}`}>
            {metrics.successRate}%
          </p>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${
              metrics.successRate >= 80
                ? 'bg-green-500'
                : metrics.successRate >= 60
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${Math.min(metrics.successRate, 100)}%` }}
          />
        </div>
      </div>

      {metrics.hangupRate !== undefined && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs text-gray-400">Hangup Rate</p>
            <p className={`text-base font-bold ${
              metrics.hangupRate <= 10
                ? 'text-green-400'
                : metrics.hangupRate <= 25
                ? 'text-yellow-400'
                : 'text-red-400'
            }`}>
              {metrics.hangupRate.toFixed(1)}%
            </p>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                metrics.hangupRate <= 10
                  ? 'bg-green-500'
                  : metrics.hangupRate <= 25
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(metrics.hangupRate, 100)}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={() => onViewDetails(metrics.agent_id)}
        className="w-full mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
      >
        View Details
      </button>
    </div>
  );
}


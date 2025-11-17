'use client';

import { useState, useEffect, useCallback } from 'react';
import { Agent, AgentMetrics, DateRange } from '@/types';
import { getDateRange } from '@/lib/supabase';
import DateRangePicker from '@/components/DateRangePicker';
import AgentCard from '@/components/AgentCard';
import AgentDetailModal from '@/components/AgentDetailModal';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Dashboard() {
  console.log('🔵 Dashboard component rendering');
  
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Calculate initial date range from TODAY backwards
    const range = getDateRange(30);
    console.log('🔵 Initial date range:', range);
    console.log('🔵 Current year:', new Date().getFullYear());
    return range;
  });
  const [agents, setAgents] = useState<Agent[]>([]);
  const [metrics, setMetrics] = useState<AgentMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<{ id: string; name: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const addDebugInfo = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const debugMessage = `[${timestamp}] ${message}`;
    console.log('🔍 DEBUG:', debugMessage);
    setDebugInfo(prev => [...prev.slice(-9), debugMessage]);
  }, []);

  useEffect(() => {
    addDebugInfo('Component mounted');
  }, [addDebugInfo]);

  const fetchData = useCallback(async () => {
    console.log('🟢 fetchData called with dateRange:', dateRange);
    addDebugInfo('Starting data fetch...');
    setLoading(true);
    setError(null);
    
    try {
      const agentsUrl = `/api/agents?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`;
      const metricsUrl = `/api/metrics?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`;
      
      console.log('🟢 Fetching agents from:', agentsUrl);
      console.log('🟢 Fetching metrics from:', metricsUrl);
      addDebugInfo(`Fetching: ${agentsUrl}`);
      
      const [agentsRes, metricsRes] = await Promise.all([
        fetch(agentsUrl),
        fetch(metricsUrl),
      ]);

      console.log('🟢 Agents response status:', agentsRes.status, agentsRes.ok);
      console.log('🟢 Metrics response status:', metricsRes.status, metricsRes.ok);
      addDebugInfo(`Agents: ${agentsRes.status}, Metrics: ${metricsRes.status}`);

      if (!agentsRes.ok) {
        const errorText = await agentsRes.text();
        console.error('❌ Agents API error:', errorText);
        throw new Error(`Agents API failed: ${agentsRes.status} - ${errorText}`);
      }

      if (!metricsRes.ok) {
        const errorText = await metricsRes.text();
        console.error('❌ Metrics API error:', errorText);
        throw new Error(`Metrics API failed: ${metricsRes.status} - ${errorText}`);
      }

      const agentsData = await agentsRes.json();
      const metricsData = await metricsRes.json();

      console.log('🟢 Agents data received:', agentsData);
      console.log('🟢 Metrics data received:', metricsData);
      addDebugInfo(`Agents: ${agentsData.agents?.length || 0}, Metrics: ${metricsData.metrics?.length || 0}`);

      setAgents(agentsData.agents || []);
      setMetrics(metricsData.metrics || []);
      setLastUpdated(new Date());
      addDebugInfo('Data loaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      console.error('❌ Error in fetchData:', err);
      addDebugInfo(`ERROR: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setLoading(false);
      addDebugInfo('Fetch completed');
    }
  }, [dateRange, addDebugInfo]);

  useEffect(() => {
    console.log('🟢 useEffect triggered, calling fetchData');
    addDebugInfo('useEffect: fetchData triggered');
    fetchData();
  }, [fetchData, addDebugInfo]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        console.log('🟢 Auto-refresh triggered');
        addDebugInfo('Auto-refresh triggered');
        fetchData();
      }, 30000);

      return () => {
        console.log('🟢 Clearing auto-refresh interval');
        clearInterval(interval);
      };
    }
  }, [autoRefresh, fetchData, addDebugInfo]);

  const handleViewDetails = (agentId: string) => {
    const agent = agents.find(a => a.agent_id === agentId);
    if (agent) {
      setSelectedAgent({ id: agentId, name: agent.agent_name });
    }
  };

  const handleCloseModal = () => {
    setSelectedAgent(null);
  };

  console.log('🔵 Render state:', { loading, error, agentsCount: agents.length, metricsCount: metrics.length });

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Debug Panel */}
      <div className="bg-yellow-900/20 border-b border-yellow-700 p-4">
        <details className="text-xs">
          <summary className="cursor-pointer text-yellow-400 font-bold mb-2">🔍 Debug Info (Click to expand)</summary>
          <div className="bg-gray-900 p-3 rounded mt-2 max-h-48 overflow-y-auto">
            <div className="text-yellow-300 font-mono space-y-1">
              <div>Loading: {loading ? 'YES' : 'NO'}</div>
              <div>Error: {error || 'None'}</div>
              <div>Agents: {agents.length}</div>
              <div>Metrics: {metrics.length}</div>
              <div>Date Range: {dateRange.startDate} to {dateRange.endDate}</div>
              <div className="mt-2 border-t border-yellow-700 pt-2">
                <div className="font-bold mb-1">Debug Log:</div>
                {debugInfo.map((info, idx) => (
                  <div key={idx} className="text-yellow-200">{info}</div>
                ))}
              </div>
            </div>
          </div>
        </details>
      </div>

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                ElevenLabs Agent Performance Dashboard
              </h1>
              <p className="text-sm text-gray-400">
                Last updated: <span suppressHydrationWarning>{lastUpdated.toLocaleTimeString()}</span>
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                Auto-refresh (30s)
              </label>
              <button
                onClick={fetchData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Range Picker */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Date Range</h2>
          <DateRangePicker onDateChange={setDateRange} initialRange={dateRange} />
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 mb-8">
            <h3 className="text-red-400 font-bold text-lg mb-2">❌ Error</h3>
            <p className="text-red-300 mb-4">{error}</p>
            <div className="bg-red-950/50 p-4 rounded mb-4">
              <p className="text-red-200 text-sm">
                Check the browser console (F12) and server logs for more details.
              </p>
            </div>
            <button
              onClick={fetchData}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && agents.length === 0 && (
          <div className="flex flex-col justify-center items-center py-16">
            <LoadingSpinner size="lg" />
            <p className="text-gray-400 mt-4">Loading dashboard data...</p>
            <p className="text-gray-500 text-sm mt-2">This may take a few seconds</p>
          </div>
        )}

        {/* Agents Overview */}
        {!loading && !error && (
          <>
            {agents.length === 0 ? (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-12 text-center">
                <p className="text-gray-400 text-lg mb-2">No agents found for the selected date range.</p>
                <p className="text-gray-500 text-sm">
                  Date range: {dateRange.startDate} to {dateRange.endDate}
                </p>
                <button
                  onClick={fetchData}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">Agents Overview</h2>
                  <p className="text-gray-400">
                    Found {agents.length} agent{agents.length !== 1 ? 's' : ''} in the selected date range
                  </p>
                </div>

                {metrics.length === 0 ? (
                  <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6">
                    <p className="text-yellow-400">
                      ⚠️ No metrics data available. Agents were found but metrics calculation failed.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {metrics.map((metric) => (
                      <AgentCard
                        key={metric.agent_id}
                        metrics={metric}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Agent Detail Modal */}
        {selectedAgent && (
          <AgentDetailModal
            agentId={selectedAgent.id}
            agentName={selectedAgent.name}
            dateRange={dateRange}
            onClose={handleCloseModal}
          />
        )}
      </main>
    </div>
  );
}

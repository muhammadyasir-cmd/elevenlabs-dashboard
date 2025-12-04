'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { signOut } from 'next-auth/react';
import { Agent, AgentMetrics, DateRange, CallCategory } from '@/types';
import { getDateRange } from '@/lib/supabase';
import DateRangePicker from '@/components/DateRangePicker';
import AgentCard from '@/components/AgentCard';
import AgentDetailModal from '@/components/AgentDetailModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import CallCategoriesChart from '@/components/Charts/CallCategoriesChart';

export default function Dashboard() {
  console.log('🔵 Dashboard component rendering');
  
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    // Calculate initial date range from TODAY backwards
    const range = getDateRange(30);
    console.log('🔵 Initial date range:', range);
    console.log('🔵 Current year:', new Date().getFullYear());
    return range;
  });
  const [selectedAgent, setSelectedAgent] = useState<{ id: string; name: string } | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsPerPage = 20;

  const addDebugInfo = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const debugMessage = `[${timestamp}] ${message}`;
    console.log('🔍 DEBUG:', debugMessage);
    setDebugInfo(prev => [...prev.slice(-9), debugMessage]);
  }, []);

  useEffect(() => {
    addDebugInfo('Component mounted');
  }, [addDebugInfo]);

  // React Query hooks for data fetching
  const {
    data: agentsData,
    isLoading: agentsLoading,
    error: agentsError,
    refetch: refetchAgents,
  } = useQuery({
    queryKey: ['agents', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const response = await fetch(
        `/api/agents?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch agents');
      }
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const {
    data: metricsData,
    isLoading: metricsLoading,
    error: metricsError,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['metrics', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const response = await fetch(
        `/api/metrics?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ['call-categories'],
    queryFn: async () => {
      const response = await fetch('/api/call-categories');
      if (!response.ok) {
        throw new Error('Failed to fetch call categories');
      }
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Derived state
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const agents = agentsData?.agents || [];
  const metrics = (metricsData?.metrics || []).sort(
    (a: AgentMetrics, b: AgentMetrics) => b.totalConversations - a.totalConversations
  );
  const callCategories = categoriesData?.categories || [];
  const callCategoriesTotal = categoriesData?.totalCalls || 0;
  const loading = agentsLoading || metricsLoading;
  const error = agentsError || metricsError;
  const filteredMetrics = normalizedSearchQuery
    ? metrics.filter((metric: AgentMetrics) =>
        metric.agent_name.toLowerCase().includes(normalizedSearchQuery)
      )
    : metrics;
  const paginatedMetrics = filteredMetrics.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const filteredMetricsCount = filteredMetrics.length;
  const totalFilteredPages = Math.max(1, Math.ceil(filteredMetrics.length / itemsPerPage));

  // Reset to first page when data changes
  useEffect(() => {
    if (metrics.length > 0) {
      setCurrentPage(1);
    }
  }, [metrics.length, normalizedSearchQuery]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleRefresh = useCallback(() => {
    refetchAgents();
    refetchMetrics();
    refetchCategories();
    addDebugInfo('Manual refresh triggered');
  }, [refetchAgents, refetchMetrics, refetchCategories, addDebugInfo]);

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const handleViewDetails = (agentId: string) => {
    const agent = agents.find((a: Agent) => a.agent_id === agentId);
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
              <div>Error: {error ? (error instanceof Error ? error.message : String(error)) : 'None'}</div>
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
              <h1 className="text-3xl font-bold text-white">
                ElevenLabs Agent Performance Dashboard
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              
              {/* Top-right menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label="Menu"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
                
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
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

        {/* Call Categories Chart */}
        <div className="mb-8">
          <CallCategoriesChart
            data={callCategories}
            totalCalls={callCategoriesTotal}
            loading={categoriesLoading}
          />
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 mb-8">
            <h3 className="text-red-400 font-bold text-lg mb-2">❌ Error</h3>
            <p className="text-red-300 mb-4">{error instanceof Error ? error.message : String(error)}</p>
            <div className="bg-red-950/50 p-4 rounded mb-4">
              <p className="text-red-200 text-sm">
                Check the browser console (F12) and server logs for more details.
              </p>
            </div>
            <button
              onClick={handleRefresh}
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
                  onClick={handleRefresh}
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

                {metrics.length > 0 && (
                  <div className="mb-6">
                    <label htmlFor="agent-search" className="sr-only">
                      Search agents
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-4.35-4.35M15 10a5 5 0 11-10 0 5 5 0 0110 0z"
                          />
                        </svg>
                      </span>
                      <input
                        id="agent-search"
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search agents by name..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors"
                      />
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                      {filteredMetricsCount} agent{filteredMetricsCount === 1 ? '' : 's'} found
                    </p>
                  </div>
                )}

                {metrics.length === 0 ? (
                  <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-6">
                    <p className="text-yellow-400">
                      ⚠️ No metrics data available. Agents were found but metrics calculation failed.
                    </p>
                  </div>
                ) : filteredMetrics.length === 0 ? (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center">
                    <p className="text-gray-300 mb-2">No agents match your search.</p>
                    <p className="text-gray-500 text-sm">Try a different name or clear the search box.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-all duration-300">
                      {paginatedMetrics.map((metric: AgentMetrics) => (
                        <AgentCard
                          key={metric.agent_id}
                          metrics={metric}
                          onViewDetails={handleViewDetails}
                        />
                      ))}
                    </div>
                    
                    {/* Pagination Controls */}
                    {filteredMetrics.length > itemsPerPage && (
                      <div className="mt-8 flex flex-col items-center gap-4">
                        <div className="text-sm text-gray-400">
                          Page {currentPage} of {totalFilteredPages}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          
                          <div className="flex gap-1">
                            {Array.from({ length: totalFilteredPages }, (_, i) => i + 1)
                              .filter(page => {
                                // Show first page, last page, current page, and nearby pages
                                const totalPages = totalFilteredPages;
                                if (totalPages <= 7) return true;
                                if (page === 1 || page === totalPages) return true;
                                if (Math.abs(page - currentPage) <= 1) return true;
                                return false;
                              })
                              .map((page, index, array) => {
                                // Add ellipsis if there's a gap
                                const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1;
                                return (
                                  <div key={page} className="flex items-center gap-1">
                                    {showEllipsisBefore && (
                                      <span className="px-2 text-gray-500">...</span>
                                    )}
                                    <button
                                      onClick={() => setCurrentPage(page)}
                                      className={`px-3 py-2 min-w-[2.5rem] font-medium rounded transition-colors ${
                                        currentPage === page
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-700 hover:bg-gray-600 text-white'
                                      }`}
                                    >
                                      {page}
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                          
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalFilteredPages, prev + 1))}
                            disabled={currentPage === totalFilteredPages}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
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

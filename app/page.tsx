'use client';
//,,,
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { signOut } from 'next-auth/react';
import { Agent, AgentMetrics, ChatMetrics, DateRange, CallCategory } from '@/types';
import { getDateRange } from '@/lib/supabase';
import DateRangePicker from '@/components/DateRangePicker';
import AgentCard from '@/components/AgentCard';
import AgentDetailModal from '@/components/AgentDetailModal';
import LoadingSpinner from '@/components/LoadingSpinner';
import CallCategoriesChart from '@/components/Charts/CallCategoriesChart';
import ChatConversationsTable from '@/components/ChatConversationsTable';

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
  const [viewMode, setViewMode] = useState<'calls' | 'chats'>('calls');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChatData, setShowChatData] = useState(false);
  const [totalCallsFilter, setTotalCallsFilter] = useState<string>('All');
  const [avgDurationFilter, setAvgDurationFilter] = useState<string>('All');
  const [avgMessagesFilter, setAvgMessagesFilter] = useState<string>('All');
  const [successRateFilter, setSuccessRateFilter] = useState<string>('All');
  const [hangupRateFilter, setHangupRateFilter] = useState<string>('All');
  const [revenueRateFilter, setRevenueRateFilter] = useState<string>('All');
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

  useEffect(() => {
    setSelectedAgent(null);
    setCurrentPage(1);
  }, [viewMode]);

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
    enabled: viewMode === 'calls',
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
    enabled: viewMode === 'calls',
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
    enabled: viewMode === 'calls',
  });

  const {
    data: chatMetricsData,
    isLoading: chatMetricsLoading,
    error: chatMetricsError,
    refetch: refetchChatMetrics,
  } = useQuery({
    queryKey: ['chat-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/chat-metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch chat metrics');
      }
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
    enabled: viewMode === 'chats',
  });

  const {
    data: chatCategoriesData,
    isLoading: chatCategoriesLoading,
    error: chatCategoriesError,
    refetch: refetchChatCategories,
  } = useQuery({
    queryKey: ['chat-categories'],
    queryFn: async () => {
      const response = await fetch('/api/chat-categories');
      if (!response.ok) {
        throw new Error('Failed to fetch chat categories');
      }
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
    enabled: viewMode === 'chats',
  });

  const {
    data: chatConversationsData,
    isLoading: chatConversationsLoading,
    error: chatConversationsError,
    refetch: refetchChatConversations,
  } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: async () => {
      const response = await fetch('/api/chat-conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch chat conversations');
      }
      return response.json();
    },
    refetchInterval: autoRefresh ? 30000 : false,
    enabled: viewMode === 'chats' && showChatData,
  });

  // Derived state
  const isCallView = viewMode === 'calls';
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const agents = isCallView ? agentsData?.agents || [] : [];
  const metrics = isCallView
    ? (metricsData?.metrics || []).sort(
        (a: AgentMetrics, b: AgentMetrics) => b.totalConversations - a.totalConversations
      )
    : [];
  const callCategories = isCallView ? categoriesData?.categories || [] : [];
  const callCategoriesTotal = isCallView ? categoriesData?.totalCalls || 0 : 0;
  const chatMetrics = !isCallView ? (chatMetricsData?.metrics as ChatMetrics | undefined) : undefined;
  const chatCategories = !isCallView ? chatCategoriesData?.categories || [] : [];
  const chatCategoriesTotal = !isCallView ? chatCategoriesData?.totalCalls || 0 : 0;
  const chatConversations = !isCallView ? chatConversationsData?.conversations || [] : [];
  const categoriesLoadingState = isCallView ? categoriesLoading : chatCategoriesLoading;
  const loading = isCallView ? agentsLoading || metricsLoading : chatMetricsLoading || chatCategoriesLoading;
  const error = isCallView ? agentsError || metricsError : chatMetricsError || chatCategoriesError;
  const metricsByAgentId = useMemo(() => {
    const map = new Map<string, AgentMetrics>();
    metrics.forEach((metric: AgentMetrics) => {
      map.set(metric.agent_id, metric);
    });
    return map;
  }, [metrics]);
  const metricsOrder = useMemo(() => {
    const order = new Map<string, number>();
    metrics.forEach((metric: AgentMetrics, index: number) => {
      order.set(metric.agent_id, index);
    });
    return order;
  }, [metrics]);
  const searchFilteredAgents = normalizedSearchQuery
    ? agents.filter((agent: Agent) => agent.agent_name.toLowerCase().includes(normalizedSearchQuery))
    : agents;
  const hangupRateByAgent = useMemo(() => {
    const rateMap = new Map<string, number>();

    // Use hangupRate directly from metrics API response
    metrics.forEach((metric: AgentMetrics) => {
      const hangupRate = metric.hangupRate ?? 0;
      rateMap.set(metric.agent_id, hangupRate);
    });

    console.log('🔍 Hangup rates map:', Array.from(rateMap.entries()));
    return rateMap;
  }, [metrics]);

  const revenueRateByAgent = useMemo(() => {
    const rateMap = new Map<string, number>();

    metrics.forEach((metric: AgentMetrics) => {
      const revenueRate = metric.revenueOpportunityRate ?? 0;
      rateMap.set(metric.agent_id, revenueRate);
    });

    console.log('🔍 Revenue opportunity rates map:', Array.from(rateMap.entries()));
    return rateMap;
  }, [metrics]);

  // Log filter changes for hangup rate
  useEffect(() => {
    console.log('🔍 Hangup filter changed:', hangupRateFilter);
  }, [hangupRateFilter]);
  const anyFilterActive =
    totalCallsFilter !== 'All' ||
    avgDurationFilter !== 'All' ||
    avgMessagesFilter !== 'All' ||
    successRateFilter !== 'All' ||
    hangupRateFilter !== 'All' ||
    revenueRateFilter !== 'All';
  const clearAllFilters = () => {
    setTotalCallsFilter('All');
    setAvgDurationFilter('All');
    setAvgMessagesFilter('All');
    setSuccessRateFilter('All');
    setHangupRateFilter('All');
    setRevenueRateFilter('All');
  };
  const filteredAndSortedAgents = useMemo(() => {
    const getMetric = (agentId: string) => metricsByAgentId.get(agentId);
    const withIndex = searchFilteredAgents.map((agent: Agent, index: number) => ({ agent, index }));

    const comparisonChain: Array<(a: Agent | undefined, b: Agent | undefined) => number> = [];

    const compareMetricValue = (
      getter: (metric?: AgentMetrics) => number,
      direction: 'asc' | 'desc'
    ) => {
      return (aAgent?: Agent, bAgent?: Agent) => {
        if (!aAgent && !bAgent) return 0;
        if (aAgent && !bAgent) return -1;
        if (!aAgent && bAgent) return 1;
        const aMetric = aAgent ? getMetric(aAgent.agent_id) : undefined;
        const bMetric = bAgent ? getMetric(bAgent.agent_id) : undefined;

        const aHas = Boolean(aMetric);
        const bHas = Boolean(bMetric);
        if (aHas && !bHas) return -1;
        if (!aHas && bHas) return 1;

        const aValue = getter(aMetric);
        const bValue = getter(bMetric);
        const diff = direction === 'desc' ? bValue - aValue : aValue - bValue;
        if (diff !== 0) return diff;
        return 0;
      };
    };

    if (totalCallsFilter !== 'All') {
      comparisonChain.push(
        compareMetricValue(
          (metric) => metric?.totalConversations ?? 0,
          totalCallsFilter === 'Highest First' ? 'desc' : 'asc'
        )
      );
    }

    if (avgDurationFilter !== 'All') {
      comparisonChain.push(
        compareMetricValue(
          (metric) => metric?.avgCallDuration ?? 0,
          avgDurationFilter === 'Longest First' ? 'desc' : 'asc'
        )
      );
    }

    if (avgMessagesFilter !== 'All') {
      comparisonChain.push(
        compareMetricValue(
          (metric) => metric?.avgMessages ?? 0,
          avgMessagesFilter === 'Most First' ? 'desc' : 'asc'
        )
      );
    }

    if (successRateFilter !== 'All') {
      comparisonChain.push(
        compareMetricValue(
          (metric) => metric?.successRate ?? 0,
          successRateFilter === 'Highest First' ? 'desc' : 'asc'
        )
      );
    }

    if (hangupRateFilter !== 'All') {
      comparisonChain.push((aAgent?: Agent, bAgent?: Agent) => {
        if (!aAgent && !bAgent) return 0;
        if (aAgent && !bAgent) return -1;
        if (!aAgent && bAgent) return 1;
        const aRate = aAgent ? hangupRateByAgent.get(aAgent.agent_id) ?? 0 : 0;
        const bRate = bAgent ? hangupRateByAgent.get(bAgent.agent_id) ?? 0 : 0;
        const diff = hangupRateFilter === 'Lowest First' ? aRate - bRate : bRate - aRate;
        console.log('🔍 Hangup comparator', {
          hangupRateFilter,
          aAgentId: aAgent?.agent_id,
          bAgentId: bAgent?.agent_id,
          aRate,
          bRate,
          diff,
        });
        if (diff !== 0) return diff;
        return 0;
      });
    }

    if (revenueRateFilter !== 'All') {
      comparisonChain.push((aAgent?: Agent, bAgent?: Agent) => {
        if (!aAgent && !bAgent) return 0;
        if (aAgent && !bAgent) return -1;
        if (!aAgent && bAgent) return 1;
        const aRate = aAgent ? revenueRateByAgent.get(aAgent.agent_id) ?? 0 : 0;
        const bRate = bAgent ? revenueRateByAgent.get(bAgent.agent_id) ?? 0 : 0;
        const diff = revenueRateFilter === 'Lowest First' ? aRate - bRate : bRate - aRate;
        console.log('🔍 Revenue comparator', {
          revenueRateFilter,
          aAgentId: aAgent?.agent_id,
          bAgentId: bAgent?.agent_id,
          aRate,
          bRate,
          diff,
        });
        if (diff !== 0) return diff;
        return 0;
      });
    }

    let sortedAgents = withIndex
      .map((entry: { agent: Agent; index: number }) => ({ ...entry }))
      .sort((a: { agent: Agent; index: number }, b: { agent: Agent; index: number }) => {
        for (const compare of comparisonChain) {
          const result = compare(a.agent, b.agent);
          if (result !== 0) return result;
        }

        const defaultA = metricsOrder.get(a.agent.agent_id) ?? Number.MAX_SAFE_INTEGER;
        const defaultB = metricsOrder.get(b.agent.agent_id) ?? Number.MAX_SAFE_INTEGER;
        if (defaultA !== defaultB) return defaultA - defaultB;
        return a.index - b.index;
      })
      .map((entry: { agent: Agent; index: number }) => entry.agent);

    // TEMP WORKAROUND: Exclude Dealer Auto Glass from Revenue Opportunity sorting only
    if (revenueRateFilter !== 'All') {
      sortedAgents = sortedAgents.filter(
        (agent: Agent) => agent.agent_id !== 'agent_5801k9wb9paqesdbg5n77bsesgec'
      );
    }

    return sortedAgents;
  }, [
    avgDurationFilter,
    avgMessagesFilter,
    hangupRateFilter,
    metricsByAgentId,
    metricsOrder,
    searchFilteredAgents,
    successRateFilter,
    totalCallsFilter,
    hangupRateByAgent,
    revenueRateFilter,
    revenueRateByAgent,
  ]);
  const filteredAndSortedMetrics = useMemo(() => {
    return filteredAndSortedAgents.map((agent: Agent) => {
      const metric = metricsByAgentId.get(agent.agent_id);
      // Prefer hangupRate from metric (API response), fallback to Map
      const hangupRate = metric?.hangupRate ?? hangupRateByAgent.get(agent.agent_id) ?? 0;
      const revenueOpportunityRate = metric?.revenueOpportunityRate ?? revenueRateByAgent.get(agent.agent_id) ?? 0;
      if (metric) {
        return { ...metric, hangupRate, revenueOpportunityRate };
      }
      return {
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        totalConversations: 0,
        avgCallDuration: 0,
        avgMessages: 0,
        successRate: 0,
        statusBreakdown: {} as Record<string, number>,
        directionBreakdown: {} as Record<string, number>,
        hangupRate,
        revenueOpportunityRate,
      };
    });
  }, [filteredAndSortedAgents, hangupRateByAgent, revenueRateByAgent, metricsByAgentId]);
  const paginatedMetrics = filteredAndSortedMetrics.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const filteredMetricsCount = filteredAndSortedMetrics.length;
  const totalFilteredPages = Math.max(1, Math.ceil(filteredAndSortedMetrics.length / itemsPerPage));

  // Reset to first page when data changes
  useEffect(() => {
    if (metrics.length > 0) {
      setCurrentPage(1);
    }
  }, [metrics.length, normalizedSearchQuery, totalCallsFilter, avgDurationFilter, avgMessagesFilter, successRateFilter, hangupRateFilter, revenueRateFilter]);

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
    if (isCallView) {
      refetchAgents();
      refetchMetrics();
      refetchCategories();
    } else {
      refetchChatMetrics();
      refetchChatCategories();
      if (showChatData) {
        refetchChatConversations();
      }
    }
    addDebugInfo('Manual refresh triggered');
  }, [isCallView, refetchAgents, refetchMetrics, refetchCategories, refetchChatMetrics, refetchChatCategories, refetchChatConversations, showChatData, addDebugInfo]);

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
              <div>View Mode: {viewMode}</div>
              <div>Agents: {agents.length}</div>
              <div>Metrics: {metrics.length}</div>
              <div>Date Range: {dateRange.startDate} to {dateRange.endDate}</div>
              <div className="mt-2 border-t border-yellow-700 pt-2">
                <div className="font-bold mb-1">Debug Log:</div>
                {debugInfo.map((info: string, idx: number) => (
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
        {/* View Mode + Date Range */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">View Mode</h2>
              <p className="text-sm text-gray-400">
                Switch between call performance and chat performance data sources.
              </p>
            </div>
            <div className="inline-flex bg-gray-900 border border-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('calls')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isCallView
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                Calls
              </button>
              <button
                onClick={() => setViewMode('chats')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  !isCallView
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                Chats
              </button>
            </div>
          </div>

          {isCallView && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Date Range</h3>
              <DateRangePicker onDateChange={setDateRange} initialRange={dateRange} />
            </div>
          )}
        </div>

        {/* Call Categories Chart */}
        <div className="mb-8">
          <CallCategoriesChart
            data={isCallView ? callCategories : chatCategories}
            totalCalls={isCallView ? callCategoriesTotal : chatCategoriesTotal}
            loading={categoriesLoadingState}
            title={isCallView ? 'Call Categories' : 'Chat Categories'}
            totalLabel={isCallView ? 'Total Calls' : 'Total Chats'}
            valueLabel={isCallView ? 'Calls' : 'Chats'}
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
        {loading && ((isCallView && agents.length === 0) || (!isCallView && !chatMetrics)) && (
          <div className="flex flex-col justify-center items-center py-16">
            <LoadingSpinner size="lg" />
            <p className="text-gray-400 mt-4">Loading dashboard data...</p>
            <p className="text-gray-500 text-sm mt-2">This may take a few seconds</p>
          </div>
        )}

        {/* Agents Overview - Calls */}
        {!loading && !error && isCallView && (
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

                    {/* Filter Bar */}
                    <div className="flex flex-row flex-wrap gap-4 mb-4 items-end mt-4">
                      <div className="flex flex-col">
                        <label className="text-sm text-gray-400 mb-1">Sort by Total Calls</label>
                        <select
                          value={totalCallsFilter}
                          onChange={(event) => setTotalCallsFilter(event.target.value)}
                          className="w-48 bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                        >
                          <option>All</option>
                          <option>Highest First</option>
                          <option>Lowest First</option>
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-sm text-gray-400 mb-1">Sort by Avg Duration</label>
                        <select
                          value={avgDurationFilter}
                          onChange={(event) => setAvgDurationFilter(event.target.value)}
                          className="w-48 bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                        >
                          <option>All</option>
                          <option>Longest First</option>
                          <option>Shortest First</option>
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-sm text-gray-400 mb-1">Sort by Avg Messages</label>
                        <select
                          value={avgMessagesFilter}
                          onChange={(event) => setAvgMessagesFilter(event.target.value)}
                          className="w-48 bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                        >
                          <option>All</option>
                          <option>Most First</option>
                          <option>Least First</option>
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-sm text-gray-400 mb-1">Sort by Success Rate</label>
                        <select
                          value={successRateFilter}
                          onChange={(event) => setSuccessRateFilter(event.target.value)}
                          className="w-48 bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                        >
                          <option>All</option>
                          <option>Highest First</option>
                          <option>Lowest First</option>
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-sm text-gray-400 mb-1">Sort by Hangup Rate</label>
                        <select
                          value={hangupRateFilter}
                          onChange={(event) => setHangupRateFilter(event.target.value)}
                          className="w-48 bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                        >
                          <option>All</option>
                          <option>Highest First</option>
                          <option>Lowest First</option>
                        </select>
                      </div>

                      <div className="flex flex-col">
                        <label className="text-sm text-gray-400 mb-1">Sort by Revenue Opportunity</label>
                        <select
                          value={revenueRateFilter}
                          onChange={(event) => setRevenueRateFilter(event.target.value)}
                          className="w-48 bg-gray-800 text-white border border-gray-700 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                        >
                          <option>All</option>
                          <option>Highest First</option>
                          <option>Lowest First</option>
                        </select>
                      </div>

                      {anyFilterActive && (
                        <button
                          onClick={clearAllFilters}
                          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>

                    <p className="text-sm text-gray-400">
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
                ) : filteredAndSortedMetrics.length === 0 ? (
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
                    {filteredAndSortedMetrics.length > itemsPerPage && (
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
                              .map((page: number, index: number, array: number[]) => {
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

        {/* Chat Overview */}
        {!loading && !error && !isCallView && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Chat Overview</h2>
              <p className="text-gray-400">
                Aggregate metrics from all chat conversations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <p className="text-sm text-gray-400 mb-2">Total Conversations</p>
                <p className="text-3xl font-bold text-white">
                  {chatMetrics?.totalConversations?.toLocaleString() ?? 0}
                </p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <p className="text-sm text-gray-400 mb-2">Average Messages</p>
                <p className="text-3xl font-bold text-white">
                  {chatMetrics?.avgMessages !== undefined ? chatMetrics.avgMessages.toFixed(1) : '0.0'}
                </p>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <p className="text-sm text-gray-400 mb-2">Success Rate</p>
                <p className="text-3xl font-bold text-white">
                  {chatMetrics?.successRate !== undefined ? `${chatMetrics.successRate.toFixed(1)}%` : '0.0%'}
                </p>
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Status Breakdown</h3>
              {chatMetrics && Object.keys(chatMetrics.statusBreakdown || {}).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(chatMetrics.statusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">
                      <span className="text-gray-300 capitalize">{status}</span>
                      <span className="text-white font-semibold">{count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">No status data available.</p>
              )}
            </div>

            {/* Show Chat Data Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowChatData(!showChatData)}
                disabled={chatConversationsLoading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {chatConversationsLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Loading...
                  </>
                ) : (
                  <>
                    {showChatData ? (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Hide Chat Data
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Show Chat Data
                      </>
                    )}
                  </>
                )}
              </button>
            </div>

            {/* Chat Conversations Table */}
            {showChatData && (
              <div className="mt-6">
                {chatConversationsError ? (
                  <div className="bg-red-900/20 border border-red-700 rounded-lg p-6">
                    <h3 className="text-red-400 font-bold text-lg mb-2">❌ Error Loading Conversations</h3>
                    <p className="text-red-300 mb-4">
                      {chatConversationsError instanceof Error ? chatConversationsError.message : String(chatConversationsError)}
                    </p>
                    <button
                      onClick={() => refetchChatConversations()}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                    >
                      Retry
                    </button>
                  </div>
                ) : (
                  <ChatConversationsTable
                    conversations={chatConversations}
                    loading={chatConversationsLoading}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* Agent Detail Modal */}
        {isCallView && selectedAgent && (
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

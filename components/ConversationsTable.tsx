'use client';

import { useState, useEffect, useCallback } from 'react';
import { Conversation, PaginationInfo } from '@/types';
import { formatDuration } from '@/lib/supabase';
import { formatDateTime } from '@/lib/utils';
import LoadingSpinner from './LoadingSpinner';

interface ConversationsTableProps {
  agentId: string;
  startDate: string;
  endDate: string;
}

export default function ConversationsTable({
  agentId,
  startDate,
  endDate,
}: ConversationsTableProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchConversations = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/conversations?agent_id=${agentId}&start_date=${startDate}&end_date=${endDate}&page=${pageNum}&limit=100`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      const data = await response.json();
      setConversations(data.conversations);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [agentId, startDate, endDate]);

  useEffect(() => {
    fetchConversations(page);
  }, [agentId, startDate, endDate, page, fetchConversations]);

  if (loading && conversations.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Conversations</h3>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Conversations</h3>
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => fetchConversations(page)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Conversations</h3>
        <div className="text-center py-8 text-gray-400">No conversations found</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Conversations</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="pb-3 text-sm font-medium text-gray-400">Date</th>
              <th className="pb-3 text-sm font-medium text-gray-400">Duration</th>
              <th className="pb-3 text-sm font-medium text-gray-400">Messages</th>
              <th className="pb-3 text-sm font-medium text-gray-400">Status</th>
              <th className="pb-3 text-sm font-medium text-gray-400">Direction</th>
              <th className="pb-3 text-sm font-medium text-gray-400">Title</th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((conv) => (
              <tr key={conv.conversation_id} className="border-b border-gray-700/50">
                <td className="py-3 text-sm text-gray-300">
                  {formatDateTime(conv.start_time_unix_secs)}
                </td>
                <td className="py-3 text-sm text-white">{formatDuration(conv.call_duration_secs)}</td>
                <td className="py-3 text-sm text-white">{conv.message_count}</td>
                <td className="py-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      conv.status === 'done'
                        ? 'bg-green-500/20 text-green-400'
                        : conv.status === 'in-progress'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : conv.status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {conv.status || 'N/A'}
                  </span>
                </td>
                <td className="py-3 text-sm text-white capitalize">
                  {conv.direction || 'N/A'}
                </td>
                <td className="py-3 text-sm text-gray-300 truncate max-w-xs">
                  {conv.call_summary_title || 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} conversations
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const newPage = page - 1;
                setPage(newPage);
                fetchConversations(newPage);
              }}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => {
                const newPage = page + 1;
                setPage(newPage);
                fetchConversations(newPage);
              }}
              disabled={!pagination.hasMore}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


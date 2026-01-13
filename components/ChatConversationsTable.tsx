'use client';

import { useState } from 'react';
import { ChatConversation } from '@/types';
import { formatDateTime } from '@/lib/utils';

interface ChatConversationsTableProps {
  conversations: ChatConversation[];
  loading?: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Revenue Opportunity': 'bg-green-500/20 text-green-400',
  'Forwarded to Advisor': 'bg-blue-500/20 text-blue-400',
  'General Info & Customer Service': 'bg-purple-500/20 text-purple-400',
  'System / Other': 'bg-gray-500/20 text-gray-400',
  'Repair Status & Shop Updates': 'bg-yellow-500/20 text-yellow-400',
  'Logistics, Billing & Other': 'bg-orange-500/20 text-orange-400',
};

export default function ChatConversationsTable({
  conversations,
  loading = false,
}: ChatConversationsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [sortField, setSortField] = useState<keyof ChatConversation>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof ChatConversation) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedConversations = [...conversations].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    const aStr = String(aValue);
    const bStr = String(bValue);
    return sortDirection === 'asc' 
      ? aStr.localeCompare(bStr)
      : bStr.localeCompare(aStr);
  });

  const toggleRow = (sessionId: string) => {
    setExpandedRow(expandedRow === sessionId ? null : sessionId);
  };

  const getStatusBadge = (status: string | null | undefined) => {
    const statusLower = (status || '').toLowerCase();
    if (statusLower === 'completed' || statusLower === 'done') {
      return 'bg-green-500/20 text-green-400';
    } else if (statusLower === 'abandoned' || statusLower === 'failed') {
      return 'bg-red-500/20 text-red-400';
    } else if (statusLower === 'in-progress') {
      return 'bg-yellow-500/20 text-yellow-400';
    }
    return 'bg-gray-500/20 text-gray-400';
  };

  const getSuccessBadge = (success: string | null | undefined) => {
    if (success === 'success') {
      return 'bg-green-500/20 text-green-400';
    } else if (success === 'failed' || success === 'failure') {
      return 'bg-red-500/20 text-red-400';
    }
    return 'bg-gray-500/20 text-gray-400';
  };

  const getCategoryBadge = (category: string | null | undefined) => {
    return CATEGORY_COLORS[category || ''] || 'bg-gray-500/20 text-gray-400';
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const truncateText = (text: string | null | undefined, maxLength: number) => {
    if (!text) return 'N/A';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const SortIcon = ({ field }: { field: keyof ChatConversation }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Chat Conversations</h3>
        <div className="flex justify-center items-center h-64 text-gray-400">
          Loading conversations...
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Chat Conversations</h3>
        <div className="text-center py-8 text-gray-400">No chat conversations found</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-white mb-2">Chat Conversations</h3>
        <p className="text-xs text-gray-500">Click on any row to view the full transcript</p>
      </div>

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr className="border-b-2 border-gray-700">
              <th 
                className="pb-3 px-2 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('session_id')}
              >
                <div className="flex items-center gap-1">
                  Session ID
                  <SortIcon field="session_id" />
                </div>
              </th>
              <th 
                className="pb-3 px-2 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('message_count')}
              >
                <div className="flex items-center gap-1">
                  Messages
                  <SortIcon field="message_count" />
                </div>
              </th>
              <th 
                className="pb-3 px-2 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  <SortIcon field="status" />
                </div>
              </th>
              <th 
                className="pb-3 px-2 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('conversation_successful')}
              >
                <div className="flex items-center gap-1">
                  Success
                  <SortIcon field="conversation_successful" />
                </div>
              </th>
              <th className="pb-3 px-2 text-sm font-medium text-gray-400">
                Summary Title
              </th>
              <th 
                className="pb-3 px-2 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('summary_category')}
              >
                <div className="flex items-center gap-1">
                  Category
                  <SortIcon field="summary_category" />
                </div>
              </th>
              <th 
                className="pb-3 px-2 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center gap-1">
                  Created At
                  <SortIcon field="created_at" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedConversations.map((conv, index) => (
              <>
                <tr
                  key={conv.session_id}
                  className={`border-b border-gray-700/50 cursor-pointer hover:bg-gray-700/50 transition-colors ${
                    index % 2 === 0 ? 'bg-gray-900/30' : 'bg-gray-800/30'
                  } ${expandedRow === conv.session_id ? 'bg-gray-700/30' : ''}`}
                  onClick={() => toggleRow(conv.session_id)}
                >
                  <td className="py-3 px-2 text-sm text-gray-300 font-mono">
                    {truncateText(conv.session_id, 15)}
                  </td>
                  <td className="py-3 px-2 text-sm text-white text-center">
                    {conv.message_count || 0}
                  </td>
                  <td className="py-3 px-2 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusBadge(conv.status)}`}>
                      {conv.status || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${getSuccessBadge(conv.conversation_successful)}`}>
                      {conv.conversation_successful || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-300 max-w-xs" title={conv.summary_title || 'N/A'}>
                    {truncateText(conv.summary_title, 50)}
                  </td>
                  <td className="py-3 px-2 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${getCategoryBadge(conv.summary_category)}`}>
                      {truncateText(conv.summary_category, 30)}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-sm text-gray-300 whitespace-nowrap">
                    {formatDate(conv.created_at)}
                  </td>
                </tr>
                {expandedRow === conv.session_id && (
                  <tr className="bg-gray-900/50 border-b border-gray-700">
                    <td colSpan={7} className="p-4">
                      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-sm font-semibold text-white">Full Transcript</h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedRow(null);
                            }}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto bg-gray-900/50 rounded p-3">
                          {conv.transcript ? (
                            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans">
                              {conv.transcript}
                            </pre>
                          ) : (
                            <p className="text-gray-500 italic">No transcript available</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


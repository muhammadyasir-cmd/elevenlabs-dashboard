'use client';

import { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from './LoadingSpinner';

interface CategoryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  agentId?: string;
  startDate?: string;
  endDate?: string;
}

interface ConversationDetail {
  conversation_id: string;
  call_summary_title: string;
  start_time_unix_secs: number;
  agent_name: string;
}

export default function CategoryDetailsModal({
  isOpen,
  onClose,
  category,
  agentId,
  startDate,
  endDate
}: CategoryDetailsModalProps) {
  const [conversations, setConversations] = useState<ConversationDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategoryDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ category });
      if (agentId) params.append('agent_id', agentId);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await fetch(`/api/call-categories/details?${params}`);
      if (!response.ok) throw new Error('Failed to fetch category details');
      
      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [category, agentId, startDate, endDate]);

  useEffect(() => {
    if (isOpen && category) {
      fetchCategoryDetails();
    }
  }, [isOpen, category, fetchCategoryDetails]);

  if (!isOpen) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            {category} - Call Titles
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="text-red-400 text-center py-8">
              <p>{error}</p>
              <button
                onClick={fetchCategoryDetails}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
              >
                Retry
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-gray-400 text-center py-8">
              No conversations found in this category
            </p>
          ) : (
            <>
              <p className="text-gray-400 mb-4">
                Total: {conversations.length} calls
              </p>
              <div className="space-y-3">
                {conversations.map((conv) => (
                  <div
                    key={conv.conversation_id}
                    className="bg-gray-700 p-4 rounded-lg hover:bg-gray-650"
                  >
                    <p className="text-white font-medium mb-2">
                      {conv.call_summary_title}
                    </p>
                    <div className="flex justify-between text-sm text-gray-400">
                      <span>{conv.agent_name}</span>
                      <span>{formatDate(conv.start_time_unix_secs)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


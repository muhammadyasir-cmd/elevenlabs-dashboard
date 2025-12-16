export interface Conversation {
  conversation_id: string;
  agent_id: string;
  agent_name: string;
  branch_id?: string | null;
  start_time_unix_secs: number;
  call_duration_secs: number;
  message_count: number;
  status?: string | null;
  call_successful?: string | null;
  transcript_summary?: string | null;
  call_summary_title?: string | null;
  direction?: string | null;
  rating?: string | null;
  summary_category?: string | null;
  created_at?: string;
}

export interface Agent {
  agent_id: string;
  agent_name: string;
}

export interface AgentMetrics {
  agent_id: string;
  agent_name: string;
  totalConversations: number;
  avgCallDuration: number;
  avgMessages: number;
  successRate: number;
  hangupRate?: number;
  revenueOpportunityRate?: number;
  statusBreakdown: Record<string, number>;
  directionBreakdown: Record<string, number>;
}

export interface DailyMetric {
  date: string;
  conversationCount: number;
  avgDuration: number;
  avgMessages: number;
  successRate: number;
  hangupRate?: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface CallCategory {
  category: string;
  count: number;
  percentage: number;
}

import { Conversation, AgentMetrics, DailyMetric } from '@/types';

export function calculateAgentMetrics(conversations: Conversation[]): AgentMetrics | null {
  if (conversations.length === 0) {
    return null;
  }

  const agentId = conversations[0].agent_id;
  const agentName = conversations[0].agent_name;

  const totalConversations = conversations.length;

  // Calculate average call duration
  const totalDuration = conversations.reduce((sum, conv) => sum + conv.call_duration_secs, 0);
  const avgCallDuration = Math.round(totalDuration / totalConversations);

  // Calculate average messages
  const totalMessages = conversations.reduce((sum, conv) => sum + conv.message_count, 0);
  const avgMessages = parseFloat((totalMessages / totalConversations).toFixed(1));

  // Calculate success rate
  const successCount = conversations.filter(
    conv => conv.call_successful === 'success'
  ).length;
  const successRate = parseFloat(((successCount / totalConversations) * 100).toFixed(1));

  // Status breakdown
  const statusBreakdown: Record<string, number> = {};
  conversations.forEach(conv => {
    const status = conv.status || 'unknown';
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
  });

  // Direction breakdown
  const directionBreakdown: Record<string, number> = {};
  conversations.forEach(conv => {
    const direction = conv.direction || 'unknown';
    directionBreakdown[direction] = (directionBreakdown[direction] || 0) + 1;
  });

  return {
    agent_id: agentId,
    agent_name: agentName,
    totalConversations,
    avgCallDuration,
    avgMessages,
    successRate,
    statusBreakdown,
    directionBreakdown,
  };
}

export function calculateDailyMetrics(
  conversations: Conversation[],
  startDate: string,
  endDate: string
): DailyMetric[] {
  // Create a map of dates
  const dateMap = new Map<string, Conversation[]>();
  
  // Initialize all dates in range
  const start = new Date(startDate);
  const end = new Date(endDate);
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    dateMap.set(dateStr, []);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Group conversations by date
  conversations.forEach(conv => {
    const dateStr = unixToDate(conv.start_time_unix_secs);
    if (dateMap.has(dateStr)) {
      dateMap.get(dateStr)!.push(conv);
    }
  });

  // Calculate metrics for each day
  const dailyMetrics: DailyMetric[] = [];
  dateMap.forEach((dayConversations, date) => {
    if (dayConversations.length === 0) {
      dailyMetrics.push({
        date,
        conversationCount: 0,
        avgDuration: 0,
        avgMessages: 0,
        successRate: 0,
        hangupRate: 0,
      });
      return;
    }

    const totalDuration = dayConversations.reduce((sum, c) => sum + c.call_duration_secs, 0);
    const avgDuration = Math.round(totalDuration / dayConversations.length);

    const totalMessages = dayConversations.reduce((sum, c) => sum + c.message_count, 0);
    const avgMessages = parseFloat((totalMessages / dayConversations.length).toFixed(1));

    const successCount = dayConversations.filter(c => c.call_successful === 'success').length;
    const successRate = parseFloat(((successCount / dayConversations.length) * 100).toFixed(1));

    // Calculate hangup rate: call is a hangup if call_duration_secs < 15 AND message_count < 3
    const hangupCount = dayConversations.filter(
      c => c.call_duration_secs < 15 && c.message_count < 3
    ).length;
    const hangupRate = parseFloat(((hangupCount / dayConversations.length) * 100).toFixed(1));

    dailyMetrics.push({
      date,
      conversationCount: dayConversations.length,
      avgDuration,
      avgMessages,
      successRate,
      hangupRate,
    });
  });

  return dailyMetrics.sort((a, b) => a.date.localeCompare(b.date));
}

function unixToDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().split('T')[0];
}



import { NextResponse } from 'next/server';
import { supabase, getDateRangeTimestamps } from '@/lib/supabase';
import { Conversation } from '@/types';
import { AgentMetrics } from '@/types';

export const dynamic = 'force-dynamic';
// Cache for 15 minutes
export const revalidate = 900;

export async function GET(request: Request) {
  console.log('🟡 [API] /api/metrics - Request received');
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const agentId = searchParams.get('agent_id');

    console.log('🟡 [API] /api/metrics - Params:', { startDate, endDate, agentId });

    if (!startDate || !endDate) {
      console.error('❌ [API] /api/metrics - Missing parameters');
      return NextResponse.json(
        { error: 'Missing start_date or end_date parameters' },
        { status: 400 }
      );
    }

    // Convert dates to Unix timestamps (seconds) - includes full start and end days
    // Uses "next day" approach: start_time_unix_secs >= startDate AND < (endDate + 1 day)
    const { startTimestamp, endTimestampExclusive } = getDateRangeTimestamps(startDate, endDate);

    console.log('🟡 [API] /api/metrics - Timestamps:', { startTimestamp, endTimestampExclusive });
    console.log('🟡 [API] /api/metrics - Date range:', { startDate, endDate });
    console.log('🟡 [API] /api/metrics - Filter: start_time_unix_secs >=', startTimestamp, 'AND <', endTimestampExclusive);

    // STEP 1: Get all distinct agents in the date range using PAGINATION
    console.log('🟡 [API] /api/metrics - Step 1: Getting distinct agents with pagination...');
    
    let allAgentsData: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let agentsQuery = supabase
        .from('conversations')
        .select('agent_id, agent_name')
        .gte('start_time_unix_secs', startTimestamp)
        .lt('start_time_unix_secs', endTimestampExclusive) // CRITICAL: Use .lt() with next day timestamp to include full end date
        .order('start_time_unix_secs', { ascending: true }) // CRITICAL: Order by timestamp to ensure consistent pagination
        .range(from, from + pageSize - 1);

      if (agentId) {
        agentsQuery = agentsQuery.eq('agent_id', agentId);
      }

      const { data: agentsData, error: agentsError } = await agentsQuery;

      if (agentsError) {
        console.error('❌ [API] /api/metrics - Error fetching agents:', agentsError);
        return NextResponse.json(
          { error: agentsError.message, details: agentsError },
          { status: 500 }
        );
      }

      if (agentsData && agentsData.length > 0) {
        allAgentsData = allAgentsData.concat(agentsData);
        console.log(`🔴 [API] /api/metrics - Fetched ${agentsData.length} agent rows, total so far: ${allAgentsData.length}`);
        
        if (agentsData.length < pageSize) {
          hasMore = false; // Last page
        } else {
          from += pageSize; // Next page
        }
      } else {
        hasMore = false;
      }
    }

    console.log('🟢 [API] /api/metrics - Total agent rows fetched:', allAgentsData.length);

    if (!allAgentsData || allAgentsData.length === 0) {
      console.log('🟡 [API] /api/metrics - No agents found, returning empty metrics');
      return NextResponse.json({ metrics: [] });
    }

    // Get unique agents
    const agentMap = new Map<string, { agent_id: string; agent_name: string }>();
    allAgentsData.forEach((row: any) => {
      if (row.agent_id && row.agent_name) {
        const key = `${row.agent_id}_${row.agent_name}`;
        if (!agentMap.has(key)) {
          agentMap.set(key, {
            agent_id: row.agent_id,
            agent_name: row.agent_name,
          });
        }
      }
    });

    const agents = Array.from(agentMap.values());
    console.log('🟢 [API] /api/metrics - Found', agents.length, 'unique agents');

    // STEP 2: For each agent, fetch raw conversations and calculate metrics
    console.log('🟡 [API] /api/metrics - Step 2: Fetching conversations per agent and calculating metrics...');
    
    const metricsPromises = agents.map(async (agent) => {
      // Fetch all raw conversations for this agent in the date range using PAGINATION
      let allConversations: any[] = [];
      let convFrom = 0;
      const convPageSize = 1000;
      let hasMoreConv = true;

      while (hasMoreConv) {
        const { data: conversations, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('agent_id', agent.agent_id)
          .gte('start_time_unix_secs', startTimestamp)
          .lt('start_time_unix_secs', endTimestampExclusive) // CRITICAL: Use .lt() with next day timestamp to include full end date
          .order('start_time_unix_secs', { ascending: true }) // CRITICAL: Order by timestamp to ensure consistent pagination
          .range(convFrom, convFrom + convPageSize - 1);

        if (convError) {
          console.error(`❌ [API] /api/metrics - Error fetching conversations for agent ${agent.agent_id}:`, convError);
          return null;
        }

        if (conversations && conversations.length > 0) {
          allConversations = allConversations.concat(conversations);
          
          if (conversations.length < convPageSize) {
            hasMoreConv = false; // Last page
          } else {
            convFrom += convPageSize; // Next page
          }
        } else {
          hasMoreConv = false;
        }
      }

      if (!allConversations || allConversations.length === 0) {
        return null; // Skip agents with no conversations
      }

      // Calculate metrics server-side from raw conversations
      const totalConversations = allConversations.length;

      const totalDuration = allConversations.reduce((sum: number, c: Conversation) => sum + (c.call_duration_secs || 0), 0);
      const avgCallDuration = Math.round(totalDuration / totalConversations);

      const totalMessages = allConversations.reduce((sum: number, c: Conversation) => sum + (c.message_count || 0), 0);
      const avgMessages = parseFloat((totalMessages / totalConversations).toFixed(1));

      const successCount = allConversations.filter((c: Conversation) => c.call_successful === 'success').length;
      const successRate = parseFloat(((successCount / totalConversations) * 100).toFixed(1));

      // Calculate rates using summary_category column (exclude null categories)
      const categorizedConversations = allConversations.filter(
        (c: Conversation) => c.summary_category !== null && c.summary_category !== undefined
      );
      const categorizedCount = categorizedConversations.length;
      
      const hangupConversations = categorizedConversations.filter(
        (c: Conversation) => c.summary_category === 'Hangups'
      ).length;
      
      const revenueConversations = categorizedConversations.filter(
        (c: Conversation) => c.summary_category === 'Revenue Opportunity'
      ).length;
      
      const hangupRate = categorizedCount > 0 
        ? Number(((hangupConversations / categorizedCount) * 100).toFixed(2))
        : 0;

      const revenueOpportunityRate = categorizedCount > 0
        ? Number(((revenueConversations / categorizedCount) * 100).toFixed(2))
        : 0;

      const statusBreakdown: Record<string, number> = {};
      allConversations.forEach((c: Conversation) => {
        const status = c.status || 'unknown';
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      });

      const directionBreakdown: Record<string, number> = {};
      allConversations.forEach((c: Conversation) => {
        const direction = c.direction || 'unknown';
        directionBreakdown[direction] = (directionBreakdown[direction] || 0) + 1;
      });

      const metric: AgentMetrics = {
        agent_id: agent.agent_id,
        agent_name: agent.agent_name,
        totalConversations,
        avgCallDuration,
        avgMessages,
        successRate,
        hangupRate,
        revenueOpportunityRate,
        statusBreakdown,
        directionBreakdown,
      };

      return metric;
    });

    const metricsResults = await Promise.all(metricsPromises);
    const metrics = metricsResults
      .filter((metric): metric is AgentMetrics => metric !== null)
      .sort((a, b) => a.agent_name.localeCompare(b.agent_name));

    console.log('🟢 [API] /api/metrics - Success, returning', metrics.length, 'metrics');
    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('❌ [API] /api/metrics - Unexpected error:', error);
    console.error('❌ [API] /api/metrics - Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

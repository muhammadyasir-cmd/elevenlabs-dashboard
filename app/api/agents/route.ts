import { NextResponse } from 'next/server';
import { supabase, dateToUnix } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
// Cache for 15 minutes
export const revalidate = 900;

export async function GET(request: Request) {
  console.log('🟡 [API] /api/agents - Request received');
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    console.log('🟡 [API] /api/agents - Params:', { startDate, endDate });

    if (!startDate || !endDate) {
      console.error('❌ [API] /api/agents - Missing parameters');
      return NextResponse.json(
        { error: 'Missing start_date or end_date parameters' },
        { status: 400 }
      );
    }

    // Convert dates to Unix timestamps (seconds)
    // Start date: beginning of day (00:00:00)
    // End date: end of day (23:59:59) - add 86400 seconds to include full day
    const startTimestamp = dateToUnix(startDate);
    const endTimestamp = dateToUnix(endDate);
    const endTimestampInclusive = endTimestamp + 86400 - 1; // 23:59:59 of end date

    console.log('🟡 [API] /api/agents - Timestamps:', { startTimestamp, endTimestamp, endTimestampInclusive });
    console.log('🟡 [API] /api/agents - Date range:', { startDate, endDate });

    // Check Supabase connection
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ [API] /api/agents - Missing Supabase credentials');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Supabase credentials' },
        { status: 500 }
      );
    }

    console.log('🟡 [API] /api/agents - Querying Supabase for distinct agents...');
    console.log('🔴 [API] /api/agents - Starting pagination to fetch ALL rows (Supabase max is 1000 per request)...');
    
    // Fetch ALL conversations by paginating (Supabase has 1000 row limit per request)
    let allConversations: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('conversations')
        .select('agent_id, agent_name')
        .gte('start_time_unix_secs', startTimestamp)
        .lte('start_time_unix_secs', endTimestampInclusive)
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('❌ [API] /api/agents - Supabase error:', error);
        console.error('❌ [API] /api/agents - Error details:', JSON.stringify(error, null, 2));
        return NextResponse.json(
          { error: error.message, details: error },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        allConversations = allConversations.concat(data);
        console.log(`🔴 [API] /api/agents - Fetched ${data.length} rows (page ${Math.floor(from / pageSize) + 1}), total so far: ${allConversations.length}`);
        
        if (data.length < pageSize) {
          hasMore = false; // Last page - got fewer than pageSize rows
        } else {
          from += pageSize; // Move to next page
        }
      } else {
        hasMore = false; // No data returned
      }
    }

    console.log('🟢 [API] /api/agents - Total conversations fetched:', allConversations.length);

    // Get unique agent combinations and count conversations per agent
    const agentMap = new Map<string, { agent_id: string; agent_name: string; total_conversations: number }>();
    allConversations.forEach(conv => {
      if (conv.agent_id && conv.agent_name) {
        const key = `${conv.agent_id}_${conv.agent_name}`;
        if (!agentMap.has(key)) {
          agentMap.set(key, {
            agent_id: conv.agent_id,
            agent_name: conv.agent_name,
            total_conversations: 0,
          });
        }
        agentMap.get(key)!.total_conversations++;
      }
    });

    const agents = Array.from(agentMap.values())
      .map(({ total_conversations, ...agent }) => ({
        ...agent,
        total_conversations,
      }))
      .sort((a, b) => a.agent_name.localeCompare(b.agent_name));
    
    console.log('🟢 [API] /api/agents - Unique agents found:', agents.length);
    console.log('🟢 [API] /api/agents - Agent names:', agents.map(a => a.agent_name).join(', '));

    const response = {
      agents,
      dateRange: {
        startDate,
        endDate,
      },
    };

    console.log('🟢 [API] /api/agents - Success, returning response');
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ [API] /api/agents - Unexpected error:', error);
    console.error('❌ [API] /api/agents - Error stack:', error instanceof Error ? error.stack : 'No stack');
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
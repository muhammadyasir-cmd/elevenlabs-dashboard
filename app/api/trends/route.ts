import { NextResponse } from 'next/server';
import { supabase, getDateRangeTimestamps } from '@/lib/supabase';
import { calculateDailyMetrics } from '@/lib/calculations';
import { Conversation } from '@/types';

export const dynamic = 'force-dynamic';
// Cache for 15 minutes
export const revalidate = 900;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const agentId = searchParams.get('agent_id');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing start_date or end_date parameters' },
        { status: 400 }
      );
    }

    // Convert dates to Unix timestamps (seconds) - includes full start and end days
    // Uses "next day" approach: start_time_unix_secs >= startDate AND < (endDate + 1 day)
    const { startTimestamp, endTimestampExclusive } = getDateRangeTimestamps(startDate, endDate);

    // Fetch ALL conversations using pagination (Supabase has 1000 row limit per request)
    let allConversations: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('conversations')
        .select('*')
        .gte('start_time_unix_secs', startTimestamp)
        .lt('start_time_unix_secs', endTimestampExclusive) // CRITICAL: Use .lt() with next day timestamp to include full end date
        .order('start_time_unix_secs', { ascending: true }); // CRITICAL: Order by timestamp to ensure consistent pagination

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query.range(from, from + pageSize - 1);

      if (error) {
        console.error('❌ [API] /api/trends - Supabase error:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        allConversations = allConversations.concat(data);
        console.log(`🔴 [API] /api/trends - Fetched ${data.length} rows (page ${Math.floor(from / pageSize) + 1}), total so far: ${allConversations.length}`);
        
        if (data.length < pageSize) {
          hasMore = false; // Last page
        } else {
          from += pageSize; // Next page
        }
      } else {
        hasMore = false; // No data returned
      }
    }

    console.log('🟢 [API] /api/trends - Total conversations fetched:', allConversations.length);
    const conversations = (allConversations as Conversation[]) || [];

    const dailyMetrics = calculateDailyMetrics(conversations, startDate, endDate);

    return NextResponse.json({ dailyMetrics });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



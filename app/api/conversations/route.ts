import { NextResponse } from 'next/server';
import { supabase, getDateRangeTimestamps } from '@/lib/supabase';
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
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 100);

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing start_date or end_date parameters' },
        { status: 400 }
      );
    }

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agent_id parameter' },
        { status: 400 }
      );
    }

    // Convert dates to Unix timestamps (seconds) - includes full start and end days
    // Uses "next day" approach: start_time_unix_secs >= startDate AND < (endDate + 1 day)
    const { startTimestamp, endTimestampExclusive } = getDateRangeTimestamps(startDate, endDate);

    // Get total count
    let countQuery = supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .gte('start_time_unix_secs', startTimestamp)
      .lt('start_time_unix_secs', endTimestampExclusive); // CRITICAL: Use .lt() with next day timestamp to include full end date

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Supabase count error:', countError);
      return NextResponse.json(
        { error: countError.message },
        { status: 500 }
      );
    }

    const total = count || 0;

    // Get paginated data
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let dataQuery = supabase
      .from('conversations')
      .select('*')
      .eq('agent_id', agentId)
      .gte('start_time_unix_secs', startTimestamp)
      .lt('start_time_unix_secs', endTimestampExclusive) // CRITICAL: Use .lt() with next day timestamp to include full end date
      .order('start_time_unix_secs', { ascending: false })
      .range(from, to);

    const { data, error } = await dataQuery;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      conversations: (data as Conversation[]) || [],
      pagination: {
        page,
        limit,
        total,
        hasMore: to < total - 1,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



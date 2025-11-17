import { NextResponse } from 'next/server';
import { supabase, dateToUnix } from '@/lib/supabase';
import { Conversation } from '@/types';

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

    // Convert dates to Unix timestamps (seconds)
    // Equivalent SQL: WHERE start_time_unix_secs >= EXTRACT(EPOCH FROM TIMESTAMP '{startDate} 00:00:00')
    //   AND start_time_unix_secs <= EXTRACT(EPOCH FROM TIMESTAMP '{endDate} 23:59:59')
    const startTimestamp = dateToUnix(startDate);
    const endTimestamp = dateToUnix(endDate);
    const endTimestampInclusive = endTimestamp + 86400 - 1; // 23:59:59 of end date

    // Get total count
    let countQuery = supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('agent_id', agentId)
      .gte('start_time_unix_secs', startTimestamp)
      .lte('start_time_unix_secs', endTimestampInclusive);

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
      .lte('start_time_unix_secs', endTimestampInclusive)
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



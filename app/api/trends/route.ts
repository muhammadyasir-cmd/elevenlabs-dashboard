import { NextResponse } from 'next/server';
import { supabase, dateToUnix } from '@/lib/supabase';
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

    // Convert dates to Unix timestamps (seconds)
    // Equivalent SQL: WHERE start_time_unix_secs >= EXTRACT(EPOCH FROM TIMESTAMP '{startDate} 00:00:00')
    //   AND start_time_unix_secs <= EXTRACT(EPOCH FROM TIMESTAMP '{endDate} 23:59:59')
    const startTimestamp = dateToUnix(startDate);
    const endTimestamp = dateToUnix(endDate);
    const endTimestampInclusive = endTimestamp + 86400 - 1; // 23:59:59 of end date

    let query = supabase
      .from('conversations')
      .select('*')
      .gte('start_time_unix_secs', startTimestamp)
      .lte('start_time_unix_secs', endTimestampInclusive)
      .order('start_time_unix_secs', { ascending: true });

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const conversations = (data as Conversation[]) || [];
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



import { NextRequest, NextResponse } from 'next/server';
import { supabase, getDateRangeTimestamps } from '@/lib/supabase';

// Cache for 15 minutes
export const revalidate = 900;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const category = searchParams.get('category');
  const agentId = searchParams.get('agent_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  if (!category) {
    return NextResponse.json({ error: 'Category parameter required' }, { status: 400 });
  }

  try {
    // Build query with category filter
    let query = supabase
      .from('conversations')
      .select('conversation_id, call_summary_title, start_time_unix_secs, agent_name, summary_category')
      .eq('summary_category', category) // Direct match on summary_category column
      .order('start_time_unix_secs', { ascending: false });

    // Apply optional filters
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    if (startDate && endDate) {
      const { startTimestamp, endTimestampExclusive } = getDateRangeTimestamps(startDate, endDate);
      query = query
        .gte('start_time_unix_secs', startTimestamp)
        .lt('start_time_unix_secs', endTimestampExclusive);
    }

    // Fetch all conversations with pagination
    let allConversations: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await query.range(from, from + pageSize - 1);
      
      if (error) {
        console.error('❌ [API] /api/call-categories/details - Supabase error:', error);
        return NextResponse.json(
          { error: error.message, details: error },
          { status: 500 }
        );
      }
      
      if (data && data.length > 0) {
        allConversations = allConversations.concat(data);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      } else {
        hasMore = false;
      }
    }

    // Conversations are already sorted by timestamp descending from the query

    return NextResponse.json({
      category,
      totalTitles: allConversations.length,
      conversations: allConversations.map(conv => ({
        conversation_id: conv.conversation_id,
        call_summary_title: conv.call_summary_title || 'No title',
        start_time_unix_secs: conv.start_time_unix_secs,
        agent_name: conv.agent_name
      }))
    });

  } catch (error) {
    console.error('❌ [API] /api/call-categories/details - Error fetching category details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category details' },
      { status: 500 }
    );
  }
}

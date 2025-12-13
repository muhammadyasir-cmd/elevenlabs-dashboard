import { NextResponse } from 'next/server';
import { supabase, getDateRangeTimestamps } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  console.log('🟡 [API] /api/call-categories - Request received');
  try {
    // Extract optional query parameters
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agent_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    console.log('🟡 [API] /api/call-categories - Query params:', { agentId, startDate, endDate });

    // Calculate date range timestamps if provided
    let startTimestamp: number | undefined;
    let endTimestampExclusive: number | undefined;
    
    if (startDate && endDate) {
      const timestamps = getDateRangeTimestamps(startDate, endDate);
      startTimestamp = timestamps.startTimestamp;
      endTimestampExclusive = timestamps.endTimestampExclusive;
      console.log('🟡 [API] /api/call-categories - Date range timestamps:', { startTimestamp, endTimestampExclusive });
    }

    // Build base query to fetch conversations with summary_category
    let query = supabase
      .from('conversations')
      .select('summary_category')
      .not('summary_category', 'is', null); // Exclude null categories

    // Apply optional filters
    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    if (startTimestamp !== undefined && endTimestampExclusive !== undefined) {
      query = query
        .gte('start_time_unix_secs', startTimestamp)
        .lt('start_time_unix_secs', endTimestampExclusive);
    }

    // Fetch all conversations matching filters
    let allConversations: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await query.range(from, from + pageSize - 1);

      if (error) {
        console.error('❌ [API] /api/call-categories - Supabase error:', error);
        return NextResponse.json(
          { error: error.message, details: error },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        allConversations = allConversations.concat(data);
        console.log(`🟡 [API] /api/call-categories - Fetched ${data.length} rows, total: ${allConversations.length}`);
        
        if (data.length < pageSize) {
          hasMore = false; // Last page
        } else {
          from += pageSize; // Next page
        }
      } else {
        hasMore = false;
      }
    }

    console.log('🟢 [API] /api/call-categories - Total conversations fetched:', allConversations.length);

    // Group by summary_category and count
    const categoryCounts: Record<string, number> = {};
    
    allConversations.forEach(conv => {
      const category = conv.summary_category || 'System / Other';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const totalCalls = allConversations.length;

    // Build response with counts and percentages
    const categories = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
      percentage: totalCalls > 0 
        ? parseFloat(((count / totalCalls) * 100).toFixed(1))
        : 0,
    }));

    // Sort by count (descending)
    categories.sort((a, b) => b.count - a.count);

    console.log('🟢 [API] /api/call-categories - Categorization complete');
    console.log('🟢 [API] /api/call-categories - Category breakdown:', categories);

    return NextResponse.json({
      totalCalls,
      categories,
    });
  } catch (error) {
    console.error('❌ [API] /api/call-categories - Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

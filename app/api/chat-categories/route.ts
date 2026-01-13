import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 900;

export async function GET() {
  console.log('🟡 [API] /api/chat-categories - Request received');
  try {
    let allChats: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('summary_category')
        .not('summary_category', 'is', null)
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('❌ [API] /api/chat-categories - Supabase error:', error);
        return NextResponse.json(
          { error: error.message, details: error },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        allChats = allChats.concat(data);
        console.log(`🟡 [API] /api/chat-categories - Fetched ${data.length} rows, total: ${allChats.length}`);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      } else {
        hasMore = false;
      }
    }

    const categoryCounts: Record<string, number> = {};
    allChats.forEach((conv) => {
      const category = conv.summary_category || 'System / Other';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const totalCalls = allChats.length;
    const categories = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
      percentage: totalCalls > 0 ? Number(((count / totalCalls) * 100).toFixed(1)) : 0,
    }));

    categories.sort((a, b) => b.count - a.count);

    console.log('🟢 [API] /api/chat-categories - Categorization complete');
    return NextResponse.json({
      totalCalls,
      categories,
    });
  } catch (error) {
    console.error('❌ [API] /api/chat-categories - Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


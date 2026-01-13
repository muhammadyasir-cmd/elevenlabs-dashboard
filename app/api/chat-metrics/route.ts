import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ChatConversation, ChatMetrics } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 900;

export async function GET() {
  console.log('🟡 [API] /api/chat-metrics - Request received');
  try {
    let allChats: ChatConversation[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .range(from, from + pageSize - 1);

      if (error) {
        console.error('❌ [API] /api/chat-metrics - Supabase error:', error);
        return NextResponse.json(
          { error: error.message, details: error },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        allChats = allChats.concat(data as ChatConversation[]);
        console.log(`🟡 [API] /api/chat-metrics - Fetched ${data.length} rows, total: ${allChats.length}`);
        if (data.length < pageSize) {
          hasMore = false;
        } else {
          from += pageSize;
        }
      } else {
        hasMore = false;
      }
    }

    const totalConversations = allChats.length;
    if (totalConversations === 0) {
      console.log('🟡 [API] /api/chat-metrics - No chat conversations found');
      return NextResponse.json({
        metrics: {
          totalConversations: 0,
          avgMessages: 0,
          successRate: 0,
          statusBreakdown: {},
        } as ChatMetrics,
      });
    }

    const totalMessages = allChats.reduce((sum, conv) => sum + (conv.message_count || 0), 0);
    const avgMessages = Number((totalMessages / totalConversations).toFixed(1));

    const successCount = allChats.filter((conv) => conv.conversation_successful === 'success').length;
    const successRate = Number(((successCount / totalConversations) * 100).toFixed(1));

    const statusBreakdown: Record<string, number> = {};
    allChats.forEach((conv) => {
      const status = conv.status || 'unknown';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    const metrics: ChatMetrics = {
      totalConversations,
      avgMessages,
      successRate,
      statusBreakdown,
    };

    console.log('🟢 [API] /api/chat-metrics - Success, returning metrics');
    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('❌ [API] /api/chat-metrics - Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


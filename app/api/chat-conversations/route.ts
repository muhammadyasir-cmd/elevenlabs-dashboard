import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ChatConversation } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 900;

export async function GET() {
  console.log('🟡 [API] /api/chat-conversations - Request received');
  try {
    // Fetch all rows without pagination for small datasets
    const { data, error, count } = await supabase
      .from('chat_conversations')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('❌ [API] /api/chat-conversations - Supabase error:', error);
      return NextResponse.json(
        { error: error.message, details: error },
        { status: 500 }
      );
    }

    console.log(`🟢 [API] /api/chat-conversations - Fetched ${data?.length || 0} conversations (count: ${count})`);
    console.log('🟢 [API] /api/chat-conversations - Session IDs:', (data || []).map(c => c.session_id).join(', '));

    return NextResponse.json({ conversations: data || [] });
  } catch (error) {
    console.error('❌ [API] /api/chat-conversations - Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


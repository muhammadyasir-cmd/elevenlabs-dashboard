import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  console.log('🟡 [API] /api/test - Testing Supabase connection');
  
  try {
    // Test 1: Check environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const envCheck = {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING',
      keyPreview: supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'MISSING',
    };

    console.log('🟡 [API] /api/test - Environment check:', envCheck);

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing environment variables',
        envCheck,
      }, { status: 500 });
    }

    // Test 2: Try a simple query
    console.log('🟡 [API] /api/test - Testing Supabase query...');
    const { data, error, count } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .limit(1);

    console.log('🟡 [API] /api/test - Query result:', { 
      hasData: !!data, 
      error: error?.message, 
      count 
    });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        errorDetails: error,
        envCheck,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      envCheck,
      conversationCount: count || 0,
    });
  } catch (error) {
    console.error('❌ [API] /api/test - Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}


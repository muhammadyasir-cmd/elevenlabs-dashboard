import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Fixed 10 categories as specified
const CATEGORIES = [
  'Appointment Requests',
  'Transfer to Human',
  'Pricing Inquiries',
  'Vehicle Status',
  'Appointment Changes',
  'General Inquiry',
  'Service Requests',
  'Message Taking',
  'Hangups/Incomplete',
  'Testing/Other',
] as const;

// Category keywords for fuzzy matching
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Appointment Requests': ['appointment', 'schedule', 'book', 'reservation', 'appt', 'booking'],
  'Transfer to Human': ['transfer', 'human', 'agent', 'representative', 'speak to', 'talk to'],
  'Pricing Inquiries': ['price', 'cost', 'pricing', 'quote', 'how much', 'fee', 'charge'],
  'Vehicle Status': ['vehicle', 'car', 'status', 'ready', 'pickup', 'delivery', 'location'],
  'Appointment Changes': ['change', 'reschedule', 'cancel', 'modify', 'update appointment'],
  'General Inquiry': ['question', 'inquiry', 'info', 'information', 'help', 'general'],
  'Service Requests': ['service', 'repair', 'maintenance', 'work', 'fix', 'service request'],
  'Message Taking': ['message', 'take a message', 'leave a message', 'voicemail'],
  'Hangups/Incomplete': ['hangup', 'incomplete', 'disconnected', 'dropped', 'cut off'],
  'Testing/Other': [], // Catch-all category
};

// Calculate similarity score between two strings (simple fuzzy matching)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  
  // Calculate word overlap
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const intersection = words1.filter(w => words2.includes(w));
  const union = [...new Set([...words1, ...words2])];
  
  if (union.length === 0) return 0;
  return intersection.length / union.length;
}

// Categorize a call summary title using fuzzy matching
function categorizeCall(title: string | null | undefined): string {
  if (!title || title.trim() === '') {
    return 'Testing/Other';
  }
  
  const normalizedTitle = title.toLowerCase().trim();
  let bestMatch = 'Testing/Other';
  let bestScore = 0;
  
  // Check each category's keywords
  for (const category of CATEGORIES) {
    if (category === 'Testing/Other') continue; // Skip catch-all
    
    const keywords = CATEGORY_KEYWORDS[category];
    
    // Check direct keyword matches
    for (const keyword of keywords) {
      if (normalizedTitle.includes(keyword.toLowerCase())) {
        const score = calculateSimilarity(normalizedTitle, keyword);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = category;
        }
      }
    }
    
    // Check category name similarity
    const categoryScore = calculateSimilarity(normalizedTitle, category.toLowerCase());
    if (categoryScore > bestScore && categoryScore > 0.3) {
      bestScore = categoryScore;
      bestMatch = category;
    }
  }
  
  // If no good match found, use Testing/Other
  if (bestScore < 0.2) {
    return 'Testing/Other';
  }
  
  return bestMatch;
}

export async function GET() {
  console.log('🟡 [API] /api/call-categories - Request received');
  try {
    // Fetch ALL conversations (NO date filtering as per requirements)
    console.log('🟡 [API] /api/call-categories - Fetching ALL conversations...');
    
    // Use pagination to fetch ALL conversations
    let allConversations: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('conversations')
        .select('conversation_id, call_summary_title')
        .range(from, from + pageSize - 1);

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

    // Categorize all conversations
    const categoryCounts: Record<string, number> = {};
    
    // Initialize all categories with 0
    CATEGORIES.forEach(cat => {
      categoryCounts[cat] = 0;
    });

    // Categorize each conversation
    allConversations.forEach(conv => {
      const category = categorizeCall(conv.call_summary_title);
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const totalCalls = allConversations.length;

    // Build response with counts and percentages
    const categories = CATEGORIES.map(category => ({
      category,
      count: categoryCounts[category] || 0,
      percentage: totalCalls > 0 
        ? parseFloat(((categoryCounts[category] / totalCalls) * 100).toFixed(1))
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


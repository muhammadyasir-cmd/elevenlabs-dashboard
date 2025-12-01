import { NextResponse } from 'next/server';
import { supabase, dateToUnix } from '@/lib/supabase';

// Cache for 15 minutes
export const revalidate = 900;

// Interface for conversation data used in categorization
interface ConversationForCategorization {
  call_summary_title?: string | null;
  call_duration_secs?: number;
  message_count?: number;
}

// New 7-category structure
const CATEGORIES = [
  'Hangups',
  'Revenue Opportunity',
  'Repair Status & Shop Updates',
  'General Info & Customer Service',
  'Logistics, Billing & Other',
  'Forwarded to Advisor',
  'System / Other',
] as const;

// Category keywords for fuzzy matching - New 7-category structure
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Hangups': [
    // Keyword-based hangup detection (after duration check)
    'silent', 'incomplete', 'no response', 'disconnected', 'hang up', 'hangup', 'empty', 'abandoned',
    'noise only', 'robocall', 'spam call', 'immediate disconnect'
  ],
  'Revenue Opportunity': [
    // Service-related keywords (merged from all service categories)
    'appointment', 'schedule', 'book', 'service', 'repair', 'brake', 'oil change', 'tire', 'alignment',
    'AC', 'diagnostic', 'symptom', 'noise', 'quote', 'price', 'cost', 'estimate', 'maintenance',
    'tune-up', 'inspection', 'check', 'parts', 'warranty', 'alternator', 'battery', 'transmission',
    'engine', 'suspension', 'exhaust', 'fluid', 'filter', 'belt', 'hose', 'spark plug', 'radiator',
    'coolant', 'timing', 'clutch', 'strut', 'shock', 'cv joint', 'wheel bearing', 'serpentine',
    'thermostat', 'water pump', 'fuel pump', 'starter', 'catalytic converter', 'muffler', 'rotor',
    'pad', 'caliper', 'master cylinder', 'do you do', 'can you', 'availability', 'fixing',
    'looking for service'
  ],
  'Repair Status & Shop Updates': [
    'ready', 'status', 'update', 'done', 'finished', 'complete', 'progress', 'diagnosed',
    'diagnosis result', 'pick up ready', 'when ready', 'eta', 'how long', 'waiting',
    'callback about repair', 'repair update'
  ],
  'General Info & Customer Service': [
    'hours', 'open', 'close', 'location', 'address', 'directions', 'where located', 'holiday',
    'weekend hours', 'shuttle', 'contact', 'phone number', 'email', 'fax', 'general inquiry',
    'information', 'help', 'question about business'
  ],
  'Logistics, Billing & Other': [
    'invoice', 'receipt', 'billing', 'payment', 'charge', 'paid', 'insurance', 'paperwork',
    'tow', 'pickup request', 'dropoff logistics', 'copy of invoice', 'transaction',
    'payment method', 'credit card'
  ],
  'Forwarded to Advisor': [
    'transfer', 'speak to', 'talk to', 'human', 'representative', 'agent', 'advisor', 'person',
    'staff member', 'connect me', 'put me through', 'escalate', 'manager', 'technician name'
  ],
  'System / Other': [
    'unclassifiable', 'error', 'garbled', 'test', 'system issue', 'unclear intent', 'cannot determine'
  ],
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

// Categorize a call using duration/message count and fuzzy matching
function categorizeCall(conversation: ConversationForCategorization): string {
  const title = conversation.call_summary_title;
  const duration = conversation.call_duration_secs || 0;
  const messageCount = conversation.message_count || 0;
  
  // FIRST: Check for Hangups (duration < 15 seconds AND message count < 3)
  // This runs BEFORE any keyword matching
  if (duration < 15 && messageCount < 3) {
    return 'Hangups';
  }
  
  // If not a hangup, proceed with keyword matching logic
  if (!title || title.trim() === '') {
    return 'System / Other';
  }
  
  const normalizedTitle = title.toLowerCase().trim();
  let bestMatch = 'System / Other';
  let bestScore = 0;
  
  // SECOND: Check Revenue Opportunity FIRST (service-related keywords get priority)
  // This ensures service-related calls go to Revenue Opportunity even if general info is mentioned
  const revenueKeywords = CATEGORY_KEYWORDS['Revenue Opportunity'] || [];
  for (const keyword of revenueKeywords) {
    if (normalizedTitle.includes(keyword.toLowerCase())) {
      const score = calculateSimilarity(normalizedTitle, keyword);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = 'Revenue Opportunity';
      }
    }
  }
  
  // THIRD: Check other category keywords (excluding Hangups and System / Other)
  for (const category of CATEGORIES) {
    if (category === 'Hangups' || category === 'System / Other' || category === 'Revenue Opportunity') {
      continue; // Skip already checked categories
    }
    
    const keywords = CATEGORY_KEYWORDS[category] || [];
    
    // Keyword matching logic
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
  
  // Require minimum threshold (SIMILARITY_THRESHOLD = 0.15)
  if (bestScore < 0.15) {
    return 'System / Other';
  }
  
  return bestMatch;
}

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
    let endTimestampInclusive: number | undefined;
    
    if (startDate && endDate) {
      startTimestamp = dateToUnix(startDate);
      const endTimestamp = dateToUnix(endDate);
      endTimestampInclusive = endTimestamp + 86399; // End of day (23:59:59)
      console.log('🟡 [API] /api/call-categories - Date range timestamps:', { startTimestamp, endTimestampInclusive });
    }

    // Determine fetch message based on filters
    if (agentId || (startDate && endDate)) {
      console.log('🟡 [API] /api/call-categories - Fetching filtered conversations...');
    } else {
      console.log('🟡 [API] /api/call-categories - Fetching ALL conversations...');
    }
    
    // Use pagination to fetch conversations (with optional filters)
    let allConversations: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      // Build base query
      let query = supabase
        .from('conversations')
        .select('conversation_id, call_summary_title, call_duration_secs, message_count, start_time_unix_secs, agent_name')
        .range(from, from + pageSize - 1)
        .limit(pageSize);

      // Apply optional filters
      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      if (startTimestamp !== undefined && endTimestampInclusive !== undefined) {
        query = query
          .gte('start_time_unix_secs', startTimestamp)
          .lte('start_time_unix_secs', endTimestampInclusive);
      }

      const { data, error } = await query;

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

    // Categorize each conversation - Pass entire conversation object
    allConversations.forEach(conv => {
      const category = categorizeCall({
        call_summary_title: conv.call_summary_title,
        call_duration_secs: conv.call_duration_secs,
        message_count: conv.message_count
      });
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


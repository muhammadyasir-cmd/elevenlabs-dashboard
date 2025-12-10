import { NextResponse } from 'next/server';
import { supabase, getDateRangeTimestamps } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

const CATEGORY_EVALUATION_ORDER: Array<(typeof CATEGORIES)[number]> = [
  'Repair Status & Shop Updates',
  'Logistics, Billing & Other',
  'General Info & Customer Service',
  'Forwarded to Advisor',
] as const;

const SIMILARITY_THRESHOLD = 0.01;

// Category keywords for fuzzy matching - New 7-category structure
// Updated: 2025-12-02 (Cache-busting timestamp - reverted to original logic)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Hangups': [
    // Keyword-based hangup detection (after duration check)
    'silent', 'incomplete', 'no response', 'disconnected', 'hang up', 'hangup', 'empty', 'abandoned',
    'noise only', 'robocall', 'spam call', 'immediate disconnect',
    'hangs up', 'hangs up on', 'abrupt termination', 'abrupt call',
    'silent call', 'empty call', 'call connection issue',
    'dropped call', 'call terminated', 'ended abruptly', 'user hangs',
    'disconnect', 'silence', 'call ended', 'call cut', 'call dropped'
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
    'looking for service', "won't start", 'car issue', 'vehicle problem', 'oil leak', 'tire issue',
    'not working', 'broken', 'needs repair', 'engine problem', 'breakdown', 'car trouble',
    'checking on', 'following up', 'need help with', 'problem with', 'issue with', 'concern about',
    'question about service',
    'vehicle issue', 'car problem', 'vehicle trouble', 'help with',
    'assistance with', 'worried about', 'assistance needed', 'needs help', "won't crank"
  ],
  'Repair Status & Shop Updates': [
    'ready', 'status', 'update', 'done', 'finished', 'complete', 'progress', 'diagnosed',
    'diagnosis result', 'pick up ready', 'when ready', 'eta', 'how long', 'waiting',
    'callback about repair', 'repair update', 'vehicle ready', 'drop off',
    'drop-off notification', 'car arrival', 'vehicle drop', 'bring car', 'car done',
    'vehicle status', 'car status', 'pickup status', 'truck status',
    'status inquiry', 'status request', 'status update', 'ready inquiry', 'pickup inquiry',
    'ready status', 'pickup time', 'eta request', 'progress inquiry', 'update request',
    'claim status', 'order status', 'heads ready', 'parts ready',
    'car pickup', 'vehicle pickup', 'truck pickup', 'drop-off', 'authorize work',
    'vehicle release', 'keys confirmation', 'car ready', 'vehicle arrival',
    'picking up car', 'pick up vehicle', 'picking up vehicle', 'picking up truck', 'dropping off',
    'drop off car', 'bringing car', 'bringing vehicle', 'authorize', 'authorization', 'approval',
    'vehicle is ready', 'car is ready', 'ready for pickup', 'checking status', 'status check',
    'status on', 'inquiring about status', 'asking about status', 'when will be ready',
    'calling about', 'checking in', 'update on', 'status of', 'where is my', 'is my car', 'when can I',
    'car pickup arrangement', 'vehicle pickup arrangement', 'pickup time confirmation', 'pickup notification request',
    'pickup assistance needed', 'pickup inquiry request', 'car drop-off scheduling', 'vehicle drop-off scheduling',
    'drop-off arrangement', 'drop-off notification request', 'bringing car in', 'bringing vehicle in',
    'car arrival confirmation', 'vehicle arrival confirmation', 'pickup confirmation request', 'ready for collection',
    'collection notification', 'work authorization', 'authorize repair', 'approval needed', 'approval request',
    'keys ready', 'car completion', 'vehicle completion', 'finished repair',
    'pickup inquiry', 'pickup arrangement', 'pickup notification', 'pickup assistance',
    'drop-off inquiry', 'drop-off arrangement', 'drop-off notification',
    'bringing car', 'bringing vehicle', 'arrival confirmation', 'arrival notification',
    'pickup confirmation', 'drop-off confirmation',
    'checking on', 'check on', 'status of', 'where is my', 'is my car', 'is my vehicle',
    'when will', 'how long', 'car ready', 'vehicle ready', 'ready yet', 'done yet',
    'finished yet', 'status check', 'checking status', 'inquiring about', 'asking about',
    'following up on', 'follow up on', 'update on', 'car update', 'vehicle update',
    'repair status', 'work status', 'job status', 'estimate status', 'car progress',
    'vehicle progress', 'completion status', 'when done', 'when ready', 'time estimate',
    'ready for pickup', 'ready to pick', 'can I pick', 'pickup ready', 'come get',
    'car done', 'vehicle done', 'work done', 'repair done', 'finished repair'
  ],
  'General Info & Customer Service': [
    'hours', 'open', 'close', 'location', 'address', 'directions', 'where located', 'holiday',
    'weekend hours', 'shuttle', 'contact', 'phone number', 'email', 'fax', 'general inquiry',
    'information', 'help', 'question about business', 'closing time', 'store hours', 'when close',
    'business hours', 'hours inquiry', 'greeting', 'hello', 'assistance', 'help with',
    'virtual assistant', 'AI assistant',
    'language support', 'language assistance', 'spanish support', 'french support', 'switch to spanish',
    'switch to french', 'translation needed', 'language help', 'speak spanish', 'speak french',
    'virtual assistant introduction', 'virtual assistant greeting', 'automated assistant', 'assistant introduction',
    'assistant greeting', 'call center introduction', 'greeting message', 'assistance offer', 'help offered',
    'do you have', 'are you open', 'what time', 'where are you', 'how do I', 'can you tell me',
    'call start', 'inbound call greeting', 'shop info request', 'business inquiry',
    'how can I assist', 'how may I help', 'assistance needed',
    'call recording', 'call introduction'
  ],
  'Logistics, Billing & Other': [
    'invoice', 'receipt', 'billing', 'payment', 'charge', 'paid', 'insurance', 'paperwork',
    'tow', 'pickup request', 'dropoff logistics', 'copy of invoice', 'transaction',
    'payment method', 'credit card', 'towing', 'tow truck', 'AAA', 'invoice copy',
    'payment inquiry', 'bill payment', 'billing inquiry', 'past due', 'payment assistance',
    'payment plan', 'payment options', 'payment link', 'charge inquiry', 'declined payment',
    'overcharge', 'billing issue', 'payment follow-up', 'balance inquiry', 'payment authorization',
    'car pickup', 'vehicle pickup', 'pick up car', 'ready to pick up',
    'pay bill', 'pay invoice', 'make payment', 'send invoice',
    'need tow', 'car towed', 'towing service',
    'financing', 'quote', 'estimate', 'clearance', 'customs', 'shipment',
    'need invoice', 'invoice request', 'billing question', 'payment issue', 'paying bill',
    'need to pay', 'tow service', 'need towing', 'towing request', 'quote request',
    'estimate request', 'pricing question', 'cost question', 'how much',
    'invoice copy request', 'invoice inquiry request', 'billing inquiry request', 'payment inquiry request',
    'bill payment inquiry', 'balance inquiry request', 'outstanding payment', 'payment status',
    'invoice status', 'billing status', 'payment clarification', 'billing clarification', 'invoice clarification',
    'cost', 'price', 'pricing', 'charges', 'total', 'bill', 'pay', 'paid', 'transaction', 'balance',
    'outstanding', 'owe', 'owing', 'amount due', 'finance', 'financing',
    'debit', 'billing inquiry', 'invoice inquiry', 'cost inquiry', 'price inquiry',
    'estimate cost', 'quote cost', 'insurance', 'paperwork', 'document'
  ],
  'Forwarded to Advisor': [
    'transfer', 'speak to', 'talk to', 'human', 'representative', 'agent', 'advisor', 'person',
    'staff member', 'connect me', 'put me through', 'escalate', 'manager', 'technician name',
    'take message', 'leave message', 'message for', 'call back', 'return call', 'speak with',
    'looking for', 'call for', 'returning call', 'pass message',
    'relay message', 'connect to', 'reach', 'unavailable', 'callback', 'find', 'seeking',
    'taking message', 'leaving message', 'taking a message', 'leave a message', 'leaving a message',
    'message request', 'message to', 'returning a call', 'returning phone call', 'calling for',
    'calling back', 'call back request', 'speaking to', 'speaking with', 'talk with', 'talking to',
    'request callback', 'need to speak', 'need to talk', 'reaching out', 'trying to reach',
    'get in touch', 'contact person',
    'return a call', 'message taking', 'message relay', 'forward message', 'looking for person',
    'speak to person', 'talk to person', 'connect to person', 'reach person', 'find person',
    'seeking person', 'callback request', 'return missed call', 'want to talk', 'can I speak',
    'may I speak', 'is available', 'get back to me',
    'request to speak', 'follow-up', 'follow up', 'missed call',
    'connect me to', 'put me through to', 'reaching out to', 'get in touch with'
  ],
  'System / Other': [
    // Only for truly unclassifiable, random, scam calls, wrong number
    'unclassifiable', 'error', 'garbled', 'test', 'system issue', 'unclear intent', 'cannot determine',
    'scam', 'wrong number', 'random', 'spam', 'robocall', 'telemarketing', 'prank call'
  ],
};

// Calculate similarity score between two strings (simple fuzzy matching)
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  // Prioritize substring matches - if keyword appears in title, return 0.9
  if (s1.includes(s2) || s2.includes(s1)) return 0.9;
  
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
  
  // THIRD: Check other category keywords using priority order
  for (const category of CATEGORY_EVALUATION_ORDER) {
    const keywords = CATEGORY_KEYWORDS[category] || [];
    
    // Keyword matching logic - ensure normalizedTitle.includes() check runs for ALL categories
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
  
  // FOURTH: Check Hangups keywords (if no other category matched)
  const hangupKeywords = CATEGORY_KEYWORDS['Hangups'] || [];
  for (const keyword of hangupKeywords) {
    if (normalizedTitle.includes(keyword.toLowerCase())) {
      const score = calculateSimilarity(normalizedTitle, keyword);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = 'Hangups';
      }
    }
  }
  
  // FIFTH: Check System / Other keywords (if no other category matched)
  const systemKeywords = CATEGORY_KEYWORDS['System / Other'] || [];
  for (const keyword of systemKeywords) {
    if (normalizedTitle.includes(keyword.toLowerCase())) {
      const score = calculateSimilarity(normalizedTitle, keyword);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = 'System / Other';
      }
    }
  }
  
  // Require minimum threshold before trusting match; fall back to best guess even if low confidence
  if (bestScore < SIMILARITY_THRESHOLD) {
    console.log('🔍 [Categorization] Low-confidence match - Title:', title, '| BestMatch:', bestMatch, '| BestScore:', bestScore.toFixed(3));
    return bestMatch;
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
    let endTimestampExclusive: number | undefined;
    
    if (startDate && endDate) {
      const timestamps = getDateRangeTimestamps(startDate, endDate);
      startTimestamp = timestamps.startTimestamp;
      endTimestampExclusive = timestamps.endTimestampExclusive;
      console.log('🟡 [API] /api/call-categories - Date range timestamps:', { startTimestamp, endTimestampExclusive });
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
        .order('start_time_unix_secs', { ascending: true }) // CRITICAL: Order by timestamp to ensure consistent pagination
        .range(from, from + pageSize - 1)
        .limit(pageSize);

      // Apply optional filters
      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      if (startTimestamp !== undefined && endTimestampExclusive !== undefined) {
        query = query
          .gte('start_time_unix_secs', startTimestamp)
          .lt('start_time_unix_secs', endTimestampExclusive); // CRITICAL: Use .lt() with next day timestamp to include full end date
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
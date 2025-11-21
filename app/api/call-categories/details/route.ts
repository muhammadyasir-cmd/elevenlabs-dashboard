import { NextRequest, NextResponse } from 'next/server';
import { supabase, dateToUnix } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Fixed 11 categories as specified
const CATEGORIES = [
  'Appointment Scheduling',
  'Service Status Inquiries',
  'Pricing and Quotes',
  'Vehicle Diagnostics/Maintenance',
  'Parts and Repairs',
  'Billing and Payments',
  'General Information',
  'Customer Service Requests',
  'Vehicle Logistics',
  'Technical and Miscellaneous',
  'Others',
] as const;

// Category keywords for fuzzy matching - Comprehensive automotive shop terminology
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Appointment Scheduling': [
    // Core appointment terms
    'appointment', 'appointments', 'schedule', 'scheduled', 'scheduling', 'book', 'booking', 'booked',
    'reserve', 'reserved', 'reservation', 'reservations', 'appt', 'appts',
    // Action phrases
    'make appointment', 'set appointment', 'schedule appointment', 'book appointment', 'make a appointment',
    'need appointment', 'want appointment', 'would like appointment', 'looking to schedule', 'looking to book',
    'schedule service', 'book service', 'schedule maintenance', 'book maintenance', 'schedule repair', 'book repair',
    'schedule oil change', 'book oil change', 'schedule tire', 'book tire', 'schedule inspection', 'book inspection',
    'schedule an appointment', 'book an appointment', 'make an appointment', 'set up appointment',
    // Time-related
    'time slot', 'time slots', 'availability', 'available', 'when available', 'available time', 'next available',
    'open slot', 'open slots', 'appointment time', 'service time', 'when can i', 'when can we', 'when is', 'what time',
    'what times', 'available times', 'when are you available', 'when can you', 'when do you have',
    // Variations
    'appointment request', 'scheduling request', 'booking request', 'rescheduling', 're-schedule', 'rebook', 're-book',
    'change appointment', 'modify appointment', 'update appointment', 'cancel appointment', 'reschedule appointment'
  ],
  'Service Status Inquiries': [
    // Status core terms
    'status', 'statuses', 'ready', 'progress', 'completion', 'finished', 'done', 'complete', 'completed',
    'check', 'checking', 'update', 'updates', 'inquiry', 'inquiries',
    // Inquiry phrases
    'status inquiry', 'check status', 'service status', 'work status', 'repair status', 'vehicle status', 'car status',
    'status update', 'update on', 'how is', 'how are', 'where is', 'where are', 'what is the status',
    'check on', 'checking on', 'status of', 'status on', 'update on my', 'update on the',
    // Ready/Completion phrases
    'is ready', 'when ready', 'will be ready', 'when will it be ready', 'when will be ready', 'ready for pickup',
    'ready to pick up', 'ready yet', 'is it ready', 'is my car ready', 'is my vehicle ready', 'is my truck ready',
    'ready now', 'is ready yet', 'not ready', 'still not ready', 'when will ready',
    // Progress phrases
    'how long', 'how much longer', 'almost done', 'still working', 'in progress', 'work in progress',
    'how much time', 'how much more time', 'how much longer will it take', 'when will it be done',
    // Vehicle-specific
    'vehicle ready', 'car ready', 'truck ready', 'service ready', 'repair ready', 'work ready',
    'my vehicle', 'my car', 'my truck', 'the vehicle', 'the car', 'the truck'
  ],
  'Pricing and Quotes': [
    // Core pricing terms
    'price', 'prices', 'cost', 'costs', 'pricing', 'quote', 'quotes', 'quotation', 'quotations', 'estimate', 'estimates',
    'priced', 'costing', 'quoted', 'estimated',
    // Inquiry phrases
    'price inquiry', 'pricing inquiry', 'quote request', 'estimate request', 'price quote', 'cost estimate',
    'how much', 'what does it cost', 'how much does it cost', 'how much is', 'what is the price', 'what is the cost',
    'price for', 'cost for', 'quote for', 'estimate for', 'pricing for', 'what\'s the price', 'what\'s the cost',
    'need a quote', 'need an estimate', 'want a quote', 'want an estimate', 'looking for quote', 'looking for estimate',
    'get a quote', 'get an estimate', 'can i get a quote', 'can i get an estimate',
    // Variations
    'oil change price', 'tire price', 'repair price', 'service price', 'maintenance price',
    'oil change cost', 'tire cost', 'repair cost', 'service cost', 'maintenance cost',
    'oil change quote', 'tire quote', 'repair quote', 'service quote', 'maintenance quote',
    'oil change estimate', 'tire estimate', 'repair estimate', 'service estimate', 'maintenance estimate',
    // Fee/Charge terms
    'fee', 'fees', 'charge', 'charges', 'payment amount', 'total cost', 'total price', 'pricing information',
    'how much will it cost', 'what will it cost', 'what\'s the total', 'what\'s the total cost'
  ],
  'Vehicle Diagnostics/Maintenance': [
    // Diagnostic terms
    'diagnostic', 'diagnosis', 'diagnose', 'check', 'inspection', 'inspect', 'checked', 'checking',
    // Maintenance terms
    'maintenance', 'service', 'tune-up', 'tune up', 'servicing',
    // Common services
    'oil change', 'oil', 'tire rotation', 'tire', 'tires', 'brake', 'brakes', 'brake service',
    'filter', 'filters', 'air filter', 'oil filter', 'battery', 'alignment', 'wheel alignment',
    // Engine/Vehicle checks
    'check engine', 'engine light', 'check engine light', 'warning light', 'dashboard light',
    'engine check', 'vehicle check', 'car check', 'inspection needed', 'needs inspection',
    // Diagnostic phrases
    'diagnostic check', 'diagnostic service', 'diagnostic test', 'run diagnostic', 'diagnostic scan',
    'check codes', 'error codes', 'trouble codes', 'diagnostic codes',
    // Maintenance phrases
    'maintenance service', 'routine maintenance', 'preventive maintenance', 'preventative maintenance',
    'scheduled maintenance', 'regular maintenance', 'service appointment', 'maintenance appointment'
  ],
  'Parts and Repairs': [
    // Core repair terms
    'repair', 'repairs', 'fix', 'fixed', 'fixing', 'replace', 'replacement', 'replacing',
    // Parts terms
    'parts', 'part', 'component', 'components', 'auto parts', 'car parts', 'vehicle parts',
    // Broken/Damage terms
    'broken', 'damage', 'damaged', 'broken part', 'broken component', 'damaged part', 'damaged component',
    // Need phrases
    'need part', 'part needed', 'need parts', 'parts needed', 'need repair', 'repair needed',
    'need fix', 'fix needed', 'need replacement', 'replacement needed',
    // Repair phrases
    'repair work', 'repair service', 'part replacement', 'component replacement', 'fix work',
    'repair my', 'fix my', 'repair the', 'fix the', 'repair vehicle', 'repair car',
    // Specific repairs
    'engine repair', 'transmission repair', 'brake repair', 'tire repair', 'body repair',
    'engine fix', 'transmission fix', 'brake fix', 'tire fix', 'body fix'
  ],
  'Billing and Payments': [
    // Core billing terms
    'billing', 'bill', 'bills', 'invoice', 'invoices', 'invoice payment',
    // Payment terms
    'payment', 'pay', 'paying', 'paid', 'payments', 'payment method', 'payment options',
    // Payment phrases
    'how to pay', 'pay bill', 'pay invoice', 'make payment', 'payment due', 'payment information',
    'payment amount', 'total due', 'amount due', 'balance', 'outstanding balance',
    // Payment methods
    'credit card', 'debit card', 'cash', 'check', 'cheque', 'payment plan', 'financing',
    // Receipt/Invoice
    'receipt', 'receipts', 'invoice copy', 'bill copy', 'payment receipt',
    // Billing phrases
    'billing question', 'billing inquiry', 'billing issue', 'payment question', 'payment inquiry'
  ],
  'General Information': [
    // Core info terms
    'information', 'info', 'question', 'questions', 'inquiry', 'inquiries', 'help', 'assistance',
    // General phrases
    'general', 'general question', 'general inquiry', 'general information', 'need info', 'need information',
    'looking for', 'tell me about', 'information about', 'what is', 'what are', 'how do', 'how does',
    // Question words
    'what', 'how', 'where', 'when', 'why', 'who', 'which',
    // Help phrases
    'need help', 'looking for help', 'have a question', 'got a question', 'wondering about',
    // Intro/Greeting terms - AGGRESSIVE MATCHING
    'introduction', 'intro', 'introductions', 'virtual assistant', 'assistant intro', 'automotive virtual assistant',
    'ai assistant', 'assistant', 'greeting', 'greetings', 'hello', 'hi', 'hey', 'welcome', 'welcoming',
    // Location/Hours info
    'hours', 'location', 'address', 'directions', 'where are you', 'where is', 'what are your hours',
    'business hours', 'open hours', 'store hours', 'shop hours', 'location address', 'physical address',
    'how to get there', 'directions to', 'where located', 'what address', 'what location',
    // General phrases
    'about your', 'about the', 'tell me', 'explain', 'can you tell me', 'do you know', 'i need to know',
    'looking for information', 'seeking information', 'need details', 'want to know'
  ],
  'Customer Service Requests': [
    // Core service terms
    'customer service', 'service request', 'service issue', 'service problem', 'service', 'rep',
    // Transfer/Human agent - AGGRESSIVE MATCHING
    'transfer', 'transferred', 'transfer to', 'transfer me', 'transfer to human', 'transfer to agent',
    'transfer request', 'transfer call', 'need to transfer', 'want to transfer', 'can you transfer',
    'human agent', 'human', 'person', 'people', 'speak to human', 'talk to human', 'speak to agent', 'talk to agent',
    'speak to manager', 'talk to manager', 'speak to someone', 'talk to someone', 'speak to', 'talk to',
    'agent', 'agents', 'representative', 'representatives', 'rep', 'reps', 'advisor', 'advisors',
    'manager', 'managers', 'supervisor', 'supervisors', 'connect', 'connect me', 'connect to', 'reach', 'reach out',
    // Callback - AGGRESSIVE MATCHING
    'callback', 'call back', 'call me back', 'have someone call', 'call me', 'call back request',
    'please call', 'can you call', 'would like a call', 'need a call back', 'want a call back',
    // Message taking - AGGRESSIVE MATCHING
    'message', 'messages', 'take message', 'leave message', 'take a message', 'leave a message',
    'for chris', 'for john', 'for mary', 'for', 'message for', 'take a message for', 'leave a message for',
    // Speak/Talk - AGGRESSIVE MATCHING
    'speak', 'speaking', 'talk', 'talking', 'speak with', 'talk with', 'speak to', 'talk to',
    'i need to speak', 'i need to talk', 'want to speak', 'want to talk', 'can i speak', 'can i talk',
    // Complaint/Issue terms
    'complaint', 'complaints', 'issue', 'issues', 'problem', 'problems', 'concern', 'concerns',
    'unhappy', 'dissatisfied', 'not happy', 'not satisfied', 'disappointed',
    // Escalation
    'escalate', 'escalation', 'escalated', 'escalate to', 'need to escalate',
    // Feedback
    'feedback', 'review', 'reviews', 'complaint about', 'issue with', 'problem with',
    // Help phrases
    'need help with issue', 'have a problem', 'customer complaint', 'customer concern',
    'service issue', 'customer service issue', 'need assistance', 'need help'
  ],
  'Vehicle Logistics': [
    // Pickup terms
    'pickup', 'pick up', 'pick-up', 'picking up', 'pickup vehicle', 'pick up vehicle', 'pickup car', 'pick up car',
    'when can i pick up', 'when can i pickup', 'when can we pick up', 'ready for pickup', 'ready to pick up',
    // Delivery terms
    'delivery', 'deliver', 'delivered', 'delivering', 'vehicle delivery', 'car delivery',
    // Drop off terms
    'drop off', 'drop-off', 'dropping off', 'drop off vehicle', 'drop off car', 'drop vehicle', 'drop car',
    // Tow/Transport
    'tow', 'towing', 'towed', 'tow truck', 'towing service', 'transport', 'transportation', 'transported',
    // Location terms
    'location', 'where', 'where is', 'where are', 'where can i', 'vehicle location', 'car location',
    'logistics', 'retrieve', 'retrieval', 'when can i retrieve',
    // Specific phrases
    'pickup time', 'delivery time', 'drop off time', 'when to pick up', 'when to pickup'
  ],
  'Technical and Miscellaneous': [
    // Technical terms
    'technical', 'technically', 'technical support', 'technical issue', 'technical problem',
    'technical assistance', 'technical help',
    // Error/System terms
    'error', 'errors', 'system error', 'system issue', 'system problem', 'system malfunction',
    'malfunction', 'malfunctioning', 'malfunctions',
    // Software/Hardware
    'software', 'hardware', 'system', 'systems', 'application', 'app',
    // Troubleshooting
    'troubleshooting', 'troubleshoot', 'trouble shooting', 'fix issue', 'fix problem',
    // Incomplete/Empty/Silent calls - AGGRESSIVE MATCHING
    'incomplete', 'incomplete call', 'incomplete calls', 'empty', 'empty call', 'silent', 'silent call',
    'silent calls', 'no response', 'no answer', 'no reply', 'no sound', 'no audio', 'no voice',
    'inaudible', 'unclear', 'unclear audio', 'unclear call', 'cannot hear', 'can\'t hear', 'hard to hear',
    // Wrong number/Test/Spam - AGGRESSIVE MATCHING
    'wrong number', 'wrong numbers', 'not the right number', 'called wrong', 'wrong person',
    'test', 'testing', 'test call', 'test calls', 'testing call', 'spam', 'spam call', 'spam calls',
    'robocall', 'robocalls', 'automated call', 'automated calls', 'scam', 'scam call', 'scam calls',
    // Abandoned/Disconnected - AGGRESSIVE MATCHING
    'abandoned', 'abandoned call', 'abandoned calls', 'aborted', 'aborted call', 'aborted calls',
    'hang up', 'hung up', 'hanging up', 'disconnected', 'disconnect', 'disconnection', 'call disconnected',
    'dropped call', 'dropped calls', 'call dropped', 'lost connection', 'connection lost',
    // Miscellaneous
    'miscellaneous', 'misc', 'other', 'various', 'different', 'unusual',
    // Technical phrases
    'technical support needed', 'need technical support', 'have a technical issue', 'technical problem with'
  ],
  'Others': [], // Catch-all category
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
    return 'Others';
  }
  
  const normalizedTitle = title.toLowerCase().trim();
  let bestMatch = 'Others';
  let bestScore = 0;
  
  // Check each category's keywords
  for (const category of CATEGORIES) {
    if (category === 'Others') continue; // Skip catch-all
    
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
  
  // If no good match found, use Others (lowered threshold from 0.2 to 0.15 for more aggressive matching)
  if (bestScore < 0.15) {
    return 'Others';
  }
  
  return bestMatch;
}

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
    // Build query with optional filters
    let query = supabase
      .from('conversations')
      .select('conversation_id, call_summary_title, start_time_unix_secs, agent_name');

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    if (startDate && endDate) {
      const startTimestamp = dateToUnix(startDate);
      const endTimestamp = dateToUnix(endDate) + 86399;
      query = query
        .gte('start_time_unix_secs', startTimestamp)
        .lte('start_time_unix_secs', endTimestamp);
    }

    // Fetch all conversations with pagination
    let allConversations: any[] = [];
    let from = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await query.range(from, from + pageSize - 1);
      
      if (error) throw error;
      
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

    // Filter conversations that match the requested category
    // Use the SAME categorizeCall function from call-categories/route.ts
    const filteredConversations = allConversations.filter(conv => {
      const assignedCategory = categorizeCall(conv.call_summary_title);
      return assignedCategory === category;
    });

    // Sort by timestamp descending
    filteredConversations.sort((a, b) => b.start_time_unix_secs - a.start_time_unix_secs);

    return NextResponse.json({
      category,
      totalTitles: filteredConversations.length,
      conversations: filteredConversations.map(conv => ({
        conversation_id: conv.conversation_id,
        call_summary_title: conv.call_summary_title || 'No title',
        start_time_unix_secs: conv.start_time_unix_secs,
        agent_name: conv.agent_name
      }))
    });

  } catch (error) {
    console.error('Error fetching category details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category details' },
      { status: 500 }
    );
  }
}


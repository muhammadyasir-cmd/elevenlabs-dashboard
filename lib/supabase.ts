import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ [Supabase] Missing environment variables:');
    console.error('❌ [Supabase] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'MISSING');
    console.error('❌ [Supabase] SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'MISSING');
    throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
  }

  console.log('🟢 [Supabase] Client initialized');
  console.log('🟢 [Supabase] URL:', supabaseUrl);
  console.log('🟢 [Supabase] Key:', supabaseKey ? `${supabaseKey.substring(0, 10)}...` : 'MISSING');

  // Configure Supabase client with better error handling for Node.js
  supabaseClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
    },
    global: {
      fetch: async (url, options = {}) => {
        try {
          const urlString = typeof url === 'string' ? url : url.toString();
          console.log('🟡 [Supabase] Fetching:', urlString.substring(0, 100) + '...');
          
          const response = await fetch(url, options);
          
          if (!response.ok) {
            console.error('❌ [Supabase] Response not OK:', response.status, response.statusText);
          }
          
          return response;
        } catch (error: any) {
          console.error('❌ [Supabase] Fetch error:', error);
          console.error('❌ [Supabase] Error type:', error?.constructor?.name);
          console.error('❌ [Supabase] Error message:', error?.message);
          console.error('❌ [Supabase] Error code:', error?.code);
          console.error('❌ [Supabase] Error stack:', error?.stack?.substring(0, 500));
          
          const urlString = typeof url === 'string' ? url : url?.toString() || 'unknown';
          console.error('❌ [Supabase] URL attempted:', urlString.substring(0, 100));
          
          // Provide more helpful error message
          if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
            throw new Error(`Cannot connect to Supabase. Check your internet connection and Supabase URL. Original error: ${error.message}`);
          } else if (error?.code === 'CERT_HAS_EXPIRED' || error?.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
            throw new Error(`SSL certificate error. This might be a network/proxy issue. Original error: ${error.message}`);
          } else {
            throw new Error(`Network error connecting to Supabase: ${error?.message || 'Unknown error'}`);
          }
        }
      },
    },
  });
  return supabaseClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});

// FIXED: Helper to convert dates to Unix timestamps (seconds)
// Uses UTC timezone to match SQL EXTRACT(EPOCH FROM TIMESTAMP) behavior
export function dateToUnix(dateString: string): number {
  // Parse date string as YYYY-MM-DD
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create timestamp in UTC timezone at midnight (00:00:00)
  // This matches how SQL TIMESTAMP '2025-10-17 00:00:00' works
  const timestamp = Math.floor(Date.UTC(year, month - 1, day, 0, 0, 0, 0) / 1000);
  
  console.log('🔵 [dateToUnix]', dateString, '→', timestamp, '→', new Date(timestamp * 1000).toISOString());
  
  return timestamp;
}

// Helper to format Unix timestamp to date string
export function unixToDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().split('T')[0];
}

// Helper to format duration from seconds to "Xm Ys"
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

// Helper to get date range (last N days from TODAY)
export function getDateRange(days: number): { startDate: string; endDate: string } {
  // Use current date/time - ensure we're using the actual current date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // End date is today
  const endDate = new Date(today);
  
  // Start date is N days ago
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);
  
  // Ensure we don't go beyond 90 days
  const maxDaysBack = 90;
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() - maxDaysBack);
  
  if (startDate < minDate) {
    startDate.setTime(minDate.getTime());
  }
  
  // Format as YYYY-MM-DD
  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };
  
  const result = {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
  
  console.log('🟢 [DateRange] Calculated:', result, 'from', days, 'days ago');
  console.log('🟢 [DateRange] Current date:', formatDate(today));
  console.log('🟢 [DateRange] Current year:', today.getFullYear());
  
  return result;
}

// Helper to format SQL timestamp string
export function formatSQLTimestamp(dateString: string, isEndOfDay: boolean = false): string {
  const time = isEndOfDay ? '23:59:59' : '00:00:00';
  return `${dateString} ${time}`;
}
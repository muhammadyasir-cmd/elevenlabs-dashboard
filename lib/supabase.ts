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

// Helper to get the next day's timestamp (for exclusive end date filtering)
function getNextDayTimestamp(dateString: string): number {
  // Parse date string as YYYY-MM-DD
  const [year, month, day] = dateString.split('-').map(Number);
  
  // Create date object for the end date at 00:00:00 UTC
  const endDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  
  // Add 1 day (24 hours = 86400000 milliseconds)
  const nextDay = new Date(endDate.getTime() + 86400000);
  
  // Convert to Unix timestamp (seconds)
  const timestamp = Math.floor(nextDay.getTime() / 1000);
  
  console.log('🔵 [getNextDayTimestamp]', {
    inputDate: dateString,
    endDateUTC: endDate.toISOString(),
    nextDayUTC: nextDay.toISOString(),
    timestamp,
  });
  
  return timestamp;
}

// Shared utility to convert date range to Unix timestamps for filtering
// Returns timestamps that include the FULL start and end days
// Uses "next day" approach: start_time_unix_secs >= startDate 00:00:00 AND < (endDate + 1 day) 00:00:00
export function getDateRangeTimestamps(startDate: string, endDate: string): { 
  startTimestamp: number; 
  endTimestampExclusive: number; // Next day at 00:00:00 (use with .lt())
} {
  // Start timestamp: beginning of start date (00:00:00)
  const startTimestamp = dateToUnix(startDate);
  
  // End timestamp: beginning of NEXT day (00:00:00)
  // This allows us to use .lt() to include the full end date
  // Example: For endDate "2025-12-10", this returns timestamp for "2025-12-11 00:00:00"
  // Query: start_time_unix_secs < (2025-12-11 00:00:00) includes all of Dec 10
  const endTimestampExclusive = getNextDayTimestamp(endDate);
  
  console.log('🔵 [getDateRangeTimestamps]', {
    startDate,
    endDate,
    startTimestamp,
    endTimestampExclusive,
    startDateISO: new Date(startTimestamp * 1000).toISOString(),
    endDateExclusiveISO: new Date(endTimestampExclusive * 1000).toISOString(),
    note: 'Using .lt() with endTimestampExclusive to include full end date',
  });
  
  return { startTimestamp, endTimestampExclusive };
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

const pakistanDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Karachi',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getPakistanDateString(baseDate: Date = new Date()): string {
  const parts = pakistanDateFormatter.formatToParts(baseDate);
  const year = parts.find(p => p.type === 'year')?.value ?? '1970';
  const month = parts.find(p => p.type === 'month')?.value ?? '01';
  const day = parts.find(p => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

function getPakistanToday(): Date {
  // Build a Date anchored to Pakistan time to avoid timezone drift
  return new Date(`${getPakistanDateString()}T00:00:00+05:00`);
}

// Helper to get date range (last N days from TODAY)
export function getDateRange(days: number): { startDate: string; endDate: string } {
  // Use Pakistan time as the reference for "today"
  const today = getPakistanToday();
  
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
  
  // Format as YYYY-MM-DD in Pakistan time
  const formatDate = (date: Date): string => pakistanDateFormatter.format(date);
  
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
# Database Setup for Call Categories Feature

## Overview

The Call Categories feature uses fuzzy string matching to categorize conversations based on their `call_summary_title` field. While the current implementation uses JavaScript-based fuzzy matching in the API route, you can optimize this by using PostgreSQL's `pg_trgm` extension for better performance with large datasets.

## Current Implementation

The current implementation (`app/api/call-categories/route.ts`) uses JavaScript-based fuzzy matching:
- Keyword-based matching with similarity scoring
- Processes all conversations in memory
- Works well for datasets up to ~100K conversations

## Optional: PostgreSQL pg_trgm Extension (For Optimization)

If you want to move the categorization logic to the database for better performance, follow these steps:

### Step 1: Enable pg_trgm Extension

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable the pg_trgm extension for fuzzy string matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Step 2: Create Index (Optional but Recommended)

```sql
-- Create a GIN index on call_summary_title for faster similarity searches
CREATE INDEX IF NOT EXISTS idx_conversations_call_summary_title_trgm 
ON conversations USING gin(call_summary_title gin_trgm_ops);
```

### Step 3: Create Categorization Function (Optional)

You can create a PostgreSQL function to categorize calls using SQL:

```sql
CREATE OR REPLACE FUNCTION categorize_call(title TEXT)
RETURNS TEXT AS $$
DECLARE
  category TEXT;
  similarity_score REAL;
  max_similarity REAL := 0;
  best_category TEXT := 'Testing/Other';
BEGIN
  -- Check each category with fuzzy matching
  FOR category IN 
    SELECT unnest(ARRAY[
      'Appointment Requests',
      'Transfer to Human',
      'Pricing Inquiries',
      'Vehicle Status',
      'Appointment Changes',
      'General Inquiry',
      'Service Requests',
      'Message Taking',
      'Hangups/Incomplete'
    ])
  LOOP
    -- Calculate similarity using pg_trgm
    similarity_score := similarity(COALESCE(title, ''), category);
    
    IF similarity_score > max_similarity THEN
      max_similarity := similarity_score;
      best_category := category;
    END IF;
  END LOOP;
  
  -- If similarity is too low, use catch-all
  IF max_similarity < 0.2 THEN
    RETURN 'Testing/Other';
  END IF;
  
  RETURN best_category;
END;
$$ LANGUAGE plpgsql;
```

### Step 4: Update API Route (If Using SQL Function)

If you implement the SQL function above, you can update `app/api/call-categories/route.ts` to use it:

```typescript
// Instead of JavaScript categorization, use SQL:
const { data, error } = await supabase.rpc('categorize_calls_batch', {
  // Pass parameters if needed
});
```

## Current Status

✅ **Current Implementation**: JavaScript-based fuzzy matching (works immediately, no database changes needed)

⚠️ **Future Optimization**: PostgreSQL pg_trgm extension (requires database setup, better for large datasets)

## Testing the Feature

1. The feature works immediately with the current JavaScript implementation
2. Test by accessing `/api/call-categories` endpoint
3. Verify categories appear correctly in the dashboard
4. Check that all 10 categories are represented

## Notes

- The current implementation categorizes ALL conversations (no date filtering)
- Each conversation is assigned to exactly ONE category (highest match score)
- Categories are sorted by count (descending) in the response
- The chart updates automatically when new data arrives in the database


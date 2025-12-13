# Database Setup for Call Categories Feature

## Overview

The Call Categories feature uses the `summary_category` column in the `conversations` table to categorize conversations. Categories are pre-computed by the n8n workflow and stored directly in the database, making queries 10-100x faster than the previous client-side fuzzy matching approach.

## Current Implementation

The current implementation (`app/api/call-categories/route.ts`) uses direct database queries on the `summary_category` column:
- Queries the `summary_category` column directly from the database
- Groups by category using SQL aggregation
- No client-side categorization or fuzzy matching needed
- Works efficiently with datasets of any size
- Categories are pre-computed by n8n workflow

## Database Schema

The `conversations` table includes a `summary_category` column that stores the category for each conversation:

```sql
-- Example: Check summary_category column
SELECT summary_category, COUNT(*) 
FROM conversations 
WHERE summary_category IS NOT NULL
GROUP BY summary_category
ORDER BY COUNT(*) DESC;
```

## API Endpoints

### GET /api/call-categories

Returns category counts and percentages for all conversations (with optional filters).

**Query Parameters:**
- `agent_id` (optional): Filter by specific agent
- `start_date` (optional): Filter by start date (YYYY-MM-DD)
- `end_date` (optional): Filter by end date (YYYY-MM-DD)

**Response:**
```json
{
  "totalCalls": 8420,
  "categories": [
    {
      "category": "Revenue Opportunity",
      "count": 2500,
      "percentage": 29.7
    },
    ...
  ]
}
```

### GET /api/call-categories/details

Returns conversation details for a specific category.

**Query Parameters:**
- `category` (required): The category name to filter by
- `agent_id` (optional): Filter by specific agent
- `start_date` (optional): Filter by start date (YYYY-MM-DD)
- `end_date` (optional): Filter by end date (YYYY-MM-DD)

**Response:**
```json
{
  "category": "Revenue Opportunity",
  "totalTitles": 2500,
  "conversations": [
    {
      "conversation_id": "...",
      "call_summary_title": "...",
      "start_time_unix_secs": 1234567890,
      "agent_name": "..."
    },
    ...
  ]
}
```

## Performance

- **Previous Implementation**: 2-5 seconds (client-side fuzzy matching on all conversations)
- **Current Implementation**: 50-200ms (direct SQL query on indexed column)
- **Improvement**: 10-100x faster

## Category Values

The `summary_category` column can contain any of these values:
- `Hangups`
- `Revenue Opportunity`
- `Repair Status & Shop Updates`
- `General Info & Customer Service`
- `Logistics, Billing & Other`
- `Forwarded to Advisor`
- `System / Other`

## Notes

- Categories are pre-computed by the n8n workflow and stored in the `summary_category` column
- The API excludes conversations where `summary_category` IS NULL
- All optional filters (agent_id, start_date, end_date) work with the new implementation
- Response format remains identical to the previous implementation for backward compatibility

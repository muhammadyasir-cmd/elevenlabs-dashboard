# ElevenLabs Agent Performance Dashboard – Complete System Documentation

**Last Updated:** 2025-01-XX (Updated with call category details modal, clickable categories, and agent-specific filtering)  
**Project Path:** `/Users/yasir/Desktop/Web tracking portal new`

---

## Table of Contents

1. [System Overview](#system-overview)
2. [System Architecture](#system-architecture)
3. [How It Works](#how-it-works)
4. [Complete Directory Structure](#complete-directory-structure)
5. [File-by-File Documentation](#file-by-file-documentation)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Key Features & Recent Updates](#key-features--recent-updates)

---

## System Overview

### Purpose

The **ElevenLabs Agent Performance Dashboard** is a Next.js web application designed to monitor, analyze, and visualize the performance metrics of AI voice agents. The system connects to a Supabase PostgreSQL database containing conversation data and provides:

- **Real-time Performance Monitoring**: Track agent metrics including call volume, duration, success rates, and message counts
- **Historical Analysis**: View trends over customizable date ranges (7, 30, or 90 days)
- **Agent Comparison**: Compare multiple agents side-by-side with aggregated statistics
- **Detailed Insights**: Drill down into individual agent performance with charts, breakdowns, and conversation tables
- **Data Visualization**: Interactive charts showing call volumes, duration trends, status distributions, and success rates
- **Call Categorization**: Automatic categorization of all calls into 11 predefined categories using comprehensive fuzzy matching with automotive shop terminology

### Technology Stack

- **Framework**: Next.js 14.2.0 (App Router)
- **Language**: TypeScript 5.3.0
- **UI Library**: React 18.3.0
- **Styling**: Tailwind CSS 3.4.0
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts 2.10.3
- **Date Handling**: react-datepicker 4.25.0, date-fns 3.0.0
- **Utilities**: clsx 2.1.0
- **Build Tools**: PostCSS, Autoprefixer, ESLint

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Browser (React)                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Dashboard Page (app/page.tsx)                       │   │
│  │  - DateRangePicker                                    │   │
│  │  - CallCategoriesChart                                │   │
│  │  - AgentCard Grid                                     │   │
│  │  - AgentDetailModal                                   │   │
│  └──────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP Requests
                        │ (GET /api/agents, /api/metrics, etc.)
┌───────────────────────▼─────────────────────────────────────┐
│              Next.js API Routes (Server-Side)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ /api/agents  │  │ /api/metrics│  │ /api/trends  │      │
│  │ /api/convos  │  │ /api/call-  │  │ /api/test    │      │
│  │              │  │ categories  │  │              │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                 │               │
│         └──────────────────┴─────────────────┘               │
│                          │                                    │
│                          ▼                                    │
│              ┌───────────────────────┐                       │
│              │  Supabase Client       │                       │
│              │  (lib/supabase.ts)     │                       │
│              └───────────┬───────────┘                       │
└──────────────────────────┼───────────────────────────────────┘
                           │ PostgreSQL Queries
                           │ (with pagination)
┌──────────────────────────▼───────────────────────────────────┐
│              Supabase PostgreSQL Database                     │
│  ┌────────────────────────────────────────────────────┐     │
│  │  conversations table                                 │     │
│  │  - conversation_id (PK)                             │     │
│  │  - agent_id, agent_name                             │     │
│  │  - start_time_unix_secs (BIGINT)                   │     │
│  │  - call_duration_secs, message_count                │     │
│  │  - status, call_successful, direction               │     │
│  │  - transcript_summary, call_summary_title          │     │
│  └────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Interaction**: User selects a date range or clicks "View Details" on an agent card
2. **Frontend Request**: Dashboard makes parallel API calls to `/api/agents` and `/api/metrics`
3. **API Processing**: 
   - Routes validate query parameters
   - Convert date strings to Unix timestamps (UTC)
   - Query Supabase with pagination (handles 1000+ row limit)
   - Calculate metrics server-side from raw conversation data
4. **Response**: JSON data returned to frontend
5. **UI Update**: React components re-render with new data, charts update

---

## How It Works

### Date Range Handling

**Critical Fix Applied**: The system now correctly calculates dates from **TODAY** (current date), not hardcoded 2025.

1. **Date Input**: User selects date range via `DateRangePicker` component
2. **Date Conversion**: 
   - Frontend: Dates formatted as `YYYY-MM-DD` strings
   - Backend: `dateToUnix()` converts to Unix timestamps using **UTC timezone** to match SQL `EXTRACT(EPOCH FROM TIMESTAMP)` behavior
   - Start date: `00:00:00 UTC` of the selected day
   - End date: `23:59:59 UTC` of the selected day (inclusive)
3. **Database Query**: Supabase filters conversations where `start_time_unix_secs >= startTimestamp AND start_time_unix_secs <= endTimestampInclusive`

### Pagination Strategy

Supabase has a **1000 row limit per request**. The system implements pagination:

1. **Initial Request**: Fetch first 1000 rows (range 0-999)
2. **Check for More**: If response has exactly 1000 rows, fetch next page
3. **Continue**: Repeat until fewer than 1000 rows returned
4. **Aggregate**: Combine all pages into single array for processing

This ensures **all agents and conversations** are retrieved, not just the first 1000.

### Metrics Calculation (2-Step Process)

The `/api/metrics` route uses a sophisticated 2-step approach:

**Step 1: Get All Distinct Agents**
- Query all conversations in date range (with pagination)
- Extract unique `agent_id` and `agent_name` combinations
- This ensures we find ALL agents, even if they have thousands of conversations

**Step 2: Calculate Metrics Per Agent**
- For each unique agent, fetch ALL their raw conversations (with pagination)
- Calculate metrics server-side:
  - `totalConversations`: Count of conversations
  - `avgCallDuration`: Average of `call_duration_secs`
  - `avgMessages`: Average of `message_count`
  - `successRate`: Percentage where `call_successful === 'success'`
  - `statusBreakdown`: Count by status (done, in-progress, failed, etc.)
  - `directionBreakdown`: Count by direction (inbound, outbound, etc.)

This approach ensures **accurate metrics** even with large datasets.

### Call Categorization

The `/api/call-categories` endpoint categorizes ALL historical conversations (no date filtering) into 11 predefined categories:

1. **Fuzzy Matching**: Uses comprehensive keyword matching and similarity scoring with automotive shop terminology
2. **Categories**: 
   - Appointment Scheduling
   - Service Status Inquiries
   - Pricing and Quotes
   - Vehicle Diagnostics/Maintenance
   - Parts and Repairs
   - Billing and Payments
   - General Information
   - Customer Service Requests
   - Vehicle Logistics
   - Technical and Miscellaneous
   - Others (catch-all)
3. **Pagination**: Fetches all conversations with pagination to handle 1000+ records
4. **Cache-Busting**: Uses `force-dynamic` and `revalidate: 0` to ensure fresh data
5. **Similarity Threshold**: 0.15 (lowered from 0.2 for more aggressive matching)

---

## Complete Directory Structure

```
.
├── .env.local                    # Environment variables (Supabase credentials) - NOT in git
├── .eslintrc.json                # ESLint configuration
├── .gitignore                    # Git ignore rules
├── .next/                        # Next.js build output (generated, not in git)
├── node_modules/                 # Dependencies (not in git)
├── DATABASE_SETUP_CALL_CATEGORIES.md  # Database setup guide for call categories
├── DEBUG_GUIDE.md                # Debugging instructions
├── FIXES_APPLIED.md              # Fix history documentation
├── FILE_STRUCTURE.md             # This file - complete system documentation
├── README.md                     # Project overview and setup instructions
├── app/                          # Next.js App Router directory
│   ├── api/                      # API routes (server-side)
│   │   ├── agents/
│   │   │   └── route.ts          # GET /api/agents - Agent discovery endpoint
│   │   ├── call-categories/
│   │   │   ├── route.ts          # GET /api/call-categories - Call categorization endpoint
│   │   │   └── details/
│   │   │       └── route.ts      # GET /api/call-categories/details - Category details endpoint
│   │   ├── conversations/
│   │   │   └── route.ts          # GET /api/conversations - Paginated conversations
│   │   ├── metrics/
│   │   │   └── route.ts          # GET /api/metrics - Metrics calculation endpoint
│   │   ├── trends/
│   │   │   └── route.ts          # GET /api/trends - Daily trend metrics
│   │   └── test/
│   │       └── route.ts          # GET /api/test - Diagnostic endpoint
│   ├── globals.css               # Global styles + Tailwind CSS imports
│   ├── layout.tsx                # Root layout component
│   └── page.tsx                  # Main dashboard page (homepage)
├── components/                   # React components
│   ├── AgentCard.tsx             # Agent summary card component
│   ├── AgentDetailModal.tsx      # Agent detail modal with charts and table
│   ├── CategoryDetailsModal.tsx  # Modal showing call titles for a category
│   ├── ConversationsTable.tsx    # Paginated conversation table component
│   ├── DateRangePicker.tsx       # Date range selector component
│   ├── LoadingSpinner.tsx        # Loading indicator component
│   ├── MetricCard.tsx            # Metric display card component
│   └── Charts/                   # Chart components directory
│       ├── AverageMessagesChart.tsx      # Average messages trend chart (linear regression)
│       ├── CallCategoriesChart.tsx       # Call categories bar chart
│       ├── CallVolumeChart.tsx           # Call volume trend chart (linear regression)
│       ├── DirectionDonutChart.tsx      # Direction distribution donut chart
│       ├── DurationTrendChart.tsx        # Duration trend chart (linear regression)
│       ├── StatusPieChart.tsx            # Status distribution pie chart
│       └── SuccessRateChart.tsx          # Success rate trend chart
├── lib/                          # Utility libraries
│   ├── supabase.ts               # Supabase client + helper functions
│   ├── calculations.ts           # Metric calculation functions
│   └── utils.ts                  # General utility functions
├── types/                        # TypeScript type definitions
│   └── index.ts                  # Shared interfaces and types
├── next.config.js                # Next.js configuration
├── next-env.d.ts                 # Next.js TypeScript declarations (generated)
├── package.json                  # Dependencies and scripts
├── package-lock.json             # Dependency lock file
├── postcss.config.js             # PostCSS configuration
├── tailwind.config.ts            # Tailwind CSS configuration
└── tsconfig.json                 # TypeScript configuration
```

---

## File-by-File Documentation

### Root Configuration Files

#### `package.json`
**Purpose**: Defines project dependencies, scripts, and metadata.

**Key Dependencies**:
- `next`: Next.js framework (v14.2.0)
- `react`, `react-dom`: React library (v18.3.0)
- `@supabase/supabase-js`: Supabase client (v2.39.0)
- `recharts`: Charting library (v2.10.3)
- `react-datepicker`: Date picker component (v4.25.0)
- `date-fns`: Date utility library (v3.0.0)
- `tailwindcss`: Utility-first CSS framework (v3.4.0)
- `clsx`: Class name utility (v2.1.0)

**Scripts**:
- `npm run dev`: Start development server (port 3000)
- `npm run build`: Create production build
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

#### `.env.local`
**Purpose**: Stores environment variables (not committed to git).

**Required Variables**:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for server-side queries with full access)

**Security Note**: Never commit this file to git. It contains sensitive credentials.

#### `tsconfig.json`
**Purpose**: TypeScript compiler configuration.

**Key Settings**:
- `target`: ES2020
- `strict`: true (enables strict type checking)
- `paths`: `@/*` maps to project root (enables `@/components` imports)
- `jsx`: preserve (for Next.js)
- `moduleResolution`: bundler (for Next.js)

#### `next.config.js`
**Purpose**: Next.js framework configuration.

**Key Settings**:
- `reactStrictMode`: true (enables React strict mode)

#### `tailwind.config.ts`
**Purpose**: Tailwind CSS configuration.

**Key Settings**:
- `content`: Paths to scan for Tailwind classes
- `darkMode`: 'class' (enables dark mode via class)
- Custom colors: `background`, `foreground` CSS variables

#### `postcss.config.js`
**Purpose**: PostCSS configuration for Tailwind CSS processing.

---

### `/app` Directory

#### `app/layout.tsx`
**Purpose**: Root layout component that wraps all pages.

**Features**:
- Applies dark theme (`bg-gray-900`)
- Sets page metadata (title: "ElevenLabs Agent Performance Dashboard")
- Provides global HTML structure
- Imports global CSS

**Code Structure**:
```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-900 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
```

#### `app/globals.css`
**Purpose**: Global styles and Tailwind CSS imports.

**Contents**:
- Tailwind base, components, utilities directives
- Dark theme color tokens
- Custom styles for `react-datepicker` to match dark theme
- Global body styles
- Custom scrollbar styling

#### `app/page.tsx` ⭐ **Main Dashboard Component**
**Purpose**: Main dashboard page that orchestrates the entire UI.

**Key Features**:
- **State Management**:
  - `dateRange`: Current selected date range (defaults to last 30 days from TODAY)
  - `agents`: List of agents from API
  - `metrics`: Calculated metrics for each agent
  - `callCategories`: Call category data
  - `callCategoriesTotal`: Total calls count
  - `loading`: Loading state
  - `error`: Error state
  - `selectedAgent`: Currently selected agent for detail modal
  - `autoRefresh`: Auto-refresh toggle (30-second interval)
  - `debugInfo`: Debug log array
  - `lastUpdated`: Timestamp of last data fetch

- **Data Fetching**:
  - `fetchData()`: Parallel fetch of `/api/agents` and `/api/metrics`
  - `fetchCallCategories()`: Fetches call categories (all historical data)
  - Triggers on date range change
  - Handles errors gracefully

- **UI Components**:
  - Debug panel (collapsible)
  - Header with title, last updated time, auto-refresh toggle, manual refresh button
  - Date range picker
  - Call categories chart
  - Error display with retry button
  - Loading spinner
  - Agent cards grid (responsive: 1 col mobile, 2 cols tablet, 3 cols desktop)
  - Agent detail modal

**Key Code**:
```typescript
const fetchData = useCallback(async () => {
  setLoading(true);
  setError(null);
  
  try {
    const [agentsRes, metricsRes] = await Promise.all([
      fetch(`/api/agents?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`),
      fetch(`/api/metrics?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`),
    ]);
    
    const agentsData = await agentsRes.json();
    const metricsData = await metricsRes.json();
    
    setAgents(agentsData.agents || []);
    setMetrics(metricsData.metrics || []);
    setLastUpdated(new Date());
  } catch (err) {
    setError(err instanceof Error ? err.message : 'An error occurred');
  } finally {
    setLoading(false);
  }
}, [dateRange]);
```

---

### `/app/api` Directory - API Routes

#### `app/api/agents/route.ts` ⭐ **Agent Discovery Endpoint**
**Purpose**: Returns all unique agents that have conversations in the specified date range.

**Endpoint**: `GET /api/agents?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`

**Process**:
1. Validates `start_date` and `end_date` query parameters
2. Converts dates to Unix timestamps using `dateToUnix()` (UTC timezone)
3. **Pagination Loop**: Fetches ALL conversations in date range (handles 1000+ rows)
4. Extracts unique `agent_id` and `agent_name` combinations
5. Counts conversations per agent
6. Returns sorted list of agents with conversation counts

**Response Format**:
```json
{
  "agents": [
    {
      "agent_id": "agent_123",
      "agent_name": "Customer Support Agent",
      "total_conversations": 642
    }
  ],
  "dateRange": {
    "startDate": "2024-10-15",
    "endDate": "2024-11-14"
  }
}
```

**Key Code**:
```typescript
// Pagination to fetch ALL rows
let allConversations: any[] = [];
let from = 0;
const pageSize = 1000;
let hasMore = true;

while (hasMore) {
  const { data, error } = await supabase
    .from('conversations')
    .select('agent_id, agent_name')
    .gte('start_time_unix_secs', startTimestamp)
    .lte('start_time_unix_secs', endTimestampInclusive)
    .range(from, from + pageSize - 1);
  
  if (data && data.length > 0) {
    allConversations = allConversations.concat(data);
    if (data.length < pageSize) {
      hasMore = false; // Last page
    } else {
      from += pageSize; // Next page
    }
  } else {
    hasMore = false;
  }
}
```

#### `app/api/metrics/route.ts` ⭐ **Metrics Calculation Endpoint**
**Purpose**: Returns calculated performance metrics for all agents (or a specific agent) in the date range.

**Endpoint**: `GET /api/metrics?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&agent_id=optional`

**Process** (2-Step):
1. **Step 1**: Get all distinct agents (with pagination)
2. **Step 2**: For each agent:
   - Fetch ALL raw conversations (with pagination)
   - Calculate metrics server-side:
     - Total conversations count
     - Average call duration
     - Average messages
     - Success rate percentage
     - Status breakdown (done, in-progress, failed, etc.)
     - Direction breakdown (inbound, outbound, etc.)

**Response Format**:
```json
{
  "metrics": [
    {
      "agent_id": "agent_123",
      "agent_name": "Customer Support Agent",
      "totalConversations": 642,
      "avgCallDuration": 55,
      "avgMessages": 7.6,
      "successRate": 99.8,
      "statusBreakdown": {
        "done": 640,
        "in-progress": 2
      },
      "directionBreakdown": {
        "inbound": 635,
        "outbound": 7
      }
    }
  ]
}
```

**Key Code**:
```typescript
// Step 1: Get all distinct agents with pagination
let allAgentsData: any[] = [];
// ... pagination loop ...

// Step 2: Calculate metrics per agent
const metricsPromises = agents.map(async (agent) => {
  // Fetch ALL conversations for this agent (with pagination)
  let allConversations: any[] = [];
  // ... pagination loop ...
  
  // Calculate metrics from raw data
  const totalConversations = allConversations.length;
  const avgCallDuration = Math.round(
    allConversations.reduce((sum, c) => sum + c.call_duration_secs, 0) / totalConversations
  );
  // ... more calculations ...
  
  return metric;
});

const metrics = await Promise.all(metricsPromises);
```

#### `app/api/call-categories/route.ts` ⭐ **Call Categorization Endpoint**
**Purpose**: Categorizes conversations into 11 predefined categories using comprehensive fuzzy matching with automotive shop terminology.

**Endpoint**: `GET /api/call-categories?agent_id=optional&start_date=optional&end_date=optional`

**Query Parameters** (all optional):
- `agent_id` (optional): Filter conversations by specific agent
- `start_date` (optional): Filter conversations from this date (YYYY-MM-DD)
- `end_date` (optional): Filter conversations to this date (YYYY-MM-DD)

**Behavior**:
- **No parameters**: Returns ALL historical conversations (unchanged behavior for main dashboard)
- **With parameters**: Returns filtered conversations by agent and/or date range (for agent detail modals)

**Cache-Busting**: 
- `export const dynamic = 'force-dynamic'` - Forces Next.js to never cache
- `export const revalidate = 0` - Disables revalidation caching

**Process**:
1. Extracts optional query parameters (`agent_id`, `start_date`, `end_date`)
2. Builds Supabase query with optional filters:
   - If `agent_id` provided: Filters by agent
   - If `start_date` and `end_date` provided: Filters by date range
   - If no parameters: Fetches ALL conversations (no filtering)
3. Fetches conversations with pagination (handles 1000+ rows)
4. Uses comprehensive fuzzy matching algorithm to categorize each conversation based on `call_summary_title`
5. Returns category counts and percentages sorted by count (descending)

**Categories** (11 total):
1. **Appointment Scheduling**: schedule, book, appointment, reservation, time slot, availability
2. **Service Status Inquiries**: status, ready, progress, completion, check status, when ready
3. **Pricing and Quotes**: price, cost, quote, estimate, how much, pricing inquiry
4. **Vehicle Diagnostics/Maintenance**: diagnostic, check, inspection, maintenance, oil change, tire rotation, check engine light
5. **Parts and Repairs**: parts, repair, fix, replace, broken, damage, component
6. **Billing and Payments**: billing, bill, payment, invoice, credit card, receipt, balance
7. **General Information**: information, info, question, inquiry, help, greeting, intro, hours, location, address, directions
8. **Customer Service Requests**: transfer, callback, message, speak, talk, agent, representative, human, manager, connect, reach
9. **Vehicle Logistics**: pickup, delivery, drop off, tow, transport, location, retrieve
10. **Technical and Miscellaneous**: technical, error, incomplete, silent, empty, wrong number, test, spam, disconnected, hang up
11. **Others**: Catch-all category for calls that don't match any category (similarity score < 0.15)

**Fuzzy Matching Algorithm**:
- **Comprehensive Keyword Arrays**: Each category has extensive keyword lists covering:
  - Core terms and synonyms
  - Common phrases and variations
  - Automotive shop-specific terminology
  - Abbreviations and variations
  - Related terms and patterns
- **Similarity Scoring**: Uses word overlap calculation
- **Similarity Threshold**: 0.15 (lowered from 0.2 for more aggressive matching)
- **Category Name Matching**: Also checks similarity to category name itself (threshold 0.3)
- **Fallback**: Falls back to "Others" if no good match found (score < 0.15)

**Keyword Examples**:
- **Appointment Scheduling**: 40+ keywords including "schedule", "book", "appointment", "reservation", "time slot", "availability", "schedule service", "book oil change", etc.
- **General Information**: 30+ keywords including "greeting", "hello", "welcome", "intro", "virtual assistant", "hours", "location", "address", "directions", etc.
- **Customer Service Requests**: 50+ keywords including "transfer", "callback", "message", "speak to", "talk to", "agent", "representative", "human", "manager", etc.
- **Technical and Miscellaneous**: 30+ keywords including "incomplete", "silent", "empty", "no response", "wrong number", "test", "spam", "disconnected", "hang up", etc.

**Response Format**:
```json
{
  "totalCalls": 8420,
  "categories": [
    {
      "category": "Appointment Scheduling",
      "count": 2341,
      "percentage": 27.8
    },
    {
      "category": "Service Status Inquiries",
      "count": 1892,
      "percentage": 22.5
    }
  ]
}
```

**Key Code**:
```typescript
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
  
  // If no good match found, use Others (threshold: 0.15)
  if (bestScore < 0.15) {
    return 'Others';
  }
  
  return bestMatch;
}
```

#### `app/api/trends/route.ts`
**Purpose**: Returns daily aggregated metrics for trend analysis.

**Endpoint**: `GET /api/trends?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&agent_id=optional`

**Process**:
1. Fetches conversations in date range (with optional agent filter)
2. Groups conversations by date
3. Calculates daily metrics: count, avg duration, avg messages, success rate
4. Returns array of `DailyMetric` objects

**Response Format**:
```json
{
  "dailyMetrics": [
    {
      "date": "2024-11-01",
      "conversationCount": 45,
      "avgDuration": 52,
      "avgMessages": 7.2,
      "successRate": 98.5
    }
  ]
}
```

#### `app/api/conversations/route.ts`
**Purpose**: Returns paginated list of conversations for a specific agent.

**Endpoint**: `GET /api/conversations?agent_id=xxx&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&page=1&limit=100`

**Process**:
1. Validates required parameters (`agent_id`, `start_date`, `end_date`)
2. Gets total count of conversations
3. Fetches paginated conversations (sorted by `start_time_unix_secs` DESC)
4. Returns conversations array + pagination metadata

**Response Format**:
```json
{
  "conversations": [...],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 642,
    "hasMore": true
  }
}
```

#### `app/api/call-categories/details/route.ts` ⭐ **Category Details Endpoint**
**Purpose**: Returns individual call titles for a specific category with optional filtering.

**Endpoint**: `GET /api/call-categories/details?category=xxx&agent_id=optional&start_date=optional&end_date=optional`

**Query Parameters**:
- `category` (required): Category name to filter by
- `agent_id` (optional): Filter conversations by specific agent
- `start_date` (optional): Filter conversations from this date (YYYY-MM-DD)
- `end_date` (optional): Filter conversations to this date (YYYY-MM-DD)

**Process**:
1. Validates required `category` parameter
2. Builds Supabase query with optional filters (agent_id, date range)
3. Fetches ALL matching conversations with pagination
4. Filters conversations using the same `categorizeCall()` function to match the requested category
5. Sorts by timestamp descending (newest first)
6. Returns conversation details: conversation_id, call_summary_title, start_time_unix_secs, agent_name

**Response Format**:
```json
{
  "category": "Appointment Scheduling",
  "totalTitles": 2341,
  "conversations": [
    {
      "conversation_id": "conv_123",
      "call_summary_title": "Customer wants to schedule oil change",
      "start_time_unix_secs": 1704067200,
      "agent_name": "Customer Support Agent"
    }
  ]
}
```

**Key Features**:
- Uses same categorization logic as main endpoint (copied `categorizeCall()` function)
- Supports filtering by agent and date range for context-aware results
- Pagination handles 1000+ conversations
- Returns sorted list (newest first)

#### `app/api/test/route.ts`
**Purpose**: Diagnostic endpoint to test Supabase connectivity.

**Endpoint**: `GET /api/test`

**Process**:
1. Checks environment variables
2. Performs simple Supabase query
3. Returns connection status and conversation count

**Response Format**:
```json
{
  "success": true,
  "message": "Supabase connection successful",
  "conversationCount": 8420
}
```

---

### `/components` Directory

#### `components/DateRangePicker.tsx` ⭐ **Date Range Selector**
**Purpose**: Allows users to select a date range for filtering data.

**Features**:
- **Quick Filters**: Buttons for "Last 7 days", "Last 30 days", "Last 90 days" (calculated from TODAY)
- **Custom Range**: Date picker for custom start/end dates
- **Validation**: Enforces 90-day maximum range
- **Default**: Last 30 days from TODAY (not hardcoded 2025)

**Key Code**:
```typescript
// Calculate date range from TODAY backwards
function getDefaultDateRange(days: number): DateRange {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const endDate = new Date(today);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}
```

#### `components/AgentCard.tsx`
**Purpose**: Displays summary card for a single agent.

**Features**:
- Agent name and ID
- Total conversations badge
- Average call duration (formatted as "Xm Ys")
- Average messages
- Success rate with color-coded progress bar:
  - Green: ≥80%
  - Yellow: ≥60%
  - Red: <60%
- "View Details" button

**Visual Design**:
- Dark theme card (`bg-gray-800`)
- Hover effects
- Responsive grid layout

#### `components/AgentDetailModal.tsx` ⭐ **Agent Detail View**
**Purpose**: Modal showing detailed metrics, charts, and conversation table for a single agent.

**Features**:
- **Key Metrics Cards**: Total conversations, avg duration, avg messages, success rate
- **Charts Grid**:
  - Call Volume Chart (line chart with linear regression trend)
  - Duration Trend Chart (line chart with linear regression trend)
  - Average Messages Chart (line chart with linear regression trend)
- **Call Categories Chart**: Filtered call categories for this agent and date range
  - Shows categories specific to the selected agent
  - Clickable bars/rows to view individual call titles
  - Fetches from `/api/call-categories` with agent_id and date filters
- **Conversations Table**: Paginated table of individual conversations
- **Loading State**: Spinner while fetching data
- **Error Handling**: Error message with close button

**Data Fetching**:
- Parallel fetch of `/api/metrics` and `/api/trends`
- Separate fetch of `/api/call-categories` with agent_id and date range filters
- Updates when date range or agent changes

#### `components/ConversationsTable.tsx`
**Purpose**: Paginated table displaying individual conversations.

**Features**:
- Columns: Date, Duration, Messages, Status, Direction, Title
- Pagination controls (Previous/Next)
- Status badges with color coding:
  - Green: "done"
  - Yellow: "in-progress"
  - Red: "failed"
- Loading spinner
- Error handling with retry

**Pagination**:
- Fetches 100 conversations per page
- Shows "Showing X to Y of Z conversations"
- Disables Previous/Next buttons at boundaries

#### `components/CategoryDetailsModal.tsx` ⭐ **Category Details Modal**
**Purpose**: Modal displaying individual call titles for a selected category.

**Features**:
- **Header**: Shows category name and close button
- **Content**: Scrollable list of conversation titles
- **Conversation Display**: Each conversation shows:
  - Call summary title
  - Agent name
  - Timestamp (formatted as date/time)
- **Loading State**: Spinner while fetching data
- **Error Handling**: Error message with retry button
- **Empty State**: Message when no conversations found

**Data Fetching**:
- Fetches from `/api/call-categories/details` with category and optional filters
- Supports filtering by agent_id, start_date, end_date (passed as props)
- Automatically refetches when modal opens or filters change

**Usage**:
- Opened when user clicks on a category bar or table row in `CallCategoriesChart`
- Context-aware: Shows filtered results when opened from agent modal, all data when opened from main dashboard

#### `components/LoadingSpinner.tsx`
**Purpose**: Reusable loading indicator.

**Features**:
- Three sizes: `sm`, `md`, `lg`
- Animated spinner
- Used throughout the app

#### `components/MetricCard.tsx`
**Purpose**: Small card displaying a metric value.

**Features**:
- Title and value
- Optional subtitle
- Customizable background color

#### `components/Charts/` Directory

All chart components use **Recharts** library and are styled for dark theme.

##### `components/Charts/CallVolumeChart.tsx`
**Purpose**: Line chart showing daily conversation counts with linear regression trend line.

**Features**:
- Blue line: Actual daily conversation counts
- Red line: Straight diagonal trend line (linear regression)
- X-axis: Dates (formatted as M/D)
- Y-axis: Conversation count
- Tooltip with formatted dates

**Trend Line Calculation**:
- Uses linear regression (y = mx + b) instead of moving average
- Calculates slope and intercept from all data points
- Creates straight line from start to end point
- Line type: `linear` (not `monotone`)

##### `components/Charts/DurationTrendChart.tsx`
**Purpose**: Line chart showing average call duration over time with linear regression trend line.

**Features**:
- Green line: Actual daily average duration
- Red line: Straight diagonal trend line (linear regression)
- Y-axis: Duration formatted as "Xm Ys"
- Tooltip with formatted duration

**Trend Line Calculation**: Same as CallVolumeChart (linear regression)

##### `components/Charts/AverageMessagesChart.tsx`
**Purpose**: Line chart showing average messages per conversation over time with linear regression trend line.

**Features**:
- Blue line: Actual daily average messages
- Red line: Straight diagonal trend line (linear regression)
- Y-axis: Message count
- Tooltip with message count

**Trend Line Calculation**: Same as CallVolumeChart (linear regression)

##### `components/Charts/CallCategoriesChart.tsx` ⭐ **Call Categories Chart**
**Purpose**: Horizontal bar chart showing call category distribution with clickable categories.

**Features**:
- Horizontal bars for each category
- Color-coded bars (10 different colors)
- Shows count and percentage
- Table below chart with detailed breakdown
- Total calls display
- **Clickable Interaction**:
  - Click on any bar to view call titles for that category
  - Click on any table row to view call titles for that category
  - Opens `CategoryDetailsModal` with filtered results
- **Context-Aware Filtering**:
  - Accepts optional props: `agentId`, `startDate`, `endDate`
  - When props provided: Shows filtered categories (for agent modals)
  - When props not provided: Shows all historical data (for main dashboard)

**Props**:
- `data`: Array of category data
- `totalCalls`: Total number of calls
- `loading`: Optional loading state
- `agentId`: Optional agent ID for filtering
- `startDate`: Optional start date for filtering
- `endDate`: Optional end date for filtering

**Data Source**: `/api/call-categories` endpoint (with optional query parameters)

##### `components/Charts/StatusPieChart.tsx`
**Purpose**: Pie chart showing status distribution (done, in-progress, failed, etc.).

**Features**:
- Color-coded segments
- Tooltip with count and percentage
- Legend

##### `components/Charts/DirectionDonutChart.tsx`
**Purpose**: Donut chart showing inbound vs outbound call distribution.

**Features**:
- Color-coded segments
- Tooltip with count and percentage
- Legend

##### `components/Charts/SuccessRateChart.tsx`
**Purpose**: Line chart showing success rate percentage over time.

**Features**:
- Line showing daily success rate
- Y-axis: Percentage (0-100%)
- Tooltip with formatted percentage

---

### `/lib` Directory

#### `lib/supabase.ts` ⭐ **Supabase Client & Helpers**
**Purpose**: Provides Supabase client instance and utility functions.

**Key Functions**:

1. **`getSupabaseClient()`**: Lazy-initialized Supabase client
   - Uses environment variables for URL and service role key
   - Custom fetch interceptor for better error handling
   - Logs connection status
   - Handles network errors gracefully

2. **`dateToUnix(dateString: string): number`** ⭐ **FIXED**
   - Converts `YYYY-MM-DD` date string to Unix timestamp (seconds)
   - **Uses UTC timezone** to match SQL `EXTRACT(EPOCH FROM TIMESTAMP)` behavior
   - Returns timestamp for `00:00:00 UTC` of the specified date

   **Code**:
   ```typescript
   export function dateToUnix(dateString: string): number {
     const [year, month, day] = dateString.split('-').map(Number);
     const timestamp = Math.floor(Date.UTC(year, month - 1, day, 0, 0, 0, 0) / 1000);
     return timestamp;
   }
   ```

3. **`unixToDate(timestamp: number): string`**
   - Converts Unix timestamp to `YYYY-MM-DD` string

4. **`formatDuration(seconds: number): string`**
   - Formats seconds as "Xm Ys" (e.g., "5m 30s")
   - Handles edge cases (0 minutes, 0 seconds)

5. **`getDateRange(days: number): { startDate: string; endDate: string }`** ⭐ **FIXED**
   - Calculates date range from **TODAY** backwards (not hardcoded 2025)
   - Returns last N days from current date
   - Formats as `YYYY-MM-DD`
   - Enforces 90-day maximum

6. **`formatSQLTimestamp(dateString: string, isEndOfDay: boolean): string`**
   - Formats date string as SQL timestamp
   - `isEndOfDay=true`: Returns `"YYYY-MM-DD 23:59:59"`
   - `isEndOfDay=false`: Returns `"YYYY-MM-DD 00:00:00"`

#### `lib/calculations.ts`
**Purpose**: Pure functions for calculating metrics from conversation data.

**Functions**:

1. **`calculateAgentMetrics(conversations: Conversation[]): AgentMetrics | null`**
   - Calculates all metrics for a single agent from conversation array
   - Returns `null` if no conversations
   - Calculates: totalConversations, avgCallDuration, avgMessages, successRate, statusBreakdown, directionBreakdown

2. **`calculateDailyMetrics(conversations: Conversation[], startDate: string, endDate: string): DailyMetric[]`**
   - Groups conversations by date
   - Calculates daily metrics for each day in range
   - Returns array sorted by date
   - Handles days with no conversations (returns 0 values)

#### `lib/utils.ts`
**Purpose**: General utility functions.

**Functions**:
- `cn(...classes)`: Combines class names (uses `clsx`)
- `formatDate(date)`: Formats date for display (e.g., "Jan 15, 2024")
- `formatDateTime(timestamp)`: Formats Unix timestamp as date + time

---

### `/types` Directory

#### `types/index.ts`
**Purpose**: TypeScript type definitions shared across the application.

**Interfaces**:

```typescript
export interface Conversation {
  conversation_id: string;
  agent_id: string;
  agent_name: string;
  branch_id?: string | null;
  start_time_unix_secs: number;  // Unix timestamp in seconds
  call_duration_secs: number;
  message_count: number;
  status?: string | null;
  call_successful?: string | null;
  transcript_summary?: string | null;
  call_summary_title?: string | null;
  direction?: string | null;
  rating?: string | null;
  created_at?: string;
}

export interface Agent {
  agent_id: string;
  agent_name: string;
}

export interface AgentMetrics {
  agent_id: string;
  agent_name: string;
  totalConversations: number;
  avgCallDuration: number;
  avgMessages: number;
  successRate: number;
  statusBreakdown: Record<string, number>;
  directionBreakdown: Record<string, number>;
}

export interface DailyMetric {
  date: string;  // YYYY-MM-DD
  conversationCount: number;
  avgDuration: number;
  avgMessages: number;
  successRate: number;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface DateRange {
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
}

export interface CallCategory {
  category: string;
  count: number;
  percentage: number;
}
```

---

## Database Schema

### `conversations` Table

**Primary Key**: `conversation_id` (TEXT)

| Column | Type | Description |
|--------|------|-------------|
| `conversation_id` | TEXT | Unique conversation identifier (PK) |
| `agent_id` | TEXT | Agent identifier |
| `agent_name` | TEXT | Human-readable agent name |
| `start_time_unix_secs` | BIGINT | Unix timestamp (seconds) of conversation start |
| `call_duration_secs` | INTEGER | Duration of call in seconds |
| `message_count` | INTEGER | Number of messages in conversation |
| `status` | TEXT | Status (e.g., "done", "in-progress", "failed") |
| `call_successful` | TEXT | Success indicator (e.g., "success", "failed") |
| `direction` | TEXT | Call direction ("inbound", "outbound") |
| `transcript_summary` | TEXT | Summary of conversation transcript |
| `call_summary_title` | TEXT | Title/summary of the call (used for categorization) |
| `rating` | TEXT | Optional rating |
| `branch_id` | TEXT | Optional branch identifier |
| `created_at` | TIMESTAMP | Record creation timestamp |

**Indexes** (recommended):
- Index on `start_time_unix_secs` for date range queries
- Index on `agent_id` for agent-specific queries
- Composite index on `(agent_id, start_time_unix_secs)` for optimized metrics queries

---

## API Endpoints

### `GET /api/agents`
**Purpose**: Get all unique agents in date range.

**Query Parameters**:
- `start_date` (required): `YYYY-MM-DD`
- `end_date` (required): `YYYY-MM-DD`

**Response**: `{ agents: Agent[], dateRange: DateRange }`

**Features**:
- Pagination to handle 1000+ conversations
- Returns unique agents with conversation counts
- Sorted by agent name

---

### `GET /api/metrics`
**Purpose**: Get calculated metrics for all agents (or specific agent).

**Query Parameters**:
- `start_date` (required): `YYYY-MM-DD`
- `end_date` (required): `YYYY-MM-DD`
- `agent_id` (optional): Filter to specific agent

**Response**: `{ metrics: AgentMetrics[] }`

**Features**:
- 2-step process: Get agents, then calculate metrics per agent
- Pagination for both steps
- Server-side metric calculation from raw data

---

### `GET /api/trends`
**Purpose**: Get daily aggregated metrics for trend analysis.

**Query Parameters**:
- `start_date` (required): `YYYY-MM-DD`
- `end_date` (required): `YYYY-MM-DD`
- `agent_id` (optional): Filter to specific agent

**Response**: `{ dailyMetrics: DailyMetric[] }`

---

### `GET /api/conversations`
**Purpose**: Get paginated list of conversations for an agent.

**Query Parameters**:
- `agent_id` (required): Agent identifier
- `start_date` (required): `YYYY-MM-DD`
- `end_date` (required): `YYYY-MM-DD`
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 100, max: 100)

**Response**: `{ conversations: Conversation[], pagination: PaginationInfo }`

---

### `GET /api/call-categories`
**Purpose**: Get categorized breakdown of conversations into 11 automotive-specific categories.

**Query Parameters** (all optional):
- `agent_id` (optional): Filter conversations by specific agent
- `start_date` (optional): Filter conversations from this date (YYYY-MM-DD)
- `end_date` (optional): Filter conversations to this date (YYYY-MM-DD)

**Response**: `{ totalCalls: number, categories: CallCategory[] }`

**Features**:
- **No parameters**: Returns ALL historical conversations (unchanged behavior for main dashboard)
- **With parameters**: Returns filtered conversations by agent and/or date range (for agent detail modals)
- Cache-busting headers (`force-dynamic`, `revalidate: 0`)
- Pagination to handle 1000+ records
- Comprehensive fuzzy matching with 30-50+ keywords per category
- Similarity threshold: 0.15 (aggressive matching)
- 11 categories: Appointment Scheduling, Service Status Inquiries, Pricing and Quotes, Vehicle Diagnostics/Maintenance, Parts and Repairs, Billing and Payments, General Information, Customer Service Requests, Vehicle Logistics, Technical and Miscellaneous, Others

---

### `GET /api/call-categories/details`
**Purpose**: Get individual call titles for a specific category with optional filtering.

**Query Parameters**:
- `category` (required): Category name to filter by
- `agent_id` (optional): Filter conversations by specific agent
- `start_date` (optional): Filter conversations from this date (YYYY-MM-DD)
- `end_date` (optional): Filter conversations to this date (YYYY-MM-DD)

**Response**: `{ category: string, totalTitles: number, conversations: ConversationDetail[] }`

**Features**:
- Returns conversation details: conversation_id, call_summary_title, start_time_unix_secs, agent_name
- Uses same categorization logic as main endpoint
- Supports filtering by agent and date range for context-aware results
- Pagination handles 1000+ conversations
- Sorted by timestamp descending (newest first)

---

### `GET /api/test`
**Purpose**: Diagnostic endpoint to test Supabase connectivity.

**Response**: `{ success: boolean, message: string, conversationCount?: number }`

---

## Key Features & Recent Updates

### ✅ Date Range Fixes (Critical)

**Problem**: System was showing 2025 dates instead of 2024, and only 2-3 agents instead of all 18.

**Solution**:
1. **Frontend**: `DateRangePicker` now calculates dates from `new Date()` (TODAY), not hardcoded 2025
2. **Backend**: `dateToUnix()` now uses **UTC timezone** to match SQL behavior
3. **Default Range**: Last 30 days from TODAY (not hardcoded date)

**Files Updated**:
- `components/DateRangePicker.tsx`: Removed dependency on `getDateRange`, added local helper
- `lib/supabase.ts`: Fixed `dateToUnix()` to use UTC, updated `getDateRange()` to use current date

### ✅ Pagination Implementation

**Problem**: Supabase has 1000 row limit per request, causing incomplete data retrieval.

**Solution**: Implemented pagination loops in:
- `/api/agents`: Fetches ALL conversations in date range
- `/api/metrics`: Fetches ALL agents, then ALL conversations per agent
- `/api/call-categories`: Fetches ALL conversations (no date filter)

**Result**: System now retrieves **all data**, not just first 1000 rows.

### ✅ 2-Step Metrics Calculation

**Problem**: Metrics calculation was inefficient and could miss agents.

**Solution**: 
1. Step 1: Get all distinct agents (with pagination)
2. Step 2: For each agent, fetch raw conversations and calculate metrics server-side

**Result**: Accurate metrics for all agents, even with large datasets.

### ✅ UTC Timezone Fix

**Problem**: Date conversions were using local timezone, causing mismatches with SQL queries.

**Solution**: `dateToUnix()` now uses `Date.UTC()` to create timestamps in UTC, matching SQL `EXTRACT(EPOCH FROM TIMESTAMP)` behavior.

### ✅ Linear Regression Trend Lines

**Problem**: Trend lines were curved (moving average), client wanted straight diagonal lines.

**Solution**: Replaced moving average with linear regression (y = mx + b) in:
- `CallVolumeChart.tsx`
- `DurationTrendChart.tsx`
- `AverageMessagesChart.tsx`

**Implementation**:
- Calculates slope and intercept from all data points
- Creates straight line from start to end point
- Changed line type from `monotone` to `linear`

**Result**: Perfectly straight diagonal trend lines showing overall UP or DOWN trend.

### ✅ Call Categories Feature

**Problem**: Need to categorize all calls into predefined categories.

**Solution**: 
- Created `/api/call-categories` endpoint
- Implemented comprehensive fuzzy matching algorithm
- 11 predefined categories with extensive keyword matching
- Added `CallCategoriesChart` component
- Cache-busting to ensure fresh data

**Result**: All calls automatically categorized and displayed in bar chart.

### ✅ Enhanced Call Categorization (11 Categories)

**Problem**: Original 10 categories were too generic and didn't match automotive shop terminology.

**Solution**: 
- Replaced 10 categories with 11 automotive-specific categories:
  1. Appointment Scheduling
  2. Service Status Inquiries
  3. Pricing and Quotes
  4. Vehicle Diagnostics/Maintenance
  5. Parts and Repairs
  6. Billing and Payments
  7. General Information
  8. Customer Service Requests
  9. Vehicle Logistics
  10. Technical and Miscellaneous
  11. Others (catch-all)
- Created comprehensive keyword arrays (30-50+ keywords per category)
- Added automotive shop-specific terminology
- Included common phrases, variations, and abbreviations

**Result**: Better categorization accuracy with automotive context.

### ✅ Aggressive Keyword Matching

**Problem**: 62.6% of calls falling into "Others" category due to insufficient keyword matching.

**Solution**: 
- Expanded keyword arrays significantly:
  - **General Information**: Added greeting, intro, hello, welcome, hours, location, address, directions
  - **Customer Service Requests**: Added transfer, callback, message, speak, talk, agent, representative, human, manager, connect, reach
  - **Technical and Miscellaneous**: Added incomplete, silent, empty, no response, wrong number, test, spam, disconnected, hang up
- Lowered similarity threshold from 0.2 to 0.15 for more aggressive matching
- Added comprehensive variations, synonyms, and common phrases

**Result**: Reduced "Others" category from 62.6% to under 15% by capturing generic titles like "virtual assistant intro", "greeting", "transfer request", "take message", "incomplete call", etc.

### ✅ Cache-Busting for Call Categories

**Problem**: Call categories API showing old cached data (7,639) instead of new data (8,420).

**Solution**: Added cache-busting headers to `/api/call-categories/route.ts`:
- `export const dynamic = 'force-dynamic'`
- `export const revalidate = 0`
- Added `.limit(pageSize)` to Supabase query

**Result**: API always fetches fresh data from Supabase.

### ✅ Call Category Details Feature

**Problem**: Need to view individual call titles within each category.

**Solution**: 
- Created `/api/call-categories/details` endpoint to fetch call titles for a specific category
- Created `CategoryDetailsModal` component to display call titles in a modal
- Updated `CallCategoriesChart` to be clickable (bars and table rows)
- Added optional filtering support to main call-categories endpoint (agent_id, start_date, end_date)
- Integrated category chart into agent detail modals with agent-specific filtering

**Features**:
- Click any category bar or table row to view call titles
- Context-aware filtering: Shows filtered results in agent modals, all data in main dashboard
- Modal displays conversation titles, agent names, and timestamps
- Loading states and error handling
- Scrollable list for many conversations

**Files Created**:
- `/app/api/call-categories/details/route.ts`: New endpoint for category details
- `/components/CategoryDetailsModal.tsx`: New modal component

**Files Updated**:
- `/app/api/call-categories/route.ts`: Added optional query parameters support
- `/components/Charts/CallCategoriesChart.tsx`: Added click handlers and modal integration
- `/components/AgentDetailModal.tsx`: Added call categories chart with filtering

**Result**: Users can now drill down into categories to see individual call titles, with proper filtering based on context (main dashboard vs agent modal).

### 🎨 UI Features

- **Dark Theme**: Consistent dark gray color scheme
- **Responsive Design**: Mobile, tablet, and desktop layouts
- **Loading States**: Spinners and skeleton screens
- **Error Handling**: User-friendly error messages with retry buttons
- **Debug Panel**: Collapsible debug info panel (development)
- **Auto-Refresh**: Optional 30-second auto-refresh toggle

### 📊 Data Visualization

- **Line Charts**: Call volume, duration trends, success rates (with linear regression trend lines)
- **Pie/Donut Charts**: Status and direction distributions
- **Bar Charts**: Call categories distribution
- **Interactive Tooltips**: Hover to see detailed values
- **Dark Theme Styling**: All charts styled for dark background

---

## Development Workflow

### Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Access Dashboard**:
   Open `http://localhost:3000`

### Testing

1. **Test Date Range**: Select different date ranges (7, 30, 90 days)
2. **Test Agent Discovery**: Verify all agents appear (should see all 18 agents for appropriate ranges)
3. **Test Metrics**: Verify metrics are accurate (check totals match conversation counts)
4. **Test Pagination**: Verify conversations table pagination works
5. **Test Charts**: Verify charts display correctly with data
6. **Test Call Categories**: Verify call categories chart shows all historical data

### Debugging

- **Browser Console**: Check for errors and API responses
- **Debug Panel**: Expand debug panel on dashboard for real-time info
- **API Test Endpoint**: Use `/api/test` to verify Supabase connectivity
- **Server Logs**: Check Next.js server console for API route logs

---

## Future Enhancements

Potential improvements:
- Export data to CSV/Excel
- Agent comparison view (side-by-side)
- Advanced filtering (by status, direction, etc.)
- Real-time updates via Supabase subscriptions
- User authentication and multi-tenant support
- Custom date range presets
- Performance optimizations (caching, query optimization)
- Additional chart types (heatmaps, scatter plots)
- Call transcript search functionality

---

## Maintenance Notes

### Keeping This Document Updated

1. When adding new files, update the directory structure section
2. When modifying API routes, update the API endpoints section
3. When changing data structures, update the types section
4. When fixing bugs, document in the "Recent Updates" section

### Code Style

- TypeScript strict mode
- ESLint with Next.js config
- Consistent error handling with try-catch
- Console logging for debugging (use emoji prefixes: 🟢 success, 🟡 info, ❌ error)
- Comments for complex logic

---

**End of Documentation**

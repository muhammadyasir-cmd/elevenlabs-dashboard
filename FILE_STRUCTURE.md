# ElevenLabs Agent Performance Dashboard – Complete System Documentation

**Last Updated:** 2025-01-XX  
**Project Path:** `/Users/yasir/Desktop/Web tracking portal new`

---

## Table of Contents

1. [System Overview](#system-overview)
2. [System Architecture](#system-architecture)
3. [How It Works](#how-it-works)
4. [Directory Structure](#directory-structure)
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

### Technology Stack

- **Framework**: Next.js 14.2.0 (App Router)
- **Language**: TypeScript 5.3.0
- **UI Library**: React 18.3.0
- **Styling**: Tailwind CSS 3.4.0
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts 2.10.3
- **Date Handling**: react-datepicker 4.25.0, date-fns 3.0.0
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
│  │ /api/convos  │  │ /api/test    │  │              │      │
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

---

## Directory Structure

```
.
├── .env.local                    # Environment variables (Supabase credentials)
├── .eslintrc.json                # ESLint configuration
├── .gitignore                    # Git ignore rules
├── .next/                        # Next.js build output (generated)
├── DEBUG_GUIDE.md                # Debugging instructions
├── FIXES_APPLIED.md              # Fix history documentation
├── FILE_STRUCTURE.md             # This file
├── README.md                     # Project overview and setup
├── app/                          # Next.js App Router
│   ├── api/                      # API routes (server-side)
│   │   ├── agents/route.ts       # GET /api/agents
│   │   ├── metrics/route.ts       # GET /api/metrics
│   │   ├── trends/route.ts        # GET /api/trends
│   │   ├── conversations/route.ts # GET /api/conversations
│   │   └── test/route.ts          # GET /api/test (diagnostics)
│   ├── globals.css                # Global styles + Tailwind
│   ├── layout.tsx                 # Root layout component
│   └── page.tsx                   # Main dashboard page
├── components/                    # React components
│   ├── AgentCard.tsx              # Agent summary card
│   ├── AgentDetailModal.tsx       # Agent detail modal
│   ├── ConversationsTable.tsx     # Paginated conversation table
│   ├── DateRangePicker.tsx        # Date range selector
│   ├── LoadingSpinner.tsx         # Loading indicator
│   ├── MetricCard.tsx            # Metric display card
│   └── Charts/                    # Chart components
│       ├── CallVolumeChart.tsx
│       ├── DurationTrendChart.tsx
│       ├── StatusPieChart.tsx
│       ├── DirectionDonutChart.tsx
│       └── SuccessRateChart.tsx
├── lib/                           # Utility libraries
│   ├── supabase.ts                # Supabase client + helpers
│   ├── calculations.ts             # Metric calculation functions
│   └── utils.ts                   # General utilities
├── types/                         # TypeScript type definitions
│   └── index.ts                   # Shared interfaces
├── next.config.js                 # Next.js configuration
├── package.json                   # Dependencies and scripts
├── postcss.config.js              # PostCSS configuration
├── tailwind.config.ts             # Tailwind CSS configuration
└── tsconfig.json                  # TypeScript configuration
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
- `tailwindcss`: Utility-first CSS framework (v3.4.0)

**Scripts**:
- `npm run dev`: Start development server
- `npm run build`: Create production build
- `npm run start`: Start production server
- `npm run lint`: Run ESLint

#### `.env.local`
**Purpose**: Stores environment variables (not committed to git).

**Required Variables**:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for server-side queries)

#### `tsconfig.json`
**Purpose**: TypeScript compiler configuration.

**Key Settings**:
- Strict mode enabled
- Path alias `@/*` maps to project root
- ES2020 target
- Next.js plugin enabled

---

### `/app` Directory

#### `app/layout.tsx`
**Purpose**: Root layout component that wraps all pages.

**Features**:
- Applies dark theme (`bg-gray-900`)
- Sets page metadata (title: "ElevenLabs Agent Performance Dashboard")
- Provides global HTML structure

#### `app/globals.css`
**Purpose**: Global styles and Tailwind CSS imports.

**Contents**:
- Tailwind base, components, utilities
- Dark theme color tokens
- Custom styles for `react-datepicker` to match dark theme
- Global body styles

#### `app/page.tsx` ⭐ **Main Dashboard Component**
**Purpose**: Main dashboard page that orchestrates the entire UI.

**Key Features**:
- **State Management**:
  - `dateRange`: Current selected date range (defaults to last 30 days from TODAY)
  - `agents`: List of agents from API
  - `metrics`: Calculated metrics for each agent
  - `loading`: Loading state
  - `error`: Error state
  - `selectedAgent`: Currently selected agent for detail modal
  - `autoRefresh`: Auto-refresh toggle (30-second interval)
  - `debugInfo`: Debug log array

- **Data Fetching**:
  - `fetchData()`: Parallel fetch of `/api/agents` and `/api/metrics`
  - Triggers on date range change
  - Handles errors gracefully

- **UI Components**:
  - Debug panel (collapsible)
  - Header with title, last updated time, auto-refresh toggle, manual refresh button
  - Date range picker
  - Error display with retry button
  - Loading spinner
  - Agent cards grid (responsive: 1 col mobile, 2 cols tablet, 3 cols desktop)
  - Agent detail modal

**Code Snippet**:
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

#### `app/api/test/route.ts`
**Purpose**: Diagnostic endpoint to test Supabase connectivity.

**Endpoint**: `GET /api/test`

**Process**:
1. Checks environment variables
2. Performs simple Supabase query
3. Returns connection status and conversation count

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

const setQuickRange = (days: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const end = new Date(today);
  const start = new Date(today);
  start.setDate(start.getDate() - days);
  
  handleDateChange(start, end);
};
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
  - Call Volume Chart (line chart)
  - Duration Trend Chart (line chart)
  - Status Pie Chart
  - Direction Donut Chart
  - Success Rate Chart (line chart)
- **Conversations Table**: Paginated table of individual conversations
- **Loading State**: Spinner while fetching data
- **Error Handling**: Error message with close button

**Data Fetching**:
- Parallel fetch of `/api/metrics` and `/api/trends`
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

- **CallVolumeChart.tsx**: Line chart showing daily conversation counts
- **DurationTrendChart.tsx**: Line chart showing average call duration over time
- **StatusPieChart.tsx**: Pie chart showing status distribution
- **DirectionDonutChart.tsx**: Donut chart showing inbound vs outbound
- **SuccessRateChart.tsx**: Line chart showing success rate percentage over time

---

### `/lib` Directory

#### `lib/supabase.ts` ⭐ **Supabase Client & Helpers**
**Purpose**: Provides Supabase client instance and utility functions.

**Key Functions**:

1. **`getSupabaseClient()`**: Lazy-initialized Supabase client
   - Uses environment variables for URL and service role key
   - Custom fetch interceptor for better error handling
   - Logs connection status

2. **`dateToUnix(dateString: string): number`** ⭐ **FIXED**
   - Converts `YYYY-MM-DD` date string to Unix timestamp (seconds)
   - **Uses UTC timezone** to match SQL `EXTRACT(EPOCH FROM TIMESTAMP)` behavior
   - Returns timestamp for `00:00:00 UTC` of the specified date

   **Code**:
   ```typescript
   export function dateToUnix(dateString: string): number {
     // Parse date string as YYYY-MM-DD
     const [year, month, day] = dateString.split('-').map(Number);
     
     // Create timestamp in UTC timezone at midnight (00:00:00)
     // This matches how SQL TIMESTAMP '2025-10-17 00:00:00' works
     const timestamp = Math.floor(Date.UTC(year, month - 1, day, 0, 0, 0, 0) / 1000);
     
     return timestamp;
   }
   ```

3. **`unixToDate(timestamp: number): string`**
   - Converts Unix timestamp to `YYYY-MM-DD` string

4. **`formatDuration(seconds: number): string`**
   - Formats seconds as "Xm Ys" (e.g., "5m 30s")

5. **`getDateRange(days: number): { startDate: string; endDate: string }`** ⭐ **FIXED**
   - Calculates date range from **TODAY** backwards (not hardcoded 2025)
   - Returns last N days from current date
   - Formats as `YYYY-MM-DD`

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

#### `lib/utils.ts`
**Purpose**: General utility functions.

**Functions**:
- `cn(...classes)`: Combines class names (uses `clsx`)
- `formatDate(date)`: Formats date for display
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
| `call_summary_title` | TEXT | Title/summary of the call |
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

### 🎨 UI Features

- **Dark Theme**: Consistent dark gray color scheme
- **Responsive Design**: Mobile, tablet, and desktop layouts
- **Loading States**: Spinners and skeleton screens
- **Error Handling**: User-friendly error messages with retry buttons
- **Debug Panel**: Collapsible debug info panel (development)
- **Auto-Refresh**: Optional 30-second auto-refresh toggle

### 📊 Data Visualization

- **Line Charts**: Call volume, duration trends, success rates
- **Pie/Donut Charts**: Status and direction distributions
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

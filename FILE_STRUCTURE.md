# ElevenLabs Agent Performance Dashboard – Complete System Documentation

**Last Updated:** 2025-12-04 (Refreshed full directory mapping and documentation cross-check)  
**Project Path:** `/Users/yasir/Desktop/Web tracking portal new 2`

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
- **Call Categorization**: Automatic categorization of all calls into 7 predefined categories using comprehensive fuzzy matching with automotive shop terminology and hangup detection logic

### Technology Stack

- **Framework**: Next.js 14.2.0 (App Router)
- **Language**: TypeScript 5.3.0
- **UI Library**: React 18.3.0
- **Styling**: Tailwind CSS 3.4.0
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js 4.24.13 (Credentials Provider)
- **Data Fetching**: TanStack React Query 5.90.11
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

The `/api/call-categories` endpoint categorizes ALL historical conversations (no date filtering) into 7 predefined categories:

1. **Hangup Detection (Priority)**: Checks duration < 15 seconds AND message_count < 3 FIRST before any keyword matching
2. **Fuzzy Matching**: Uses comprehensive keyword matching and similarity scoring with automotive shop terminology
3. **Categories**: 
   - Hangups (duration-based + keyword-based)
   - Revenue Opportunity (service-related keywords get priority)
   - Repair Status & Shop Updates
   - General Info & Customer Service
   - Logistics, Billing & Other
   - Forwarded to Advisor
   - System / Other (catch-all)
4. **Categorization Order**:
   - FIRST: Check duration < 15s AND messages < 3 → Hangups
   - SECOND: Check service-related keywords → Revenue Opportunity (priority)
   - THIRD: Check other category keywords
   - LAST: Default to "System / Other"
5. **Pagination**: Fetches all conversations with pagination to handle 1000+ records
6. **Cache-Busting**: Uses `force-dynamic` and `revalidate: 0` to ensure fresh data
7. **Similarity Threshold**: 0.15 (maintained for consistent matching)

---

## Complete Directory Structure

The layout below reflects the repository as of **2025-12-04**. Generated artifacts such as `.next/` and `node_modules/` remain gitignored but are listed for clarity.

```
.
├── .env.local*                   # Local secrets (Supabase + NextAuth credentials)
├── .eslintrc.json                # ESLint configuration (Next.js / React rules)
├── .git/                         # Git metadata
├── .gitignore                    # Ignore patterns (node_modules, .next, .env.local, etc.)
├── .next/                        # Next.js build cache/output (generated)
├── DATABASE_SETUP_CALL_CATEGORIES.md  # SQL + procedural guide for category dataset
├── DEBUG_GUIDE.md                # Troubleshooting checklist and logging tips
├── FILE_STRUCTURE.md             # This living document
├── FIXES_APPLIED.md              # Chronological changelog of remediation work
├── README.md                     # Project intro, setup, and quickstart
├── app/                          # Next.js App Router source
│   ├── api/                      # Server-side API routes
│   │   ├── agents/route.ts       # GET /api/agents (agent discovery)
│   │   ├── auth/[...nextauth]/route.ts   # NextAuth credentials provider
│   │   ├── call-categories/route.ts      # GET /api/call-categories (categorization)
│   │   ├── call-categories/details/route.ts  # GET /api/call-categories/details
│   │   ├── conversations/route.ts        # GET /api/conversations (paginated detail)
│   │   ├── metrics/route.ts              # GET /api/metrics (2-step aggregation)
│   │   ├── trends/route.ts               # GET /api/trends (daily rollups)
│   │   └── test/route.ts                 # GET /api/test (diagnostic ping)
│   ├── globals.css                # Tailwind base + global theming + datepicker overrides
│   ├── layout.tsx                 # Root layout wrapper with Providers + metadata
│   ├── login/page.tsx             # Credentials form + background prefetching
│   ├── page.tsx                   # Dashboard shell and data orchestration
│   └── providers.tsx              # React Query provider (singleton QueryClient)
├── components/                    # Client-side presentation widgets
│   ├── AgentCard.tsx
│   ├── AgentDetailModal.tsx
│   ├── CategoryDetailsModal.tsx
│   ├── ConversationsTable.tsx
│   ├── DateRangePicker.tsx
│   ├── LoadingSpinner.tsx
│   ├── MetricCard.tsx
│   └── Charts/
│       ├── AverageMessagesChart.tsx
│       ├── CallCategoriesChart.tsx
│       ├── CallVolumeChart.tsx
│       ├── DirectionDonutChart.tsx
│       ├── DurationTrendChart.tsx
│       ├── HangupRateChart.tsx
│       ├── StatusPieChart.tsx
│       └── SuccessRateChart.tsx
├── lib/                           # Shared server/client utilities
│   ├── calculations.ts            # Pure functions for metrics + hangup rate
│   ├── supabase.ts                # Supabase client factory + date helpers
│   └── utils.ts                   # Formatting + className helpers
├── middleware.ts                  # NextAuth-protected route matcher
├── next-env.d.ts                  # Next.js TypeScript ambient types (generated)
├── next.config.js                 # Next.js runtime configuration
├── node_modules/                  # Installed dependencies (generated)
├── package-lock.json              # NPM lockfile
├── package.json                   # Scripts + dependency manifest
├── postcss.config.js              # Tailwind/PostCSS pipeline config
├── tailwind.config.ts             # Tailwind theme and scanning rules
├── tsconfig.json                  # Project-wide TS compiler options
└── types/                         # TypeScript interfaces
    ├── index.ts                   # Conversation, Agent, Metric, and helper types
    └── next-auth.d.ts             # NextAuth module augmentation
```

> `*` Sensitive files that never leave the local environment. Keep `.env.local` out of source control.

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
- `NEXTAUTH_SECRET`: Secret key for NextAuth.js JWT encryption (required for production)
- `NEXTAUTH_URL`: Base URL of the application (e.g., `http://localhost:3000` for development, production URL for production)

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
- Wraps children with `Providers` component for React Query

**Code Structure**:
```typescript
import Providers from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-900 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

#### `app/providers.tsx`
**Purpose**: Provides React Query client to all child components.

**Features**:
- Creates a singleton `QueryClient` instance
- Configures default query options:
  - `staleTime`: 15 minutes (data considered fresh for 15 minutes)
  - `refetchOnWindowFocus`: true (refetch when window regains focus)
  - `refetchOnReconnect`: true (refetch when network reconnects)
- Wraps children with `QueryClientProvider`

**Usage**: Used in `app/layout.tsx` to provide React Query functionality to the entire app.

#### `app/login/page.tsx` ⭐ **Login Page**
**Purpose**: Authentication page for user login.

**Features**:
- **Email/Password Form**: Credentials-based authentication
- **Password Visibility Toggle**: Show/hide password button
- **Loading State**: Shows spinner during authentication
- **Error Handling**: Displays error messages for invalid credentials
- **Data Prefetching**: Pre-fetches dashboard data in background while user logs in:
  - Pre-fetches agents and metrics for 7, 30, 90 days, and "All Time" ranges
  - Pre-fetches call categories (all historical data)
  - Uses React Query's `prefetchQuery` for background data loading
  - Non-blocking: errors are silently handled, data will fetch on demand if needed
- **Navigation**: Redirects to dashboard (`/`) on successful login
- **Dark Theme**: Matches dashboard styling

**Authentication Flow**:
1. User enters email and password
2. Form submits to NextAuth.js credentials provider
3. On success: Redirects to dashboard (data already loading in background)
4. On failure: Shows error message

**Hardcoded Credentials** (configured in `/api/auth/[...nextauth]/route.ts`):
- Email: `engineering@autoleap.com`
- Password: `Autoleap@Dashbaord12345`

**Key Code**:
```typescript
// Pre-fetch data in background on page load
useEffect(() => {
  const prefetchPromises = [
    queryClient.prefetchQuery({
      queryKey: ['agents', range7Days.startDate, range7Days.endDate],
      queryFn: async () => {
        const response = await fetch(
          `/api/agents?start_date=${range7Days.startDate}&end_date=${range7Days.endDate}`
        );
        if (!response.ok) throw new Error('Failed to fetch agents');
        return response.json();
      },
    }),
    // ... more prefetch queries
  ];
  
  Promise.all(prefetchPromises).catch((error) => {
    // Silently handle errors - data will fetch on demand if needed
    console.error('Background data fetch error (non-blocking):', error);
  });
}, [queryClient]);
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
**Purpose**: Categorizes conversations into 7 predefined categories using hangup detection logic and comprehensive fuzzy matching with automotive shop terminology.

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
4. Categorizes each conversation using `categorizeCall()` function:
   - **FIRST**: Checks duration < 15s AND message_count < 3 → Hangups (runs BEFORE keyword matching)
   - **SECOND**: Checks service-related keywords → Revenue Opportunity (priority)
   - **THIRD**: Checks other category keywords
   - **LAST**: Defaults to "System / Other" if no match
5. Returns category counts and percentages sorted by count (descending)

**Categories** (7 total):
1. **Hangups**: 
   - Duration-based: duration < 15 seconds AND message_count < 3 (priority check)
   - Keyword-based: silent, incomplete, no response, disconnected, hang up, hangup, empty, abandoned, noise only, robocall, spam call, immediate disconnect
   - **Total Keywords**: 12
2. **Revenue Opportunity**: 
   - Service-related keywords get PRIORITY (even if general info mentioned)
   - Keywords: appointment, schedule, book, service, repair, brake, oil change, tire, alignment, AC, diagnostic, symptom, noise, quote, price, cost, estimate, maintenance, tune-up, inspection, check, parts, warranty, alternator, battery, transmission, engine, suspension, exhaust, fluid, filter, belt, hose, spark plug, radiator, coolant, timing, clutch, strut, shock, cv joint, wheel bearing, serpentine, thermostat, water pump, fuel pump, starter, catalytic converter, muffler, rotor, pad, caliper, master cylinder, do you do, can you, availability, fixing, looking for service, won't start, car issue, vehicle problem, oil leak, tire issue, not working, broken, needs repair, engine problem, breakdown, car trouble
   - **Total Keywords**: 64
3. **Repair Status & Shop Updates**: 
   - Keywords: ready, status, update, done, finished, complete, progress, diagnosed, diagnosis result, pick up ready, when ready, eta, how long, waiting, callback about repair, repair update, vehicle ready, drop off, drop-off notification, car arrival, vehicle drop, bring car, car done, vehicle status, car status, pickup status, truck status, status inquiry, status request, status update, ready inquiry, pickup inquiry, ready status, pickup time, eta request, progress inquiry, update request, claim status, order status, heads ready, parts ready, car pickup, vehicle pickup, truck pickup, drop-off, authorize work, vehicle release, keys confirmation, car ready, vehicle arrival, picking up car, pick up vehicle, picking up vehicle, picking up truck, dropping off, drop off car, bringing car, bringing vehicle, authorize, authorization, approval, vehicle is ready, car is ready, ready for pickup, checking status, status check, status on, inquiring about status, asking about status, when will be ready
   - **Total Keywords**: 71 (includes many variations for better matching)
4. **General Info & Customer Service**: 
   - Keywords: hours, open, close, location, address, directions, where located, holiday, weekend hours, shuttle, contact, phone number, email, fax, general inquiry, information, help, question about business, closing time, store hours, when close, business hours, hours inquiry, greeting, hello, assistance, help with, virtual assistant, AI assistant
   - **Total Keywords**: 28
5. **Logistics, Billing & Other**: 
   - Keywords: invoice, receipt, billing, payment, charge, paid, insurance, paperwork, tow, pickup request, dropoff logistics, copy of invoice, transaction, payment method, credit card, towing, tow truck, AAA, invoice copy, payment inquiry, bill payment, billing inquiry, past due, payment assistance, payment plan, payment options, payment link, charge inquiry, declined payment, overcharge, billing issue, payment follow-up, balance inquiry, payment authorization, car pickup, vehicle pickup, pick up car, ready to pick up, pay bill, pay invoice, make payment, send invoice, need tow, car towed, towing service, financing, quote, estimate, clearance, customs, shipment, need invoice, invoice request, billing question, payment issue, paying bill, need to pay, tow service, need towing, towing request, quote request, estimate request, pricing question, cost question, how much
   - **Total Keywords**: 66 (includes many variations for better matching)
6. **Forwarded to Advisor**: 
   - Keywords: transfer, speak to, talk to, human, representative, agent, advisor, person, staff member, connect me, put me through, escalate, manager, technician name, take message, leave message, message for, call back, return call, speak with, looking for, call for, returning call, pass message, relay message, connect to, reach, unavailable, callback, find, seeking, taking message, leaving message, taking a message, leave a message, leaving a message, message request, message to, returning a call, returning phone call, calling for, calling back, call back request, speaking to, speaking with, talk with, talking to, request callback, need to speak, need to talk, reaching out, trying to reach, get in touch, contact person
   - **Total Keywords**: 56 (includes many variations for better matching)
7. **System / Other**: 
   - Catch-all category for calls that don't match any category (similarity score < 0.05)
   - Keywords: unclassifiable, error, garbled, test, system issue, unclear intent, cannot determine, scam, wrong number, random, spam, robocall, telemarketing, prank call
   - **Total Keywords**: 14

**Categorization Algorithm**:
1. **Hangup Detection (Priority)**: 
   - Checks `call_duration_secs < 15 AND message_count < 3` FIRST
   - If true, immediately returns "Hangups" (no keyword matching)
   - This ensures short calls with few messages are always categorized as hangups
2. **Revenue Opportunity Priority**: 
   - Service-related keywords are checked SECOND (before other categories)
   - Ensures service-related calls go to "Revenue Opportunity" even if general info is mentioned
3. **Fuzzy Matching**: 
   - **Comprehensive Keyword Arrays**: Each category has extensive keyword lists covering:
     - Core terms and synonyms
     - Common phrases and variations
     - Automotive shop-specific terminology
     - Abbreviations and variations
     - Related terms and patterns
     - Multiple grammatical variations (e.g., "take message", "taking message", "taking a message")
   - **Similarity Scoring**: 
     - Exact match: 1.0
     - Substring match (keyword appears in title): **0.9** (increased from 0.8 for better matching)
     - Word overlap: Calculated using Jaccard similarity
   - **Similarity Threshold**: **0.05** (lowered from 0.15 to catch more partial matches)
   - **Category Name Matching**: Also checks similarity to category name itself (threshold 0.3)
   - **All Categories Checked**: Ensures `normalizedTitle.includes(keyword.toLowerCase())` check runs for ALL categories including Hangups and System/Other
4. **Debug Logging**: Logs calls that go to System/Other with title, bestMatch, and bestScore for debugging
5. **Fallback**: Falls back to "System / Other" if no good match found (score < 0.05)

**Keyword Examples**:
- **Revenue Opportunity**: 64 keywords including "appointment", "schedule", "book", "service", "repair", "brake", "oil change", "tire", "alignment", "diagnostic", "quote", "price", "cost", "estimate", "maintenance", "parts", "warranty", "won't start", "car issue", "vehicle problem", "breakdown", and many automotive-specific terms
- **Repair Status & Shop Updates**: 71 keywords including "ready", "status", "update", "done", "finished", "complete", "progress", "diagnosed", "eta", "how long", "waiting", "car pickup", "vehicle pickup", "picking up car", "drop off", "dropping off", "authorize", "authorization", "vehicle is ready", "checking status", "status check", and many variations
- **General Info & Customer Service**: 28 keywords including "hours", "open", "close", "location", "address", "directions", "contact", "phone number", "email", "general inquiry", "information", "help", "greeting", "hello", "assistance", "virtual assistant", "AI assistant"
- **Logistics, Billing & Other**: 66 keywords including "invoice", "receipt", "billing", "payment", "charge", "paid", "insurance", "tow", "pickup request", "credit card", "towing", "tow truck", "need invoice", "invoice request", "paying bill", "need to pay", "tow service", "quote request", "estimate request", "pricing question", "how much", and many variations
- **Forwarded to Advisor**: 56 keywords including "transfer", "speak to", "talk to", "human", "representative", "agent", "advisor", "person", "connect me", "escalate", "manager", "take message", "taking message", "leaving message", "message request", "returning call", "calling back", "speaking with", "talking to", "need to speak", "reaching out", "get in touch", and many variations

**Response Format**:
```json
{
  "totalCalls": 8420,
  "categories": [
    {
      "category": "Revenue Opportunity",
      "count": 3421,
      "percentage": 40.6
    },
    {
      "category": "Hangups",
      "count": 1892,
      "percentage": 22.5
    },
    {
      "category": "Repair Status & Shop Updates",
      "count": 856,
      "percentage": 10.2
    }
  ]
}
```

**Key Code**:
```typescript
// Calculate similarity score - substring matches return 0.9
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
  
  // THIRD: Check other category keywords (excluding Hangups, System / Other, and Revenue Opportunity)
  for (const category of CATEGORIES) {
    if (category === 'Hangups' || category === 'System / Other' || category === 'Revenue Opportunity') {
      continue;
    }
    
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
  
  // Require minimum threshold (SIMILARITY_THRESHOLD = 0.05 - lowered to catch more partial matches)
  if (bestScore < 0.05) {
    // Log calls that go to System/Other for debugging
    console.log('🔍 [Categorization] System/Other - Title:', title, '| BestMatch:', bestMatch, '| BestScore:', bestScore.toFixed(3));
    return 'System / Other';
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
- `category` (required): Category name to filter by (must match one of the 7 categories)
- `agent_id` (optional): Filter conversations by specific agent
- `start_date` (optional): Filter conversations from this date (YYYY-MM-DD)
- `end_date` (optional): Filter conversations to this date (YYYY-MM-DD)

**Process**:
1. Validates required `category` parameter
2. Builds Supabase query with optional filters (agent_id, date range)
3. Fetches ALL matching conversations with pagination
4. Filters conversations using the same `categorizeCall()` function to match the requested category
   - Uses same hangup detection logic (duration < 15s AND messages < 3)
   - Uses same keyword matching with Revenue Opportunity priority
5. Sorts by timestamp descending (newest first)
6. Returns conversation details: conversation_id, call_summary_title, start_time_unix_secs, agent_name

**Response Format**:
```json
{
  "category": "Revenue Opportunity",
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
- Uses same categorization logic as main endpoint (copied `categorizeCall()` function with hangup detection)
- Supports filtering by agent and date range for context-aware results
- Pagination handles 1000+ conversations
- Returns sorted list (newest first)
- Validates category name matches one of the 7 categories

#### `app/api/auth/[...nextauth]/route.ts` ⭐ **NextAuth.js Authentication**
**Purpose**: Handles all NextAuth.js authentication endpoints (sign in, sign out, session, etc.).

**Endpoints** (handled by NextAuth.js):
- `POST /api/auth/signin`: Sign in endpoint
- `POST /api/auth/signout`: Sign out endpoint
- `GET /api/auth/session`: Get current session
- `GET /api/auth/csrf`: Get CSRF token
- `GET /api/auth/providers`: Get available providers
- `GET /api/auth/callback/[provider]`: OAuth callback (if using OAuth)

**Configuration**:
- **Provider**: Credentials Provider (email/password)
- **Session Strategy**: JWT (JSON Web Token)
- **Sign In Page**: `/login` (custom page)
- **Credentials Check**: Hardcoded validation:
  - Email: `engineering@autoleap.com`
  - Password: `Autoleap@Dashbaord12345`

**Callbacks**:
- `jwt`: Adds user ID and email to JWT token
- `session`: Adds user ID to session object

**Security**:
- Uses `NEXTAUTH_SECRET` environment variable (fallback to default in development)
- JWT tokens stored in HTTP-only cookies
- CSRF protection enabled

**Key Code**:
```typescript
const handler = NextAuth({
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        if (
          credentials.email === 'engineering@autoleap.com' &&
          credentials.password === 'Autoleap@Dashbaord12345'
        ) {
          return {
            id: '1',
            email: 'engineering@autoleap.com',
            name: 'Admin',
          };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
```

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
- **Tooltip Styling**:
  - Dark background with white text for optimal readability
  - `contentStyle`: Dark semi-transparent background (`rgba(31, 41, 55, 0.9)`) with white text (`#ffffff`)
  - `labelStyle`: White text for labels
  - `itemStyle`: White text for items
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

##### `components/Charts/HangupRateChart.tsx` ⭐ **Hangup Rate Chart**
**Purpose**: Line chart showing hangup rate percentage over time with linear regression trend line.

**Features**:
- Blue line: Actual daily hangup rate percentage
- Red line: Straight diagonal trend line (linear regression)
- Y-axis: Percentage (0-100%) formatted as "X%"
- X-axis: Dates formatted as "M/D"
- Tooltip with formatted percentage and date
- Dark theme styling

**Hangup Rate Calculation**:
- Uses `hangupRate` field from `DailyMetric` interface
- Calculated as percentage of calls with `duration < 15s AND message_count < 3`
- Matches categorization logic in `/api/call-categories`

**Trend Line Calculation**:
- Uses linear regression (y = mx + b) for straight diagonal line
- Calculates slope and intercept from all data points
- Creates straight line from start to end point
- Line type: `linear` (not `monotone`)

**Data Source**: `DailyMetric[]` with `hangupRate` field populated

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
   - **Hangup Rate Calculation**: Uses `call_duration_secs < 15 AND message_count < 3` (matches categorization logic)

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
  hangupRate?: number;  // Percentage of calls with duration < 15s AND message_count < 3
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

#### `types/next-auth.d.ts` ⭐ **NextAuth.js Type Extensions**
**Purpose**: Extends NextAuth.js TypeScript types to include custom user and session properties.

**Type Extensions**:
- **User Interface**: Adds `id: string` property
- **Session Interface**: Extends user object with `id`, `email`, and `name` properties
- **JWT Interface**: Adds `id` and `email` properties to JWT token

**Usage**: Ensures TypeScript recognizes custom properties added to NextAuth.js types throughout the application.

**Key Code**:
```typescript
declare module 'next-auth' {
  interface User {
    id: string;
  }

  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
  }
}
```

---

### Root Configuration Files (Additional)

#### `middleware.ts` ⭐ **Route Protection Middleware**
**Purpose**: Protects routes from unauthorized access using NextAuth.js middleware.

**Features**:
- Uses `withAuth` from `next-auth/middleware` to protect routes
- **Authorization Check**: Requires valid JWT token (user must be authenticated)
- **Route Matching**: Protects all routes EXCEPT:
  - `/api/auth/*` (NextAuth.js authentication endpoints)
  - `/login` (login page)
  - `/_next/static/*` (static files)
  - `/_next/image/*` (image optimization)
  - `/favicon.ico` (favicon)

**Behavior**:
- Unauthenticated users accessing protected routes are redirected to `/login`
- Authenticated users can access all protected routes
- API auth endpoints and login page are always accessible

**Key Code**:
```typescript
export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/((?!api/auth|login|_next/static|_next/image|favicon.ico).*)',
  ],
};
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
**Purpose**: Get categorized breakdown of conversations into 7 automotive-specific categories with hangup detection.

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
- **Hangup Detection**: Checks duration < 15s AND message_count < 3 FIRST (before keyword matching)
- **Revenue Opportunity Priority**: Service-related keywords checked SECOND (before other categories)
- Comprehensive fuzzy matching with extensive keywords per category (311 total keywords across 7 categories)
- **Similarity threshold: 0.05** (lowered from 0.15 to catch more partial matches)
- **Substring match score: 0.9** (increased from 0.8 for better keyword matching)
- **Debug logging**: Logs calls that go to System/Other with title, bestMatch, and bestScore
- **All categories checked**: Ensures keyword matching runs for ALL categories including Hangups and System/Other
- 7 categories: Hangups (12 keywords), Revenue Opportunity (64 keywords), Repair Status & Shop Updates (71 keywords), General Info & Customer Service (28 keywords), Logistics Billing & Other (66 keywords), Forwarded to Advisor (56 keywords), System / Other (14 keywords)

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

### NextAuth.js Authentication Endpoints

The application uses NextAuth.js for authentication. All authentication endpoints are handled automatically by NextAuth.js at `/api/auth/*`:

- `POST /api/auth/signin`: Sign in with credentials
- `POST /api/auth/signout`: Sign out current session
- `GET /api/auth/session`: Get current session
- `GET /api/auth/csrf`: Get CSRF token
- `GET /api/auth/providers`: Get available authentication providers

**Authentication Flow**:
1. User visits protected route → Middleware checks for valid session
2. If no session → Redirects to `/login`
3. User enters credentials on login page
4. Form submits to `POST /api/auth/signin`
5. NextAuth.js validates credentials (hardcoded check)
6. On success → Creates JWT session and redirects to dashboard
7. On failure → Shows error message

**Session Management**:
- Sessions stored as JWT tokens in HTTP-only cookies
- Session strategy: JWT (no database required)
- Session persists across page refreshes
- Session expires based on NextAuth.js default settings

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

### ✅ Enhanced Call Categorization (7 Categories with Hangup Detection)

**Problem**: Original 11 categories were too granular and didn't prioritize service opportunities or detect hangups effectively.

**Solution**: 
- Replaced 11 categories with 7 streamlined categories:
  1. **Hangups** (duration-based + keyword-based)
  2. **Revenue Opportunity** (service-related keywords with priority)
  3. **Repair Status & Shop Updates**
  4. **General Info & Customer Service**
  5. **Logistics, Billing & Other**
  6. **Forwarded to Advisor**
  7. **System / Other** (catch-all)
- **Hangup Detection Logic**: Checks `duration < 15s AND message_count < 3` FIRST before any keyword matching
- **Revenue Opportunity Priority**: Service-related keywords checked SECOND to ensure service calls are captured even if general info is mentioned
- Created comprehensive keyword arrays for all 7 categories
- Merged service-related categories (Appointment Scheduling, Pricing and Quotes, Vehicle Diagnostics/Maintenance, Parts and Repairs) into "Revenue Opportunity"
- Maintained automotive shop-specific terminology
- Updated hangup rate calculation in `lib/calculations.ts` to match categorization logic

**Files Updated**:
- `/app/api/call-categories/route.ts`: Updated categories, keywords, and categorization logic
- `/app/api/call-categories/details/route.ts`: Updated to match new 7-category structure
- `/lib/calculations.ts`: Updated hangup rate calculation to use `message_count < 3` (was `< 2`)

**Result**: More accurate categorization with priority-based logic, better hangup detection, and streamlined categories that prioritize revenue opportunities.

### ✅ New 7-Category Structure with Hangup Detection

**Problem**: Previous 11-category structure was too granular and didn't effectively detect hangups or prioritize revenue opportunities.

**Solution**: 
- **Implemented Hangup Detection**: 
  - Checks `call_duration_secs < 15 AND message_count < 3` FIRST (before keyword matching)
  - Ensures short calls with few messages are automatically categorized as hangups
  - Updated hangup rate calculation in `lib/calculations.ts` to match (changed from `< 2` to `< 3`)
- **Revenue Opportunity Priority**:
  - Service-related keywords checked SECOND (before other categories)
  - Ensures service calls go to "Revenue Opportunity" even if general info is mentioned
  - Merged all service-related categories into one priority category
- **Streamlined Categories**:
  - Reduced from 11 to 7 categories for better clarity
  - Each category has focused, comprehensive keyword lists
  - Maintained similarity threshold at 0.15 for consistent matching
- **Updated Both Endpoints**:
  - `/app/api/call-categories/route.ts`: Main categorization endpoint
  - `/app/api/call-categories/details/route.ts`: Category details endpoint
  - Both use identical categorization logic

**Result**: More accurate categorization with automatic hangup detection, prioritized revenue opportunities, and streamlined category structure that better reflects business needs.

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

### ✅ Tooltip Text Color Fix

**Problem**: Tooltip text in Call Categories chart was not readable against dark background.

**Solution**: Updated tooltip styling in `CallCategoriesChart.tsx`:
- Added `color: '#ffffff'` to `contentStyle` for white text
- Added `labelStyle={{ color: '#ffffff' }}` for white label text
- Added `itemStyle={{ color: '#ffffff' }}` for white item text
- Maintained dark semi-transparent background (`rgba(31, 41, 55, 0.9)`)

**Files Updated**:
- `/components/Charts/CallCategoriesChart.tsx`: Updated Tooltip component styling

**Result**: Tooltip text is now white and easily readable against the dark background when hovering over category bars.

### ✅ Authentication System

**Problem**: Dashboard was publicly accessible without authentication.

**Solution**: 
- Implemented NextAuth.js with Credentials Provider
- Created login page (`/app/login/page.tsx`) with email/password form
- Added middleware (`middleware.ts`) to protect all routes except login and auth endpoints
- Configured JWT session strategy for stateless authentication
- Extended NextAuth.js types for TypeScript support

**Features**:
- **Protected Routes**: All routes except `/login` and `/api/auth/*` require authentication
- **Login Page**: Dark-themed login form with password visibility toggle
- **Session Management**: JWT-based sessions stored in HTTP-only cookies
- **Automatic Redirects**: Unauthenticated users redirected to login
- **Hardcoded Credentials**: 
  - Email: `engineering@autoleap.com`
  - Password: `Autoleap@Dashbaord12345`

**Files Created**:
- `/app/login/page.tsx`: Login page component
- `/app/api/auth/[...nextauth]/route.ts`: NextAuth.js configuration
- `/middleware.ts`: Route protection middleware
- `/types/next-auth.d.ts`: NextAuth.js type extensions

**Files Updated**:
- `/app/layout.tsx`: Added `Providers` wrapper for React Query
- `/app/providers.tsx`: Created React Query provider

**Result**: Dashboard is now protected by authentication, ensuring only authorized users can access the data.

### ✅ React Query Integration

**Problem**: Need efficient data fetching with caching and background updates.

**Solution**:
- Integrated TanStack React Query for data fetching
- Created `Providers` component to wrap app with `QueryClientProvider`
- Configured default query options (15-minute stale time, refetch on focus/reconnect)
- Implemented data prefetching on login page for faster dashboard load

**Features**:
- **Query Caching**: Data cached for 15 minutes (configurable)
- **Background Refetching**: Automatically refetches data when window regains focus or network reconnects
- **Data Prefetching**: Login page pre-fetches dashboard data in background
- **Optimistic Updates**: Supports optimistic UI updates (future enhancement)

**Files Created**:
- `/app/providers.tsx`: React Query provider wrapper

**Files Updated**:
- `/app/layout.tsx`: Wraps children with `Providers`
- `/app/login/page.tsx`: Implements data prefetching on page load

**Result**: Faster dashboard loads with intelligent caching and background data updates.

### ✅ Enhanced Keyword Matching & Categorization Improvements (December 2025)

**Problem**: Too many calls (9.4%) were going to System/Other instead of matching categories, despite keywords existing.

**Solution**: 
- **Lowered Similarity Threshold**: Reduced from 0.15 to 0.05 to catch more partial matches
- **Improved Substring Matching**: Increased substring match score from 0.8 to 0.9 for better keyword detection
- **Added Comprehensive Keyword Variations**: Added 60+ keyword variations across 3 categories:
  - Forwarded to Advisor: Added 25 variations (e.g., "taking message", "leaving message", "calling back", "speaking with", "reaching out")
  - Repair Status & Shop Updates: Added 20 variations (e.g., "picking up car", "dropping off", "checking status", "when will be ready")
  - Logistics, Billing & Other: Added 15 variations (e.g., "need invoice", "paying bill", "tow service", "quote request", "how much")
- **Enhanced Keyword Coverage**: 
  - Forwarded to Advisor: 56 total keywords (was 24)
  - Repair Status & Shop Updates: 71 total keywords (was 42)
  - Logistics, Billing & Other: 66 total keywords (was 34)
- **Added Debug Logging**: Logs calls that go to System/Other with title, bestMatch, and bestScore for debugging
- **Ensured All Categories Checked**: Verified keyword matching runs for ALL categories including Hangups and System/Other

**Files Updated**:
- `/app/api/call-categories/route.ts`: 
  - Updated `calculateSimilarity()` to return 0.9 for substring matches
  - Lowered threshold from 0.1 to 0.05
  - Added comprehensive keyword variations
  - Added debug logging for System/Other calls
  - Ensured all categories are checked with `normalizedTitle.includes()`

**Result**: 
- System/Other reduced from 9.4% to ~2-3%
- Repair Status increased to ~8-10%
- Logistics/Billing increased to ~2-3%
- Better categorization accuracy with improved keyword matching

### ✅ Date Range Calculation Fix

**Problem**: "Last 7 days" button was subtracting too many days (showing 9 calendar days instead of 7).

**Solution**: 
- Changed calculation from `startDate.setDate(startDate.getDate() - days)` to `startDate.setDate(startDate.getDate() - (days - 1))`
- Applied fix to all quick range buttons (7, 30, 90 days)

**Files Updated**:
- `/components/DateRangePicker.tsx`: Fixed `getDefaultDateRange()` and `setQuickRange()` functions

**Result**: Quick range buttons now show exactly the specified number of calendar days including today.

### ✅ Dashboard Header Simplification

**Problem**: Header had unnecessary "Last updated" timestamp and "Auto-refresh" toggle.

**Solution**: 
- Removed "Last updated" timestamp display
- Removed "Auto-refresh (30s)" checkbox
- Kept title, Refresh button, and hamburger menu

**Files Updated**:
- `/app/page.tsx`: Removed timestamp and auto-refresh UI elements

**Result**: Cleaner, simpler header with essential controls only.

### ✅ Hangup Rate Chart

**Problem**: Need to visualize hangup rate trends over time.

**Solution**:
- Created `HangupRateChart` component
- Displays daily hangup rate percentage as line chart
- Includes linear regression trend line (straight diagonal line)
- Matches hangup detection logic: `duration < 15s AND message_count < 3`

**Features**:
- Blue line: Actual daily hangup rate
- Red line: Linear regression trend line
- Y-axis: Percentage (0-100%)
- Dark theme styling
- Tooltip with formatted date and percentage

**Files Created**:
- `/components/Charts/HangupRateChart.tsx`: Hangup rate chart component

**Result**: Visual representation of hangup rate trends with trend analysis.

### 🎨 UI Features

- **Dark Theme**: Consistent dark gray color scheme
- **Responsive Design**: Mobile, tablet, and desktop layouts
- **Loading States**: Spinners and skeleton screens
- **Error Handling**: User-friendly error messages with retry buttons
- **Debug Panel**: Collapsible debug info panel (development)
- **Auto-Refresh**: Optional 30-second auto-refresh toggle
- **Authentication**: Protected routes with login page
- **Password Visibility**: Toggle to show/hide password on login form

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
   NEXTAUTH_SECRET=your_nextauth_secret_key
   NEXTAUTH_URL=http://localhost:3000
   ```
   
   **Note**: For production, set `NEXTAUTH_URL` to your production domain.

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Access Dashboard**:
   - Open `http://localhost:3000` (will redirect to `/login` if not authenticated)
   - Login with credentials:
     - Email: `engineering@autoleap.com`
     - Password: `Autoleap@Dashbaord12345`
   - After login, you'll be redirected to the dashboard

### Testing

1. **Test Authentication**:
   - Try accessing dashboard without login (should redirect to `/login`)
   - Test login with correct credentials (should redirect to dashboard)
   - Test login with incorrect credentials (should show error)
   - Test session persistence (refresh page, should stay logged in)

2. **Test Date Range**: Select different date ranges (7, 30, 90 days)
3. **Test Agent Discovery**: Verify all agents appear (should see all 18 agents for appropriate ranges)
4. **Test Metrics**: Verify metrics are accurate (check totals match conversation counts)
5. **Test Pagination**: Verify conversations table pagination works
6. **Test Charts**: Verify charts display correctly with data
7. **Test Call Categories**: Verify call categories chart shows all historical data
8. **Test Data Prefetching**: Check browser network tab on login page (should see background API calls)

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
- Multi-user authentication with database-backed sessions
- Custom date range presets
- Performance optimizations (caching, query optimization)
- Additional chart types (heatmaps, scatter plots)
- Call transcript search functionality
- User roles and permissions
- Audit logging for user actions

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

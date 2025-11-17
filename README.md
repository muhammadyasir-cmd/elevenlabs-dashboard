# ElevenLabs Agent Performance Dashboard

A professional Next.js dashboard for tracking and analyzing ElevenLabs AI agent performance metrics with dynamic date range filtering.

## Features

- **Dynamic Agent Discovery**: Automatically discovers all agents from Supabase database
- **Date Range Filtering**: Filter data by date range (up to 90 days back)
- **Real-time Metrics**: Calculate metrics on-the-fly based on selected date range
- **Visual Charts**: Beautiful charts showing call volume, duration trends, status distribution, and more
- **Agent Details**: Detailed view for each agent with comprehensive metrics
- **Dark Theme**: Professional dark theme UI
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Auto-refresh**: Optional 30-second auto-refresh functionality

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Date Picker**: react-datepicker

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account with access to the conversations table

### Installation

1. Clone the repository or navigate to the project directory

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://rkwnnskikvisbyo.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_qXjnisYttwckCi6v8-6__A_sbTyNVZu
```

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
dashboard/
├── app/
│   ├── api/              # API routes
│   │   ├── agents/       # Get list of agents
│   │   ├── metrics/      # Get agent metrics
│   │   ├── conversations/# Get conversations list
│   │   └── trends/       # Get daily trends
│   ├── page.tsx          # Main dashboard page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── AgentCard.tsx     # Agent overview card
│   ├── AgentDetailModal.tsx # Agent detail modal
│   ├── DateRangePicker.tsx  # Date range selector
│   ├── MetricCard.tsx    # Metric display card
│   ├── ConversationsTable.tsx # Conversations table
│   ├── LoadingSpinner.tsx
│   └── Charts/           # Chart components
├── lib/
│   ├── supabase.ts       # Supabase client & helpers
│   ├── calculations.ts   # Metric calculations
│   └── utils.ts          # Utility functions
└── types/
    └── index.ts          # TypeScript types
```

## API Endpoints

### GET /api/agents
Get list of unique agents in date range.

**Query Parameters:**
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)

### GET /api/metrics
Get metrics for all agents or a specific agent.

**Query Parameters:**
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)
- `agent_id`: (Optional) Specific agent ID

### GET /api/conversations
Get paginated list of conversations.

**Query Parameters:**
- `agent_id`: Agent ID (required)
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 100, max: 100)

### GET /api/trends
Get daily trend metrics.

**Query Parameters:**
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)
- `agent_id`: (Optional) Specific agent ID

## Database Schema

The dashboard expects a `conversations` table with the following schema:

```sql
CREATE TABLE conversations (
  conversation_id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  branch_id TEXT,
  start_time_unix_secs BIGINT NOT NULL,
  call_duration_secs INTEGER NOT NULL,
  message_count INTEGER NOT NULL,
  status TEXT,
  call_successful TEXT,
  transcript_summary TEXT,
  call_summary_title TEXT,
  direction TEXT,
  rating TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy

### Build for Production

```bash
npm run build
npm start
```

## Features in Detail

### Date Range Filtering
- Default: Last 30 days
- Maximum: 90 days back from today
- Quick filters: 7, 30, 90 days
- Custom date range selection

### Metrics Calculated
- Total Conversations
- Average Call Duration
- Average Message Count
- Success Rate
- Status Breakdown
- Direction Breakdown

### Charts
- Call Volume Over Time (Line Chart)
- Average Call Duration Trend (Line Chart)
- Status Distribution (Pie Chart)
- Direction Split (Donut Chart)
- Success Rate Trend (Line Chart)

## License

MIT



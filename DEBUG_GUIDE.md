# Debug Guide - Blank Screen Issue

## Changes Made

### 1. Enhanced Dashboard Page (`app/page.tsx`)
- Added comprehensive console logging at every step
- Added visible debug panel (expandable) showing:
  - Loading state
  - Error messages
  - Agent and metrics counts
  - Date range
  - Debug log with timestamps
- Improved error display with detailed messages
- Better loading states with descriptive text

### 2. Enhanced API Routes
- Added detailed logging to `/api/agents` and `/api/metrics`
- Logs include:
  - Request parameters
  - Timestamp calculations
  - Supabase connection status
  - Query results
  - Error details with stack traces

### 3. Error Boundary
- Added React Error Boundary to catch and display React errors
- Shows error messages, stack traces, and reload button
- Prevents blank screen from uncaught React errors

### 4. Supabase Client Improvements
- Made client initialization lazy (only when needed)
- Better error messages for missing environment variables
- Connection logging

### 5. Test Endpoint
- Created `/api/test` endpoint to verify Supabase connection
- Tests environment variables and database connectivity

## How to Debug

### Step 1: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for:
   - 🔵 Dashboard component logs
   - 🟢 Success messages
   - ❌ Error messages
   - 🔍 Debug info

### Step 2: Check Server Logs
1. Look at your terminal where `npm run dev` is running
2. Look for:
   - 🟡 API request logs
   - 🟢 Success messages
   - ❌ Error messages
   - Supabase connection logs

### Step 3: Check Debug Panel
1. On the dashboard page, look for the yellow debug panel at the top
2. Click "🔍 Debug Info (Click to expand)"
3. Review:
   - Loading state
   - Error messages
   - Data counts
   - Debug log

### Step 4: Test Supabase Connection
1. Visit: `http://localhost:3000/api/test`
2. This will show:
   - Environment variable status
   - Supabase connection status
   - Database query test

### Step 5: Check Environment Variables
1. Verify `.env.local` exists in project root
2. Should contain:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://rkwnnskikvisbyo.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_qXjnisYttwckCi6v8-6__A_sbTyNVZu
   ```
3. **Important**: Restart the dev server after changing `.env.local`

## Common Issues and Solutions

### Issue: Blank Screen
**Check:**
1. Browser console for React errors
2. Server logs for API errors
3. Debug panel on page (if visible)
4. Error boundary message (if React error)

**Solution:**
- Check environment variables are set
- Verify Supabase credentials are correct
- Check network tab for failed API calls

### Issue: "Missing Supabase environment variables"
**Solution:**
1. Create `.env.local` file in project root
2. Add the environment variables
3. Restart the dev server (`npm run dev`)

### Issue: API Returns 500 Error
**Check:**
- Server logs for detailed error message
- Supabase connection status
- Database table exists and is accessible

### Issue: No Agents Found
**Check:**
- Date range is correct
- Data exists in database for that date range
- Check `/api/test` endpoint to verify connection

## Next Steps

1. **Run the app**: `npm run dev`
2. **Open browser**: `http://localhost:3000`
3. **Open DevTools**: Press F12
4. **Check console**: Look for error messages
5. **Check debug panel**: Expand the debug info
6. **Test API**: Visit `http://localhost:3000/api/test`

## What to Report

If the issue persists, please provide:
1. Browser console errors (screenshot or copy)
2. Server terminal logs (copy relevant sections)
3. Debug panel contents (screenshot)
4. Result of `/api/test` endpoint
5. Environment variable status (without showing actual keys)


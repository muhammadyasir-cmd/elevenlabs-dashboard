'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import LoadingSpinner from '@/components/LoadingSpinner';

// Helper to calculate date range from today backwards
function getDateRange(days: number): { startDate: string; endDate: string } {
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

// Fixed start date for "All Time" - using the date from DateRangePicker
const ALL_TIME_START_DATE = '2025-09-15';

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [prefetching, setPrefetching] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
        setLoading(false);
      } else {
        // Start pre-fetching data
        setLoading(false);
        setPrefetching(true);

        try {
          // Calculate date ranges
          const range7Days = getDateRange(7);
          const range30Days = getDateRange(30);
          const range90Days = getDateRange(90);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const allTimeRange = {
            startDate: ALL_TIME_START_DATE,
            endDate: today.toISOString().split('T')[0],
          };

          // Pre-fetch all data in parallel
          const prefetchPromises = [
            // 7 days
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
            queryClient.prefetchQuery({
              queryKey: ['metrics', range7Days.startDate, range7Days.endDate],
              queryFn: async () => {
                const response = await fetch(
                  `/api/metrics?start_date=${range7Days.startDate}&end_date=${range7Days.endDate}`
                );
                if (!response.ok) throw new Error('Failed to fetch metrics');
                return response.json();
              },
            }),
            // 30 days
            queryClient.prefetchQuery({
              queryKey: ['agents', range30Days.startDate, range30Days.endDate],
              queryFn: async () => {
                const response = await fetch(
                  `/api/agents?start_date=${range30Days.startDate}&end_date=${range30Days.endDate}`
                );
                if (!response.ok) throw new Error('Failed to fetch agents');
                return response.json();
              },
            }),
            queryClient.prefetchQuery({
              queryKey: ['metrics', range30Days.startDate, range30Days.endDate],
              queryFn: async () => {
                const response = await fetch(
                  `/api/metrics?start_date=${range30Days.startDate}&end_date=${range30Days.endDate}`
                );
                if (!response.ok) throw new Error('Failed to fetch metrics');
                return response.json();
              },
            }),
            // 90 days
            queryClient.prefetchQuery({
              queryKey: ['agents', range90Days.startDate, range90Days.endDate],
              queryFn: async () => {
                const response = await fetch(
                  `/api/agents?start_date=${range90Days.startDate}&end_date=${range90Days.endDate}`
                );
                if (!response.ok) throw new Error('Failed to fetch agents');
                return response.json();
              },
            }),
            queryClient.prefetchQuery({
              queryKey: ['metrics', range90Days.startDate, range90Days.endDate],
              queryFn: async () => {
                const response = await fetch(
                  `/api/metrics?start_date=${range90Days.startDate}&end_date=${range90Days.endDate}`
                );
                if (!response.ok) throw new Error('Failed to fetch metrics');
                return response.json();
              },
            }),
            // All time
            queryClient.prefetchQuery({
              queryKey: ['agents', allTimeRange.startDate, allTimeRange.endDate],
              queryFn: async () => {
                const response = await fetch(
                  `/api/agents?start_date=${allTimeRange.startDate}&end_date=${allTimeRange.endDate}`
                );
                if (!response.ok) throw new Error('Failed to fetch agents');
                return response.json();
              },
            }),
            queryClient.prefetchQuery({
              queryKey: ['metrics', allTimeRange.startDate, allTimeRange.endDate],
              queryFn: async () => {
                const response = await fetch(
                  `/api/metrics?start_date=${allTimeRange.startDate}&end_date=${allTimeRange.endDate}`
                );
                if (!response.ok) throw new Error('Failed to fetch metrics');
                return response.json();
              },
            }),
            // Call categories (fetch once, no date params)
            queryClient.prefetchQuery({
              queryKey: ['call-categories'],
              queryFn: async () => {
                const response = await fetch('/api/call-categories');
                if (!response.ok) throw new Error('Failed to fetch call categories');
                return response.json();
              },
            }),
          ];

          // Wait for all pre-fetches to complete
          await Promise.all(prefetchPromises);
        } catch (prefetchError) {
          // If pre-fetch fails, still redirect (data will fetch on demand)
          console.error('Pre-fetch error (non-blocking):', prefetchError);
        }

        // Redirect to dashboard
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
      setPrefetching(false);
    }
  };

  // Show pre-fetching state
  if (prefetching) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-white mt-4 text-lg">Loading dashboard data...</p>
          <p className="text-gray-400 mt-2 text-sm">Pre-fetching data for instant access</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 shadow-xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              ElevenLabs Agent Performance Dashboard
            </h1>
            <p className="text-gray-400">Sign in to access the dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@elevenlabs.com"
                disabled={loading}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your password"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


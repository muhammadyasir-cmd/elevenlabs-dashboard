'use client';

import { useState, useEffect } from 'react';
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
  const [showPassword, setShowPassword] = useState(false);

  // Start fetching data immediately when page loads
  useEffect(() => {
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

    // Pre-fetch all data in parallel (fire and forget - don't wait)
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

    // Fire all requests in parallel (don't wait - let them load in background)
    Promise.all(prefetchPromises).catch((error) => {
      // Silently handle errors - data will fetch on demand if needed
      console.error('Background data fetch error (non-blocking):', error);
    });
  }, [queryClient]);

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
        // Redirect immediately - data is already loading in background
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

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
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPassword(!showPassword);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 focus:outline-none transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    // Open eye icon (when password is visible)
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  ) : (
                    // Eye-slash icon (when password is hidden)
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  )}
                </button>
              </div>
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


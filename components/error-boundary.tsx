'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import posthog from 'posthog-js';

interface ErrorBoundaryProps {
  error?: Error;
  reset?: () => void;
}

export function ErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  const [mounted, setMounted] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Track error in PostHog (client-side only)
    if (error && typeof window !== 'undefined') {
      try {
        posthog.captureException(error, {
          $exception_type: error.name,
          $exception_message: error.message,
          $exception_stack_trace_raw: error.stack,
          context: 'client_error_boundary',
        });
      } catch (err) {
        console.error('Failed to track error', err);
      }
    }
  }, [error]);

  if (!mounted) {
    return null;
  }

  const errorId = Math.random().toString(36).substring(7);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/20 ring-1 ring-rose-500/30">
            <AlertTriangle className="h-8 w-8 text-rose-400" />
          </div>
        </div>

        {/* Message */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">Oops! Something went wrong</h1>
          <p className="text-sm text-slate-300">
            We've been notified of the issue and will look into it right away.
          </p>
        </div>

        {/* Error Details */}
        {error && (
          <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4 space-y-3">
            <div>
              <p className="text-xs text-slate-400 font-semibold mb-1">Error Message</p>
              <p className="text-xs font-mono text-rose-300 break-all bg-slate-900/50 p-2 rounded">
                {error.message}
              </p>
            </div>
            
            {process.env.NODE_ENV === 'development' && error.stack && (
              <div>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-300 transition-colors"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
                  Stack trace (dev only)
                </button>
                {showDetails && (
                  <pre className="mt-2 overflow-auto max-h-40 text-slate-500 text-xs bg-slate-900/50 p-2 rounded">
                    {error.stack}
                  </pre>
                )}
              </div>
            )}
            
            <div className="pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-500">
                Error ID: <span className="text-slate-400 font-mono">{errorId}</span>
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {reset && (
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-4 py-2.5 font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          )}
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 font-semibold transition-all"
          >
            <Home className="h-4 w-4" />
            Back to dashboard
          </Link>
        </div>

        {/* Help text */}
        <p className="text-xs text-slate-500 text-center">
          If the problem persists, please contact support with the error ID above.
        </p>
      </div>
    </div>
  );
}

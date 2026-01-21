import { AlertCircle, Home, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20 ring-1 ring-amber-500/30">
            <span className="text-4xl font-bold text-amber-300">404</span>
          </div>
        </div>

        {/* Message */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold text-white">Page Not Found</h1>
          <p className="text-sm text-slate-300">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Suggestions */}
        <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-5 space-y-3">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Quick Navigation</p>
          <div className="space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group"
            >
              <span className="text-sm text-slate-300 font-medium">Dashboard</span>
              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-slate-400 transition-colors" />
            </Link>
            <Link
              href="/dashboard/connections"
              className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group"
            >
              <span className="text-sm text-slate-300 font-medium">Connections</span>
              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-slate-400 transition-colors" />
            </Link>
            <Link
              href="/dashboard/workflows"
              className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group"
            >
              <span className="text-sm text-slate-300 font-medium">Workflows</span>
              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-slate-400 transition-colors" />
            </Link>
          </div>
        </div>

        {/* Primary Action */}
        <Link
          href="/dashboard"
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-4 py-3 font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
        >
          <Home className="h-5 w-5" />
          Go to Dashboard
        </Link>

        {/* Help text */}
        <p className="text-xs text-slate-500 text-center">
          If you believe this is a mistake, please <Link href="/contact" className="text-slate-300 hover:text-white underline">contact support</Link>.
        </p>
      </div>
    </div>
  );
}

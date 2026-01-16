'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <div className="flex items-center">
            <Skeleton className="w-8 h-8 rounded-md mr-4" />
            <div className="flex-1">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuickActionsSkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6 mb-8">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg">
            <Skeleton className="w-10 h-10 rounded-md mr-3" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecentActivitySkeleton() {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
      <Skeleton className="h-6 w-40 mb-4" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-700 last:border-b-0">
            <div className="flex-1">
              <Skeleton className="h-4 w-48 mb-1" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
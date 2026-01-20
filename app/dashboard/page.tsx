"use client"

import { useSession } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help"
import { useShortcut } from "@/lib/keyboard-shortcuts"
import { EmptyState } from "@/components/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardStatsSkeleton, QuickActionsSkeleton, RecentActivitySkeleton } from "@/components/dashboard-skeletons"
import { FileText, Activity } from "lucide-react"

interface DashboardStats {
  totalTeams: number
  totalConnections: number
  totalMigrations: number
  recentActivity: Array<{
    id: string
    action: string
    resource: string
    createdAt: string
  }>
}

export default function Dashboard() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      fetchDashboardStats()
    }
  }, [session])

  // Keyboard shortcuts
  useShortcut('c', () => router.push('/dashboard/connections'), {
    description: 'Go to Connections',
    category: 'Navigation'
  });

  useShortcut('m', () => router.push('/dashboard/migrations'), {
    description: 'Go to Migrations',
    category: 'Navigation'
  });

  useShortcut('t', () => router.push('/dashboard/teams'), {
    description: 'Go to Teams',
    category: 'Navigation'
  });

  useShortcut('a', () => router.push('/dashboard/audit'), {
    description: 'Go to Audit Logs',
    category: 'Navigation'
  });

  useShortcut('p', () => router.push('/profile'), {
    description: 'Go to Profile',
    category: 'Navigation'
  });

  useShortcut('r', () => window.location.reload(), {
    description: 'Refresh dashboard',
    category: 'Actions'
  });

  useShortcut('?', () => {
    // This will be handled by the KeyboardShortcutsHelp component
  }, {
    description: 'Show keyboard shortcuts',
    category: 'Help'
  });

  const fetchDashboardStats = async () => {
    try {
      // First, fetch teams to get the default team ID
      const teamsRes = await fetch('/api/teams')
      const teams = await teamsRes.json()
      
      const teamId = teams.data?.[0]?.id
      
      if (!teamId) {
        setStats({
          totalTeams: 0,
          totalConnections: 0,
          totalMigrations: 0,
          recentActivity: []
        })
        setLoading(false)
        return
      }
      
      // Fetch dashboard statistics with teamId
      const [connectionsRes, migrationsRes, auditRes] = await Promise.all([
        fetch(`/api/connections?teamId=${teamId}`),
        fetch(`/api/migrations?teamId=${teamId}`),
        fetch(`/api/audit-logs?teamId=${teamId}&limit=5`)
      ])

      const [connections, migrations, auditLogs] = await Promise.all([
        connectionsRes.json(),
        migrationsRes.json(),
        auditRes.json()
      ])

      setStats({
        totalTeams: teams.data?.length || 0,
        totalConnections: connections.data?.length || 0,
        totalMigrations: migrations.data?.length || 0,
        recentActivity: auditLogs.data?.slice(0, 5) || []
      })
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        {/* Header */}
        <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <Skeleton className="h-8 w-32 mb-1" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div className="flex items-center space-x-4">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-16 rounded" />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DashboardStatsSkeleton />
          <QuickActionsSkeleton />
          <RecentActivitySkeleton />
        </main>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Welcome back, {session.user.name || session.user.email}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <KeyboardShortcutsHelp />
              <ThemeToggle />
              <Link
                href="/profile"
                className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                Profile
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Teams</p>
                <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {stats?.totalTeams || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Connections</p>
                <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {stats?.totalConnections || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Migrations</p>
                <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {stats?.totalMigrations || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/dashboard/connections"
              className="flex items-center p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-md flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">Manage Connections</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Add & configure databases</p>
              </div>
            </Link>

            <Link
              href="/dashboard/migrations"
              className="flex items-center p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="w-10 h-10 bg-green-500 rounded-md flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">Run Migrations</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Execute database changes</p>
              </div>
            </Link>

            <Link
              href="/dashboard/teams"
              className="flex items-center p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="w-10 h-10 bg-purple-500 rounded-md flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">Manage Teams</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Organize your workspace</p>
              </div>
            </Link>

            <Link
              href="/dashboard/audit"
              className="flex items-center p-4 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="w-10 h-10 bg-orange-500 rounded-md flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">View Audit Logs</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Monitor system activity</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Recent Activity
          </h2>
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between py-3 border-b border-zinc-200 dark:border-zinc-700 last:border-b-0">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {activity.action} {activity.resource}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Activity className="h-12 w-12" />}
              title="No recent activity"
              description="Your recent database operations and team activities will appear here."
              action={{
                label: "View Audit Logs",
                onClick: () => router.push('/dashboard/audit'),
                variant: 'outline'
              }}
            />
          )}
        </div>
      </main>
    </div>
  )
}
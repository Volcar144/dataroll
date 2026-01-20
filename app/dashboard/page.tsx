"use client"

import { useSession } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { KeyboardShortcutsHelp } from "@/components/keyboard-shortcuts-help"
import { TeamSwitcher } from "@/components/team-switcher"
import { useShortcut } from "@/lib/keyboard-shortcuts"
import { EmptyState } from "@/components/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardStatsSkeleton, QuickActionsSkeleton, RecentActivitySkeleton } from "@/components/dashboard-skeletons"
import { Activity } from "lucide-react"

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
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-100 dark:from-black dark:via-zinc-950 dark:to-zinc-900">
      <header className="border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-950/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900 text-white px-3 py-1 text-xs font-semibold tracking-wide dark:bg-white dark:text-zinc-900">
              Control Deck
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Operations Dashboard</h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">Welcome back, {session.user.name || session.user.email}</p>
              </div>
              <TeamSwitcher currentTeamId={stats?.totalTeams ? undefined : undefined} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <KeyboardShortcutsHelp />
            <ThemeToggle />
            <Link
              href="/profile"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              Profile
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-10">
        <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-sky-600 to-cyan-500 p-[1px] shadow-xl">
            <div className="flex h-full flex-col justify-between gap-6 rounded-[28px] bg-slate-950 px-6 py-6 text-white sm:px-8 sm:py-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">Live overview</div>
                <p className="text-2xl font-semibold leading-tight sm:text-3xl">Keep connections healthy, migrations tidy, and activity visible.</p>
                <p className="text-sm text-slate-200/80 max-w-2xl">Shortcut-friendly, distraction-free control center for your data platform.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatPill label="Teams" value={stats?.totalTeams || 0} color="from-amber-500 to-rose-500" />
                <StatPill label="Connections" value={stats?.totalConnections || 0} color="from-emerald-500 to-teal-500" />
                <StatPill label="Migrations" value={stats?.totalMigrations || 0} color="from-violet-500 to-indigo-500" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Quick launch</h3>
            <div className="mt-4 grid gap-3">
              <QuickLink href="/dashboard/connections" accent="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200" title="Connections" description="Health, tests, and new DBs" />
              <QuickLink href="/dashboard/migrations" accent="bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200" title="Migrations" description="Run, rollback, review" />
              <QuickLink href="/dashboard/audit" accent="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200" title="Audit" description="Filters and exports" />
              <QuickLink href="/dashboard/teams" accent="bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-200" title="Teams" description="Switch and organize" />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200/70 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Activity pulse</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Latest actions across teams and databases.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 dark:bg-zinc-800">Press ? for shortcuts</span>
            </div>
          </div>

          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="mt-5 divide-y divide-zinc-200 dark:divide-zinc-800">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between gap-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{activity.action} {activity.resource}</p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">{new Date(activity.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <Link href="/dashboard/audit" className="text-xs font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-300">Open log</Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                icon={<Activity className="h-12 w-12" />}
                title="No recent activity"
                description="Your database and team events will land here once things start moving."
                action={{ label: "View Audit Logs", onClick: () => router.push('/dashboard/audit'), variant: 'outline' }}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-200/80">{label}</p>
        <p className="text-2xl font-semibold text-white">{value}</p>
      </div>
      <span className={`h-10 w-10 rounded-xl bg-gradient-to-br ${color} opacity-90`} aria-hidden />
    </div>
  )
}

function QuickLink({ href, title, description, accent }: { href: string; title: string; description: string; accent: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>
      <span className={`ml-3 inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold ${accent}`}>Open</span>
    </Link>
  )
}
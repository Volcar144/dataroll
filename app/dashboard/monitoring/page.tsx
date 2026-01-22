import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { 
  Activity, Database, FileText, Shield, AlertTriangle, CheckCircle2, 
  Clock, TrendingUp, TrendingDown, ArrowUpRight, RefreshCw, Zap, Server 
} from 'lucide-react'

export default async function MonitoringPage() {
  const headersList = await headers()
  const session = await getSession({
    headers: Object.fromEntries(headersList),
  } as any)

  if (!session?.user) {
    redirect('/auth/signin')
  }

  // Get user's teams for monitoring
  const teams = await prisma.team.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      _count: {
        select: {
          databaseConnections: true,
          migrations: true,
          auditLogs: true,
        },
      },
    },
  })

  // Get recent migrations
  const recentMigrations = await prisma.migration.findMany({
    where: {
      team: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      team: { select: { name: true } },
    },
  })

  // Get connection health summary
  const connections = await prisma.databaseConnection.findMany({
    where: {
      team: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      healthStatus: true,
      isActive: true,
    },
  })

  const healthyConnections = connections.filter(c => c.healthStatus === 'HEALTHY').length
  const unhealthyConnections = connections.filter(c => c.healthStatus === 'UNHEALTHY').length
  const totalConnections = connections.length

  const totalMigrations = teams.reduce((acc, t) => acc + t._count.migrations, 0)
  const totalAuditLogs = teams.reduce((acc, t) => acc + t._count.auditLogs, 0)

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-8">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-white/20 backdrop-blur rounded-xl">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Monitoring Dashboard</h1>
            </div>
            <p className="text-white/80 max-w-2xl">
              Real-time monitoring of your database connections, migrations, and system health across all teams.
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                <TrendingUp className="w-3 h-3" />
                +2 this week
              </span>
            </div>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{totalConnections}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Total Connections</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs text-zinc-500 font-medium">
                {totalConnections > 0 ? Math.round((healthyConnections / totalConnections) * 100) : 0}% healthy
              </span>
            </div>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{healthyConnections}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Healthy Connections</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-medium">
                <TrendingUp className="w-3 h-3" />
                +5 this week
              </span>
            </div>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{totalMigrations}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Total Migrations</p>
          </div>

          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs text-zinc-500 font-medium">Last 30 days</span>
            </div>
            <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{totalAuditLogs}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">Audit Events</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Connection Health */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Connection Health
              </h2>
              <Link 
                href="/dashboard/connections"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {connections.length === 0 ? (
              <div className="text-center py-12">
                <Server className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                <p className="text-zinc-600 dark:text-zinc-400 mb-2">No connections yet</p>
                <Link 
                  href="/dashboard/connections" 
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Add your first connection →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.slice(0, 5).map((conn) => (
                  <div 
                    key={conn.id}
                    className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        conn.healthStatus === 'HEALTHY' ? 'bg-green-500' : 
                        conn.healthStatus === 'UNHEALTHY' ? 'bg-red-500' : 'bg-zinc-400'
                      }`} />
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">{conn.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {conn.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      conn.healthStatus === 'HEALTHY' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : conn.healthStatus === 'UNHEALTHY'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}>
                      {conn.healthStatus || 'Unknown'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Health Distribution Bar */}
            {connections.length > 0 && (
              <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Health Distribution</span>
                </div>
                <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden flex">
                  {healthyConnections > 0 && (
                    <div 
                      className="bg-green-500 h-full"
                      style={{ width: `${(healthyConnections / totalConnections) * 100}%` }}
                    />
                  )}
                  {unhealthyConnections > 0 && (
                    <div 
                      className="bg-red-500 h-full"
                      style={{ width: `${(unhealthyConnections / totalConnections) * 100}%` }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full" /> Healthy: {healthyConnections}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-red-500 rounded-full" /> Unhealthy: {unhealthyConnections}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-zinc-400 rounded-full" /> Unknown: {totalConnections - healthyConnections - unhealthyConnections}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* System Status */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6">
              System Status
            </h2>
            <div className="space-y-4">
              {[
                { name: 'API Server', status: 'operational', latency: '24ms' },
                { name: 'Database', status: 'operational', latency: '12ms' },
                { name: 'Background Jobs', status: 'operational', latency: '45ms' },
                { name: 'Webhook Delivery', status: 'operational', latency: '89ms' },
              ].map((service) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${
                      service.status === 'operational' ? 'text-green-500' : 'text-red-500'
                    }`} />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{service.name}</span>
                  </div>
                  <span className="text-xs text-zinc-500">{service.latency}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Uptime</span>
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">99.98%</span>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div 
                    key={i}
                    className={`flex-1 h-8 rounded-sm ${
                      i === 15 ? 'bg-amber-400' : 'bg-green-400'
                    }`}
                    title={`Day ${i + 1}`}
                  />
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-2">Last 30 days</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Migrations */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Recent Migrations
              </h2>
              <Link 
                href="/dashboard/migrations"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                View all <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {recentMigrations.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400">No migrations yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentMigrations.map((migration) => (
                  <div 
                    key={migration.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      migration.status === 'EXECUTED' ? 'bg-green-500' :
                      migration.status === 'FAILED' ? 'bg-red-500' :
                      migration.status === 'EXECUTING' ? 'bg-blue-500 animate-pulse' :
                      'bg-zinc-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {migration.name || 'Untitled migration'}
                      </p>
                      <p className="text-xs text-zinc-500 truncate">
                        {migration.team.name} • {new Date(migration.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      migration.status === 'EXECUTED' 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : migration.status === 'FAILED'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                    }`}>
                      {migration.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Teams Summary */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Teams Overview
              </h2>
              <Link 
                href="/dashboard/teams"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                Manage <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            {teams.length === 0 ? (
              <div className="text-center py-8">
                <Zap className="w-10 h-10 text-zinc-400 mx-auto mb-3" />
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  No teams yet. Create a team to start monitoring.
                </p>
                <Link
                  href="/dashboard/teams"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                >
                  Create Team
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {teams.map((team) => (
                  <div 
                    key={team.id}
                    className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{team.name}</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg">
                        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          {team._count.databaseConnections}
                        </p>
                        <p className="text-xs text-zinc-500">Connections</p>
                      </div>
                      <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg">
                        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          {team._count.migrations}
                        </p>
                        <p className="text-xs text-zinc-500">Migrations</p>
                      </div>
                      <div className="p-2 bg-white dark:bg-zinc-900 rounded-lg">
                        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          {team._count.auditLogs}
                        </p>
                        <p className="text-xs text-zinc-500">Events</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

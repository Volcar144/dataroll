"use client"

import { useSession } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import posthog from "posthog-js"
import { ChevronDown, Download, Clock, CheckCircle, XCircle, AlertCircle, X } from "lucide-react"

interface Migration {
  id: string
  name: string
  version: string
  type: string
  status: string
  executedAt: string | null
  rolledBackAt: string | null
  createdAt: string
  databaseConnection: {
    id: string
    name: string
    type: string
  }
  createdBy: {
    id: string
    name: string | null
    email: string
  }
  executions: Array<{
    id: string
    status: string
    executedAt: string
    duration: number
  }>
}

interface ExecutionResult {
  success: boolean
  duration: number
  error?: string
  changes?: string[]
  dryRun?: boolean
}

export default function MigrationsPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [migrations, setMigrations] = useState<Migration[]>([])
  const [loading, setLoading] = useState(true)
  const [executingMigration, setExecutingMigration] = useState<string | null>(null)
  const [rollingBackMigration, setRollingBackMigration] = useState<string | null>(null)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [showExecutionModal, setShowExecutionModal] = useState(false)
  const [selectedMigration, setSelectedMigration] = useState<Migration | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [expandedMigration, setExpandedMigration] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newMigrationData, setNewMigrationData] = useState({
    name: '',
    version: '',
    type: 'PRISMA' as 'PRISMA' | 'DRIZZLE' | 'RAW_SQL',
    filePath: '',
    content: '',
    databaseConnectionId: '',
  })
  const [connections, setConnections] = useState<any[]>([])
  const [creatingMigration, setCreatingMigration] = useState(false)

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session) {
      fetchTeamAndMigrations()
    }
  }, [session])

  const fetchTeamAndMigrations = async () => {
    try {
      // First fetch teams to get teamId
      const teamsRes = await fetch('/api/teams')
      const teamsData = await teamsRes.json()
      const firstTeamId = teamsData.data?.[0]?.id
      
      if (!firstTeamId) {
        setLoading(false)
        return
      }
      
      setTeamId(firstTeamId)
      
      // Now fetch migrations with teamId
      const [migrationsRes, connectionsRes] = await Promise.all([
        fetch(`/api/migrations?teamId=${firstTeamId}`),
        fetch(`/api/connections?teamId=${firstTeamId}`)
      ])
      
      const migrationsData = await migrationsRes.json()
      const connectionsData = await connectionsRes.json()
      
      if (migrationsData.success) {
        setMigrations(migrationsData.data || [])
      }
      
      if (connectionsData.data) {
        setConnections(connectionsData.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch migrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const executeMigration = async (migration: Migration, dryRun: boolean = false) => {
    setExecutingMigration(migration.id)
    setExecutionResult(null)

    try {
      const response = await fetch('/api/migrations/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          migrationId: migration.id,
          dryRun,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setExecutionResult(result.data)
        if (!dryRun) {
          fetchTeamAndMigrations() // Refresh the list
        }

        // Track migration events
        const eventName = dryRun ? 'migration_dry_run' : 'migration_executed'
        posthog.capture(eventName, {
          migration_id: migration.id,
          migration_name: migration.name,
          migration_version: migration.version,
          migration_type: migration.type,
          connection_name: migration.databaseConnection.name,
          connection_type: migration.databaseConnection.type,
          success: result.data.success,
          duration_ms: result.data.duration,
        })
      } else {
        setExecutionResult({
          success: false,
          duration: 0,
          error: result.error?.message || 'Execution failed',
        })

        // Track failed migration attempt
        const eventName = dryRun ? 'migration_dry_run' : 'migration_executed'
        posthog.capture(eventName, {
          migration_id: migration.id,
          migration_name: migration.name,
          migration_version: migration.version,
          success: false,
          error: result.error?.message || 'Execution failed',
        })
      }
    } catch (error) {
      setExecutionResult({
        success: false,
        duration: 0,
        error: 'Migration execution failed',
      })
      posthog.captureException(error)
    } finally {
      setExecutingMigration(null)
    }
  }

  const rollbackMigration = async (migration: Migration) => {
    if (!confirm(`Are you sure you want to rollback migration "${migration.name}"? This action cannot be undone.`)) {
      return
    }

    setRollingBackMigration(migration.id)
    setExecutionResult(null)

    try {
      const response = await fetch('/api/migrations/rollback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          migrationId: migration.id,
          reason: 'Manual rollback from dashboard',
        }),
      })

      const result = await response.json()

      if (result.success) {
        setExecutionResult(result.data)
        fetchTeamAndMigrations() // Refresh the list

        // Track rollback event
        posthog.capture('migration_rolled_back', {
          migration_id: migration.id,
          migration_name: migration.name,
          migration_version: migration.version,
          migration_type: migration.type,
          connection_name: migration.databaseConnection.name,
          success: true,
          duration_ms: result.data.duration,
        })
      } else {
        setExecutionResult({
          success: false,
          duration: 0,
          error: result.error?.message || 'Rollback failed',
        })

        // Track failed rollback
        posthog.capture('migration_rolled_back', {
          migration_id: migration.id,
          migration_name: migration.name,
          success: false,
          error: result.error?.message || 'Rollback failed',
        })
      }
    } catch (error) {
      setExecutionResult({
        success: false,
        duration: 0,
        error: 'Migration rollback failed',
      })
      posthog.captureException(error)
    } finally {
      setRollingBackMigration(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXECUTED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
      case 'FAILED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
      case 'EXECUTING':
        return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200'
      case 'ROLLED_BACK':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'
      case 'PENDING':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-200'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXECUTED':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'PENDING':
        return <Clock className="h-5 w-5 text-slate-400" />
      case 'ROLLED_BACK':
        return <AlertCircle className="h-5 w-5 text-amber-500" />
      default:
        return <Clock className="h-5 w-5 text-slate-400" />
    }
  }

  const canExecute = (migration: Migration) => {
    return ['PENDING', 'FAILED'].includes(migration.status)
  }

  const canRollback = (migration: Migration) => {
    return migration.status === 'EXECUTED'
  }

  const getMigrationStats = () => {
    const stats = {
      total: migrations.length,
      executed: migrations.filter(m => m.status === 'EXECUTED').length,
      pending: migrations.filter(m => m.status === 'PENDING').length,
      failed: migrations.filter(m => m.status === 'FAILED').length,
      rolledBack: migrations.filter(m => m.status === 'ROLLED_BACK').length,
    }
    return stats
  }

  const exportMigrationHistory = () => {
    const csv = ['Name,Version,Status,Connection,Executed At,Rolled Back At']
    migrations.forEach(m => {
      csv.push(`"${m.name}","${m.version}","${m.status}","${m.databaseConnection.name}","${m.executedAt || 'N/A'}","${m.rolledBackAt || 'N/A'}"`)
    })
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv.join('\n')))
    element.setAttribute('download', `migrations-${new Date().toISOString().split('T')[0]}.csv`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const createMigration = async () => {
    if (!newMigrationData.name || !newMigrationData.version || !newMigrationData.filePath || 
        !newMigrationData.content || !newMigrationData.databaseConnectionId || !teamId) {
      alert('Please fill in all required fields')
      return
    }

    setCreatingMigration(true)
    try {
      const response = await fetch('/api/migrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newMigrationData,
          teamId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        posthog.capture('migration_created', {
          migration_name: newMigrationData.name,
          migration_version: newMigrationData.version,
          migration_type: newMigrationData.type,
          connection_id: newMigrationData.databaseConnectionId,
        })
        
        // Reset form and close modal
        setNewMigrationData({ 
          name: '', 
          version: '', 
          type: 'PRISMA', 
          filePath: '', 
          content: '', 
          databaseConnectionId: '' 
        })
        setShowCreateModal(false)
        
        // Refresh migrations list
        fetchTeamAndMigrations()
      } else {
        const errorMessage = result.error?.message || 'Failed to create migration'
        alert(errorMessage)
        
        // Track error to PostHog
        posthog.capture('migration_creation_failed', {
          error: errorMessage,
          validation_errors: result.error?.code === 'INTERNAL_ERROR' ? result.error.message : undefined,
        })
      }
    } catch (error) {
      console.error('Failed to create migration:', error)
      const errorMessage = 'Error creating migration'
      alert(errorMessage)
      
      // Track exception to PostHog
      posthog.captureException(error)
    } finally {
      setCreatingMigration(false)
    }
  }

  if (isPending || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const stats = getMigrationStats()

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-100 dark:from-black dark:via-zinc-950 dark:to-zinc-900">
      <header className="border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-950/60 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center rounded-full bg-zinc-900 text-white px-3 py-1 text-xs font-semibold dark:bg-white dark:text-zinc-900">
                Schema management
              </div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Migrations</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Plan, execute, and rollback schema changes safely</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportMigrationHistory}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <Link
                href="/dashboard"
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                Back
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Execution Result Modal */}
      {executionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative mx-4 w-full max-w-md rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-4 flex items-center">
              {executionResult.success ? (
                <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              ) : (
                <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
              )}
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                {executionResult.dryRun ? 'Simulation complete' : executionResult.success ? 'Execution successful' : 'Execution failed'}
              </h3>
            </div>

            <div className="mb-6 space-y-3">
              <div className="rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50">
                <p className="text-xs uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Execution time</p>
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{executionResult.duration}ms</p>
              </div>
              {executionResult.error && (
                <div className="rounded-lg border border-red-200/50 bg-red-50/50 p-3 dark:border-red-900/50 dark:bg-red-900/20">
                  <p className="text-sm text-red-700 dark:text-red-200">{executionResult.error}</p>
                </div>
              )}
              {executionResult.changes && executionResult.changes.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Changes</p>
                  <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {executionResult.changes.map((change, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1 inline-block h-1 w-1 rounded-full bg-zinc-400" />
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={() => setExecutionResult(null)}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        {/* Create Migration Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="relative mx-4 w-full max-w-md rounded-2xl border border-zinc-200/70 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Create Migration</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    Migration Name *
                  </label>
                  <input
                    type="text"
                    value={newMigrationData.name}
                    onChange={(e) => setNewMigrationData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Add users table"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    Version *
                  </label>
                  <input
                    type="text"
                    value={newMigrationData.version}
                    onChange={(e) => setNewMigrationData(prev => ({ ...prev, version: e.target.value }))}
                    placeholder="e.g., 20260121_001 or 1.0.0"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    Type *
                  </label>
                  <select
                    value={newMigrationData.type}
                    onChange={(e) => setNewMigrationData(prev => ({ ...prev, type: e.target.value as 'PRISMA' | 'DRIZZLE' | 'RAW_SQL' }))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="PRISMA">Prisma</option>
                    <option value="DRIZZLE">Drizzle</option>
                    <option value="RAW_SQL">Raw SQL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    File Path *
                  </label>
                  <input
                    type="text"
                    value={newMigrationData.filePath}
                    onChange={(e) => setNewMigrationData(prev => ({ ...prev, filePath: e.target.value }))}
                    placeholder="e.g., prisma/migrations/20260121_001_add_users/migration.sql"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    Database Connection *
                  </label>
                  <select
                    value={newMigrationData.databaseConnectionId}
                    onChange={(e) => setNewMigrationData(prev => ({ ...prev, databaseConnectionId: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  >
                    <option value="">Select a connection</option>
                    {connections.map(conn => (
                      <option key={conn.id} value={conn.id}>{conn.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    Migration SQL/Content *
                  </label>
                  <textarea
                    value={newMigrationData.content}
                    onChange={(e) => setNewMigrationData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="CREATE TABLE users (&#10;  id SERIAL PRIMARY KEY,&#10;  email VARCHAR(255) UNIQUE NOT NULL&#10;);"
                    rows={8}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-mono focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  onClick={createMigration}
                  disabled={creatingMigration}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700"
                >
                  {creatingMigration ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <section className="grid gap-4 sm:grid-cols-5">
          <StatCard label="Total" value={stats.total} color="bg-slate-100 dark:bg-slate-900/40 text-slate-700 dark:text-slate-200" />
          <StatCard label="Executed" value={stats.executed} color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200" />
          <StatCard label="Pending" value={stats.pending} color="bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-200" />
          <StatCard label="Failed" value={stats.failed} color="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200" />
          <StatCard label="Rolled back" value={stats.rolledBack} color="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200" />
        </section>

        {migrations.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200/70 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <Clock className="h-8 w-8 text-zinc-400" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-50">No migrations yet</h3>
            <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">Create your first migration to manage schema changes.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              New migration
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {migrations.map((migration) => (
              <div
                key={migration.id}
                className="rounded-2xl border border-zinc-200/70 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(migration.status)}
                        <div>
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{migration.name}</h3>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">v{migration.version} • {migration.type}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-600 dark:text-zinc-400">
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">
                          {migration.databaseConnection.name}
                        </span>
                        {migration.executedAt && (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            ✓ {new Date(migration.executedAt).toLocaleDateString()}
                          </span>
                        )}
                        {migration.rolledBackAt && (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            ↻ {new Date(migration.rolledBackAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(migration.status)}`}>
                        {migration.status}
                      </span>
                      <button
                        onClick={() => setExpandedMigration(expandedMigration === migration.id ? null : migration.id)}
                        className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedMigration === migration.id ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {expandedMigration === migration.id && (
                    <div className="space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                      <div className="grid gap-4 text-sm">
                        <div>
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Created by</p>
                          <p className="text-zinc-900 dark:text-zinc-50">{migration.createdBy.name || migration.createdBy.email}</p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">{new Date(migration.createdAt).toLocaleString()}</p>
                        </div>

                        {migration.executions && migration.executions.length > 0 && (
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">Execution history</p>
                            <div className="space-y-1">
                              {migration.executions.slice(0, 3).map(exec => (
                                <div key={exec.id} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                                  <span className="text-xs text-zinc-600 dark:text-zinc-400">{new Date(exec.executedAt).toLocaleString()}</span>
                                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{exec.duration}ms</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        {canExecute(migration) && (
                          <>
                            <button
                              onClick={() => executeMigration(migration, true)}
                              disabled={executingMigration === migration.id}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700"
                            >
                              {executingMigration === migration.id ? 'Simulating...' : 'Simulate'}
                            </button>
                            <button
                              onClick={() => executeMigration(migration, false)}
                              disabled={executingMigration === migration.id}
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700"
                            >
                              {executingMigration === migration.id ? 'Executing...' : 'Execute'}
                            </button>
                          </>
                        )}
                        {canRollback(migration) && (
                          <button
                            onClick={() => rollbackMigration(migration)}
                            disabled={rollingBackMigration === migration.id}
                            className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-700"
                          >
                            {rollingBackMigration === migration.id ? 'Rolling back...' : 'Rollback'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl p-4 text-center ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}
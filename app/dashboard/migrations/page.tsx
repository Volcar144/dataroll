"use client"

import { useSession } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import posthog from "posthog-js"

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
      const response = await fetch(`/api/migrations?teamId=${firstTeamId}`)
      const data = await response.json()
      if (data.success) {
        setMigrations(data.data || [])
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
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'FAILED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'EXECUTING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'ROLLED_BACK':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const canExecute = (migration: Migration) => {
    return ['PENDING', 'FAILED'].includes(migration.status)
  }

  const canRollback = (migration: Migration) => {
    return migration.status === 'EXECUTED'
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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                Migrations
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Manage and execute database migrations
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="px-4 py-2 border border-zinc-300 bg-white text-zinc-900 rounded-md hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Back to Dashboard
              </Link>
              <button className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
                Create Migration
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Execution Result Modal */}
      {executionResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              {executionResult.success ? (
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                {executionResult.dryRun ? 'Dry Run Result' : executionResult.success ? 'Success' : 'Error'}
              </h3>
            </div>

            <div className="mb-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                Duration: {executionResult.duration}ms
              </p>
              {executionResult.error && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {executionResult.error}
                </p>
              )}
              {executionResult.changes && executionResult.changes.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">Changes:</p>
                  <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                    {executionResult.changes.map((change, index) => (
                      <li key={index}>• {change}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              onClick={() => setExecutionResult(null)}
              className="w-full px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {migrations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              No migrations found
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">
              Create your first migration to get started.
            </p>
            <button className="px-4 py-2 bg-zinc-900 text-white rounded-md hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200">
              Create Migration
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
              <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                Migration History
              </h2>
            </div>
            <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {migrations.map((migration) => (
                <div key={migration.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mr-3">
                          {migration.name}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(migration.status)}`}>
                          {migration.status}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        <span>Version: {migration.version}</span>
                        <span className="mx-2">•</span>
                        <span>Type: {migration.type}</span>
                        <span className="mx-2">•</span>
                        <span>Connection: {migration.databaseConnection.name}</span>
                        {migration.executedAt && (
                          <>
                            <span className="mx-2">•</span>
                            <span>Executed: {new Date(migration.executedAt).toLocaleString()}</span>
                          </>
                        )}
                        {migration.rolledBackAt && (
                          <>
                            <span className="mx-2">•</span>
                            <span>Rolled back: {new Date(migration.rolledBackAt).toLocaleString()}</span>
                          </>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
                        Created by {migration.createdBy.name || migration.createdBy.email} on {new Date(migration.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {canExecute(migration) && (
                        <>
                          <button
                            onClick={() => executeMigration(migration, true)}
                            disabled={executingMigration === migration.id}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          >
                            {executingMigration === migration.id ? 'Running...' : 'Dry Run'}
                          </button>
                          <button
                            onClick={() => executeMigration(migration, false)}
                            disabled={executingMigration === migration.id}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                          >
                            {executingMigration === migration.id ? 'Executing...' : 'Execute'}
                          </button>
                        </>
                      )}
                      {canRollback(migration) && (
                        <button
                          onClick={() => rollbackMigration(migration)}
                          disabled={rollingBackMigration === migration.id}
                          className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                        >
                          {rollingBackMigration === migration.id ? 'Rolling back...' : 'Rollback'}
                        </button>
                      )}
                      <button className="px-3 py-1 text-sm bg-zinc-600 text-white rounded hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
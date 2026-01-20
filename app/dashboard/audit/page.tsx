"use client"

import { useSession } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"

interface AuditLog {
  id: string
  action: string
  resource: string
  resourceId: string | null
  details: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
  user: {
    name: string | null
    email: string
  }
  team: {
    name: string
  }
}

export default function AuditPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [defaultTeamId, setDefaultTeamId] = useState<string>('')
  const [filters, setFilters] = useState({
    action: '',
    userId: '',
    teamId: '',
    limit: 50,
  })

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    }
  }, [session, isPending, router])

  useEffect(() => {
    if (session && !defaultTeamId) {
      fetchTeamFirst()
    }
  }, [session, defaultTeamId])

  useEffect(() => {
    if (session && defaultTeamId) {
      fetchAuditLogs()
    }
  }, [session, defaultTeamId, filters])

  const fetchTeamFirst = async () => {
    try {
      const teamsRes = await fetch('/api/teams')
      const teamsData = await teamsRes.json()
      const firstTeamId = teamsData.data?.[0]?.id
      if (firstTeamId) {
        setDefaultTeamId(firstTeamId)
      } else {
        setLoading(false)
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
      setLoading(false)
    }
  }

  const fetchAuditLogs = async () => {
    try {
      const queryParams = new URLSearchParams()
      if (filters.action) queryParams.append('action', filters.action)
      if (filters.userId) queryParams.append('userId', filters.userId)
      // Use filter teamId if set, otherwise use default team
      const teamIdToUse = filters.teamId || defaultTeamId
      if (teamIdToUse) queryParams.append('teamId', teamIdToUse)
      queryParams.append('limit', filters.limit.toString())

      const response = await fetch(`/api/audit-logs?${queryParams}`)
      const data = await response.json()
      if (data.success) {
        setAuditLogs(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    }
    if (action.includes('DELETE') || action.includes('REMOVE')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    if (action.includes('UPDATE') || action.includes('EDIT')) {
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    }
    return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
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
                Audit Logs
              </h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Monitor system activity and security events
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="px-4 py-2 border border-zinc-300 bg-white text-zinc-900 rounded-md hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-4">
            Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value="">All Actions</option>
                <option value="USER_LOGIN">User Login</option>
                <option value="USER_LOGOUT">User Logout</option>
                <option value="TEAM_CREATED">Team Created</option>
                <option value="CONNECTION_CREATED">Connection Created</option>
                <option value="MIGRATION_EXECUTED">Migration Executed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                User ID
              </label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                placeholder="Filter by user ID"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Team ID
              </label>
              <input
                type="text"
                value={filters.teamId}
                onChange={(e) => setFilters(prev => ({ ...prev, teamId: e.target.value }))}
                placeholder="Filter by team ID"
                className="w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Limit
              </label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              >
                <option value={25}>25 entries</option>
                <option value={50}>50 entries</option>
                <option value={100}>100 entries</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              Activity Log
            </h2>
          </div>
          {auditLogs.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-zinc-600 dark:text-zinc-400">
                No audit logs found matching your filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200 dark:divide-zinc-700">
              {auditLogs.map((log) => (
                <div key={log.id} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {log.resource} {log.resourceId && `(${log.resourceId})`}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-zinc-900 dark:text-zinc-100">
                        {log.details && <p>{log.details}</p>}
                      </div>
                      <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                        <span>By: {log.user.name || log.user.email}</span>
                        <span className="mx-2">•</span>
                        <span>Team: {log.team.name}</span>
                        <span className="mx-2">•</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                        {log.ipAddress && (
                          <>
                            <span className="mx-2">•</span>
                            <span>IP: {log.ipAddress}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
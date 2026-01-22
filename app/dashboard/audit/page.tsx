"use client"

import { useSession } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Download, Filter, X, Calendar } from "lucide-react"

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
  team?: {
    name: string
  } | null
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
  const [dateRange, setDateRange] = useState({
    from: '',
    to: '',
  })
  const [showFilters, setShowFilters] = useState(true)
  const [activeFilters, setActiveFilters] = useState<string[]>([])

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
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
    }
    if (action.includes('DELETE') || action.includes('REMOVE')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
    }
    if (action.includes('UPDATE') || action.includes('EDIT')) {
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200'
    }
    return 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-200'
  }

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) return '✨'
    if (action.includes('DELETE') || action.includes('REMOVE')) return '🗑️'
    if (action.includes('UPDATE') || action.includes('EDIT')) return '✏️'
    if (action.includes('LOGIN')) return '🔓'
    if (action.includes('LOGOUT')) return '🔒'
    return '📋'
  }

  const exportAuditLogs = () => {
    const csv = ['Action,Resource,User,Team,IP Address,Timestamp']
    auditLogs.forEach(log => {
      csv.push(`"${log.action}","${log.resource}","${log.user.name || log.user.email}","${log.team?.name || 'N/A'}","${log.ipAddress || 'N/A'}","${log.createdAt}"`)
    })
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv.join('\n')))
    element.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const updateActiveFilters = () => {
    const active = []
    if (filters.action) active.push(`action:${filters.action}`)
    if (filters.userId) active.push(`user:${filters.userId}`)
    if (filters.teamId) active.push(`team:${filters.teamId}`)
    if (dateRange.from) active.push(`from:${dateRange.from}`)
    if (dateRange.to) active.push(`to:${dateRange.to}`)
    setActiveFilters(active)
  }

  const clearFilters = () => {
    setFilters({ action: '', userId: '', teamId: '', limit: 50 })
    setDateRange({ from: '', to: '' })
  }

  useEffect(() => {
    updateActiveFilters()
  }, [filters, dateRange])

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
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-100 dark:from-black dark:via-zinc-950 dark:to-zinc-900">
      <header className="border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-950/60 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center rounded-full bg-zinc-900 text-white px-3 py-1 text-xs font-semibold dark:bg-white dark:text-zinc-900">
                System audit
              </div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">Audit Logs</h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Track and monitor all system activity and security events</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportAuditLogs}
                disabled={auditLogs.length === 0}
                className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
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

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        {/* Filter Controls */}
        <div className="rounded-2xl border border-zinc-200/70 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-200/70 px-6 py-4 dark:border-zinc-800">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-50"
            >
              <Filter className="h-5 w-5" />
              Filters {activeFilters.length > 0 && <span className="rounded-full bg-sky-500 text-white px-2 py-0.5 text-xs font-semibold">{activeFilters.length}</span>}
            </button>
            {activeFilters.length > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Clear all
              </button>
            )}
          </div>

          {showFilters && (
            <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Action
                </label>
                <select
                  value={filters.action}
                  onChange={(e) => setFilters(prev => ({ ...prev, action: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value="">All actions</option>
                  <option value="USER_LOGIN">User login</option>
                  <option value="USER_LOGOUT">User logout</option>
                  <option value="TEAM_CREATED">Team created</option>
                  <option value="CONNECTION_CREATED">Connection created</option>
                  <option value="MIGRATION_EXECUTED">Migration executed</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  User ID
                </label>
                <input
                  type="text"
                  value={filters.userId}
                  onChange={(e) => setFilters(prev => ({ ...prev, userId: e.target.value }))}
                  placeholder="Filter by ID"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  From date
                </label>
                <input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  To date
                </label>
                <input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Show entries
                </label>
                <select
                  value={filters.limit}
                  onChange={(e) => setFilters(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                >
                  <option value={25}>25 entries</option>
                  <option value={50}>50 entries</option>
                  <option value={100}>100 entries</option>
                </select>
              </div>
            </div>
          )}

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200/70 px-6 py-3 dark:border-zinc-800">
              {activeFilters.map(filter => (
                <div key={filter} className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-900/30 dark:text-sky-200">
                  {filter}
                  <button
                    onClick={() => {
                      const [key] = filter.split(':')
                      if (key === 'action') setFilters(p => ({ ...p, action: '' }))
                      if (key === 'user') setFilters(p => ({ ...p, userId: '' }))
                      if (key === 'team') setFilters(p => ({ ...p, teamId: '' }))
                      if (key === 'from') setDateRange(p => ({ ...p, from: '' }))
                      if (key === 'to') setDateRange(p => ({ ...p, to: '' }))
                    }}
                    className="hover:opacity-75"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Audit Logs List */}
        <div className="rounded-2xl border border-zinc-200/70 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200/70 px-6 py-4 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Activity log</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{auditLogs.length} entries</p>
            </div>
          </div>
          {auditLogs.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                <Filter className="h-6 w-6 text-zinc-400" />
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No audit logs found matching your filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200/70 dark:divide-zinc-800">
              {auditLogs.map((log) => (
                <div key={log.id} className="px-6 py-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="mt-0.5 text-xl">{getActionIcon(log.action)}</span>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{log.resource}</span>
                          {log.resourceId && <span className="text-xs text-zinc-500 dark:text-zinc-400">({log.resourceId})</span>}
                        </div>
                        {log.details && (
                          <p className="text-sm text-zinc-600 dark:text-zinc-400">{log.details}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                          <span className="inline-flex items-center gap-1">
                            👤 {log.user.name || log.user.email}
                          </span>
                          {log.team?.name && (
                            <span className="inline-flex items-center gap-1">
                              🏢 {log.team.name}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            📅 {new Date(log.createdAt).toLocaleString()}
                          </span>
                          {log.ipAddress && (
                            <span className="inline-flex items-center gap-1">
                              🌐 {log.ipAddress}
                            </span>
                          )}
                        </div>
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
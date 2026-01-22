"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useSession } from "@/lib/auth-service"
import { ThemeToggle } from "@/components/theme-toggle"
import { 
  ArrowLeft, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Pause, 
  RefreshCw, 
  Ban,
  ChevronRight,
  Search,
  Filter,
  Loader2,
  Activity,
  Timer,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  MoreVertical
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"

interface NodeExecution {
  id: string
  nodeId: string
  nodeType: string
  nodeName: string
  status: string
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  error: string | null
  startedAt: string | null
  completedAt: string | null
  duration: number | null
}

interface WorkflowExecution {
  id: string
  workflowId: string
  status: string
  triggeredBy: string
  triggeredAt: string
  startedAt: string | null
  completedAt: string | null
  context: Record<string, unknown>
  output: Record<string, unknown> | null
  error: string | null
  nodeExecutions: NodeExecution[]
}

interface ExecutionStats {
  total: number
  pending: number
  running: number
  success: number
  failed: number
  cancelled: number
}

interface ExecutionResponse {
  executions: WorkflowExecution[]
  totalCount: number
  hasMore: boolean
  stats: ExecutionStats
}

const statusConfig: Record<string, { color: string; bg: string; icon: typeof CheckCircle2 }> = {
  pending: { color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', icon: Clock },
  running: { color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: Play },
  awaiting_approval: { color: 'text-amber-500', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: Pause },
  success: { color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle2 },
  failed: { color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', icon: XCircle },
  cancelled: { color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', icon: Ban },
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

export default function WorkflowExecutionsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const workflowId = resolvedParams.id
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [stats, setStats] = useState<ExecutionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [workflowName, setWorkflowName] = useState('')
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    }
  }, [session, isPending, router])

  const fetchExecutions = useCallback(async (reset = false) => {
    try {
      setLoading(true)
      const offset = reset ? 0 : executions.length
      const statusParam = statusFilter ? `&status=${statusFilter}` : ''
      const response = await fetch(
        `/api/workflows/${workflowId}/executions?limit=20&offset=${offset}${statusParam}`
      )
      
      if (!response.ok) throw new Error('Failed to fetch executions')
      
      const data: ExecutionResponse = await response.json()
      
      if (reset) {
        setExecutions(data.executions)
      } else {
        setExecutions(prev => [...prev, ...data.executions])
      }
      setStats(data.stats)
      setHasMore(data.hasMore)
    } catch (error) {
      console.error('Error fetching executions:', error)
    } finally {
      setLoading(false)
    }
  }, [workflowId, executions.length, statusFilter])

  const fetchWorkflow = useCallback(async () => {
    try {
      const response = await fetch(`/api/workflows?id=${workflowId}`)
      if (!response.ok) throw new Error('Failed to fetch workflow')
      const data = await response.json()
      if (data.data?.length > 0) {
        setWorkflowName(data.data[0].name)
      }
    } catch (error) {
      console.error('Error fetching workflow:', error)
    }
  }, [workflowId])

  useEffect(() => {
    if (session) {
      fetchWorkflow()
      fetchExecutions(true)
    }
  }, [session, statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAction = async (executionId: string, action: 'retry' | 'cancel') => {
    try {
      setActionLoading(executionId)
      const response = await fetch(
        `/api/workflows/${workflowId}/executions/${executionId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }
      )
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Action failed')
      }
      
      // Refresh the list
      fetchExecutions(true)
    } catch (error) {
      console.error('Error performing action:', error)
      alert(error instanceof Error ? error.message : 'Action failed')
    } finally {
      setActionLoading(null)
    }
  }

  const filteredExecutions = executions.filter(e => {
    if (!searchQuery) return true
    return e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
           e.triggeredBy.toLowerCase().includes(searchQuery.toLowerCase())
  })

  if (isPending || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 dark:from-black dark:via-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200/60 dark:border-gray-800/60 bg-white/70 dark:bg-gray-950/60 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard/workflows" 
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Link href="/dashboard/workflows" className="hover:text-violet-600">Workflows</Link>
                  <ChevronRight className="w-4 h-4" />
                  <span>{workflowName || 'Workflow'}</span>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-gray-900 dark:text-white">Executions</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">Execution History</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchExecutions(true)}
                disabled={loading}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.success}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Success</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Play className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.running}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Running</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Pause className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Pending</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.cancelled}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cancelled</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by ID or trigger..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter || ''}
                onChange={(e) => setStatusFilter(e.target.value || null)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="running">Running</option>
                <option value="awaiting_approval">Awaiting Approval</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Executions List */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {loading && executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">Loading executions...</p>
            </div>
          ) : filteredExecutions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No executions found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                {searchQuery || statusFilter
                  ? 'Try adjusting your search or filters.'
                  : 'This workflow hasn\'t been executed yet. Run it to see execution history here.'
                }
              </p>
            </div>
          ) : (
            <>
              {filteredExecutions.map((execution) => {
                const config = statusConfig[execution.status] || statusConfig.pending
                const StatusIcon = config.icon
                const isExpanded = expandedId === execution.id
                const totalDuration = execution.nodeExecutions.reduce(
                  (sum, ne) => sum + (ne.duration || 0), 0
                )

                return (
                  <div 
                    key={execution.id}
                    className="border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                  >
                    {/* Execution Row */}
                    <div 
                      className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : execution.id)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Status */}
                        <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center`}>
                          <StatusIcon className={`w-5 h-5 ${config.color}`} />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-gray-900 dark:text-white">
                              {execution.id.slice(0, 8)}...
                            </code>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                              {execution.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                            <span>Triggered by {execution.triggeredBy}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(execution.triggeredAt), { addSuffix: true })}</span>
                            {totalDuration > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Timer className="w-3.5 h-3.5" />
                                  {formatDuration(totalDuration)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          {execution.status === 'failed' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAction(execution.id, 'retry')
                              }}
                              disabled={actionLoading === execution.id}
                              className="px-3 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors flex items-center gap-1"
                            >
                              {actionLoading === execution.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <RefreshCw className="w-4 h-4" />
                              )}
                              Retry
                            </button>
                          )}
                          {['pending', 'running', 'awaiting_approval'].includes(execution.status) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAction(execution.id, 'cancel')
                              }}
                              disabled={actionLoading === execution.id}
                              className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-1"
                            >
                              {actionLoading === execution.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Ban className="w-4 h-4" />
                              )}
                              Cancel
                            </button>
                          )}
                          <ChevronRight 
                            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-6 pb-4 bg-gray-50/50 dark:bg-gray-800/30">
                        {/* Error Message */}
                        {execution.error && (
                          <div className="mb-4 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <p className="font-medium text-red-800 dark:text-red-300">Execution Failed</p>
                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                  {typeof execution.error === 'string' ? execution.error : JSON.stringify(execution.error)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Node Executions Timeline */}
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            Execution Timeline
                          </h4>
                          <div className="space-y-2">
                            {execution.nodeExecutions.map((node, index) => {
                              const nodeConfig = statusConfig[node.status] || statusConfig.pending
                              const NodeIcon = nodeConfig.icon
                              
                              return (
                                <div 
                                  key={node.id}
                                  className="flex items-start gap-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700"
                                >
                                  <div className={`w-8 h-8 -ml-[21px] rounded-lg ${nodeConfig.bg} flex items-center justify-center`}>
                                    <NodeIcon className={`w-4 h-4 ${nodeConfig.color}`} />
                                  </div>
                                  <div className="flex-1 min-w-0 py-1">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                          {node.nodeName}
                                        </span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                                          ({node.nodeType})
                                        </span>
                                      </div>
                                      <span className="text-sm text-gray-500 dark:text-gray-400">
                                        {formatDuration(node.duration)}
                                      </span>
                                    </div>
                                    {node.error && (
                                      <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                        {node.error}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Context & Output */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Input Context</h4>
                            <pre className="p-3 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs overflow-auto max-h-48">
                              {JSON.stringify(execution.context, null, 2)}
                            </pre>
                          </div>
                          {execution.output && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Output</h4>
                              <pre className="p-3 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs overflow-auto max-h-48">
                                {JSON.stringify(execution.output, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Load More */}
              {hasMore && (
                <button
                  onClick={() => fetchExecutions(false)}
                  disabled={loading}
                  className="w-full py-4 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    'Load more executions'
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

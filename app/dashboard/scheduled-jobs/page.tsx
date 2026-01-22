"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationBell } from "@/components/notification-bell"
import {
  Clock,
  Calendar,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  Plus,
  ArrowLeft,
  Loader2,
  Check,
  X,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Timer,
  CalendarDays,
  History,
  Settings,
  Zap,
  MoreVertical,
  Edit,
  Copy,
  Eye,
  Filter,
  Search,
  BarChart3,
  Activity
} from "lucide-react"

interface ScheduledJob {
  id: string
  name: string
  description?: string
  cronExpression: string
  timezone: string
  status: 'active' | 'paused' | 'disabled'
  jobType: 'migration' | 'backup' | 'cleanup' | 'sync' | 'custom'
  targetId?: string
  targetName?: string
  lastRun?: string
  lastStatus?: 'success' | 'failed' | 'running'
  lastDuration?: number
  nextRun?: string
  runCount: number
  failureCount: number
  createdAt: string
  createdBy: string
  config?: Record<string, any>
}

interface JobExecution {
  id: string
  jobId: string
  startedAt: string
  completedAt?: string
  status: 'running' | 'success' | 'failed' | 'cancelled'
  duration?: number
  output?: string
  error?: string
}

// Parse cron expression to human readable
function parseCronExpression(cron: string): string {
  const parts = cron.split(' ')
  if (parts.length < 5) return cron
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts
  
  // Common patterns
  if (cron === '0 0 * * *') return 'Daily at midnight'
  if (cron === '0 * * * *') return 'Every hour'
  if (cron === '*/15 * * * *') return 'Every 15 minutes'
  if (cron === '*/30 * * * *') return 'Every 30 minutes'
  if (cron === '0 0 * * 0') return 'Weekly on Sunday at midnight'
  if (cron === '0 0 1 * *') return 'Monthly on the 1st at midnight'
  
  if (minute === '*' && hour === '*') return 'Every minute'
  if (minute.startsWith('*/')) return `Every ${minute.slice(2)} minutes`
  if (hour === '*') return `Every hour at minute ${minute}`
  if (dayOfMonth === '*' && dayOfWeek === '*') return `Daily at ${hour}:${minute.padStart(2, '0')}`
  
  return cron
}

// Calculate next run from cron
function getNextRun(cron: string): Date {
  const now = new Date()
  const parts = cron.split(' ')
  if (parts.length < 5) return now
  
  const [minute, hour] = parts
  const nextRun = new Date(now)
  
  if (minute !== '*') nextRun.setMinutes(parseInt(minute) || 0)
  if (hour !== '*') nextRun.setHours(parseInt(hour) || 0)
  
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1)
  }
  
  return nextRun
}

// Format duration
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

// Format relative time
function formatRelativeTime(date: string): string {
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

// Sample data
const sampleJobs: ScheduledJob[] = [
  {
    id: 'job_1',
    name: 'Nightly Database Backup',
    description: 'Full database backup to S3',
    cronExpression: '0 2 * * *',
    timezone: 'UTC',
    status: 'active',
    jobType: 'backup',
    lastRun: new Date(Date.now() - 3600000 * 14).toISOString(),
    lastStatus: 'success',
    lastDuration: 45000,
    nextRun: new Date(Date.now() + 3600000 * 10).toISOString(),
    runCount: 234,
    failureCount: 2,
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    createdBy: 'admin@example.com',
  },
  {
    id: 'job_2',
    name: 'Hourly Sync to Replica',
    description: 'Sync production data to read replica',
    cronExpression: '0 * * * *',
    timezone: 'UTC',
    status: 'active',
    jobType: 'sync',
    targetName: 'read-replica-1',
    lastRun: new Date(Date.now() - 1800000).toISOString(),
    lastStatus: 'success',
    lastDuration: 12000,
    nextRun: new Date(Date.now() + 1800000).toISOString(),
    runCount: 1456,
    failureCount: 8,
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    createdBy: 'admin@example.com',
  },
  {
    id: 'job_3',
    name: 'Weekly Migration Check',
    description: 'Check for pending migrations',
    cronExpression: '0 9 * * 1',
    timezone: 'America/New_York',
    status: 'active',
    jobType: 'migration',
    lastRun: new Date(Date.now() - 86400000 * 5).toISOString(),
    lastStatus: 'success',
    lastDuration: 3000,
    nextRun: new Date(Date.now() + 86400000 * 2).toISOString(),
    runCount: 12,
    failureCount: 0,
    createdAt: new Date(Date.now() - 86400000 * 90).toISOString(),
    createdBy: 'admin@example.com',
  },
  {
    id: 'job_4',
    name: 'Log Cleanup',
    description: 'Remove logs older than 30 days',
    cronExpression: '0 3 * * 0',
    timezone: 'UTC',
    status: 'paused',
    jobType: 'cleanup',
    lastRun: new Date(Date.now() - 86400000 * 14).toISOString(),
    lastStatus: 'failed',
    lastDuration: 120000,
    runCount: 8,
    failureCount: 1,
    createdAt: new Date(Date.now() - 86400000 * 45).toISOString(),
    createdBy: 'admin@example.com',
  },
]

const sampleExecutions: JobExecution[] = [
  {
    id: 'exec_1',
    jobId: 'job_1',
    startedAt: new Date(Date.now() - 3600000 * 14).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 14 + 45000).toISOString(),
    status: 'success',
    duration: 45000,
  },
  {
    id: 'exec_2',
    jobId: 'job_2',
    startedAt: new Date(Date.now() - 1800000).toISOString(),
    completedAt: new Date(Date.now() - 1800000 + 12000).toISOString(),
    status: 'success',
    duration: 12000,
  },
  {
    id: 'exec_3',
    jobId: 'job_1',
    startedAt: new Date(Date.now() - 3600000 * 38).toISOString(),
    completedAt: new Date(Date.now() - 3600000 * 38 + 48000).toISOString(),
    status: 'success',
    duration: 48000,
  },
  {
    id: 'exec_4',
    jobId: 'job_4',
    startedAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    completedAt: new Date(Date.now() - 86400000 * 14 + 120000).toISOString(),
    status: 'failed',
    duration: 120000,
    error: 'Permission denied: Unable to access archive directory',
  },
]

export default function ScheduledJobsPage() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  
  const [jobs, setJobs] = useState<ScheduledJob[]>(sampleJobs)
  const [executions, setExecutions] = useState<JobExecution[]>(sampleExecutions)
  const [loading, setLoading] = useState(false)
  const [selectedJob, setSelectedJob] = useState<ScheduledJob | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showExecutionHistory, setShowExecutionHistory] = useState(false)
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all')
  const [filterType, setFilterType] = useState<'all' | ScheduledJob['jobType']>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [actionMenuJob, setActionMenuJob] = useState<string | null>(null)

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/auth/signin")
    }
  }, [session, isPending, router])

  const filteredJobs = useMemo(() => {
    let filtered = jobs
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(j => j.status === filterStatus)
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(j => j.jobType === filterType)
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(j =>
        j.name.toLowerCase().includes(query) ||
        j.description?.toLowerCase().includes(query)
      )
    }
    
    return filtered
  }, [jobs, filterStatus, filterType, searchQuery])

  const stats = useMemo(() => ({
    total: jobs.length,
    active: jobs.filter(j => j.status === 'active').length,
    paused: jobs.filter(j => j.status === 'paused').length,
    failed: jobs.filter(j => j.lastStatus === 'failed').length,
  }), [jobs])

  const toggleJobStatus = async (jobId: string) => {
    setJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { ...job, status: job.status === 'active' ? 'paused' : 'active' }
        : job
    ))
    setActionMenuJob(null)
  }

  const runJobNow = async (jobId: string) => {
    const job = jobs.find(j => j.id === jobId)
    if (!job) return
    
    // Add a running execution
    const newExecution: JobExecution = {
      id: `exec_${Date.now()}`,
      jobId,
      startedAt: new Date().toISOString(),
      status: 'running',
    }
    setExecutions(prev => [newExecution, ...prev])
    
    // Update job last run
    setJobs(prev => prev.map(j =>
      j.id === jobId
        ? { ...j, lastRun: new Date().toISOString(), lastStatus: 'running' as const }
        : j
    ))
    
    // Simulate completion after 2 seconds
    setTimeout(() => {
      const success = Math.random() > 0.2
      const duration = Math.floor(Math.random() * 5000) + 1000
      
      setExecutions(prev => prev.map(e =>
        e.id === newExecution.id
          ? {
              ...e,
              status: success ? 'success' : 'failed',
              completedAt: new Date().toISOString(),
              duration,
              error: success ? undefined : 'Simulated error for testing',
            }
          : e
      ))
      
      setJobs(prev => prev.map(j =>
        j.id === jobId
          ? {
              ...j,
              lastStatus: success ? 'success' : 'failed',
              lastDuration: duration,
              runCount: j.runCount + 1,
              failureCount: success ? j.failureCount : j.failureCount + 1,
            }
          : j
      ))
    }, 2000)
    
    setActionMenuJob(null)
  }

  const deleteJob = async (jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId))
    setActionMenuJob(null)
  }

  const getStatusColor = (status: ScheduledJob['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      case 'paused':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      case 'disabled':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getJobTypeIcon = (type: ScheduledJob['jobType']) => {
    switch (type) {
      case 'migration':
        return <RefreshCw className="w-4 h-4" />
      case 'backup':
        return <Copy className="w-4 h-4" />
      case 'cleanup':
        return <Trash2 className="w-4 h-4" />
      case 'sync':
        return <RefreshCw className="w-4 h-4" />
      case 'custom':
        return <Zap className="w-4 h-4" />
    }
  }

  const getLastStatusIcon = (status?: ScheduledJob['lastStatus']) => {
    switch (status) {
      case 'success':
        return <Check className="w-4 h-4 text-green-500" />
      case 'failed':
        return <X className="w-4 h-4 text-red-500" />
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

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
                href="/dashboard"
                className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-6 h-6" />
                  Scheduled Jobs
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Manage automated tasks and view execution history
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Job
              </button>
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="p-3 rounded-full bg-violet-100 dark:bg-violet-900/30">
                <Calendar className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Paused</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.paused}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Pause className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Failed (Last Run)</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="all">All Types</option>
                <option value="backup">Backup</option>
                <option value="migration">Migration</option>
                <option value="sync">Sync</option>
                <option value="cleanup">Cleanup</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            
            <button
              onClick={() => setShowExecutionHistory(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <History className="w-4 h-4" />
              Execution History
            </button>
          </div>
        </div>

        {/* Jobs List */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {filteredJobs.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No scheduled jobs found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchQuery || filterStatus !== 'all' || filterType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first scheduled job to automate tasks'}
              </p>
              {!searchQuery && filterStatus === 'all' && filterType === 'all' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Job
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        job.status === 'active'
                          ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                      }`}>
                        {getJobTypeIcon(job.jobType)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white">
                            {job.name}
                          </h3>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(job.status)}`}>
                            {job.status}
                          </span>
                          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 capitalize">
                            {job.jobType}
                          </span>
                        </div>
                        
                        {job.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                            {job.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span className="font-mono">{parseCronExpression(job.cronExpression)}</span>
                          </div>
                          
                          {job.lastRun && (
                            <div className="flex items-center gap-1">
                              {getLastStatusIcon(job.lastStatus)}
                              <span>Last: {formatRelativeTime(job.lastRun)}</span>
                              {job.lastDuration && (
                                <span className="text-gray-400">({formatDuration(job.lastDuration)})</span>
                              )}
                            </div>
                          )}
                          
                          {job.nextRun && job.status === 'active' && (
                            <div className="flex items-center gap-1">
                              <Timer className="w-4 h-4" />
                              <span>Next: {formatRelativeTime(job.nextRun)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>{job.runCount} runs</span>
                          <span>{job.failureCount} failures</span>
                          <span>{((job.runCount - job.failureCount) / job.runCount * 100 || 100).toFixed(1)}% success rate</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="relative">
                      <button
                        onClick={() => setActionMenuJob(actionMenuJob === job.id ? null : job.id)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      
                      {actionMenuJob === job.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                          <button
                            onClick={() => runJobNow(job.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            <Play className="w-4 h-4" />
                            Run Now
                          </button>
                          <button
                            onClick={() => toggleJobStatus(job.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            {job.status === 'active' ? (
                              <>
                                <Pause className="w-4 h-4" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" />
                                Resume
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedJob(job)
                              setActionMenuJob(null)
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </button>
                          <button
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <hr className="my-1 border-gray-200 dark:border-gray-700" />
                          <button
                            onClick={() => deleteJob(job.id)}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Execution History Modal */}
        {showExecutionHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-3xl max-h-[80vh] overflow-hidden m-4">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Execution History
                </h2>
                <button
                  onClick={() => setShowExecutionHistory(false)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-y-auto max-h-[60vh]">
                {executions.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No execution history
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-800">
                    {executions.map((exec) => {
                      const job = jobs.find(j => j.id === exec.jobId)
                      return (
                        <div key={exec.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {exec.status === 'running' ? (
                                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                              ) : exec.status === 'success' ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : exec.status === 'failed' ? (
                                <X className="w-4 h-4 text-red-500" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-gray-400" />
                              )}
                              <span className="font-medium text-gray-900 dark:text-white">
                                {job?.name || 'Unknown Job'}
                              </span>
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                exec.status === 'success'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : exec.status === 'failed'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : exec.status === 'running'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                              }`}>
                                {exec.status}
                              </span>
                            </div>
                            {exec.duration && (
                              <span className="text-sm text-gray-500">
                                {formatDuration(exec.duration)}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            Started: {new Date(exec.startedAt).toLocaleString()}
                          </div>
                          {exec.error && (
                            <div className="mt-2 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300">
                              {exec.error}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Job Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 w-full max-w-lg max-h-[80vh] overflow-hidden m-4">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create Scheduled Job
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Job Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Nightly Backup"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    placeholder="What does this job do?"
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Job Type
                  </label>
                  <select className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="backup">Backup</option>
                    <option value="migration">Migration Check</option>
                    <option value="sync">Data Sync</option>
                    <option value="cleanup">Cleanup</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cron Expression
                  </label>
                  <input
                    type="text"
                    placeholder="0 0 * * * (every day at midnight)"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button type="button" className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                      Every hour
                    </button>
                    <button type="button" className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                      Daily midnight
                    </button>
                    <button type="button" className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                      Weekly Sunday
                    </button>
                    <button type="button" className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
                      Monthly 1st
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Timezone
                  </label>
                  <select className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                    <option value="America/Los_Angeles">America/Los_Angeles</option>
                    <option value="Europe/London">Europe/London</option>
                    <option value="Asia/Tokyo">Asia/Tokyo</option>
                  </select>
                </div>
                
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                  >
                    Create Job
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Click outside to close action menu */}
        {actionMenuJob && (
          <div
            className="fixed inset-0 z-0"
            onClick={() => setActionMenuJob(null)}
          />
        )}
      </main>
    </div>
  )
}
